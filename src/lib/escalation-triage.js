const TYPE_TO_ROLE = {
  simple_logistics: "front_desk",
  billing_or_booking: "coordinator",
  symptom_concern: "nurse",
  aftercare_concern: "nurse",
  urgent_risk: "nurse",
  doctor_required: "doctor",
};

const TYPE_TO_PRIORITY = {
  simple_logistics: "normal",
  billing_or_booking: "normal",
  symptom_concern: "high",
  aftercare_concern: "high",
  urgent_risk: "urgent",
  doctor_required: "high",
};

const ACTION_TRANSITIONS = {
  acknowledge: { requested: "acknowledged", assigned: "acknowledged", acknowledged: "acknowledged" },
  assign: { requested: "assigned", assigned: "assigned", acknowledged: "assigned", responded: "assigned" },
  respond: { requested: "responded", assigned: "responded", acknowledged: "responded", responded: "responded" },
  resolve: { requested: "resolved", assigned: "resolved", acknowledged: "resolved", responded: "resolved" },
  close: { resolved: "closed", responded: "closed" },
};

function includesAny(text, patterns) {
  const normalized = String(text || "").toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

export function classifyEscalationType({ text = "", visitStage = "", requestType = null, questionType = null }) {
  if (requestType === "doctor_confirmation" || questionType === "doctor_required") return "doctor_required";
  if (requestType === "nurse" && (visitStage === "post_care" || visitStage === "followup" || visitStage === "closed")) {
    return "aftercare_concern";
  }
  if (requestType === "coordinator") return "billing_or_booking";

  if (includesAny(text, ["severe bleeding", "trouble breathing", "can't breathe", "cannot breathe", "heavy bleeding", "응급", "숨", "호흡", "大量出血", "呼吸困难"])) {
    return "urgent_risk";
  }
  if (includesAny(text, ["doctor confirmation", "doctor", "의사", "원장", "dr."])) {
    return "doctor_required";
  }
  if (includesAny(text, ["price", "cost", "bill", "payment", "booking", "schedule", "예약", "결제", "비용", "料金", "费用"])) {
    return "billing_or_booking";
  }
  if (includesAny(text, ["where", "wait", "next step", "forms", "consent", "check in", "어디", "대기", "서류", "동의서", "表格", "在哪"])) {
    return "simple_logistics";
  }
  if (includesAny(text, ["swelling", "aftercare", "precaution", "recovery", "붓기", "회복", "주의사항", "アフターケア", "恢复"])) {
    return visitStage === "post_care" || visitStage === "followup" || visitStage === "closed"
      ? "aftercare_concern"
      : "symptom_concern";
  }
  if (includesAny(text, ["pain", "symptom", "discomfort", "통증", "증상", "아파", "疼", "不舒服"])) {
    return visitStage === "post_care" || visitStage === "followup" || visitStage === "closed"
      ? "aftercare_concern"
      : "symptom_concern";
  }

  return "simple_logistics";
}

export function buildPatientVisibleStatusText({ escalationType, assignedRole, patientLang = "en", priority }) {
  const ko = {
    front_desk: "프런트 데스크에서 확인 중입니다.",
    coordinator: "코디네이터가 질문을 확인 중입니다.",
    nurse: escalationType === "urgent_risk"
      ? "간호팀이 긴급 우선으로 검토 중입니다."
      : "간호팀 검토가 요청되었습니다.",
    doctor: "의료진 확인이 요청되었습니다.",
  };
  const en = {
    front_desk: "The front desk is reviewing your question.",
    coordinator: "A coordinator is reviewing your question.",
    nurse: escalationType === "urgent_risk"
      ? "A nurse is reviewing this urgently."
      : "A nurse review has been requested.",
    doctor: "Doctor confirmation is being requested.",
  };

  const base = patientLang === "ko" ? ko : en;
  let text = base[assignedRole] || base.coordinator;
  if (patientLang === "ko" && priority === "normal") {
    text += " 보통 약 10분 내 답변을 목표로 합니다.";
  } else if (patientLang !== "ko" && priority === "normal") {
    text += " Expected reply is about 10 minutes.";
  }
  return text;
}

export function buildPatientVisibleProgressText({
  escalationType,
  assignedRole,
  status,
  patientLang = "en",
}) {
  const ko = {
    requested: buildPatientVisibleStatusText({ escalationType, assignedRole, patientLang, priority: "normal" }),
    assigned: assignedRole === "doctor"
      ? "의료진 확인 대기열에 배정되었습니다."
      : `${assignedRole === "nurse" ? "간호팀" : assignedRole === "front_desk" ? "프런트 데스크" : "코디네이터"} 검토 대기열에 배정되었습니다.`,
    acknowledged: assignedRole === "doctor"
      ? "의료진 확인 요청이 접수되어 검토 중입니다."
      : `${assignedRole === "nurse" ? "간호팀" : assignedRole === "front_desk" ? "프런트 데스크" : "코디네이터"}가 현재 확인 중입니다.`,
    responded: "병원에서 답변을 준비 중입니다.",
    resolved: "질문 검토가 완료되었습니다. 필요 시 다시 문의해 주세요.",
    closed: "요청이 종료되었습니다.",
  };
  const en = {
    requested: buildPatientVisibleStatusText({ escalationType, assignedRole, patientLang, priority: "normal" }),
    assigned: assignedRole === "doctor"
      ? "Your request has been placed in the doctor confirmation queue."
      : `Your request has been assigned to the ${assignedRole === "nurse" ? "nurse" : assignedRole === "front_desk" ? "front desk" : "coordinator"} queue.`,
    acknowledged: assignedRole === "doctor"
      ? "Doctor confirmation has been requested and is under review."
      : `The ${assignedRole === "nurse" ? "nurse" : assignedRole === "front_desk" ? "front desk" : "coordinator"} is reviewing your question.`,
    responded: "The clinic is preparing a response.",
    resolved: "This request has been reviewed. Please contact the clinic again if you still need help.",
    closed: "This request has been closed.",
  };

  const dict = patientLang === "ko" ? ko : en;
  return dict[status] || dict.requested;
}

export function buildEscalationDraft({ text = "", visitStage = "", patientLang = "en", requestType = null, questionType = null }) {
  const escalation_type = classifyEscalationType({ text, visitStage, requestType, questionType });
  const assigned_role = TYPE_TO_ROLE[escalation_type];
  const priority = TYPE_TO_PRIORITY[escalation_type];
  const patient_visible_status_text = buildPatientVisibleStatusText({
    escalationType: escalation_type,
    assignedRole: assigned_role,
    patientLang,
    priority,
  });

  return {
    escalation_type,
    priority,
    assigned_role,
    patient_visible_status_text,
    status: "requested",
  };
}

export function getAllowedStatusTransition(currentStatus, action) {
  return ACTION_TRANSITIONS[action]?.[currentStatus] || null;
}
