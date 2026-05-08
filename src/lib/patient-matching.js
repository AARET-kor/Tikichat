const LANGUAGE_TO_CODE = {
  "한국어": "ko",
  "영어": "en",
  "일본어": "ja",
  "중국어": "zh",
  "아랍어": "ar",
  "태국어": "th",
  "베트남어": "vi",
  "러시아어": "ru",
};

function cleanString(value, max = 300) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function normalizeLoose(value) {
  return cleanString(value, 300).toLowerCase().replace(/\s+/g, "");
}

function normalizeNameText(value) {
  return cleanString(value, 300)
    .toLowerCase()
    .replace(/[()[\]{}·,./_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sortedNameKey(value) {
  return normalizeNameText(value)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join("");
}

function compactDate(value) {
  const raw = cleanString(value, 80);
  const parsed = raw ? new Date(raw) : null;
  if (parsed && Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function normalizeDigits(value) {
  return cleanString(value, 80).replace(/[^\d+]/g, "");
}

function flattenRefs(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const item of Object.values(value)) {
    if (item === null || item === undefined) continue;
    if (typeof item === "object") flattenRefs(item, out);
    else out.push(cleanString(item, 300));
  }
  return out;
}

function extractPhone(rawText = "") {
  const text = cleanString(rawText, 8000);
  const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? cleanString(match[0], 80) : "";
}

function uniq(values = []) {
  return [...new Set(values.map((value) => cleanString(value, 120)).filter(Boolean))];
}

export function buildPatientMatchSignals({ analysis = {}, source = {}, raw_text = "" } = {}) {
  const patient = analysis.patient_candidate || {};
  const visit = analysis.visit_candidate || {};
  const name = cleanString(patient.name || analysis.patient_name, 160);
  const phone = cleanString(patient.phone || source.phone || extractPhone(raw_text), 80);
  const handle = cleanString(patient.source_handle || source.handle, 160);
  const lang = cleanString(patient.lang || LANGUAGE_TO_CODE[analysis.detected_language] || "", 20);
  const birth_year = patient.birth_year ? Number(patient.birth_year) : null;
  const visit_date = compactDate(visit.visit_date || analysis.visit_date);

  return {
    name,
    phone,
    handle,
    lang,
    birth_year: Number.isFinite(birth_year) ? birth_year : null,
    visit_date,
    source_channel: cleanString(source.channel, 80),
    search_terms: uniq([name, phone, handle]),
  };
}

export function rankPatientMatches({ candidates = [], signals = {} } = {}) {
  const signalName = normalizeLoose(signals.name);
  const signalNameKey = sortedNameKey(signals.name);
  const signalPhone = normalizeDigits(signals.phone);
  const signalHandle = normalizeLoose(signals.handle);
  const signalVisitDate = compactDate(signals.visit_date);

  return candidates
    .map((patient) => {
      const reasons = [];
      let score = 0;

      const patientName = normalizeLoose(patient.name);
      const patientNameKey = sortedNameKey(patient.name);
      const refs = [
        ...flattenRefs(patient.channel_refs),
        ...flattenRefs(patient.external_refs),
      ];
      const refText = refs.map(normalizeLoose).filter(Boolean);
      const refDigits = refs.map(normalizeDigits).filter(Boolean);

      if (signalPhone && refDigits.some((value) => value.includes(signalPhone) || signalPhone.includes(value))) {
        score += 95;
        reasons.push("전화번호 일치");
      }

      if (signalHandle && refText.some((value) => value === signalHandle || value.includes(signalHandle))) {
        score += 75;
        reasons.push("채널 핸들 일치");
      }

      if (signalName && patientName === signalName) {
        score += 60;
        reasons.push("이름 정확히 일치");
      } else if (signalNameKey && patientNameKey && signalNameKey === patientNameKey) {
        score += 48;
        reasons.push("이름 순서만 다름");
      } else if (signalName && patientName && (patientName.includes(signalName) || signalName.includes(patientName))) {
        score += 35;
        reasons.push("이름 유사");
      }

      if (signals.birth_year && patient.birth_year && Number(signals.birth_year) === Number(patient.birth_year)) {
        score += 22;
        reasons.push("출생연도 일치");
      }

      const patientVisitDates = Array.isArray(patient.recent_visits)
        ? patient.recent_visits.map((visit) => compactDate(visit.visit_date)).filter(Boolean)
        : [];
      if (signalVisitDate && patientVisitDates.includes(signalVisitDate)) {
        score += 18;
        reasons.push("방문일 일치");
      }

      if (signals.lang && patient.lang && signals.lang === patient.lang) {
        score += 5;
        reasons.push("언어 일치");
      }

      const confidence = score >= 90 ? "high" : score >= 55 ? "medium" : score >= 30 ? "low" : "none";
      return {
        patient,
        score,
        confidence,
        reasons,
        safety_note: confidence === "high"
          ? "기존 환자로 연결해도 비교적 안전합니다."
          : confidence === "medium"
            ? "직원이 이름·연락처를 한 번 더 확인해야 합니다."
            : "자동 연결하지 말고 새 환자 또는 보류로 처리하는 편이 안전합니다.",
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}
