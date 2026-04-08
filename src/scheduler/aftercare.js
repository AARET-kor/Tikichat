/**
 * src/scheduler/aftercare.js
 * BullMQ Repeat Job — 매일 오전 10시 (KST) 애프터케어 자동 발송
 *
 * node-cron 대신 BullMQ Repeat Job 사용:
 *   - 서버 재시작에도 스케줄 유지 (Redis에 상태 저장)
 *   - 실패 시 자동 재시도
 *   - 실행 이력 audit_logs 기록
 *
 * patients 테이블 필요 컬럼 (Supabase SQL Editor에서 실행):
 * ─────────────────────────────────────────────────────────────
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_procedure_date DATE;
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS needs_d1_care BOOLEAN DEFAULT false;
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS needs_d3_care BOOLEAN DEFAULT false;
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS needs_d7_care BOOLEAN DEFAULT false;
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'kakao'; -- kakao|whatsapp|instagram
 * ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id TEXT;
 * ─────────────────────────────────────────────────────────────
 */

import { Worker }               from "bullmq";
import { aftercareQueue, redisConnection, safeEnqueue, messageQueue } from "../lib/queue.js";
import { supabaseAdmin, writeAuditLog } from "../lib/supabase-server.js";

const CRON_10AM_KST = "0 10 * * *"; // 매일 오전 10시
const TIMEZONE      = "Asia/Seoul";
const CLINIC_ID     = process.env.CLINIC_ID || null;

// ── 애프터케어 스케줄 등록 (서버 시작 시 1회 호출) ──────────────────────
export async function startAftercareScheduler() {
  if (!aftercareQueue) {
    console.warn("[Scheduler] Redis 미연결 — aftercare 스케줄러 비활성화");
    return;
  }

  // 기존 반복 작업 중복 방지 (동일 name + cron 패턴이면 재등록 안 함)
  const existing = await aftercareQueue.getRepeatableJobs();
  const alreadySet = existing.some(j => j.name === "daily-aftercare-scan");

  if (!alreadySet) {
    await aftercareQueue.add(
      "daily-aftercare-scan",
      { clinicId: CLINIC_ID, scheduledAt: null }, // scheduledAt은 실행 시점에 채움
      {
        repeat: {
          pattern: CRON_10AM_KST,
          tz:      TIMEZONE,
        },
        removeOnComplete: true,
        removeOnFail:     { count: 30 },
      }
    );
    console.log("[Scheduler] ✅ aftercare repeat job 등록 완료 (매일 10:00 KST)");
  } else {
    console.log("[Scheduler] aftercare repeat job 이미 등록됨 — 스킵");
  }

  startAftercareWorker();
}

// ── 애프터케어 Worker ────────────────────────────────────────────────────
function startAftercareWorker() {
  if (!redisConnection) return;

  const worker = new Worker(
    "tikichat-aftercare",
    async (job) => {
      const clinicId = job.data.clinicId || CLINIC_ID;
      const now      = new Date();
      const today    = toKSTDateString(now);

      console.log(`[Aftercare] 실행 시작 — ${today} (clinicId=${clinicId})`);

      // ── 애프터케어 대상 환자 조회 ──────────────────────────────────
      // needs_d1_care, needs_d3_care, needs_d7_care 중 하나라도 true인 환자
      const { data: patients, error } = await supabaseAdmin
        .from("patients")
        .select("id, name, phone, instagram_id, preferred_channel, preferred_lang, procedure_id, clinic_id, needs_d1_care, needs_d3_care, needs_d7_care")
        .eq("clinic_id", clinicId)      // ← RLS 명시적 강제
        .or("needs_d1_care.eq.true,needs_d3_care.eq.true,needs_d7_care.eq.true");

      if (error) {
        console.error("[Aftercare] 환자 조회 실패:", error.message);
        throw error; // BullMQ 재시도 유도
      }

      if (!patients?.length) {
        console.log("[Aftercare] 오늘 대상 환자 없음");
        return;
      }

      console.log(`[Aftercare] 대상 환자 ${patients.length}명 처리 시작`);

      for (const patient of patients) {
        const day = patient.needs_d1_care ? 1 : patient.needs_d3_care ? 3 : 7;
        await safeEnqueue(messageQueue, "aftercare-message", {
          type:      "aftercare",
          clinicId:  patient.clinic_id,
          patientId: patient.id,
          phone:     patient.phone,
          igId:      patient.instagram_id,
          channel:   patient.preferred_channel || "kakao",
          lang:      patient.preferred_lang    || "ko",
          procedureId: patient.procedure_id,
          day,
        });

        // flags 초기화 (발송 예약됨 → false)
        const updateFields = {};
        if (day === 1) updateFields.needs_d1_care = false;
        if (day === 3) updateFields.needs_d3_care = false;
        if (day === 7) updateFields.needs_d7_care = false;

        await supabaseAdmin
          .from("patients")
          .update(updateFields)
          .eq("id", patient.id)
          .eq("clinic_id", clinicId); // 이중 RLS 보장
      }

      await writeAuditLog({
        eventType:  "aftercare_schedule",
        clinicId,
        direction:  "outbound",
        status:     "success",
        durationMs: Date.now() - now.getTime(),
      });

      console.log(`[Aftercare] ✅ ${patients.length}명 큐 투입 완료`);
    },
    {
      connection:  redisConnection,
      concurrency: 1,  // 스케줄러 작업은 직렬 처리
    }
  );

  worker.on("failed", (job, err) =>
    console.error("[Aftercare Worker] 실패:", err.message)
  );
  worker.on("error", (err) =>
    console.error("[Aftercare Worker] 오류:", err.message)
  );

  console.log("[Scheduler] 🔁 aftercareWorker 시작");
}

// ── KST 날짜 문자열 (YYYY-MM-DD) ─────────────────────────────────────
function toKSTDateString(date) {
  return date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).replace(/\. /g, "-").replace(".", "");
}
