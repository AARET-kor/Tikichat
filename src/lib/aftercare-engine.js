function normalizeCategory({ procedureName = "", procedureCategory = "" }) {
  const base = `${procedureCategory} ${procedureName}`.toLowerCase();
  if (base.includes("filler") || base.includes("필러")) return "filler";
  if (base.includes("botox") || base.includes("보톡스")) return "botox";
  if (base.includes("laser") || base.includes("레이저")) return "laser";
  if (base.includes("ulthera") || base.includes("울쎄라")) return "energy";
  return procedureCategory || "generic";
}

const STEP_DEFINITIONS = [
  { step_key: "check_6h", trigger_offset_hours: 6, message_template_key: "care_6h", next_action_type: "symptom_check" },
  { step_key: "check_24h", trigger_offset_hours: 24, message_template_key: "care_24h", next_action_type: "symptom_check" },
  { step_key: "check_72h", trigger_offset_hours: 72, message_template_key: "care_72h", next_action_type: "progress_check" },
  { step_key: "check_168h", trigger_offset_hours: 168, message_template_key: "care_168h", next_action_type: "return_prompt" },
];

const TEMPLATE_LIBRARY = {
  generic: {
    care_6h: "Please check the treated area and tell us if pain, swelling, or bleeding feels stronger than expected.",
    care_24h: "Recovery check for the next day. Mild swelling can happen, but we want to know if symptoms are getting worse.",
    care_72h: "Three-day recovery check. Tell us how the area looks and feels today.",
    care_168h: "Seven-day follow-up. If recovery is stable, we can guide you on the next visit or follow-up timing.",
  },
  filler: {
    care_6h: "After filler, please avoid pressure on the treated area and tell us right away if swelling, pain, or color change feels severe.",
    care_24h: "Day 1 filler check. Mild swelling or bruising can occur. Let us know if pain, swelling, or bleeding is getting worse.",
    care_72h: "Day 3 filler check. Bruising and swelling should be settling. Tell us if the area still feels more swollen than expected.",
    care_168h: "Day 7 filler follow-up. If recovery is stable, we can help with follow-up timing or your next visit.",
  },
  botox: {
    care_6h: "After botox, please avoid rubbing the area and let us know if you have unusual pain, swelling, or dizziness.",
    care_24h: "Day 1 botox check. Mild tenderness can happen, but worsening symptoms should be reviewed by the clinic.",
    care_72h: "Day 3 botox check. We would like to know if the area feels stable and recovery is smooth.",
    care_168h: "Day 7 botox follow-up. If you are doing well, we can guide the next follow-up or return timing.",
  },
};

export function buildDefaultAftercareSteps({ procedureName = "", procedureCategory = "" } = {}) {
  const category = normalizeCategory({ procedureName, procedureCategory });
  return STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    sort_order: index + 1,
    content_template: TEMPLATE_LIBRARY[category]?.[step.message_template_key] || TEMPLATE_LIBRARY.generic[step.message_template_key],
  }));
}

export function evaluateAftercareResponse(payload = {}) {
  const painLevel = Number(payload.pain_level || 0);
  const swelling = String(payload.swelling_level || "none").toLowerCase();
  const bleeding = Boolean(payload.bleeding);
  const worsening = Boolean(payload.worsening);
  const anxiety = String(payload.anxiety_level || "low").toLowerCase();
  const satisfactionScore = Number(payload.satisfaction_score || 0);

  const signals = [];
  if (painLevel >= 8) signals.push("severe_pain");
  if (swelling === "severe") signals.push("severe_swelling");
  if (bleeding) signals.push("bleeding");
  if (worsening) signals.push("worsening");
  if (anxiety === "high") signals.push("high_anxiety");

  let risk_level = "normal";
  if (signals.includes("severe_pain") || signals.includes("severe_swelling") || signals.includes("bleeding")) {
    risk_level = "urgent";
  } else if (painLevel >= 4 || swelling === "moderate" || worsening || anxiety === "medium" || anxiety === "high") {
    risk_level = "concern";
  } else if (painLevel >= 2) {
    risk_level = "watch";
  }

  const should_create_escalation = risk_level === "concern" || risk_level === "urgent";
  const escalation_type = risk_level === "urgent"
    ? "urgent_risk"
    : should_create_escalation
      ? "aftercare_concern"
      : null;

  return {
    risk_level,
    urgent_flag: risk_level === "urgent",
    should_create_escalation,
    escalation_type,
    derived_signals: signals,
    response_status: risk_level === "normal" ? "normal" : risk_level,
    safe_for_return: risk_level === "normal" && satisfactionScore >= 4,
    next_action_type: risk_level === "normal" && satisfactionScore >= 4 ? "return_prompt" : risk_level === "watch" ? "extra_check" : should_create_escalation ? "staff_review" : "continue_plan",
  };
}

export function getAftercarePatientAcknowledgement(riskLevel) {
  if (riskLevel === "urgent") {
    return "Your response needs urgent clinic review. Please contact the clinic immediately if symptoms are severe or worsening.";
  }
  if (riskLevel === "concern") {
    return "The clinic will review your response. Please wait for confirmation from our team.";
  }
  if (riskLevel === "watch") {
    return "Thank you. We recorded your response and will continue to follow your recovery closely.";
  }
  return "Thank you. Your recovery check was recorded and the normal follow-up plan will continue.";
}
