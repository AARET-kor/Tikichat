import test from "node:test";
import assert from "node:assert/strict";

import { buildJourneyEventInsert } from "../src/lib/ops-audit.js";

test("buildJourneyEventInsert creates append-only journey event payloads with actor info", () => {
  const row = buildJourneyEventInsert({
    clinic_id: "clinic-1",
    patient_id: "patient-1",
    visit_id: "visit-1",
    event_type: "room_assigned",
    actor_type: "staff",
    actor_id: "staff-1",
    payload: {
      room_id: "room-1",
      room_name: "Consultation Room 1",
      previous_room_id: null,
    },
  });

  assert.deepEqual(row, {
    clinic_id: "clinic-1",
    patient_id: "patient-1",
    visit_id: "visit-1",
    event_type: "room_assigned",
    actor_type: "staff",
    actor_id: "staff-1",
    payload: {
      room_id: "room-1",
      room_name: "Consultation Room 1",
      previous_room_id: null,
    },
  });
});
