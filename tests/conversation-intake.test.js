import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConversationIntakeConversionPlan,
  buildConversationIntakeInsert,
  normalizeConversationIntakePayload,
} from "../src/lib/conversation-intake.js";

test("normalizes a TikiPaste result into a pending conversation intake", () => {
  const normalized = normalizeConversationIntakePayload({
    source: {
      channel: "kakao",
      handle: "wangfang2024",
      phone: "+82-10-0000-0000",
      memo: "CRM 상담에서 복사",
    },
    raw_text: "리프팅 관심, 5월 3일 방문 문의",
    analysis: {
      detected_language: "중국어",
      last_message_intent: "리프팅 예약 문의",
      risk_level: "medium",
      procedure_interests: ["리프팅"],
      options: {
        firm: { reply: "가능합니다", ko_translation: "가능합니다" },
      },
    },
    patient_candidate: { name: "Wang Fang" },
    visit_candidate: { visit_date: "2026-05-03" },
  });

  assert.equal(normalized.status, "pending_review");
  assert.equal(normalized.source_channel, "kakao");
  assert.equal(normalized.source_handle, "wangfang2024");
  assert.equal(normalized.detected_language, "중국어");
  assert.deepEqual(normalized.visit_candidate.procedure_interests, ["리프팅"]);
  assert.equal(normalized.last_intent, "리프팅 예약 문의");
  assert.equal(normalized.risk_level, "attention");
  assert.deepEqual(normalized.missing_fields, []);
  assert.equal(normalized.next_suggested_action, "create_or_link_patient");
});

test("adds conservative missing fields without guessing patient or visit", () => {
  const normalized = normalizeConversationIntakePayload({
    raw_text: "Hello, I want botox",
    analysis: {
      detected_language: "영어",
      procedure_interests: ["보톡스"],
      risk_level: "none",
    },
  });

  assert.deepEqual(normalized.missing_fields, ["patient_name", "visit_date"]);
  assert.deepEqual(normalized.patient_candidate, {});
  assert.deepEqual(normalized.visit_candidate.procedure_interests, ["보톡스"]);
});

test("builds an insert scoped to authenticated clinic and actor", () => {
  const insert = buildConversationIntakeInsert({
    clinic_id: "clinic-1",
    created_by: "staff-1",
    payload: {
      raw_text: "문의 내용",
      source: { channel: "manual" },
      analysis: { risk_level: "high" },
    },
  });

  assert.equal(insert.clinic_id, "clinic-1");
  assert.equal(insert.created_by, "staff-1");
  assert.equal(insert.status, "pending_review");
  assert.equal(insert.risk_level, "urgent");
  assert.equal(insert.next_suggested_action, "staff_review_before_reply");
});

test("builds a create-patient conversion plan without guessing missing patient name", () => {
  assert.throws(
    () => buildConversationIntakeConversionPlan({
      intake: {
        raw_text: "리프팅 문의",
        patient_candidate: {},
        visit_candidate: { visit_date: "2026-05-03" },
      },
      payload: { mode: "create_patient", patient: {} },
    }),
    /patient.name required/,
  );

  const plan = buildConversationIntakeConversionPlan({
    intake: {
      raw_text: "리프팅 문의",
      source_channel: "kakao",
      source_handle: "wangfang2024",
      source_phone: "+82",
      source_memo: "CRM 복사",
      parsed_language: "중국어",
      parsed_procedure_interests: ["리프팅"],
      patient_candidate: { name: "Wang Fang", nationality: "중국" },
      visit_candidate: { visit_date: "2026-05-03" },
    },
    payload: { mode: "create_patient", patient: { name: "Wang Fang" } },
  });

  assert.equal(plan.mode, "create_patient");
  assert.equal(plan.patient.name, "Wang Fang");
  assert.equal(plan.patient.lang, "zh");
  assert.equal(plan.visit.visitDate, "2026-05-03");
  assert.equal(plan.visit.notes.includes("TikiPaste 상담 유입"), true);
  assert.deepEqual(plan.patient.channel_refs, {
    kakao: {
      handle: "wangfang2024",
      phone: "+82",
      memo: "CRM 복사",
    },
  });
});

test("preserves extracted patient contact signals as channel refs when staff source fields are blank", () => {
  const plan = buildConversationIntakeConversionPlan({
    intake: {
      raw_text: "Wang Fang / wangfang2024 / +82-10-0000-0000 리프팅 문의",
      source_channel: "kakao",
      source_handle: "",
      source_phone: "",
      parsed_language: "중국어",
      parsed_procedure_interests: ["리프팅"],
      patient_candidate: {
        name: "Wang Fang",
        source_handle: "wangfang2024",
        phone: "+82-10-0000-0000",
      },
      visit_candidate: { visit_date: "2026-05-03" },
    },
    payload: { mode: "create_patient", patient: { name: "Wang Fang" } },
  });

  assert.deepEqual(plan.patient.channel_refs, {
    kakao: {
      handle: "wangfang2024",
      phone: "+82-10-0000-0000",
    },
  });
});

test("builds an existing-patient conversion plan only with an explicit patient id", () => {
  const plan = buildConversationIntakeConversionPlan({
    intake: {
      raw_text: "보톡스 문의",
      parsed_language: "영어",
      parsed_procedure_interests: ["보톡스"],
      visit_candidate: {},
    },
    payload: { mode: "link_existing", patientId: "patient-1" },
  });

  assert.equal(plan.mode, "link_existing");
  assert.equal(plan.patientId, "patient-1");
  assert.equal(plan.patient, null);
  assert.equal(plan.visit.notes.includes("보톡스 문의"), true);
});
