import Anthropic from "@anthropic-ai/sdk";

import {
  classifyAskQuestionType,
  decideAskPolicyResult,
  getAskQuickPrompts,
  normalizeVisitStage,
} from "./patient-ask-policy.js";

const ASK_MODEL = process.env.MODEL_HAIKU || "claude-haiku-4-5-20251001";
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const ESCALATION_OPTIONS = [
  { id: "coordinator", label: "Ask coordinator" },
  { id: "nurse", label: "Ask nurse" },
  { id: "doctor_confirmation", label: "Doctor confirmation needed" },
];

const STAGE_SUMMARIES = {
  booked: {
    title: "Booking confirmed",
    body: "Use Ask for simple preparation and clinic process questions before your visit.",
  },
  pre_visit: {
    title: "Preparing for your visit",
    body: "Ask about forms, consent, arrival timing, and approved pre-visit preparation steps.",
  },
  arrived: {
    title: "You are checked in",
    body: "Ask about waiting, next steps, and whether anything is still pending before treatment.",
  },
  treatment: {
    title: "Visit in progress",
    body: "Ask simple next-step questions. Anything clinically sensitive should be confirmed by staff.",
  },
  post_care: {
    title: "Aftercare support",
    body: "Ask only within approved aftercare guidance. Symptoms that need judgment should be handed off.",
  },
  followup: {
    title: "Follow-up support",
    body: "Use Ask for approved follow-up instructions and to request staff review when needed.",
  },
  closed: {
    title: "Visit completed",
    body: "You can still ask approved follow-up questions or request clinic confirmation.",
  },
};

function getLocalizedProcedureName(procedure, lang) {
  if (!procedure) return null;
  return procedure[`name_${lang}`] || procedure.name_en || procedure.name_ko || null;
}

function getLocalizedFaq(procedure, lang) {
  if (!procedure) return [];
  const raw = procedure[`faq_${lang}`] || procedure.faq_en || procedure.faq_ko || "";
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") return item;
      if (item?.q && item?.a) return `Q: ${item.q} A: ${item.a}`;
      return JSON.stringify(item);
    });
  }
  return String(raw)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getStageGuidance(stage, visit) {
  const rows = [];

  if (stage === "booked" || stage === "pre_visit") {
    rows.push("Patients can complete forms in My Tiki before the visit.");
    rows.push("Consent is completed before treatment, not as a diagnosis step.");
    rows.push("If the patient asks about check-in day process, answer only with clinic workflow guidance.");
  }

  if (stage === "arrived" || stage === "treatment") {
    rows.push("If the patient has arrived, they should wait in the clinic's designated waiting area until staff guidance.");
    rows.push("If forms remain incomplete, direct the patient back to the Forms tab.");
    rows.push("Do not guess waiting times with certainty; frame them as estimates only if the clinic source states them.");
  }

  if (stage === "post_care" || stage === "followup" || stage === "closed") {
    rows.push("Only answer within approved aftercare precautions and contact guidance.");
    rows.push("Do not assess severity or diagnose symptoms.");
    rows.push("If symptoms may need judgment, recommend nurse or doctor confirmation.");
  }

  if (visit?.intake_done === false) rows.push("The intake form is still incomplete.");
  if (visit?.consent_done === false) rows.push("The consent form is still incomplete.");
  if (visit?.followup_done === false && (stage === "post_care" || stage === "followup")) {
    rows.push("The follow-up form is still incomplete.");
  }

  return rows;
}

export function buildAskSourceBundle({ visit, procedure, knowledgeRows, lang }) {
  const stage = normalizeVisitStage(visit);
  const stageGuidance = getStageGuidance(stage, visit);
  const faq = getLocalizedFaq(procedure, lang);
  const procedureName = getLocalizedProcedureName(procedure, lang);
  const procedureSummary = [
    procedureName ? `Procedure: ${procedureName}` : null,
    procedure?.description ? `Description: ${procedure.description}` : null,
    Array.isArray(procedure?.cautions_ko) && procedure.cautions_ko.length
      ? `Cautions: ${procedure.cautions_ko.join(", ")}`
      : null,
  ].filter(Boolean);

  return {
    stage,
    stageGuidance,
    faq,
    procedureSummary,
    knowledge: (knowledgeRows || []).map((row) => row.content).filter(Boolean),
  };
}

export function evaluateAskPolicy({ text, visit, sourceBundle }) {
  const questionType = classifyAskQuestionType(text);
  const result = decideAskPolicyResult({
    questionType,
    hasProcedureSource: sourceBundle.procedureSummary.length > 0 || sourceBundle.knowledge.length > 0,
    hasFaqSource: sourceBundle.faq.length > 0,
    hasStageSource: sourceBundle.stageGuidance.length > 0,
    hasAftercareSource:
      (sourceBundle.stage === "post_care" || sourceBundle.stage === "followup" || sourceBundle.stage === "closed")
      && (sourceBundle.knowledge.length > 0 || sourceBundle.procedureSummary.length > 0),
  });

  return {
    stage: sourceBundle.stage,
    questionType,
    policyResult: result,
  };
}

