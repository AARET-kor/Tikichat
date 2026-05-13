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
  return !hasActiveLink(visit) || ["none", "expired", "revoked"].includes(visit.link_status);
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
      label: "링크 발급됨",
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
      key: "intake_done",
      label: "문진 완료",
      helper: "문진표 제출이 끝났습니다",
      patients: [],
    },
    {
      key: "consent_needed",
      label: "동의 필요",
      helper: "동의서 확인이 남았습니다",
      patients: [],
    },
  ];
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));

  for (const visit of visits) {
    const status = visit.link_status || "none";
    if (status === "opened") byKey.link_opened.patients.push(visit);
    else if (["active", "sent"].includes(status)) byKey.link_active.patients.push(visit);
    else byKey.link_needed.patients.push(visit);

    if (visit.intake_done) byKey.intake_done.patients.push(visit);
    if (!visit.consent_done) byKey.consent_needed.patients.push(visit);
  }

  return groups.map((group) => ({
    ...group,
    count: group.patients.length,
  }));
}
