function timeValue(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.getTime() : Number.POSITIVE_INFINITY;
}

export function getDeskNextAction(visit = {}) {
  const formsReady = Boolean(visit.intake_done && visit.consent_done);
  const arrivedAt = visit.patient_arrived_at || null;
  const checkedInAt = visit.checked_in_at || null;
  const roomReady = typeof visit.room_ready === "boolean"
    ? visit.room_ready
    : Boolean(checkedInAt && formsReady && ["pre_visit", "treatment", "post_care"].includes(visit.stage));

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

  if ((arrivedAt || checkedInAt) && !formsReady) {
    return {
      key: "complete_forms",
      label: !visit.intake_done ? "문진 확인" : "동의서 확인",
      detail: "룸 이동 전 필요한 서류가 남아 있습니다.",
      tone: "warn",
      priority: 20,
      at: arrivedAt || checkedInAt,
    };
  }

  if (roomReady && !visit.room_id) {
    return {
      key: "send_to_room",
      label: "룸 배정",
      detail: "체크인과 서류가 끝나 룸으로 보낼 수 있습니다.",
      tone: "ready",
      priority: 30,
      at: checkedInAt || arrivedAt || visit.visit_date,
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

  if (visit.link_status === "none" || visit.link_status === "expired") {
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
    key: "wait_booking",
    label: "예약 대기",
    detail: "예약 시간 흐름을 지켜보면 됩니다.",
    tone: "muted",
    priority: 90,
    at: visit.visit_date,
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

export function buildTikiDeskFlow(visits = [], limit = 5) {
  return {
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
    acc.waiting += ["confirm_arrival", "complete_forms", "send_to_room"].includes(action.key) ? 1 : 0;
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
