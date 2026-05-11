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

export function getDeskPrimaryCta(action = {}, visit = {}) {
  if (["active", "sent", "opened"].includes(visit.link_status) && visit.link?.url) {
    return {
      type: "copy_my_tiki_link",
      label: "링크 복사",
      helper: "이미 발급된 My Tiki 링크를 복사합니다",
    };
  }

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
  };

  return ctas[actionKey] || {
    type: "focus_visit",
    label: "방문 확인",
    helper: "방문 행으로 이동합니다",
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

export function buildVisitStatusBadges(visit = {}) {
  const hasLink = ["active", "opened"].includes(visit.link_status);
  const linkOpened = visit.link_status === "opened";
  const arrived = Boolean(visit.patient_arrived_at || visit.checked_in_at);
  const roomReady = typeof visit.room_ready === "boolean"
    ? visit.room_ready
    : Boolean(visit.checked_in_at && visit.intake_done && visit.consent_done);
  const inRoom = Boolean(visit.room_id || visit.room);
  const aftercareActive = visit.stage === "post_care" || Boolean(visit.followup_done);

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
      label: "사후",
      state: visit.followup_done ? "done" : aftercareActive ? "active" : "waiting",
      helper: visit.followup_done ? "사후관리 완료" : aftercareActive ? "사후관리 진행" : "시술 후 확인",
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
