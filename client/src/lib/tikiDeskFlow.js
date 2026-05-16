function timeValue(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.getTime() : Number.POSITIVE_INFINITY;
}

function finiteTimeValue(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function waitingLabelFromMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  return `${Math.floor(hours / 24)}일`;
}

const ACTIVE_LINK_STATUSES = ["active", "sent", "opened"];
const CLOSED_LINK_STATUSES = ["expired", "revoked"];

export const JOURNEY_STAGES = [
  { key: "consult", label: "상담", helper: "상담에서 방문 후보로 정리" },
  { key: "link", label: "링크", helper: "My Tiki 발급 필요" },
  { key: "arrival", label: "도착", helper: "방문 대기·도착 확인" },
  { key: "forms", label: "문진·동의", helper: "서류 확인" },
  { key: "waiting", label: "대기", helper: "룸 배정 전" },
  { key: "room", label: "룸", helper: "진료실 진행" },
  { key: "aftercare", label: "애프터케어", helper: "회복·응답 확인" },
];

function hasActiveLink(visit = {}) {
  return ACTIVE_LINK_STATUSES.includes(visit.link_status);
}

function hasMissingLink(visit = {}) {
  return !hasActiveLink(visit) || ["none", ...CLOSED_LINK_STATUSES].includes(visit.link_status);
}

function hasDisplayableLinkUrl(visit = {}) {
  return Boolean(visit.link?.url || visit.link_url || visit.my_tiki_url);
}

function formsReady(visit = {}) {
  return Boolean(visit.intake_done && visit.consent_done);
}

function isAftercareStage(visit = {}) {
  return Boolean(
    visit.followup_done ||
    visit.room_cleared_at ||
    visit.aftercare_due ||
    visit.aftercare_status ||
    ["post_care", "aftercare", "closed"].includes(visit.stage),
  );
}

function isRoomReady(visit = {}) {
  if (typeof visit.room_ready === "boolean") return visit.room_ready;
  return Boolean(visit.checked_in_at && formsReady(visit) && ["pre_visit", "treatment", "post_care"].includes(visit.stage));
}

export function getVisitJourneyStage(visit = {}) {
  const arrivedAt = visit.patient_arrived_at || null;
  const checkedInAt = visit.checked_in_at || null;

  let key = "consult";
  if (isAftercareStage(visit)) key = "aftercare";
  else if (visit.room_id || visit.room) key = "room";
  else if (checkedInAt && formsReady(visit)) key = "waiting";
  else if (checkedInAt && !formsReady(visit)) key = "forms";
  else if (arrivedAt) key = "arrival";
  else if (hasMissingLink(visit)) key = "link";
  else if (hasActiveLink(visit)) key = "link";

  const stage = JOURNEY_STAGES.find((item) => item.key === key) || JOURNEY_STAGES[0];
  return {
    ...stage,
    index: JOURNEY_STAGES.findIndex((item) => item.key === stage.key),
  };
}

