import { buildDefaultAftercareSteps, getAftercarePatientAcknowledgement } from "./aftercare-engine.js";
import { generatePatientToken } from "../middleware/auth.js";
import { sendMetaMessage } from "../api/meta.js";
import { sendSms } from "../api/solapi.js";
import { buildJourneyEventInsert, buildOperationalAuditPayload, writeJourneyEvents } from "./ops-audit.js";
import { writeAuditLog } from "./supabase-server.js";

const LINK_SENT_VIA_VALUES = new Set(["whatsapp", "sms", "email", "kakao"]);
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.tikidoc.xyz").replace(/\/+$/, "");

function normalizePhoneForSms(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82")) return `0${digits.slice(2)}`;
  return digits;
}

export function pickAftercareDeliveryTarget(channelRefs = {}) {
  if (channelRefs.whatsapp) {
    return {
      channel: "whatsapp",
      recipient: String(channelRefs.whatsapp).replace(/\D/g, ""),
      sent_via: "whatsapp",
    };
  }

  if (channelRefs.instagram) {
    return {
      channel: "instagram",
      recipient: String(channelRefs.instagram).trim(),
      sent_via: null,
    };
  }

  if (channelRefs.phone) {
    const phone = normalizePhoneForSms(channelRefs.phone);
    if (phone) {
      return {
        channel: "sms",
        recipient: phone,
        sent_via: "sms",
      };
    }
  }

  return null;
}

export function buildAftercareOutboundMessage({ contentTemplate = "", portalUrl = "" } = {}) {
  const body = String(contentTemplate || "").trim();
  const cta = portalUrl ? `Open your My Tiki follow-up here: ${portalUrl}` : "";
  return [body, cta].filter(Boolean).join("\n\n");
}

async function createAftercarePortalLink(sb, {
  clinic_id,
  patient_id,
  visit_id,
  patient_lang = "ko",
  sent_via = null,
  custom_message = null,
}) {
  const { token, tokenHash } = generatePatientToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const normalizedSentVia = LINK_SENT_VIA_VALUES.has(sent_via) ? sent_via : null;

  const { error } = await sb
    .from("patient_links")
    .insert({
      clinic_id,
      patient_id,
      visit_id,
      token_hash: tokenHash,
      link_type: "aftercare",
      status: "active",
      expires_at: expiresAt,
      patient_lang,
      sent_via: normalizedSentVia,
      custom_message,
      generated_by: "system",
    });
  if (error) throw error;

  return `${APP_BASE_URL}/t/${token}`;
}

async function sendAftercareOutbound({ channel, recipient, text }) {
  if (channel === "whatsapp" || channel === "instagram") {
    return sendMetaMessage(channel, recipient, text);
  }
  if (channel === "sms") {
    return sendSms({ to: recipient, text });
  }
  throw new Error(`Unsupported aftercare channel: ${channel}`);
}

export function isAftercareEligibleVisit(visit = {}) {
  if (!visit?.id || !visit?.procedure_id) return false;
  if (["post_care", "followup", "closed"].includes(visit.stage)) return true;
  if (!visit.visit_date) return false;
  return new Date(visit.visit_date).getTime() <= Date.now();
}

export function computeAftercareBaseTime(visit = {}) {
  return visit.room_cleared_at || visit.updated_at || visit.visit_date || new Date().toISOString();
}

export async function ensureAftercarePlan(sb, clinic_id, procedure = {}) {
  const { data: existing, error: existingError } = await sb
    .from("aftercare_plans")
    .select("id, clinic_id, procedure_id, name, is_active, created_at, updated_at")
    .eq("clinic_id", clinic_id)
    .eq("procedure_id", procedure.id)
    .eq("is_active", true)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await sb
    .from("aftercare_plans")
    .insert({
      clinic_id,
      procedure_id: procedure.id || null,
      name: `${procedure.name_ko || procedure.name_en || "Generic"} Aftercare`,
      is_active: true,
    })
    .select("id, clinic_id, procedure_id, name, is_active, created_at, updated_at")
    .single();
  if (createError) throw createError;

  const steps = buildDefaultAftercareSteps({
    procedureName: procedure.name_ko || procedure.name_en || "",
    procedureCategory: procedure.name_en || procedure.name_ko || "",
  });

  const { error: stepError } = await sb
    .from("aftercare_steps")
    .insert(steps.map((step) => ({
      plan_id: created.id,
      step_key: step.step_key,
      trigger_offset_hours: step.trigger_offset_hours,
      message_template_key: step.message_template_key,
      form_template_key: "aftercare_checkin_v1",
      escalation_policy_key: "aftercare_risk_v1",
      next_action_type: step.next_action_type,
      sort_order: step.sort_order,
      content_template: step.content_template,
    })));
  if (stepError) throw stepError;

  return created;
}

