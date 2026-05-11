const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;

const LANGUAGE_ALIASES = [
  { code: "ko", match: /^(ko|kr|korean|한국어|한글|한국)$/i },
  { code: "zh", match: /^(zh|zh-cn|zh-tw|cn|chinese|中文|중국어|중문|汉语|漢語|普通话|mandarin)$/i },
  { code: "ja", match: /^(ja|jp|japanese|일본어|日本語|にほんご)$/i },
  { code: "en", match: /^(en|english|영어)$/i },
  { code: "vi", match: /^(vi|vietnamese|베트남어|tiếng việt)$/i },
  { code: "th", match: /^(th|thai|태국어|ภาษาไทย)$/i },
  { code: "ar", match: /^(ar|arabic|아랍어|العربية)$/i },
  { code: "ru", match: /^(ru|russian|러시아어|русский)$/i },
];

export function containsHangul(value) {
  return HANGUL_RE.test(String(value || ""));
}

export function normalizeTikiPasteLanguage(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  const exact = LANGUAGE_ALIASES.find(({ match }) => match.test(text) || match.test(lower));
  if (exact) return exact.code;
  if (/중국|中文|chinese|汉语|漢語|mandarin/i.test(text)) return "zh";
  if (/일본|日本|japanese/i.test(text)) return "ja";
  if (/영어|english/i.test(text)) return "en";
  if (/한국|korean/i.test(text)) return "ko";
  return lower.slice(0, 12);
}

function cleanString(value, max = 500) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function cleanArray(value, maxItems = 6) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, maxItems)
    : [];
}

function localizedTopic(lang, procedureInterests = []) {
  let interests = cleanArray(procedureInterests);
  if (lang && lang !== "ko") {
    interests = interests.filter((interest) => !containsHangul(interest));
  }
  if (!interests.length) {
    if (lang === "zh") return "咨询内容";
    if (lang === "ja") return "ご相談内容";
    if (lang === "en") return "your question";
    return "문의 내용";
  }
  return interests.join(lang === "zh" ? "、" : ", ");
}

function buildFallbackReply(lang, variant, { appBaseUrl = "https://app.tikidoc.xyz", procedureInterests = [] } = {}) {
  const topic = localizedTopic(lang, procedureInterests);
  const bookingUrl = `${String(appBaseUrl || "https://app.tikidoc.xyz").replace(/\/+$/, "")}/book`;

  if (lang === "zh") {
    if (variant === "booking") {
      return `您好，感谢您的咨询。关于您提到的${topic}，建议先预约1:1面诊，由医生根据您的情况确认适合的治疗方式、产品选择和恢复时间。[预约: ${bookingUrl}]`;
    }
    if (variant === "firm") {
      return `您好，${topic}的具体效果、流程和恢复期会因个人情况而不同，不能只根据聊天内容确定。请先到院进行1:1咨询，医生确认后会为您说明适合的方案。`;
    }
    return `您好，感谢您的咨询。关于您提到的${topic}，具体的治疗方式、产品选择、效果和恢复时间需要医生面诊后根据您的情况确认。我们可以先帮您安排1:1咨询，再为您说明适合的方案。`;
  }

  if (lang === "ja") {
    if (variant === "booking") {
      return `お問い合わせありがとうございます。${topic}については、まず1:1カウンセリングで医師が状態を確認したうえで、適した施術方法や製剤、回復期間をご案内します。[予約: ${bookingUrl}]`;
    }
    if (variant === "firm") {
      return `${topic}の効果や流れ、回復期間は個人差があるため、メッセージだけでは確定できません。ご来院後、医師の1:1カウンセリングで安全に確認いたします。`;
    }
    return `お問い合わせありがとうございます。${topic}については、施術方法、製剤選択、効果、回復期間を医師の1:1カウンセリング後に確認する必要があります。ご不安な点は来院時に詳しくご案内します。`;
  }

  if (lang === "en") {
    if (variant === "booking") {
      return `Thank you for your message. For ${topic}, the safest next step is a 1:1 consultation so the doctor can confirm the right method, product choice, and recovery expectations for you. [Booking: ${bookingUrl}]`;
    }
    if (variant === "firm") {
      return `For ${topic}, the exact method, result, and recovery time can vary by patient, so we cannot confirm it from chat alone. Please visit for a 1:1 consultation and the doctor will guide you safely.`;
    }
    return `Thank you for reaching out. For ${topic}, the treatment method, product choice, expected result, and recovery time should be confirmed after a 1:1 consultation with the doctor. We can help you check the safest option during your visit.`;
  }

  return "";
}

function normalizeReplyOption(option, fallback = "") {
  if (!option) return { reply: fallback, ko_translation: "" };
  if (typeof option === "string") return { reply: option, ko_translation: "" };
  return {
    ...option,
    reply: cleanString(option.reply || fallback, 3000),
    ko_translation: cleanString(option.ko_translation, 3000),
  };
}

export function ensurePatientLanguageReplies(parsed = {}, options = {}) {
  const lang = normalizeTikiPasteLanguage(parsed.patient_candidate?.lang || parsed.detected_language);
  const procedureInterests = cleanArray(parsed.procedure_interests || parsed.visit_candidate?.procedure_interests);
  const normalized = {
    ...parsed,
    options: {
      kind: normalizeReplyOption(parsed.options?.kind),
      firm: normalizeReplyOption(parsed.options?.firm),
      booking: normalizeReplyOption(parsed.options?.booking),
    },
  };

  if (!lang || lang === "ko") return normalized;

  let applied = false;
  for (const key of ["kind", "firm", "booking"]) {
    const current = normalized.options[key];
    if (!containsHangul(current.reply)) continue;
    normalized.options[key] = {
      ...current,
      reply: buildFallbackReply(lang, key, { ...options, procedureInterests }) || current.reply,
      ko_translation: current.ko_translation || current.reply,
      language_guard: "rewritten_to_patient_language",
    };
    applied = true;
  }

  if (applied) normalized.language_guard_applied = true;
  return normalized;
}

export function formatForeignPatientDisplayName({ name, name_ko, lang } = {}) {
  const original = cleanString(name, 160);
  const koreanName = cleanString(name_ko, 80);
  const langCode = normalizeTikiPasteLanguage(lang);
  if (!original) return "";
  if (/\([^)]{1,80}\)/.test(original)) return original;
  if (!koreanName || !containsHangul(koreanName) || langCode === "ko" || original === koreanName) {
    return original;
  }
  return `${original} (${koreanName})`;
}