export function getDeskNextAction(visit = {}) {
  const arrivedAt = visit.patient_arrived_at || null;
  const checkedInAt = visit.checked_in_at || null;
  const readyForRoom = isRoomReady(visit);

  if (isAftercareStage(visit)) {
    return {
      key: "aftercare_review",
      label: "애프터케어 확인",
      detail: "애프터케어 응답이나 회복 신호를 확인합니다.",
      tone: visit.aftercare_attention || visit.aftercare_due ? "warn" : "steady",
      priority: 70,
      at: visit.room_cleared_at || visit.updated_at || visit.visit_date,
    };
  }

  if (visit.room_id || visit.room) {
    return {
      key: "in_room",
      label: "룸 진행 중",
      detail: "현재 룸에 배정되어 있습니다.",
      tone: "steady",
      priority: 60,
      at: visit.room_assigned_at || checkedInAt || visit.visit_date,
    };
  }

  if (arrivedAt && !checkedInAt) {
    return {
      key: "confirm_arrival",
      label: "도착 확인",
      detail: "환자가 My Tiki에서 도착을 눌렀습니다.",
      tone: "urgent",
      priority: 10,
      at: arrivedAt,
    };
  }

  if (checkedInAt && formsReady(visit)) {
    if (readyForRoom) {
      return {
        key: "send_to_room",
        label: "룸 배정",
        detail: "체크인과 서류가 끝나 룸으로 보낼 수 있습니다.",
        tone: "ready",
        priority: 30,
        at: checkedInAt || arrivedAt || visit.visit_date,
      };
    }
    return {
      key: "wait_room_ready",
      label: "룸 대기",
      detail: "문진·동의 확인은 끝났고 룸 이동 조건을 기다립니다.",
      tone: "muted",
      priority: 50,
      at: checkedInAt || arrivedAt || visit.visit_date,
    };
  }

  if ((arrivedAt || checkedInAt) && !formsReady(visit)) {
    return {
      key: "complete_forms",
      label: !visit.intake_done ? "문진 확인" : "동의서 확인",
      detail: "룸 이동 전 필요한 서류가 남아 있습니다.",
      tone: "warn",
      priority: 20,
      at: arrivedAt || checkedInAt,
    };
  }

  if (hasMissingLink(visit)) {
    return {
      key: "send_link",
      label: "링크 발급",
      detail: "My Tiki 링크를 보내 방문 준비를 시작합니다.",
      tone: "info",
      priority: 70,
      at: visit.visit_date,
    };
  }

  return {
    key: "wait_arrival",
    label: "방문 대기",
    detail: "My Tiki 링크가 발급됐고 방문을 기다립니다.",
    tone: "muted",
    priority: 80,
    at: visit.visit_date,
  };
}

export function getDeskPrimaryCta(action = {}, visit = {}) {
  const actionKey = action.key || action;
  const ctas = {
    send_link: {
      type: "generate_link",
      label: "My Tiki 링크 발급",
      helper: "환자에게 보낼 링크를 만듭니다",
    },
    confirm_arrival: {
      type: "check_in",
      label: "도착 확인",
      helper: "체크인으로 처리합니다",
    },
    complete_forms: {
      type: "confirm_forms",
      label: "서류 확인",
      helper: "직원이 문진·동의 확인을 완료 처리합니다",
    },
    send_to_room: {
      type: "assign_room",
      label: "빈 룸 배정",
      helper: "바로 배정 가능한 첫 방으로 보냅니다",
    },
    in_room: {
      type: "open_room",
      label: "Tiki Room 열기",
      helper: "진료실 화면에서 이어서 처리합니다",
    },
    aftercare_review: {
      type: "open_patient_care",
      label: "환자 케어 열기",
      helper: "애프터케어와 확인 요청 화면에서 처리합니다",
    },
  };

  if (ctas[actionKey]) return ctas[actionKey];

  if (actionKey === "wait_arrival" && ["active", "sent", "opened"].includes(visit.link_status)) {
    if (!(visit.link?.url || visit.link_url || visit.my_tiki_url)) {
      return {
        type: "view_my_tiki_status",
        label: "상태 확인",
        helper: "이미 발급된 My Tiki 상태를 확인합니다",
      };
    }
    return {
      type: "copy_my_tiki_link",
      label: "링크 복사",
      helper: "이미 발급된 My Tiki 링크를 복사합니다",
    };
  }

  return {
    type: "view_my_tiki_status",
    label: "상태 확인",
    helper: "오른쪽 My Tiki 상태에서 확인합니다",
  };
}

export function sortBookedVisits(visits = []) {
  return [...visits].sort((a, b) => timeValue(a.visit_date) - timeValue(b.visit_date));
}

export function sortArrivedVisits(visits = []) {
  return visits
    .filter((visit) => visit.patient_arrived_at || visit.checked_in_at)
    .sort((a, b) => timeValue(a.patient_arrived_at || a.checked_in_at) - timeValue(b.patient_arrived_at || b.checked_in_at));
}

export function sortNextActionVisits(visits = []) {
  return [...visits]
    .map((visit) => ({ visit, action: getDeskNextAction(visit) }))
    .sort((a, b) => {
      if (a.action.priority !== b.action.priority) return a.action.priority - b.action.priority;
      return timeValue(a.action.at || a.visit.visit_date) - timeValue(b.action.at || b.visit.visit_date);
    });
}

