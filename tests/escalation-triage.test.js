import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEscalationDraft,
  getAllowedStatusTransition,
} from "../src/lib/escalation-triage.js";

test("routes logistics questions to coordinator with normal priority", () => {
  const draft = buildEscalationDraft({
    text: "Where should I wait and are my forms complete?",
    visitStage: "arrived",
    patientLang: "en",
  });

  assert.equal(draft.escalation_type, "simple_logistics");
  assert.equal(draft.priority, "normal");
  assert.equal(draft.assigned_role, "front_desk");
  assert.match(draft.patient_visible_status_text, /reviewing/i);
});

test("routes symptom concern to nurse with high priority", () => {
  const draft = buildEscalationDraft({
    text: "I have pain and swelling after treatment",
    visitStage: "post_care",
    patientLang: "en",
  });

  assert.equal(draft.escalation_type, "aftercare_concern");
  assert.equal(draft.priority, "high");
  assert.equal(draft.assigned_role, "nurse");
});

test("routes urgent risk to nurse with urgent priority", () => {
  const draft = buildEscalationDraft({
    text: "I have severe bleeding and trouble breathing",
    visitStage: "post_care",
    patientLang: "en",
  });

  assert.equal(draft.escalation_type, "urgent_risk");
  assert.equal(draft.priority, "urgent");
  assert.equal(draft.assigned_role, "nurse");
  assert.match(draft.patient_visible_status_text, /urgent/i);
});

test("manual doctor confirmation overrides classification target", () => {
  const draft = buildEscalationDraft({
    text: "I want doctor confirmation",
    visitStage: "treatment",
    patientLang: "en",
    requestType: "doctor_confirmation",
  });

  assert.equal(draft.escalation_type, "doctor_required");
  assert.equal(draft.assigned_role, "doctor");
});

test("status transitions enforce explicit workflow", () => {
  assert.equal(getAllowedStatusTransition("requested", "acknowledge"), "acknowledged");
  assert.equal(getAllowedStatusTransition("acknowledged", "respond"), "responded");
  assert.equal(getAllowedStatusTransition("responded", "resolve"), "resolved");
  assert.equal(getAllowedStatusTransition("resolved", "close"), "closed");
  assert.equal(getAllowedStatusTransition("requested", "close"), null);
});
