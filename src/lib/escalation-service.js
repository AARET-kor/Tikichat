import {
  buildEscalationDraft,
  buildPatientVisibleProgressText,
  getAllowedStatusTransition,
} from "./escalation-triage.js";

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

export function summarizeEscalationCounts(items = []) {
  return items.reduce((acc, item) => {
    acc.open += ["requested", "assigned", "acknowledged", "responded"].includes(item.status) ? 1 : 0;
    acc.urgent += item.priority === "urgent" && item.status !== "closed" ? 1 : 0;
    acc.unanswered += ["requested", "assigned"].includes(item.status) ? 1 : 0;
    return acc;
  }, { open: 0, urgent: 0, unanswered: 0 });
}