export async function ensureAftercareRunForVisit(sb, clinic_id, patient_id, visit) {
  if (!isAftercareEligibleVisit(visit)) return null;

  const { data: existing, error: existingError } = await sb
    .from("patient_aftercare_runs")
    .select("id, clinic_id, patient_id, visit_id, plan_id, status, started_at, completed_at, created_at, updated_at")
    .eq("clinic_id", clinic_id)
    .eq("visit_id", visit.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const plan = await ensureAftercarePlan(sb, clinic_id, visit.procedures || {});
  const { data: steps, error: stepError } = await sb
    .from("aftercare_steps")
    .select("id, plan_id, step_key, trigger_offset_hours, message_template_key, form_template_key, escalation_policy_key, next_action_type, sort_order, content_template")
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });
  if (stepError) throw stepError;

  const startedAt = computeAftercareBaseTime(visit);
  const { data: run, error: runError } = await sb
    .from("patient_aftercare_runs")
    .insert({
      clinic_id,
      patient_id,
      visit_id: visit.id,
      plan_id: plan.id,
      status: "active",
      started_at: startedAt,
    })
    .select("id, clinic_id, patient_id, visit_id, plan_id, status, started_at, completed_at, created_at, updated_at")
    .single();
  if (runError) throw runError;

  const baseMs = new Date(startedAt).getTime();
  const events = (steps || []).map((step) => ({
    run_id: run.id,
    step_id: step.id,
    scheduled_for: new Date(baseMs + (step.trigger_offset_hours * 60 * 60 * 1000)).toISOString(),
    response_status: "scheduled",
    risk_level: "normal",
    next_action_status: step.next_action_type || null,
    safe_for_return: false,
  }));
  if (events.length > 0) {
    const { error: eventError } = await sb.from("patient_aftercare_events").insert(events);
    if (eventError) throw eventError;
  }

  return run;
}

export async function markDueAftercareEvents(sb, runId) {
  if (!runId) return 0;
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("patient_aftercare_events")
    .update({
      response_status: "due",
    })
    .eq("run_id", runId)
    .eq("response_status", "scheduled")
    .is("sent_at", null)
    .lte("scheduled_for", now)
    .select("id, run_id, step_id");
  if (error) throw error;
  if ((data || []).length > 0) {
    const { data: run, error: runError } = await sb
      .from("patient_aftercare_runs")
      .select("id, clinic_id, patient_id, visit_id")
      .eq("id", runId)
      .maybeSingle();
    if (runError) throw runError;

    const { data: steps, error: stepError } = await sb
      .from("aftercare_steps")
      .select("id, step_key")
      .in("id", [...new Set((data || []).map((row) => row.step_id).filter(Boolean))]);
    if (stepError) throw stepError;
    const stepMap = new Map((steps || []).map((step) => [step.id, step]));

    await writeJourneyEvents(sb, (data || []).map((row) => buildJourneyEventInsert({
      clinic_id: run?.clinic_id || null,
      patient_id: run?.patient_id || null,
      visit_id: run?.visit_id || null,
      event_type: "aftercare_due_marked",
      actor_type: "system",
      actor_id: "scheduler",
      payload: buildOperationalAuditPayload({
        current_status: "due",
        payload: {
          event_id: row.id,
          run_id: row.run_id,
          step_id: row.step_id,
          step_key: stepMap.get(row.step_id)?.step_key || null,
        },
      }),
    })));
  }
  return data?.length || 0;
}

