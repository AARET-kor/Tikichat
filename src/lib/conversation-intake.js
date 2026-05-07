const ALLOWED_STATUSES = new Set(["draft", "pending_review", "converted", "linked", "dismissed", "failed"]);
const RISK_STORAGE_MAP = {
  none: "normal",
  low: "normal",
  medium: "attention",
  high: "urgent",
  normal: "normal",
  attention: "attention",
  urgent: "urgent",
  unknown: "unknown",
};
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

function cleanString(value, max = 1000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function cleanArray(value, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item, 160)).filter(Boolean).slice(0, maxItems);
}

function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function normalizeRiskForStorage(value) {
  return RISK_STORAGE_MAP[cleanString(value, 40)] || "normal";
}

function intakeLanguage(intake = {}) {
  return cleanString(intake.parsed_language || intake.detected_language, 80);
}

function intakeProcedureInterests(intake = {}) {
  return cleanArray(intake.parsed_procedure_interests || intake.visit_candidate?.procedure_interests);
}

function intakeLastIntent(intake = {}) {
  return cleanString(intake.last_patient_intent || intake.last_intent, 500);
}

export function normalizeConversationIntakePayload(input = {}) {
  const analysis = cleanObject(input.analysis);
  const source = cleanObject(input.source);

  const source_channel = cleanString(source.channel || input.source_channel || "manual", 80) || "manual";
  const source_handle = cleanString(source.handle || input.source_handle, 160);
  const source_phone = cleanString(source.phone || input.source_phone, 80);
  const source_memo = cleanString(source.memo || input.source_memo, 500);
  const raw_text = cleanString(input.raw_text || input.rawText || analysis.extracted_text, 8000);
  const patient_candidate = {
    ...cleanObject(input.patient_candidate),
    ...(source_handle && !cleanObject(input.patient_candidate).source_handle ? { source_handle } : {}),
    ...(source_phone && !cleanObject(input.patient_candidate).phone ? { phone: source_phone } : {}),
    ...(source_memo ? { source_memo } : {}),
  };

  const risk_level = normalizeRiskForStorage(analysis.risk_level || input.risk_level);
  const procedure_interests = cleanArray(analysis.procedure_interests);
  const missing_fields = cleanArray(input.missing_fields, 20);
  if (!patient_candidate.name) missing_fields.push("patient_name");
  if (!cleanObject(input.visit_candidate).visit_date) missing_fields.push("visit_date");
  const detected_language = cleanString(analysis.detected_language || input.detected_language || input.parsed_language, 80);

  return {
    status: ALLOWED_STATUSES.has(input.status) ? input.status : "pending_review",
    source_channel,
    source_handle,
    raw_text,
    input_type: cleanString(input.input_type || "text", 40) || "text",
    detected_language,
    summary: cleanString(analysis.summary || input.summary, 1000),
    last_intent: cleanString(analysis.last_message_intent || analysis.intent || input.last_intent, 500),
    patient_candidate,
    visit_candidate: {
      ...cleanObject(input.visit_candidate),
      procedure_interests,
    },
    risk_level,
    risk_flags: cleanArray(analysis.risk_flags || input.risk_flags, 20),
    recommended_replies: analysis.options || input.recommended_replies || [],
    missing_fields: [...new Set(missing_fields)].slice(0, 20),
    next_suggested_action: cleanString(
      input.next_suggested_action
        || (risk_level === "urgent" ? "staff_review_before_reply" : "create_or_link_patient"),
      120,
    ),
  };
}

export function buildConversationIntakeInsert({ clinic_id, created_by, payload }) {
  const normalized = normalizeConversationIntakePayload(payload);
  return {
    clinic_id,
    created_by: created_by || null,
    ...normalized,
  };
}

function buildChannelRefs(intake = {}) {
  const patientCandidate = cleanObject(intake.patient_candidate);
  const channel = cleanString(intake.source_channel || "manual", 80) || "manual";
  const handle = cleanString(intake.source_handle || patientCandidate.source_handle || patientCandidate.handle, 160);
  const phone = cleanString(intake.source_phone || patientCandidate.phone, 80);
  const memo = cleanString(intake.source_memo || patientCandidate.source_memo, 500);
  if (!handle && !phone && !memo) return {};
  return {
    [channel]: {
      ...(handle ? { handle } : {}),
      ...(phone ? { phone } : {}),
      ...(memo ? { memo } : {}),
    },
  };
}

function buildIntakeNotes(intake = {}, overrideNotes = "") {
  const procedureInterests = intakeProcedureInterests(intake);
  const parts = [
    "TikiPaste 상담 유입",
    intakeLastIntent(intake),
    procedureInterests.length
      ? `관심 시술: ${procedureInterests.join(", ")}`
      : "",
    cleanString(intake.raw_text, 1200),
    cleanString(overrideNotes, 800),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 3000);
}

export function buildConversationIntakeConversionPlan({ intake = {}, payload = {} }) {
  const mode = payload.mode === "link_existing" ? "link_existing" : "create_patient";
  const patientCandidate = cleanObject(intake.patient_candidate);
  const visitCandidate = cleanObject(intake.visit_candidate);
  const payloadPatient = cleanObject(payload.patient);
  const payloadVisit = cleanObject(payload.visit);
  const languageCode = cleanString(payloadPatient.lang || patientCandidate.lang || LANGUAGE_TO_CODE[intakeLanguage(intake)], 20) || null;
  const visitDate = cleanString(payloadVisit.visitDate || payloadVisit.visit_date || visitCandidate.visit_date, 80) || null;
  const procedureInterests = cleanArray(
    payloadVisit.procedure_interests || visitCandidate.procedure_interests || intakeProcedureInterests(intake),
  );
  const notes = buildIntakeNotes(intake, payloadVisit.notes || payloadVisit.internal_notes);

  if (mode === "link_existing") {
    const patientId = cleanString(payload.patientId || payload.patient_id, 120);
    if (!patientId) throw new Error("patientId required");
    return {
      mode,
      patientId,
      patient: null,
      visit: {
        visitDate,
        procedureInterests,
        procedureId: cleanString(payloadVisit.procedureId || payloadVisit.procedure_id, 120) || null,
        notes,
      },
    };
  }

  const name = cleanString(payloadPatient.name || patientCandidate.name, 160);
  if (!name) throw new Error("patient.name required");

  return {
    mode,
    patientId: null,
    patient: {
      name,
      birth_year: payloadPatient.birth_year || patientCandidate.birth_year || null,
      gender: payloadPatient.gender || patientCandidate.gender || null,
      nationality: payloadPatient.nationality || patientCandidate.nationality || null,
      lang: languageCode,
      channel_refs: buildChannelRefs(intake),
      notes,
    },
    visit: {
      visitDate,
      procedureInterests,
      procedureId: cleanString(payloadVisit.procedureId || payloadVisit.procedure_id, 120) || null,
      notes,
    },
  };
}
