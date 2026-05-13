const POSITIVE_META = { color: "#16A34A", bg: "#F0FDF4", tone: "positive" };
const NORMAL_META = { color: "#5B72A8", bg: "#EEF2FF", tone: "normal" };
const HIGH_META = { color: "#0F4C75", bg: "#E6F4FF", tone: "high" };
const URGENT_META = { color: "#DC2626", bg: "#FEF2F2", tone: "urgent" };
const NEUTRAL_META = { color: "#6B7280", bg: "#F3F4F6", tone: "neutral" };

export const STAGE_META = {
  booked: { label: "예약 확정", color: "#5B72A8", bg: "#5B72A810" },
  pre_visit: { label: "방문 전", color: "#0F4C75", bg: "#0F4C7510" },
  treatment: { label: "시술 중", color: "#3B6500", bg: "#89E90020" },
  post_care: { label: "애프터케어", color: "#0145F2", bg: "#0145F210" },
  followup: { label: "팔로업", color: "#9B72CF", bg: "#9B72CF10" },
  closed: { label: "완료", color: "#6B7280", bg: "#6B728010" },
};

export const STAGE_ORDER = ["booked", "pre_visit", "treatment", "post_care", "followup", "closed"];

export const LINK_META = {
  none: { label: "미발송", color: "#9CA3AF" },
  active: { label: "발송됨", color: "#5B72A8" },
  opened: { label: "열람됨", color: "#3B6500" },
  expired: { label: "만료됨", color: "#0F4C75" },
  revoked: { label: "폐기됨", color: "#EF4444" },
};

export const ESCALATION_TYPE_LABELS = {
  simple_logistics: "단순 운영 문의",
  billing_or_booking: "예약·결제 문의",
  symptom_concern: "증상 문의",
  aftercare_concern: "애프터케어 문의",
  urgent_risk: "긴급 위험",
  doctor_required: "의료진 확인 필요",
};

export const ESCALATION_STATUS_LABELS = {
  requested: "요청됨",
  assigned: "배정됨",
  acknowledged: "확인 중",
  responded: "답변 처리",
  resolved: "해결됨",
  closed: "종료됨",
};

export const ESCALATION_ROLE_LABELS = {
  coordinator: "코디네이터",
  nurse: "간호팀",
  doctor: "의료진",
  front_desk: "프런트",
};

export const ROOM_TYPE_LABELS = {
  consultation: "상담실",
  vip: "VIP",
  procedure: "시술실",
  care: "케어실",
  other: "기타",
};

export const AFTERCARE_FILTER_LABELS = {
  all: "전체",
  due: "응답 대기",
  responded: "응답 완료",
  concern: "주의",
  urgent: "긴급",
  safe_for_return: "리턴 가능",
};

export const ESCALATION_PRIORITY_META = {
  low: { label: "낮음", ...NEUTRAL_META },
  normal: { label: "보통", ...NORMAL_META },
  high: { label: "높음", ...HIGH_META },
  urgent: { label: "긴급", ...URGENT_META },
};

export const AFTERCARE_RISK_META = {
  normal: { label: "정상", ...POSITIVE_META },
  watch: { label: "관찰", ...HIGH_META },
  concern: { label: "주의", ...HIGH_META },
  urgent: { label: "긴급", ...URGENT_META },
};

export const ARRIVAL_STATE_LABELS = {
  none: "미도착",
  desk_confirmation: "데스크 확인 필요",
  forms_pending: "서류 확인 필요",
  room_ready: "룸 준비",
};

export function getEscalationPriorityMeta(priority) {
  return ESCALATION_PRIORITY_META[priority] || ESCALATION_PRIORITY_META.normal;
}

export function getAftercareRiskMeta(riskLevel) {
  return AFTERCARE_RISK_META[riskLevel] || AFTERCARE_RISK_META.normal;
}

export function getEscalationGroupLabel(groupBy, key) {
  if (groupBy === "priority") return getEscalationPriorityMeta(key).label || key;
  if (groupBy === "role") return ESCALATION_ROLE_LABELS[key] || key;
  return ESCALATION_STATUS_LABELS[key] || key;
}

export function getAftercareGroupLabel(key) {
  return key === "urgent" ? "긴급" : (getAftercareRiskMeta(key).label || key);
}

export function isEscalationUnanswered(item = {}) {
  return item.status === "requested" || item.status === "assigned";
}

export function isAftercareUnanswered(item = {}) {
  return item.response_status === "due" || Boolean(item.sent_at && !item.responded_at);
}

export function getOperationalUrgencyMeta({ kind, priority, riskLevel, urgentFlag, state, roomReady } = {}) {
  if (kind === "escalation") return getEscalationPriorityMeta(priority);
  if (kind === "aftercare") {
    if (urgentFlag) return AFTERCARE_RISK_META.urgent;
    if (riskLevel === "concern") return { ...AFTERCARE_RISK_META.concern, tone: "high" };
    return getAftercareRiskMeta(riskLevel);
  }
  if (kind === "arrival") {
    if (state === "desk_confirmation" || state === "forms_pending") return { label: ARRIVAL_STATE_LABELS[state], ...HIGH_META };
    if (state === "room_ready") return { label: ARRIVAL_STATE_LABELS[state], ...POSITIVE_META };
    return { label: ARRIVAL_STATE_LABELS.none, ...NEUTRAL_META };
  }
  if (kind === "room") {
    if (roomReady) return { label: "룸 준비", ...POSITIVE_META };
    return { label: "준비 전", ...NEUTRAL_META };
  }
  return { label: "보통", ...NORMAL_META };
}
