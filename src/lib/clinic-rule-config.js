const DEFAULT_CLINIC_RULE_CONFIG = {
  ask: {
    quick_prompts: {
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
    },
    fallback_copy: {
      ko: {
        fallback: "TikiBell이 지금 바로 단정해서 안내드리기보다, 병원 확인이 필요한 내용입니다. 안전을 위해 스태프 또는 담당 의료진 확인을 권장드립니다.",
        escalate: "TikiBell이 안전을 위해 스태프 또는 담당 의료진이 확인할 수 있도록 바로 전달하겠습니다.",
      },
      en: {
        fallback: "TikiBell needs clinic confirmation rather than giving a definite answer here. For safety, please ask staff or the clinician to confirm.",
        escalate: "For safety, TikiBell will pass this to staff or the clinician for review.",
      },
    },
    escalation_labels: {
      coordinator: { ko: "코디네이터", en: "coordinator" },
      nurse: { ko: "간호팀", en: "nurse" },
      doctor_confirmation: { ko: "의사 확인", en: "doctor confirmation" },
    },
  },
  rooms: {
    room_ready: {
      require_checked_in: true,
      require_intake_done: true,
      require_consent_done: true,
      allowed_stages: ["pre_visit", "treatment", "post_care"],
    },
  },
  patient_portal: {
    tasks: {
      show_aftercare_due: true,
      show_aftercare_ack: true,
      show_safe_return: true,
    },
  },
};

function clone(value) {
  return structuredClone(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeRuleConfig(base, override) {
  if (!isPlainObject(base)) {
    return override === undefined ? clone(base) : clone(override);
  }

  const result = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(override || {})]);

  for (const key of keys) {
    const baseValue = base?.[key];
    const overrideValue = override?.[key];

    if (overrideValue === undefined) {
      result[key] = clone(baseValue);
      continue;
    }

    if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
      result[key] = clone(overrideValue);
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = mergeRuleConfig(baseValue, overrideValue);
      continue;
    }

    result[key] = clone(overrideValue);
  }

  return result;
}

export function getDefaultClinicRuleConfig() {
  return clone(DEFAULT_CLINIC_RULE_CONFIG);
}

export function extractClinicRuleOverrides(settings = {}) {
  if (!isPlainObject(settings)) return {};
  const overrides = settings.tikidoc_rules;
  return isPlainObject(overrides) ? overrides : {};
}

export function resolveClinicRuleConfig(settings = {}) {
  const defaults = getDefaultClinicRuleConfig();
  const overrides = extractClinicRuleOverrides(settings);
  return mergeRuleConfig(defaults, overrides);
}

export function applyClinicRulePatchToSettings(settings = {}, patch = {}) {
  const baseSettings = isPlainObject(settings) ? clone(settings) : {};
  const currentOverrides = extractClinicRuleOverrides(baseSettings);
  const nextOverrides = mergeRuleConfig(currentOverrides, patch);
  return {
    ...baseSettings,
    tikidoc_rules: nextOverrides,
  };
}

export async function loadClinicRuleConfig(sb, clinicId) {
  if (!sb || !clinicId) {
    return getDefaultClinicRuleConfig();
  }

  const { data, error } = await sb
    .from("clinics")
    .select("settings")
    .eq("id", clinicId)
    .maybeSingle();

  if (error) throw error;
  return resolveClinicRuleConfig(data?.settings || {});
}
