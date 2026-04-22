import { getRoomReadyQueue, isVisitRoomReady } from "./room-traffic.js";

const HIGH_RISK_PATTERNS = [
  /\b(dizzy|dizziness|faint|breathing|bleeding|severe|numb|swelling)\b/i,
  /(어지럽|숨|출혈|피가|붓기|저리|심하게)/,
];

const MEDIUM_RISK_PATTERNS = [
  /\b(pain|hurt|normal|okay|safe|allergy)\b/i,
  /(아프|괜찮|정상|안전|알레르기)/,
];

const INSTRUCTION_PATTERNS = [
  /\b(close|closed|open|wait|sit|breathe|turn)\b/i,
  /(감아|기다|앉|호흡|돌아)/,
];

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function takeFirstSentence(text = "") {
  return compactText(text).split(/(?<=[.!?。！？])/)[0] || compactText(text);
}

function inferSensitivity(text) {
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      level: "high",
      tag: "clinician_check",
      reason: "symptom_heavy",
    };
  }
  if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      level: "medium",
      tag: "caution",
      reason: "medical_uncertainty",
    };
  }
  return {
    level: "low",
    tag: "routine",
    reason: "guided_room_phrase",
  };
}

function summarizeIntent(text, sensitivity) {
  const normalized = compactText(text);
  if (!normalized) return "Patient message captured.";
  if (sensitivity.reason === "symptom_heavy") {
    if (/\b(dizzy|dizziness)\b/i.test(normalized)) {
      return `Patient is reporting dizziness during the procedure: ${takeFirstSentence(normalized).toLowerCase()}`;
    }
    return `Patient is reporting possible procedure-related symptoms: ${takeFirstSentence(normalized).toLowerCase()}`;
  }
  if (INSTRUCTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return `Patient is asking for immediate in-room instruction: ${takeFirstSentence(normalized).toLowerCase()}`;
  }
  return `Patient intent: ${takeFirstSentence(normalized)}`;
}

function buildRecommendedResponses({ sensitivity, procedureName, visitStage, patientLang, rawText }) {
  const procedure = procedureName || "today's procedure";
  const lang = patientLang || "en";
  const wantsInstruction = INSTRUCTION_PATTERNS.some((pattern) => pattern.test(rawText || ""));
  const responses = [];

  if (sensitivity.level === "high") {
    responses.push(
      {
        response_type: "pause_check",
        label: "Pause and Check",
        text: "잠시 멈추고 상태를 먼저 확인하겠습니다.",
        patient_language: lang,
      },
      {
        response_type: "instruction",
        label: "Breathing Instruction",
        text: "움직이지 말고 천천히 호흡해 주세요. 먼저 상태를 보겠습니다.",
        patient_language: lang,
      },
      {
        response_type: "safe_alternative",
        label: "Reassure Carefully",
        text: "말씀해 주셔서 감사합니다. 계속 진행하기 전에 상태를 확인하겠습니다.",
        patient_language: lang,
      },
      {
        response_type: "clinician_check",
        label: "Clinician Review",
        text: "지금은 의료진 확인 후에 계속 진행하겠습니다.",
        patient_language: lang,
      },
    );
    return responses;
  }

  if (wantsInstruction) {
    responses.push({
      response_type: "instruction",
      label: "Simple Instruction",
      text: `${procedure} 진행을 위해 다음 안내를 따라 주세요.`,
      patient_language: lang,
    });
  }

  responses.push(
    {
      response_type: wantsInstruction ? "instruction" : "primary_response",
      label: "Primary Response",
      text: "네, 지금 단계별로 안내드리겠습니다.",
      patient_language: lang,
    },
    {
      response_type: "safe_alternative",
      label: "Safe Alternative",
      text: `${procedure} 진행 중 불편하거나 이상한 느낌이 있으면 바로 말씀해 주세요.`,
      patient_language: lang,
    },
    {
      response_type: "instruction",
      label: "Action Cue",
      text: visitStage === "treatment"
        ? "잠시 가만히 계시고 제 안내에 따라 주세요."
        : "다음 단계를 준비하는 동안 잠시만 기다려 주세요.",
      patient_language: lang,
    },
    {
      response_type: "clinician_check",
      label: "Clinician Check",
      text: "예상과 다른 증상이면 잠시 멈추고 다시 확인하겠습니다.",
      patient_language: lang,
    },
  );

  if (responses.length > 4) {
    return [responses[0], responses[2], responses[3], responses[4]];
  }
  return responses.slice(0, 4);
}

export function buildRoomPrepPayload({ patient = {}, visit = {}, procedure = {}, latestEscalation = null }) {
  const procedureName = procedure.name_ko || procedure.name_en || "미지정";
  const concern = compactText(visit.notes || patient.notes || latestEscalation?.patient_visible_status_text || "No specific concern captured.");
  const cautionPoints = [
    ...(patient.flag ? [patient.flag] : []),
    ...((procedure.cautions_ko || []).slice(0, 2)),
    ...((visit.internal_tags || []).slice(0, 2)),
  ].filter(Boolean);

  return {
    patient_name: patient.name || "(이름 없음)",
    patient_language: patient.lang || "ko",
    patient_flag: patient.flag || null,
    procedure_name: procedureName,
    visit_stage: visit.stage || "booked",
    concern,
    caution_points: cautionPoints.slice(0, 3),
    forms_status: {
      intake_done: Boolean(visit.intake_done),
      consent_done: Boolean(visit.consent_done),
      followup_done: Boolean(visit.followup_done),
    },
  };
}

export function analyzeRoomLiveInput({
  text,
  patientLang = "en",
  visitStage = "treatment",
  procedureName = "",
}) {
  const raw = compactText(text);
  const sensitivity = inferSensitivity(raw);

  return {
    intent_summary: summarizeIntent(raw, sensitivity),
    raw_preview: raw,
    translated_preview: raw,
    sensitivity,
    recommended_responses: buildRecommendedResponses({
      sensitivity,
      procedureName,
      visitStage,
      patientLang,
      rawText: raw,
    }),
  };
}

export function pickNextRoomCandidate({ roomId, visits = [] }) {
  const preassigned = visits
    .filter((visit) => visit.room_id === roomId && visit.room_cleared_at)
    .filter((visit) => isVisitRoomReady(visit))
    .sort((a, b) => new Date(a.checked_in_at || 0).getTime() - new Date(b.checked_in_at || 0).getTime());

  if (preassigned.length > 0) return preassigned[0];
  return getRoomReadyQueue(visits)[0] || null;
}