export function buildJourneyStageBuckets(visits = []) {
  const buckets = JOURNEY_STAGES.map((stage) => ({
    ...stage,
    count: 0,
    attentionCount: 0,
    oldestWaitingAt: null,
    oldestWaitingLabel: "",
    patients: [],
  }));
  const byKey = Object.fromEntries(buckets.map((stage) => [stage.key, stage]));

  for (const visit of visits) {
    const stage = getVisitJourneyStage(visit);
    const action = getDeskNextAction(visit);
    const bucket = byKey[stage.key] || byKey.consult;
    bucket.patients.push(visit);
    bucket.count += 1;
    if (["urgent", "warn"].includes(action.tone)) bucket.attentionCount += 1;

    const waitingAt = finiteTimeValue(
      action.at ||
      visit.patient_arrived_at ||
      visit.checked_in_at ||
      visit.visit_date ||
      visit.created_at ||
      visit.updated_at,
    );
    if (waitingAt && (!bucket.oldestWaitingAt || waitingAt < bucket.oldestWaitingAt)) {
      bucket.oldestWaitingAt = waitingAt;
    }
  }

  const now = Date.now();
  return buckets.map((bucket) => ({
    ...bucket,
    oldestWaitingLabel: bucket.oldestWaitingAt ? waitingLabelFromMs(now - bucket.oldestWaitingAt) : "",
  }));
}

export function buildTikiDeskFlow(visits = [], limit = 5) {
  return {
    stageRail: buildJourneyStageBuckets(visits),
    booked: sortBookedVisits(visits).slice(0, limit),
    arrived: sortArrivedVisits(visits).slice(0, limit),
    nextActions: sortNextActionVisits(visits).slice(0, limit),
  };
}

export function buildTikiDeskCounts(visits = []) {
  return visits.reduce((acc, visit) => {
    const action = getDeskNextAction(visit);
    acc.total += 1;
    acc.arrived += visit.patient_arrived_at ? 1 : 0;
    acc.waiting += ["confirm_arrival", "complete_forms", "send_to_room", "wait_room_ready", "wait_arrival"].includes(action.key) ? 1 : 0;
    acc.formsNeeded += action.key === "complete_forms" ? 1 : 0;
    acc.roomReady += action.key === "send_to_room" ? 1 : 0;
    acc.needsAttention += ["confirm_arrival", "complete_forms"].includes(action.key) ? 1 : 0;
    acc.linkNeeded += action.key === "send_link" ? 1 : 0;
    acc.inRoom += action.key === "in_room" ? 1 : 0;
    return acc;
  }, {
    total: 0,
    arrived: 0,
    waiting: 0,
    formsNeeded: 0,
    roomReady: 0,
    needsAttention: 0,
    linkNeeded: 0,
    inRoom: 0,
  });
}

export function getMyTikiLinkStatus(visit = {}) {
  const status = visit.link_status || "none";
  if (CLOSED_LINK_STATUSES.includes(status)) {
    return {
      key: "link_expired_cancelled",
      label: "만료/취소",
      helper: "새 링크 발급 또는 상태 확인이 필요합니다",
      tone: "urgent",
    };
  }
  if (status === "opened" || visit.link_opened_at || visit.link?.opened_at) {
    return {
      key: "link_opened",
      label: "열람됨",
      helper: "환자가 My Tiki를 열었습니다",
      tone: "ready",
    };
  }
  if (["active", "sent"].includes(status)) {
    return {
      key: "link_active",
      label: "발급됨",
      helper: "환자에게 전달할 수 있습니다",
      tone: "info",
    };
  }
  return {
    key: "link_needed",
    label: "링크 필요",
    helper: "아직 My Tiki 링크가 없습니다",
    tone: "urgent",
  };
}

