import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveArrivalFlowState,
  isRoomReadyVisit,
} from "../src/lib/ops-board-arrival.js";

test("self-arrived patient before desk check-in needs desk confirmation", () => {
  const state = deriveArrivalFlowState({
    patient_arrived_at: "2026-04-22T09:00:00.000Z",
    checked_in_at: null,
    intake_done: true,
    consent_done: true,
  });

  assert.equal(state, "desk_confirmation");
});

test("checked-in patient with complete forms becomes room ready", () => {
  const visit = {
    patient_arrived_at: "2026-04-22T09:00:00.000Z",
    checked_in_at: "2026-04-22T09:03:00.000Z",
    intake_done: true,
    consent_done: true,
  };

  assert.equal(deriveArrivalFlowState(visit), "room_ready");
  assert.equal(isRoomReadyVisit(visit), true);
});

test("checked-in patient with incomplete forms is not room ready", () => {
  const visit = {
    patient_arrived_at: "2026-04-22T09:00:00.000Z",
    checked_in_at: "2026-04-22T09:03:00.000Z",
    intake_done: false,
    consent_done: true,
  };

  assert.equal(deriveArrivalFlowState(visit), "forms_pending");
  assert.equal(isRoomReadyVisit(visit), false);
});
