const SPEECH_LANG_MAP = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  ar: "ar-SA",
};

const LANGUAGE_LABELS = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  ar: "Arabic",
};

export function mapRoomSpeechLang(lang = "ko") {
  return SPEECH_LANG_MAP[lang] || SPEECH_LANG_MAP.ko;
}

function languageFamily(locale = "") {
  return String(locale || "").split("-")[0].toLowerCase();
}

export function getSpeechRecognitionConstructor(scope = globalThis) {
  return scope?.SpeechRecognition || scope?.webkitSpeechRecognition || null;
}

export function getSpeechSupport(scope = globalThis) {
  return getSpeechRecognitionConstructor(scope)
    ? { supported: true, reason: null }
    : { supported: false, reason: "speech_recognition_unavailable" };
}

export function getTtsSupport(scope = globalThis) {
  return scope?.speechSynthesis
    ? { supported: true, reason: null }
    : { supported: false, reason: "speech_synthesis_unavailable" };
}

export function resolveTtsVoice({ voices = [], lang = "ko" } = {}) {
  const requestedLang = mapRoomSpeechLang(lang);
  const requestedFamily = languageFamily(requestedLang);
  const label = LANGUAGE_LABELS[requestedFamily] || requestedLang;
  const exact = (voices || []).find((voice) => String(voice.lang || "").toLowerCase() === requestedLang.toLowerCase());
  if (exact) {
    return {
      voice: exact,
      requestedLang,
      spokenLang: exact.lang,
      quality: "exact",
      message: null,
    };
  }

  const family = (voices || []).find((voice) => languageFamily(voice.lang) === requestedFamily);
  if (family) {
    return {
      voice: family,
      requestedLang,
      spokenLang: family.lang,
      quality: "family",
      message: `Using closest available ${label} voice.`,
    };
  }

  return {
    voice: null,
    requestedLang,
    spokenLang: requestedLang,
    quality: "browser_default",
    message: `No matching ${label} voice was found. Browser default playback may sound less natural.`,
  };
}

export function canAnalyzeRoomTranscript({
  currentPatient = null,
  inputText = "",
  busyAction = "",
  voiceState = "idle",
} = {}) {
  return Boolean(currentPatient) && Boolean(String(inputText || "").trim()) && !busyAction && voiceState !== "listening";
}

export function buildRoomInteractionState({
  currentPatient = null,
  voiceState = "idle",
  selectedResponse = null,
  overlayVisible = false,
} = {}) {
  if (!currentPatient) {
    return { key: "empty", label: "No patient loaded", tone: "neutral" };
  }
  if (overlayVisible) {
    return { key: "display_active", label: "Patient display active", tone: "risk" };
  }
  if (voiceState === "listening") {
    return { key: "listening", label: "Listening", tone: "warn" };
  }
  if (selectedResponse?.patient_text) {
    return { key: "response_ready", label: "Response ready", tone: "safe" };
  }
  return { key: "patient_loaded", label: "Patient loaded", tone: "default" };
}