export function getMyTikiStatusAction(groupKey, visit = {}) {
  const status = visit.link_status || "none";

  if (groupKey === "link_needed") {
    return {
      type: "generate_link",
      label: "My Tiki 링크 발급",
      helper: "환자에게 보낼 링크를 새로 발급합니다",
      enabled: true,
    };
  }

  if (groupKey === "link_active" || groupKey === "link_opened") {
    if (hasDisplayableLinkUrl(visit)) {
      return {
        type: "copy_my_tiki_link",
        label: "링크 복사",
        helper: "이미 발급된 My Tiki 링크를 복사합니다",
        enabled: true,
      };
    }
    return {
      type: "generate_link",
      label: "링크 재발급",
      helper: "발급 기록은 있지만 복사할 링크 URL이 없어 새 링크를 발급합니다",
      enabled: true,
    };
  }

  if (groupKey === "intake_needed" || groupKey === "consent_needed") {
    return {
      type: "confirm_forms",
      label: "문진·동의 확인",
      helper: "직원이 문진과 동의서 확인을 완료 처리합니다",
      enabled: true,
    };
  }

  if (groupKey === "arrival_confirmed") {
    if (visit.checked_in_at) {
      return {
        type: "disabled",
        label: "도착 확인됨",
        helper: "이미 체크인 처리된 방문입니다",
        enabled: false,
      };
    }
    return {
      type: "check_in",
      label: "도착 확인",
      helper: "환자 도착 신호를 체크인으로 처리합니다",
      enabled: true,
    };
  }

  if (groupKey === "link_expired_cancelled" || CLOSED_LINK_STATUSES.includes(status)) {
    return {
      type: "generate_link",
      label: "링크 재발급",
      helper: "만료 또는 취소된 링크를 새로 발급합니다",
      enabled: true,
    };
  }

  return {
    type: "disabled",
    label: "처리 없음",
    helper: "현재 상태에서 바로 처리할 작업이 없습니다",
    enabled: false,
  };
}

function eventAt(...values) {
  return values.find(Boolean) || null;
}

export function buildVisitJourneyTimeline(visit = {}) {
  const events = [];
  const push = (key, label, detail, at) => {
    events.push({ key, label, detail, at: at || null });
  };

  if (visit.conversation_intake_id || visit.source_channel || visit.raw_text) {
    push("consultation_captured", "상담 캡처", visit.source_channel || "상담 내용에서 시작", eventAt(visit.intake_created_at, visit.created_at));
  }
  if (visit.patient_id || visit.patient_name) {
    push("patient_created", "환자 생성", visit.patient_name || "환자 기록 생성", eventAt(visit.patient_created_at, visit.created_at));
  }
  if (hasActiveLink(visit) || CLOSED_LINK_STATUSES.includes(visit.link_status) || visit.link?.id) {
    push("link_issued", "링크 발급", "My Tiki 링크 생성", eventAt(visit.link?.created_at, visit.link_created_at, visit.created_at));
  }
  if (visit.link_status === "opened" || visit.link_opened_at || visit.link?.opened_at) {
    push("link_opened", "링크 열람", "환자가 My Tiki를 열람", eventAt(visit.link_opened_at, visit.link?.opened_at, visit.updated_at));
  }
  if (visit.patient_arrived_at || visit.checked_in_at) {
    push("arrival_confirmed", "도착 확인", "도착 또는 체크인 확인", eventAt(visit.patient_arrived_at, visit.checked_in_at));
  }
  if (visit.intake_done || visit.consent_done) {
    const done = [visit.intake_done && "문진", visit.consent_done && "동의"].filter(Boolean).join("·");
    push("forms_consent", "문진·동의", done ? `${done} 확인` : "서류 확인", eventAt(visit.forms_completed_at, visit.checked_in_at, visit.updated_at));
  }
  if (visit.room_id || visit.room || visit.room_assigned_at) {
    push("room_session", "룸 진행", visit.room || "룸 배정", eventAt(visit.room_assigned_at, visit.checked_in_at, visit.updated_at));
  }
  if (isAftercareStage(visit)) {
    push("aftercare", "애프터케어", visit.aftercare_status || "회복 상태 확인", eventAt(visit.room_cleared_at, visit.aftercare_sent_at, visit.updated_at));
  }

  return events;
}

