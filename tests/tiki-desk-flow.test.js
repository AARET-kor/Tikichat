import test from "node:test";
import assert from "node:assert/strict";
import {
  JOURNEY_STAGES,
  buildJourneyStageBuckets,
  buildVisitStatusBadges,
  buildTikiDeskCounts,
  buildTikiDeskFlow,
  buildMyTikiStatusSummary,
  buildVisitJourneyTimeline,
  getMyTikiStatusAction,
  getStaffSafeErrorMessage,
  getVisitJourneyStage,
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

test("Tiki Desk command board keeps work inside the core board and puts detail panels below", () => {
  assert.match(tikiDeskSource, /Tiki Desk/);
  assert.match(tikiDeskSource, /오늘 운영 핵심/);
  assert.match(tikiDeskSource, /한 눈에 보기/);
  assert.match(tikiDeskSource, /룸 상태/);
  assert.match(tikiDeskSource, /My Tiki 상태 상세/);
  assert.match(tikiDeskSource, /openDedicatedSurface/);
  assert.doesNotMatch(tikiDeskSource, /title="오늘 할 일"/);
  assert.doesNotMatch(tikiDeskSource, /title="My Tiki 상태"/);
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

  assert.equal(getDeskNextAction(visit).key, "wait_arrival");
  assert.equal(getVisitJourneyStage(visit).key, "link");
  assert.deepEqual(getDeskPrimaryCta(getDeskNextAction(visit), visit), {
    type: "view_my_tiki_status",
    label: "상태 확인",
    helper: "이미 발급된 My Tiki 상태를 확인합니다",
  });
});

test("Tiki Desk primary CTA prioritizes the next operational transition over existing link state", () => {
  const arrived = {
    ...base,
    link_status: "active",
    patient_arrived_at: "2026-04-24T09:01:00.000Z",
    checked_in_at: null,
    intake_done: false,
    consent_done: false,
  };

  assert.deepEqual(getDeskPrimaryCta(getDeskNextAction(arrived), arrived), {
    type: "check_in",
    label: "도착 확인",
    helper: "체크인으로 처리합니다",
  });

  const forms = {
    ...base,
    link_status: "opened",
    checked_in_at: "2026-04-24T09:03:00.000Z",
    intake_done: true,
    consent_done: false,
  };

  assert.deepEqual(getDeskPrimaryCta(getDeskNextAction(forms), forms), {
    type: "confirm_forms",
    label: "서류 확인",
    helper: "직원이 문진·동의 확인을 완료 처리합니다",
  });
});

test("visit journey helper calculates the shared seven-stage contract", () => {
  assert.deepEqual(JOURNEY_STAGES.map((stage) => stage.key), [
    "consult",
    "link",
    "arrival",
    "forms",
    "waiting",
    "room",
    "aftercare",
  ]);

  assert.equal(getVisitJourneyStage({ ...base, link_status: "none" }).key, "link");
  assert.equal(getVisitJourneyStage({ ...base, link_status: "active" }).key, "link");
  assert.equal(getVisitJourneyStage({ ...base, patient_arrived_at: "2026-04-24T09:01:00.000Z", checked_in_at: null }).key, "arrival");
  assert.equal(getVisitJourneyStage({ ...base, checked_in_at: "2026-04-24T09:02:00.000Z", intake_done: false, consent_done: false }).key, "forms");
  assert.equal(getVisitJourneyStage({ ...base, checked_in_at: "2026-04-24T09:03:00.000Z", intake_done: true, consent_done: true, room_id: null }).key, "waiting");
  assert.equal(getVisitJourneyStage({ ...base, checked_in_at: "2026-04-24T09:04:00.000Z", room_id: "room-1" }).key, "room");
  assert.equal(getVisitJourneyStage({ ...base, stage: "post_care", followup_done: false }).key, "aftercare");
});

test("journey stage buckets expose counts and patients for Tiki Desk rail drilldown", () => {
  const buckets = buildJourneyStageBuckets([
    { ...base, id: "link", link_status: "none" },
    { ...base, id: "arrival", link_status: "active" },
    { ...base, id: "forms", checked_in_at: "2026-04-24T09:02:00.000Z", consent_done: false },
    { ...base, id: "waiting", checked_in_at: "2026-04-24T09:03:00.000Z", intake_done: true, consent_done: true, room_id: null },
  ]);

  assert.equal(buckets.find((stage) => stage.key === "link").count, 2);
  assert.equal(buckets.find((stage) => stage.key === "link").patients[1].id, "arrival");
  assert.equal(buckets.find((stage) => stage.key === "forms").count, 1);
  assert.equal(buckets.find((stage) => stage.key === "waiting").count, 1);
});

test("buildTikiDeskFlow includes the seven-stage rail alongside today tasks", () => {
  const flow = buildTikiDeskFlow([
    { ...base, id: "needs-link", link_status: "none" },
    { ...base, id: "arrival", link_status: "active" },
  ]);

  assert.ok(Array.isArray(flow.stageRail));
  assert.equal(flow.stageRail.length, 7);
  assert.equal(flow.stageRail.find((stage) => stage.key === "link").count, 2);
  assert.equal(flow.stageRail.find((stage) => stage.key === "arrival").count, 0);
});

test("journey stage rail uses patient-facing staff copy and attention metadata", () => {
  const stages = buildJourneyStageBuckets([
    { ...base, id: "missing-link", link_status: "none", visit_date: "2026-04-24T08:00:00.000Z" },
    { ...base, id: "aftercare", stage: "post_care", aftercare_due: true, updated_at: "2026-04-24T09:00:00.000Z" },
  ]);

  const aftercare = stages.find((stage) => stage.key === "aftercare");
  const link = stages.find((stage) => stage.key === "link");

  assert.equal(aftercare.label, "애프터케어");
  assert.equal(aftercare.attentionCount, 1);
  assert.equal(link.count, 1);
  assert.equal(typeof link.oldestWaitingLabel, "string");
});

test("Tiki Desk stage rail drilldown keeps the same backend action buttons visible", () => {
  assert.match(tikiDeskSource, /JourneyStageRail/);
  assert.match(tikiDeskSource, /JourneyStageDrilldown/);
  assert.match(tikiDeskSource, /selectedJourneyStage/);
  assert.match(tikiDeskSource, /onSelectJourneyStage/);
  assert.match(tikiDeskSource, /mode === 'next' && \(/);
  assert.doesNotMatch(tikiDeskSource, /!compact && mode === 'next' && \(/);
});

test("Tiki Desk normalizes patient data from flattened and nested API payloads", () => {
  assert.match(tikiDeskSource, /patient\.name \|\| v\.patient_name \|\| v\.patientName/);
  assert.match(tikiDeskSource, /procedure\.name_ko \|\| procedure\.name_en \|\| v\.procedure_name \|\| v\.procedureName/);
});

test("Tiki Desk today cards wire direct actions instead of passive-only rows", () => {
  assert.match(tikiDeskSource, /onPrimaryAction/);
  assert.match(tikiDeskSource, /handleDeskPrimaryAction/);
  assert.match(tikiDeskSource, /copy_my_tiki_link/);
  assert.match(tikiDeskSource, /view_my_tiki_status/);
  assert.match(tikiDeskSource, /focusMyTikiStatus/);
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

test("buildMyTikiStatusSummary groups patients by operational My Tiki state", () => {
  const summary = buildMyTikiStatusSummary([
    { ...base, id: "needs-link", link_status: "none", intake_done: false, consent_done: false },
    { ...base, id: "active-link", link_status: "active", intake_done: true, consent_done: false },
    { ...base, id: "opened", link_status: "opened", intake_done: true, consent_done: true, patient_arrived_at: "2026-04-24T09:04:00.000Z" },
    { ...base, id: "expired", link_status: "expired", intake_done: false, consent_done: false },
    { ...base, id: "revoked", link_status: "revoked", intake_done: false, consent_done: false },
  ]);

  assert.deepEqual(summary.map((group) => [group.key, group.label, group.count]), [
    ["link_needed", "링크 필요", 1],
    ["link_active", "발급됨", 1],
    ["link_opened", "열람됨", 1],
    ["intake_needed", "문진 필요", 3],
    ["consent_needed", "동의 필요", 4],
    ["arrival_confirmed", "도착 확인", 1],
    ["link_expired_cancelled", "만료/취소", 2],
  ]);
  assert.equal(summary[0].patients[0].id, "needs-link");
});

test("buildVisitJourneyTimeline exposes a compact operational journey", () => {
  const timeline = buildVisitJourneyTimeline({
    ...base,
    id: "timeline",
    patient_id: "patient-1",
    conversation_intake_id: "intake-1",
    source_channel: "kakao",
    link_status: "opened",
    link: { id: "link-1", created_at: "2026-04-24T08:40:00.000Z" },
    patient_arrived_at: "2026-04-24T08:55:00.000Z",
    checked_in_at: "2026-04-24T09:00:00.000Z",
    room: "리프팅실 1",
    room_cleared_at: "2026-04-24T10:00:00.000Z",
    aftercare_status: "responded",
  });

  assert.deepEqual(timeline.map((event) => event.label), [
    "상담 캡처",
    "환자 생성",
    "링크 발급",
    "링크 열람",
    "도착 확인",
    "문진·동의",
    "룸 진행",
    "애프터케어",
  ]);
});

test("staff safe error message hides raw database implementation details", () => {
  assert.equal(
    getStaffSafeErrorMessage(
      new Error("Could not find the 'last_edited_at' column of 'patient_interactions' in the schema cache"),
      "환자 정보를 저장하지 못했습니다. 다시 시도해 주세요.",
    ),
    "환자 정보를 저장하지 못했습니다. 다시 시도해 주세요.",
  );
  assert.equal(
    getStaffSafeErrorMessage(
      new Error("invalid input syntax for type uuid: \"demo\""),
      "환자 링크를 발급하지 못했습니다. 다시 시도해 주세요.",
    ),
    "환자 링크를 발급하지 못했습니다. 다시 시도해 주세요.",
  );
});

test("Tiki Desk exposes saved, reloaded, and next-stage confirmation feedback", () => {
  assert.match(tikiDeskSource, /저장됨/);
  assert.match(tikiDeskSource, /다시 불러오는 중/);
  assert.match(tikiDeskSource, /다음 단계 확인/);
  assert.match(tikiDeskSource, /deskActionStatusByVisit/);
});

test("Tiki Desk patient cards expose a compact journey timeline", () => {
  assert.match(tikiDeskSource, /buildVisitJourneyTimeline/);
  assert.match(tikiDeskSource, /여정 기록/);
  assert.match(tikiDeskSource, /접기/);
});

test("Tiki Desk uses safe staff errors instead of raw database messages", () => {
  assert.match(tikiDeskSource, /getStaffSafeErrorMessage/);
  assert.doesNotMatch(tikiDeskSource, /setFetchError\(err\.message\)/);
  assert.doesNotMatch(tikiDeskSource, /setErrMsg\(err\.message\)/);
});

test("legacy staff wording uses 애프터케어 instead of 사후", () => {
  assert.doesNotMatch(tikiDeskSource, /사후/);
});

test("Tiki Desk exposes a My Tiki patient-level drilldown", () => {
  assert.match(tikiDeskSource, /MyTikiStatusDrilldown/);
  assert.match(tikiDeskSource, /selectedMyTikiGroup/);
  assert.match(tikiDeskSource, /id="my-tiki-status-detail"/);
  assert.match(tikiDeskSource, /발급됨/);
  assert.match(tikiDeskSource, /열람됨/);
  assert.match(tikiDeskSource, /문진 필요/);
  assert.match(tikiDeskSource, /동의 필요/);
  assert.match(tikiDeskSource, /도착 확인/);
  assert.match(tikiDeskSource, /만료\/취소/);
});

test("My Tiki detail exposes concrete status-specific actions", () => {
  assert.deepEqual(getMyTikiStatusAction("link_needed", { ...base, link_status: "none" }), {
    type: "generate_link",
    label: "My Tiki 링크 발급",
    helper: "환자에게 보낼 링크를 새로 발급합니다",
    enabled: true,
  });
  assert.deepEqual(getMyTikiStatusAction("link_active", { ...base, link_status: "active", my_tiki_url: "https://app.tikidoc.xyz/t/abc" }), {
    type: "copy_my_tiki_link",
    label: "링크 복사",
    helper: "이미 발급된 My Tiki 링크를 복사합니다",
    enabled: true,
  });
  assert.equal(getMyTikiStatusAction("link_active", { ...base, link_status: "active" }).type, "generate_link");
  assert.equal(getMyTikiStatusAction("intake_needed", { ...base, intake_done: false }).type, "confirm_forms");
  assert.equal(getMyTikiStatusAction("consent_needed", { ...base, consent_done: false }).type, "confirm_forms");
  assert.equal(getMyTikiStatusAction("arrival_confirmed", { ...base, checked_in_at: null, patient_arrived_at: "2026-04-24T09:00:00.000Z" }).type, "check_in");
  assert.equal(getMyTikiStatusAction("arrival_confirmed", { ...base, checked_in_at: "2026-04-24T09:02:00.000Z" }).enabled, false);
  assert.equal(getMyTikiStatusAction("link_expired_cancelled", { ...base, link_status: "expired" }).type, "generate_link");
});

test("My Tiki detail panel uses status-specific actions instead of passive-only status checks", () => {
  assert.match(tikiDeskSource, /getMyTikiStatusAction/);
  assert.match(tikiDeskSource, /busyVisitIds/);
  assert.match(tikiDeskSource, /actionStatuses/);
  assert.match(tikiDeskSource, /disabled={!cta\.enabled \|\| busy}/);
  assert.match(tikiDeskSource, /actionStatus \|\| cta\.helper/);
  assert.match(tikiDeskSource, /type === 'disabled'/);
});

test("legacy My Tiki summary keys are no longer used for current operations", () => {
  const summary = buildMyTikiStatusSummary([
    { ...base, id: "needs-link", link_status: "none", intake_done: false, consent_done: false },
  ]);
  assert.equal(summary.some((group) => group.key === "intake_done"), false);
});

test("Tiki Desk keeps generated link URLs through polling without relying on token storage", () => {
  assert.match(tikiDeskSource, /linkUrlCacheRef/);
  assert.match(tikiDeskSource, /mergeCachedLinkUrls/);
  assert.match(tikiDeskSource, /linkUrlCacheRef\.current\[visitId\] = newLink\.url/);
  assert.match(tikiDeskSource, /linkUrlCacheRef\.current\[newLink\.id\] = newLink\.url/);
});

test("Tiki Desk ops-board link lookup uses stable patient_links columns and fails visibly on link query errors", () => {
  const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const routeStart = serverSource.indexOf("async function fetchOpsBoardVisits");
  const routeEnd = serverSource.indexOf("async function loadClinicRooms", routeStart);
  const routeSource = serverSource.slice(routeStart, routeEnd);

  assert.match(routeSource, /\.select\("visit_id, id, status, expires_at, created_at"\)/);
  assert.doesNotMatch(routeSource, /last_accessed_at/);
  assert.match(routeSource, /if \(linksError\) throw linksError/);
  assert.match(routeSource, /link\.status === "opened"/);
  assert.doesNotMatch(routeSource, /first_opened_at/);
});
