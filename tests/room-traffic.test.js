import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRoomOccupancy,
  getRoomReadyQueue,
  isVisitRoomReady,
} from "../src/lib/room-traffic.js";

test("room-ready requires check-in, required forms, and active visit stage", () => {
  assert.equal(isVisitRoomReady({
    checked_in_at: "2026-04-22T09:00:00.000Z",
    intake_done: true,
    consent_done: true,
    stage: "pre_visit",
  }), true);

  assert.equal(isVisitRoomReady({
    checked_in_at: null,
    intake_done: true,
    consent_done: true,
    stage: "pre_visit",
  }), false);

  assert.equal(isVisitRoomReady({
    checked_in_at: "2026-04-22T09:00:00.000Z",
    intake_done: true,
    consent_done: true,
    stage: "closed",
  }), false);
});

test("room occupancy marks assigned active visits as occupied", () => {
  const rooms = [
    { id: "room-1", name: "Consultation Room 1" },
    { id: "room-2", name: "VIP 1" },
  ];
  const visits = [
    {
      id: "visit-1",
      patient_name: "Alice",
      room_id: "room-1",
      room_cleared_at: null,
      stage: "treatment",
    },
  ];

  const result = buildRoomOccupancy({ rooms, visits });

  assert.equal(result[0].occupancy_state, "occupied");
  assert.equal(result[0].current_visit.id, "visit-1");
  assert.equal(result[1].occupancy_state, "free");
});

test("room-ready queue includes ready unassigned patients in chronological order", () => {
  const visits = [
    {
      id: "visit-late",
      patient_name: "Late",
      checked_in_at: "2026-04-22T09:20:00.000Z",
      intake_done: true,
      consent_done: true,
      room_id: null,
      stage: "pre_visit",
    },
    {
      id: "visit-early",
      patient_name: "Early",
      checked_in_at: "2026-04-22T09:05:00.000Z",
      intake_done: true,
      consent_done: true,
      room_id: null,
      stage: "pre_visit",
    },
    {
      id: "visit-assigned",
      patient_name: "Assigned",
      checked_in_at: "2026-04-22T09:00:00.000Z",
      intake_done: true,
      consent_done: true,
      room_id: "room-1",
      stage: "pre_visit",
    },
  ];

  const queue = getRoomReadyQueue(visits);

  assert.deepEqual(queue.map((item) => item.id), ["visit-early", "visit-late"]);
});