export function getStaffSafeErrorMessage(error, fallback = "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.") {
  const raw = String(error?.message || error?.error || error || "");
  if (!raw.trim()) return fallback;
  if (/session|auth|unauthorized|401|jwt|login/i.test(raw)) {
    return "로그인 세션을 다시 확인한 뒤 시도해 주세요.";
  }
  if (/schema cache|column|does not exist|invalid input syntax|uuid|PGRST|relation|foreign key|violates|duplicate key/i.test(raw)) {
    return fallback;
  }
  return fallback;
}

export function buildVisitStatusBadges(visit = {}) {
  const hasLink = hasActiveLink(visit);
  const linkOpened = visit.link_status === "opened";
  const arrived = Boolean(visit.patient_arrived_at || visit.checked_in_at);
  const roomReady = isRoomReady(visit);
  const inRoom = Boolean(visit.room_id || visit.room);
  const aftercareActive = isAftercareStage(visit);

  return [
    {
      key: "consult",
      label: "상담",
      state: "done",
      helper: "방문으로 등록됨",
    },
    {
      key: "link",
      label: "링크",
      state: linkOpened ? "done" : hasLink ? "active" : "missing",
      helper: linkOpened ? "My Tiki 열람" : hasLink ? "My Tiki 발급됨" : "My Tiki 링크 필요",
    },
    {
      key: "arrival",
      label: "도착",
      state: arrived ? "done" : "waiting",
      helper: arrived ? "도착 확인됨" : "도착 전",
    },
    {
      key: "intake",
      label: "문진",
      state: visit.intake_done ? "done" : arrived ? "missing" : "waiting",
      helper: visit.intake_done ? "문진 완료" : arrived ? "문진 확인 필요" : "문진 대기",
    },
    {
      key: "consent",
      label: "동의",
      state: visit.consent_done ? "done" : arrived ? "missing" : "waiting",
      helper: visit.consent_done ? "동의 완료" : arrived ? "동의서 확인 필요" : "동의 대기",
    },
    {
      key: "room",
      label: "룸",
      state: inRoom ? "done" : roomReady ? "active" : "waiting",
      helper: inRoom ? "룸 배정됨" : roomReady ? "룸 이동 가능" : "룸 대기",
    },
    {
      key: "aftercare",
      label: "애프터케어",
      state: visit.followup_done ? "done" : aftercareActive ? "active" : "waiting",
      helper: visit.followup_done ? "애프터케어 완료" : aftercareActive ? "애프터케어 진행" : "시술 후 확인",
    },
  ];
}

export function buildMyTikiStatusSummary(visits = []) {
  const groups = [
    {
      key: "link_needed",
      label: "링크 필요",
      helper: "아직 My Tiki 링크가 없습니다",
      patients: [],
    },
    {
      key: "link_active",
      label: "발급됨",
      helper: "환자에게 전달할 수 있습니다",
      patients: [],
    },
    {
      key: "link_opened",
      label: "열람됨",
      helper: "환자가 My Tiki를 열었습니다",
      patients: [],
    },
    {
      key: "intake_needed",
      label: "문진 필요",
      helper: "문진표 확인이 남았습니다",
      patients: [],
    },
    {
      key: "consent_needed",
      label: "동의 필요",
      helper: "동의서 확인이 남았습니다",
      patients: [],
    },
    {
      key: "arrival_confirmed",
      label: "도착 확인",
      helper: "환자가 도착을 알렸습니다",
      patients: [],
    },
    {
      key: "link_expired_cancelled",
      label: "만료/취소",
      helper: "새 링크가 필요할 수 있습니다",
      patients: [],
    },
  ];
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));

  for (const visit of visits) {
    const link = getMyTikiLinkStatus(visit);
    if (byKey[link.key]) byKey[link.key].patients.push(visit);

    if (!visit.intake_done) byKey.intake_needed.patients.push(visit);
    if (!visit.consent_done) byKey.consent_needed.patients.push(visit);
    if (visit.patient_arrived_at || visit.checked_in_at) byKey.arrival_confirmed.patients.push(visit);
  }

  return groups.map((group) => ({
    ...group,
    count: group.patients.length,
  }));
}
