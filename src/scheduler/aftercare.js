import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import { aftercareQueue, redisConnection } from "../lib/queue.js";
import {
  deliverDueAftercareEvents,
  ensureAftercareRunForVisit,
  markDueAftercareEvents,
} from "../lib/aftercare-service.js";

const HOURLY_PATTERN = "0 * * * *";
const TIMEZONE = "Asia/Seoul";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function sweepAftercareDueEvents(sb, clinicId) {
  const nowIso = new Date().toISOString();

  let visitQuery = sb
    .from("visits")
    .select(`
      id, clinic_id, patient_id, procedure_id, stage, visit_date, room_cleared_at, updated_at,
      procedures ( id, name_ko, name_en )
    `)
    .not("procedure_id", "is", null)
    .lte("visit_date", nowIso)
    .order("visit_date", { ascending: false })
    .limit(500);

  if (clinicId) visitQuery = visitQuery.eq("clinic_id", clinicId);

  const { data: visits, error: visitError } = await visitQuery;
  if (visitError) throw visitError;

  let runCount = 0;
  let dueCount = 0;

  for (const visit of visits || []) {
    const run = await ensureAftercareRunForVisit(sb, visit.clinic_id, visit.patient_id, visit);
    if (!run) continue;
    runCount += 1;
    dueCount += await markDueAftercareEvents(sb, run.id);
  }

  const sentCount = await deliverDueAftercareEvents(sb, clinicId);

  return {
    scanned_visits: (visits || []).length,
    active_runs: runCount,
    newly_due_events: dueCount,
    sent_events: sentCount,
  };
}

function startAftercareWorker() {
  if (!redisConnection) return;

  const worker = new Worker(
    "tikidoc-aftercare",
    async (job) => {
      const clinicId = job.data?.clinicId || null;
      const sb = getSupabaseAdmin();
      if (!sb) {
        console.warn("[Aftercare Scheduler] Supabase env missing; skipping");
        return;
      }

      const result = await sweepAftercareDueEvents(sb, clinicId);
      console.log(`[Aftercare Scheduler] scanned=${result.scanned_visits} runs=${result.active_runs} due=${result.newly_due_events} sent=${result.sent_events}`);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("failed", (_job, err) => {
    console.error("[Aftercare Scheduler] failed:", err.message);
  });
  worker.on("error", (err) => {
    console.error("[Aftercare Scheduler] error:", err.message);
  });
}

export async function startAftercareScheduler() {
  if (!aftercareQueue) {
    console.warn("[Aftercare Scheduler] Redis unavailable; due events stay lazy-loaded via patient/staff reads");
    return;
  }

  const existing = await aftercareQueue.getRepeatableJobs();
  const alreadySet = existing.some((job) => job.name === "aftercare-due-scan");

  if (!alreadySet) {
    await aftercareQueue.add(
      "aftercare-due-scan",
      { clinicId: process.env.CLINIC_UUID || null },
      {
        repeat: {
          pattern: HOURLY_PATTERN,
          tz: TIMEZONE,
        },
        removeOnComplete: true,
        removeOnFail: { count: 30 },
      }
    );
    console.log("[Aftercare Scheduler] hourly due-scan registered");
  }

  startAftercareWorker();
}

export { sweepAftercareDueEvents };