function getFallbackText({ lang, policyResult, questionType }) {
  const isUrgent = questionType === "urgent_risk";
  const isDoctor = questionType === "doctor_required";

  const texts = {
    ko: {
      fallback: "지금 바로 단정해서 안내드리기보다, 병원 확인이 필요한 내용입니다. 안전을 위해 스태프 또는 담당 의료진 확인을 권장드립니다.",
      escalate: isUrgent
        ? "지금 말씀하신 내용은 빠른 확인이 필요할 수 있습니다. 즉시 병원에 연락하시고, 필요한 경우 응급 진료를 받아 주세요. 아래에서 바로 의료진 확인 요청을 남길 수 있습니다."
        : isDoctor
          ? "이 내용은 담당 의료진 확인이 필요한 질문입니다. 아래에서 바로 확인 요청을 남겨 주세요."
          : "이 질문은 병원 확인이 필요한 내용입니다. 아래에서 스태프 확인 요청을 남겨 주세요.",
    },
    en: {
      fallback: "This question needs clinic confirmation rather than a definite answer here. For safety, please ask staff or the clinician to confirm.",
      escalate: isUrgent
        ? "What you described may need prompt review. Please contact the clinic immediately and seek urgent care if needed. You can request staff review below."
        : isDoctor
          ? "This question needs clinician confirmation. You can request that review below."
          : "This question needs clinic confirmation. You can request staff review below.",
    },
  };

  const dict = texts[lang] || texts.en;
  return policyResult === "escalate" ? dict.escalate : dict.fallback;
}

function buildSourceRefs(sourceBundle) {
  const refs = [];
  if (sourceBundle.stageGuidance.length) refs.push("stage_guidance");
  if (sourceBundle.faq.length) refs.push("approved_faq");
  if (sourceBundle.procedureSummary.length) refs.push("procedure_knowledge");
  if (sourceBundle.knowledge.length) refs.push("knowledge_chunks");
  return refs;
}

function pickSuggestedEscalation(questionType) {
  if (questionType === "urgent_risk" || questionType === "doctor_required") return "doctor_confirmation";
  if (questionType === "aftercare_concern" || questionType === "symptom_concern") return "nurse";
  return "coordinator";
}

async function generateAnswerWithModel({ text, lang, sourceBundle, questionType }) {
  if (!anthropic) return null;

  const sources = [
    ...sourceBundle.stageGuidance.map((item) => `Stage guidance: ${item}`),
    ...sourceBundle.faq.map((item) => `Approved FAQ: ${item}`),
    ...sourceBundle.procedureSummary.map((item) => `Procedure source: ${item}`),
    ...sourceBundle.knowledge.slice(0, 4).map((item) => `Knowledge source: ${item}`),
  ].join("\n");

  const response = await anthropic.messages.create({
    model: ASK_MODEL,
    max_tokens: 220,
    system: `You are TikiDoc My Tiki Ask, a protocol-based clinic assistant.
Respond only using the provided approved sources.
Do not diagnose. Do not reassure beyond the source. Do not invent details.
If the sources are insufficient, say that clinic confirmation is needed.
Reply in ${lang}.
Keep it under 4 short sentences.
Question type: ${questionType}.`,
    messages: [
      {
        role: "user",
        content: `Patient question: ${text}\n\nApproved sources:\n${sources}`,
      },
    ],
  });

  return response.content.find((block) => block.type === "text")?.text?.trim() || null;
}

export async function generateAskAssistantPayload({ text, lang, visit, procedure, knowledgeRows }) {
  const sourceBundle = buildAskSourceBundle({ visit, procedure, knowledgeRows, lang });
  const policy = evaluateAskPolicy({ text, visit, sourceBundle });
  const sourceRefs = buildSourceRefs(sourceBundle);
  const suggestedEscalation = pickSuggestedEscalation(policy.questionType);

  let assistantText = null;
  if (policy.policyResult === "answer") {
    assistantText = await generateAnswerWithModel({
      text,
      lang,
      sourceBundle,
      questionType: policy.questionType,
    });
  }

  if (!assistantText) {
    assistantText = getFallbackText({
      lang,
      policyResult: policy.policyResult,
      questionType: policy.questionType,
    });
  }

  return {
    ...policy,
    assistantText,
    sourceRefs,
    suggestedEscalation,
  };
}

export function getPatientAskBootstrap({ visit, messages, escalationRequest }) {
  const stage = normalizeVisitStage(visit);
  return {
    currentStage: stage,
    stageSummary: STAGE_SUMMARIES[stage] || STAGE_SUMMARIES.booked,
    quickPrompts: getAskQuickPrompts(stage),
    messages: messages || [],
    escalationOptions: ESCALATION_OPTIONS,
    openEscalation: escalationRequest || null,
  };
}

export function buildEscalationAck({ lang, requestType }) {
  const labels = {
    coordinator: { ko: "코디네이터", en: "coordinator" },
    nurse: { ko: "간호팀", en: "nurse" },
    doctor_confirmation: { ko: "의료진", en: "clinician" },
  };
  const label = labels[requestType] || labels.coordinator;

  if (lang === "ko") {
    return `${label.ko} 확인 요청이 접수되었습니다. 병원에서 확인 후 안내드릴 예정입니다.`;
  }
  return `Your request for ${label.en} review has been received. The clinic will review it and guide you.`;
}
