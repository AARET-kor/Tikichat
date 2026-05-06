import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTikiDeskCounts,
  buildTikiDeskFlow,
  getDeskNextAction,
  sortNextActionVisits,
} from "../client/src/lib/tikiDeskFlow.js";

const base = {
  id: "v0",
  patient_name: "환자",
  visit_date: "2026-04-24T09:00:00.000Z",
  link_status: "active",
  stage: "pre_visit",
  intake_done: true,
  consent_done: true,
};

test("getDeskNextAction prioritizes arrival confirmation before forms and room flow", () => {
  const visit = {
    ...base,
    patient_arrived_at: "2026-04-24T08:55:00.000Z",
    checked_in_at: null,
    intake_done: false,
    consent_done: false,
  };

  const action = getDeskNextAction(visit);

  assert.equal(action.key, "confirm_arrival");
  assert.equal(action.label, "도착 확인");
  assert.equal(action.priority, 10);
});

test("sortNextActionVisits orders operational next actions before passive bookings", () => {
  const rows = [
    { ...base, id: "booked", visit_date: "2026-04-24T08:30:00.000Z", link_status: "active", intake_done: true, consent_done: true },
    { ...base, id: "room", visit_date: "2026-04-24T10:00:00.000Z", checked_in_at: "2026-04-24T09:50:00.000Z", room_ready: true, room_id: null },
    { ...base, id: "forms", visit_date: "2026-04-24T09:00:00.000Z", checked_in_at: "2026-04-24T08:58:00.000Z", intake_done: true, consent_done: false },
    { ...base, id: "arrived", visit_date: "2026-04-24T11:00:00.000Z", patient_arrived_at: "2026-04-24T08:57:00.000Z", checked_in_at: null },
  ];

  const ordered = sortNextActionVisits(rows).map(({ visit }) => visit.id);

  assert.deepEqual(ordered, ["arrived", "forms", "room", "booked"]);
});

test("buildTikiDeskFlow exposes booked order, arrival order, and next action order separately", () => {
  const rows = [
    { ...base, id: "late", visit_date: "2026-04-24T11:00:00.000Z", patient_arrived_at: "2026-04-24T09:10:00.000Z" },
    { ...base, id: "early", visit_date: "2026-04-24T09:00:00.000Z", patient_arrived_at: "2026-04-24T09:20:00.000Z" },
  ];

  const flow = buildTikiDeskFlow(rows);

  assert.deepEqual(flow.booked.map((visit) => visit.id), ["early", "late"]);
  assert.deepEqual(flow.arrived.map((visit) => visit.id), ["late", "early"]);
});

test("buildTikiDeskCounts tracks attention, forms, and room-ready counts for the command board", () => {
  const counts = buildTikiDeskCounts([
    { ...base, id: "arrived", patient_arrived_at: "2026-04-24T09:00:00.000Z", checked_in_at: null },
    { ...base, id: "forms", checked_in_at: "2026-04-24T09:05:00.000Z", consent_done: false },
    { ...base, id: "room", checked_in_at: "2026-04-24T09:10:00.000Z", room_ready: true, room_id: null },
  ]);

  assert.equal(counts.total, 3);
  assert.equal(counts.needsAttention, 2);
  assert.equal(counts.formsNeeded, 1);
  assert.equal(counts.roomReady, 1);
  assert.equal(counts.linkNeeded, 0);
  assert.equal(counts.inRoom, 0);
});
