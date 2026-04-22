export function areFormsReady(visit = {}) {
  return Boolean(visit.intake_done && visit.consent_done);
}

export function isRoomReadyVisit(visit = {}) {
  return Boolean(visit.patient_arrived_at && visit.checked_in_at && areFormsReady(visit));
}

export function deriveArrivalFlowState(visit = {}) {
  if (!visit.patient_arrived_at) return "none";
  if (!visit.checked_in_at) return "desk_confirmation";
  if (!areFormsReady(visit)) return "forms_pending";
  return "room_ready";
}
