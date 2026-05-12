import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVisitStatusBadges,
  buildTikiDeskCounts,
  buildTikiDeskFlow,
  buildMyTikiStatusSummary,
  getDeskPrimaryCta,
  getDeskNextAction,
  sortNextActionVisits,
} from "../client/src/lib/tikiDeskFlow.js";
import { readFileSync } from "node:fs";

const tikiDeskSource = readFileSync(
  new URL("../client/src/components/mytiki/MyTikiTab.jsx", import.meta.url),
  "utf8",
);

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

test("buildVisitStatusBadges summarizes My Tiki, forms, room, and aftercare readiness", () => {
  const badges = buildVisitStatusBadges({
    ...base,
    link_status: "active",
    patient_arrived_at: "2026-04-24T09:00:00.000Z",
    checked_in_at: "2026-04-24T09:03:00.000Z",
    intake_done: true,
    consent_done: false,
    room_ready: false,
    room_id: null,
    stage: "pre_visit",
    followup_done: false,
  });

  const byKey = Object.fromEntries(badges.map((badge) => [badge.key, badge]));

  assert.equal(byKey.consult.state, "done");
  assert.equal(byKey.link.state, "active");
  assert.equal(byKey.arrival.state, "done");
  assert.equal(byKey.intake.state, "done");
  assert.equal(byKey.consent.state, "missing");
  assert.equal(byKey.room.state, "waiting");
  assert.equal(byKey.aftercare.state, "waiting");
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

test("Tiki Desk command board keeps only today tasks, My Tiki status, and room status on the main surface", () => {
  assert.match(tikiDeskSource, /오늘 할 일/);
  assert.match(tikiDeskSource, /My Tiki 상태/);
  assert.match(tikiDeskSource, /룸 상태/);
  assert.match(tikiDeskSource, /openDedicatedSurface/);
  assert.doesNotMatch(tikiDeskSource, /환자 질문이 운영 task로 전환된 항목/);
  assert.doesNotMatch(tikiDeskSource, /사후관리 체크인, 위험 신호, 리턴 가능 상태를 운영 task로 확인합니다/);
});

test("Tiki Desk next-action cards expose a concrete primary CTA per operational state", () => {
  assert.deepEqual(getDeskPrimaryCta({ key: "send_link" }), {
    type: "generate_link",
    label: "My Tiki 링크 발급",
    helper: "환자에게 보낼 링크를 만듭니다",
  });
  assert.deepEqual(getDeskPrimaryCta({ key: "confirm_arrival" }), {
    type: "check_in",
    label: "도착 확인",
    helper: "체크인으로 처리합니다",
  });
  assert.deepEqual(getDeskPrimaryCta({ key: "complete_forms" }), {
    type: "confirm_forms",
    label: "서류 확인",
    helper: "직원이 문진·동의 확인을 완료 처리합니다",
  });
  assert.deepEqual(getDeskPrimaryCta({ key: "send_to_room" }), {
    type: "assign_room",
    label: "빈 룸 배정",
    helper: "바로 배정 가능한 첫 방으로 보냅니다",
  });
});

test("Tiki Desk treats active My Tiki links as issued even when raw token URL is not recoverable", () => {
  const visit = {
    ...base,
    link_status: "active",
    link: { id: "link-1", status: "active" },
  };

  assert.equal(getDeskNextAction(visit).key, "wait_booking");
  assert.deepEqual(getDeskPrimaryCta(getDeskNextAction(visit), visit), {
    type: "focus_visit",
    label: "링크 발급됨",
    helper: "이미 My Tiki 링크가 있습니다. 새로 필요할 때만 재발급합니다",
  });
});

test("Tiki Desk normalizes patient data from flattened and nested API payloads", () => {
  assert.match(tikiDeskSource, /patient\.name \|\| v\.patient_name \|\| v\.patientName/);
  assert.match(tikiDeskSource, /procedure\.name_ko \|\| procedure\.name_en \|\| v\.procedure_name \|\| v\.procedureName/);
});

test("Tiki Desk today cards wire direct actions instead of passive-only rows", () => {
  assert.match(tikiDeskSource, /onPrimaryAction/);
  assert.match(tikiDeskSource, /handleDeskPrimaryAction/);
  assert.match(tikiDeskSource, /copy_my_tiki_link/);
  assert.match(tikiDeskSource, /confirm_forms/);
  assert.match(tikiDeskSource, /\/api\/staff\/visits\/\$\{visitId\}\/confirm-forms/);
  assert.match(tikiDeskSource, /assign_room/);
});

test("Tiki Desk initial load is not blocked by client-side clinicId state", () => {
  const fetchVisitsBlock = tikiDeskSource.match(/const fetchVisits = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0] || "";

  assert.ok(fetchVisitsBlock, "fetchVisits block should be present");
  assert.doesNotMatch(fetchVisitsBlock, /if \(!clinicId\) return/);
  assert.match(tikiDeskSource, /useState\('active'\)/);
});

test("Tiki Desk has a staff-auth persisted forms-confirm route", () => {
  const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

  assert.match(serverSource, /app\.post\("\/api\/staff\/visits\/:id\/confirm-forms", requireStaffAuth/);
  assert.match(serverSource, /intake_done: true/);
  assert.match(serverSource, /consent_done: true/);
  assert.match(serverSource, /event_type: "form_reviewed"/);
});

test("Tiki Desk ops-board includes active undated visits in today and week views", () => {
  const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

  assert.match(serverSource, /activeUndatedVisitFilter/);
  assert.match(serverSource, /visit_date\.is\.null,stage\.in\.\(booked,pre_visit,treatment\)/);
});

test("buildMyTikiStatusSummary groups patients by link and form state", () => {
  const summary = buildMyTikiStatusSummary([
    { ...base, id: "needs-link", link_status: "none", intake_done: false, consent_done: false },
    { ...base, id: "active-link", link_status: "active", intake_done: true, consent_done: false },
    { ...base, id: "opened", link_status: "opened", intake_done: true, consent_done: true },
  ]);

  assert.deepEqual(summary.map((group) => [group.key, group.count]), [
    ["link_needed", 1],
    ["link_active", 1],
    ["link_opened", 1],
    ["intake_done", 2],
    ["consent_needed", 2],
  ]);
  assert.equal(summary[0].patients[0].id, "needs-link");
});

test("Tiki Desk exposes a My Tiki patient-level drilldown", () => {
  assert.match(tikiDeskSource, /MyTikiStatusDrilldown/);
  assert.match(tikiDeskSource, /selectedMyTikiGroup/);
  assert.match(tikiDeskSource, /링크 발급됨/);
  assert.match(tikiDeskSource, /열람됨/);
  assert.match(tikiDeskSource, /문진 완료/);
  assert.match(tikiDeskSource, /동의 필요/);
});