export async function deliverDueAftercareEvents(sb, clinic_id = null) {
  let query = sb
    .from("patient_aftercare_events")
    .select(`
      id, run_id, step_id, scheduled_for, sent_at, responded_at, response_status, risk_level,
      urgent_flag, next_action_status, created_at, updated_at,
      patient_aftercare_runs!inner (
        id, clinic_id, patient_id, visit_id, status,
        patients ( id, name, lang, channel_refs ),
        visits ( id, procedure_id )
      ),
      aftercare_steps ( id, step_key, message_template_key, content_template )
    `)
    .eq("response_status", "due")
    .is("sent_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(200);

  if (clinic_id) {
    query = query.eq("patient_aftercare_runs.clinic_id", clinic_id);
  }

  const { data: events, error } = await query;
  if (error) throw error;

  let sentCount = 0;

  for (const event of events || []) {
    const run = event.patient_aftercare_runs;
    const patient = run?.patients || {};
    const target = pickAftercareDeliveryTarget(patient.channel_refs || {});

    if (!target) {
      await writeAuditLog({
        eventType: "aftercare_outbound",
        clinicId: run?.clinic_id || clinic_id || null,
        patientId: patient.id || null,
        patientLang: patient.lang || "en",
        channel: "dashboard",
        direction: "outbound",
        status: "error",
        errorMessage: "No supported outbound channel for aftercare delivery",
      });
      continue;
    }

    const portalUrl = await createAftercarePortalLink(sb, {
      clinic_id: run.clinic_id,
      patient_id: run.patient_id,
      visit_id: run.visit_id,
      patient_lang: patient.lang || "en",
      sent_via: target.sent_via,
      custom_message: event.aftercare_steps?.message_template_key || null,
    });

    const text = buildAftercareOutboundMessage({
      contentTemplate: event.aftercare_steps?.content_template || "",
      portalUrl,
    });

    try {
      await sendAftercareOutbound({
        channel: target.channel,
        recipient: target.recipient,
        text,
      });

      const { data: updated, error: updateError } = await sb
        .from("patient_aftercare_events")
        .update({
          sent_at: new Date().toISOString(),
        })
        .eq("id", event.id)
        .is("sent_at", null)
        .eq("response_status", "due")
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) continue;

      sentCount += 1;
      await writeJourneyEvents(sb, [
        buildJourneyEventInsert({
          clinic_id: run.clinic_id,
          patient_id: patient.id || null,
          visit_id: run.visit_id || null,
          event_type: "aftercare_outbound_sent",
          actor_type: "system",
          actor_id: "scheduler",
          payload: buildOperationalAuditPayload({
            current_status: "due",
            payload: {
              event_id: event.id,
              run_id: event.run_id,
              step_id: event.step_id,
              step_key: event.aftercare_steps?.step_key || null,
              channel: target.channel,
            },
          }),
        }),
      ]);
      await writeAuditLog({
        eventType: "aftercare_outbound",
        clinicId: run.clinic_id,
        patientId: patient.id || null,
        patientLang: patient.lang || "en",
        channel: target.channel,
        direction: "outbound",
        status: "success",
      });
    } catch (err) {
      await writeAuditLog({
        eventType: "aftercare_outbound",
        clinicId: run?.clinic_id || clinic_id || null,
        patientId: patient.id || null,
        patientLang: patient.lang || "en",
        channel: target.channel,
        direction: "outbound",
        status: "error",
        errorMessage: err.message,
      });
    }
  }

  return sentCount;
}

export async function fetchPatientAftercareState(sb, clinic_id, patient_id, visit_id) {
  const { data: visit, error: visitError } = await sb
    .from("visits")
    .select(`
      id, clinic_id, patient_id, procedure_id, stage, visit_date, room_cleared_at, updated_at,
      intake_done, consent_done, followup_done,
      procedures ( id, name_ko, name_en )
    `)
    .eq("id", visit_id)
    .eq("clinic_id", clinic_id)
    .maybeSingle();
  if (visitError) throw visitError;
  if (!visit) return null;

  const run = await ensureAftercareRunForVisit(sb, clinic_id, patient_id, visit);
  if (!run) {
    return {
      visit,
      run: null,
      events: [],
      due_items: [],
      completed_items: [],
      acknowledgement: null,
      safe_for_return: false,
    };
  }

  await markDueAftercareEvents(sb, run.id);

  const { data: events, error: eventsError } = await sb
    .from("patient_aftercare_events")
    .select(`
      id, run_id, step_id, scheduled_for, sent_at, responded_at,
      response_status, risk_level, escalation_request_id, urgent_flag,
      next_action_status, safe_for_return, staff_reviewed_at, staff_reviewed_by,
      created_at, updated_at,
      aftercare_steps ( id, step_key, trigger_offset_hours, message_template_key, next_action_type, content_template )
    `)
    .eq("run_id", run.id)
    .order("scheduled_for", { ascending: true });
  if (eventsError) throw eventsError;

  const dueItems = (events || []).filter((event) => event.response_status === "due" || (event.sent_at && !event.responded_at));
  const completedItems = (events || []).filter((event) => event.responded_at);
  const latestEscalated = [...(events || [])].reverse().find((event) => event.escalation_request_id || event.urgent_flag) || null;

  return {
    visit,
    run,
    events: events || [],
    due_items: dueItems,
    completed_items: completedItems,
    acknowledgement: latestEscalated ? getAftercarePatientAcknowledgement(latestEscalated.risk_level) : null,
    safe_for_return: (events || []).some((event) => event.safe_for_return),
  };
}
