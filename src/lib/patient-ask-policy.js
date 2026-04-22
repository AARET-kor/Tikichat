const QUICK_PROMPTS = {
  booked: [
    { id: "prepare_for_visit", text: "What should I prepare?" },
    { id: "complete_forms", text: "Where do I complete forms?" },
    { id: "sign_consent", text: "When do I sign consent?" },
    { id: "check_in_day_of_visit", text: "How do I check in on the day?" },
  ],
  pre_visit: [
    { id: "prepare_for_visit", text: "What should I prepare?" },
    { id: "complete_forms", text: "Where do I complete forms?" },
    { id: "sign_consent", text: "When do I sign consent?" },
    { id: "check_in_day_of_visit", text: "How do I check in on the day?" },
  ],
  arrived: [
    { id: "where_to_wait", text: "Where should I wait?" },
    { id: "next_step", text: "What is the next step?" },
    { id: "how_long", text: "How long will it take?" },
    { id: "forms_complete", text: "Are my forms complete?" },
  ],
  waiting: [
    { id: "where_to_wait", text: "Where should I wait?" },
    { id: "next_step", text: "What is the next step?" },
    { id: "how_long", text: "How long will it take?" },
    { id: "forms_complete", text: "Are my forms complete?" },
  ],
  treatment: [
    { id: "next_step", text: "What is the next step?" },
    { id: "how_long", text: "How long will it take?" },
    { id: "forms_complete", text: "Are my forms complete?" },
    { id: "doctor_confirmation", text: "I need doctor confirmation." },
  ],
  post_care: [
    { id: "normal_discomfort", text: "Is this discomfort normal?" },
    { id: "swelling_duration", text: "How long will swelling last?" },
    { id: "precautions", text: "What precautions should I follow?" },
    { id: "when_to_contact", text: "When should I contact the clinic?" },
  ],
  followup: [
    { id: "normal_discomfort", text: "Is this discomfort normal?" },
    { id: "swelling_duration", text: "How long will swelling last?" },
    { id: "precautions", text: "What precautions should I follow?" },
    { id: "when_to_contact", text: "When should I contact the clinic?" },
  ],
  closed: [
    { id: "when_to_contact", text: "When should I contact the clinic?" },
    { id: "doctor_confirmation", text: "I need doctor confirmation." },
  ],
};

const URGENT_RISK_PATTERNS = [
  "severe bleeding",
  "heavy bleeding",
  "trouble breathing",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "chest pain",
  "passed out",
  "fainted",
  "high fever",
  "응급",
  "숨",
  "호흡",
  "출혈",
  "심하게 붓",
  "고름",
  "열이 나",
  "痛みがひど",
  "出血",
  "呼吸",
  "发烧",
  "呼吸困难",
  "大量出血",
];

const QUESTION_PATTERNS = [
  { type: "urgent_risk", patterns: URGENT_RISK_PATTERNS },
  { type: "doctor_required", patterns: ["doctor", "의사", "원장", "dr.", "doctor confirmation"] },
  { type: "forms_or_consent", patterns: ["form", "consent", "문진", "동의서", "서류", "フォーム", "同意", "表格"] },
  { type: "booking_or_billing", patterns: ["price", "cost", "bill", "booking", "예약 변경", "비용", "결제", "料金", "費用", "预约", "费用"] },
  { type: "procedure_prep", patterns: ["prepare", "prep", "before procedure", "금식", "준비", "주의", "preparation", "事前", "准备"] },
  { type: "aftercare_concern", patterns: ["swelling", "aftercare", "precaution", "recovery", "붓기", "회복", "주의사항", "アフターケア", "腫れ", "恢复"] },
  { type: "symptom_concern", patterns: ["pain", "symptom", "normal?", "discomfort", "아파", "통증", "불편", "증상", "痛み", "症状", "疼", "不舒服"] },
  { type: "logistics", patterns: ["where", "wait", "next step", "how long", "check in", "어디", "대기", "다음", "얼마나", "到哪", "多久", "在哪里"] },
];

export function normalizeVisitStage(visit = {}) {
  if (visit?.patient_arrived_at) return "arrived";
  const stage = visit?.stage || "booked";
  if (stage === "pre_visit" || stage === "booked") return stage;
  if (stage === "post_care" || stage === "followup" || stage === "treatment" || stage === "closed") return stage;
  return "booked";
}

export function getAskQuickPrompts(stage) {
  return QUICK_PROMPTS[stage] || QUICK_PROMPTS.booked;
}

export function classifyAskQuestionType(text = "") {
  const normalized = String(text).trim().toLowerCase();
  if (!normalized) return "uncertain";

  for (const rule of QUESTION_PATTERNS) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))) {
      return rule.type;
    }
  }

  return "uncertain";
}

export function decideAskPolicyResult({
  questionType,
  hasProcedureSource,
  hasFaqSource,
  hasStageSource,
  hasAftercareSource,
}) {
  const hasSupport = Boolean(hasProcedureSource || hasFaqSource || hasStageSource || hasAftercareSource);

  if (questionType === "urgent_risk") return "escalate";
  if (questionType === "doctor_required") return "escalate";
  if (questionType === "symptom_concern") return hasAftercareSource ? "fallback" : "escalate";
  if (questionType === "aftercare_concern") return hasAftercareSource ? "answer" : "fallback";
  if (questionType === "logistics" || questionType === "forms_or_consent" || questionType === "procedure_prep") {
    return hasSupport ? "answer" : "fallback";
  }
  if (questionType === "booking_or_billing") return hasFaqSource || hasStageSource ? "answer" : "fallback";
  return hasSupport ? "fallback" : "fallback";
}
