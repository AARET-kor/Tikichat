import {
  buildEscalationDraft,
  buildPatientVisibleProgressText,
  getAllowedStatusTransition,
} from "./escalation-triage.js";

export const ESCALATION_SLA_MINUTES = {
  urgent: 15,
  high: 30,
  normal: 120,
  low: 240,
};

const SLA_ACTIVE_STATUSES = new Set(["requested", "assigned"]);
const SLA_HANDLED_STATUSES = new Set(["acknowledged", "responded", "resolved", "closed"]);

export function createEscalationInsert({
  clinic_id,
  patient_id,
  visit_id,
  conversation_id,
  source_message_id = null,
  text = "",
  visitStage = "",
  patientLang = "en",
  requestType = null,
  questionType = null,
  assigned_user_id = null,
}) {
  const draft = buildEscalationDraft({
    text,
    visitStage,
    patientLang,
    requestType,
    questionType,
  });

  return {
    clinic_id,
    patient_id,
    visit_id,
    conversation_id,
    message_id: source_message_id,
    source_message_id,
    request_type: requestType || (draft.assigned_role === "doctor" ? "doctor_confirmation" : draft.assigned_role === "nurse" ? "nurse" : "coordinator"),
    reason_category: questionType || draft.escalation_type,
    escalation_type: draft.escalation_type,
    priority: draft.priority,
    assigned_role: draft.assigned_role,
    assigned_user_id,
    status: "requested",
    opened_at: new Date().toISOString(),
    patient_visible_status_text: draft.patient_visible_status_text,
  };
}

export function buildEscalationUpdateForAction({
  currentStatus,
  action,
  escalation_type,
  patientLang,
  assigned_role,
  assigned_user_id,
  patient_visible_status_text,
  staff_user_id,
}) {
  const nextStatus = getAllowedStatusTransition(currentStatus, action);
  if (!nextStatus) return null;

  const now = new Date().toISOString();
  const update = {
    status: nextStatus,
    updated_at: now,
  };

  if (action === "acknowledge" && !["acknowledged", "responded", "resolved", "closed"].includes(currentStatus)) {
    update.acknowledged_at = now;
    update.acknowledged_by = staff_user_id || null;
  }
  if (action === "respond") {
    update.responded_at = now;
    update.responded_by = staff_user_id || null;
  }
  if (action === "resolve") {
    update.resolved_at = now;
    update.resolved_by = staff_user_id || null;
  }
  if (action === "close") {
    update.closed_at = now;
    update.closed_by = staff_user_id || null;
  }
  if (assigned_role !== undefined) update.assigned_role = assigned_role;
  if (assigned_user_id !== undefined) update.assigned_user_id = assigned_user_id;
  if (patient_visible_status_text !== undefined) {
    update.patient_visible_status_text = patient_visible_status_text;
  } else {
    update.patient_visible_status_text = buildPatientVisibleProgressText({
      escalationType: escalation_type,
      assignedRole: assigned_role,
      status: nextStatus,
      patientLang,
    });
  }

  return update;
}

function getEscalationSlaThreshold(priority) {
  return ESCALATION_SLA_MINUTES[priority] || ESCALATION_SLA_MINUTES.normal;
}

function getAgeMinutes(openedAt, now) {
  const openedMs = new Date(openedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(openedMs) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.floor((nowMs - openedMs) / 60000));
}

export function deriveEscalationSlaState(item = {}, { now = new Date().toISOString() } = {}) {
  const threshold = getEscalationSlaThreshold(item.priority);
  const status = item.status || "requested";

  if (SLA_HANDLED_STATUSES.has(status)) {
    return {
      status: "handled",
      age_minutes: null,
      threshold_minutes: threshold,
      due_in_minutes: null,
    };
  }

  if (!SLA_ACTIVE_STATUSES.has(status)) {
    return {
      status: "unknown",
      age_minutes: null,
      threshold_minutes: threshold,
      due_in_minutes: null,
    };
  }

  const ageMinutes = getAgeMinutes(item.opened_at || item.created_at, now);
  if (ageMinutes === null) {
    return {
      status: "unknown",
      age_minutes: null,
      threshold_minutes: threshold,
      due_in_minutes: null,
    };
  }

  const dueInMinutes = Math.max(0, threshold - ageMinutes);
  if (ageMinutes >= threshold) {
    return {
      status: "overdue",
      age_minutes: ageMinutes,
      threshold_minutes: threshold,
      due_in_minutes: 0,
    };
  }

  if (ageMinutes >= Math.ceil(threshold * 0.7)) {
    return {
      status: "due_soon",
      age_minutes: ageMinutes,
      threshold_minutes: threshold,
      due_in_minutes: dueInMinutes,
    };
  }

  return {
    status: "within_sla",
    age_minutes: ageMinutes,
    threshold_minutes: threshold,
    due_in_minutes: dueInMinutes,
  };
}

export function attachEscalationSla(items = [], options = {}) {
  return (items || []).map((item) => ({
    ...item,
    sla_state: item.sla_state || deriveEscalationSlaState(item, options),
  }));
}

export function summarizeEscalationCounts(items = [], options = {}) {
  return items.reduce((acc, item) => {
    const slaState = item.sla_state || deriveEscalationSlaState(item, options);
    acc.open += ["requested", "assigned", "acknowledged", "responded"].includes(item.status) ? 1 : 0;
    acc.urgent += item.priority === "urgent" && item.status !== "closed" ? 1 : 0;
    acc.unanswered += ["requested", "assigned"].includes(item.status) ? 1 : 0;
    acc.overdue += slaState.status === "overdue" ? 1 : 0;
    acc.due_soon += slaState.status === "due_soon" ? 1 : 0;
    return acc;
  }, { open: 0, urgent: 0, unanswered: 0, overdue: 0, due_soon: 0 });
}
