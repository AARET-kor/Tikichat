import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyAskQuestionType,
  decideAskPolicyResult,
  getAskQuickPrompts,
  normalizeVisitStage,
} from "../src/lib/patient-ask-policy.js";

test("normalizeVisitStage maps arrived patient to arrived stage", () => {
  const stage = normalizeVisitStage({
    stage: "pre_visit",
    patient_arrived_at: "2026-04-22T09:00:00.000Z",
  });

  assert.equal(stage, "arrived");
});

test("getAskQuickPrompts returns pre-visit prompts for booked stage", () => {
  const prompts = getAskQuickPrompts("booked");

  assert.deepEqual(
    prompts.map((p) => p.id),
    [
      "prepare_for_visit",
      "complete_forms",
      "sign_consent",
      "check_in_day_of_visit",
    ],
  );
});

test("classifyAskQuestionType detects urgent risk language", () => {
  const result = classifyAskQuestionType("I have severe bleeding and trouble breathing");

  assert.equal(result, "urgent_risk");
});

test("decideAskPolicyResult escalates urgent risk even with source support", () => {
  const result = decideAskPolicyResult({
    questionType: "urgent_risk",
    hasProcedureSource: true,
    hasFaqSource: true,
    hasStageSource: true,
    hasAftercareSource: true,
  });

  assert.equal(result, "escalate");
});

test("decideAskPolicyResult answers supported logistics questions", () => {
  const result = decideAskPolicyResult({
    questionType: "logistics",
    hasProcedureSource: false,
    hasFaqSource: true,
    hasStageSource: true,
    hasAftercareSource: false,
  });

  assert.equal(result, "answer");
});

test("decideAskPolicyResult falls back on uncertain unsupported questions", () => {
  const result = decideAskPolicyResult({
    questionType: "uncertain",
    hasProcedureSource: false,
    hasFaqSource: false,
    hasStageSource: false,
    hasAftercareSource: false,
  });

  assert.equal(result, "fallback");
});
