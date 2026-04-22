export function buildJourneyEventInsert({
  clinic_id,
  patient_id = null,
  visit_id = null,
  event_type,
  actor_type = "system",
  actor_id = null,
  payload = {},
}) {
  return {
    clinic_id,
    patient_id,
    visit_id,
    event_type,
    actor_type,
    actor_id,
    payload,
  };
}
