import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEscalationAck,
  getPatientAskBootstrap,
} from "../src/lib/patient-ask-service.js";
import { resolveClinicRuleConfig } from "../src/lib/clinic-rule-config.js";

test("getPatientAskBootstrap uses config-aware quick prompts and escalation labels", () => {
  const clinicRuleConfig = resolveClinicRuleConfig({
    tikidoc_rules: {
      ask: {
        quick_prompts: {
          booked: [
            { id: "prepare_for_visit", text: "Bring your passport." },
          ],
        },
        escalation_labels: {
          coordinator: { ko: "프런트", en: "front desk" },
        },
      },
    },
  });

  const bootstrap = getPatientAskBootstrap({
    visit: { stage: "booked" },
    messages: [],
    escalationRequest: null,
    clinicRuleConfig,
  });

  assert.deepEqual(bootstrap.quickPrompts, [
    { id: "prepare_for_visit", text: "Bring your passport." },
  ]);
  assert.equal(bootstrap.escalationOptions[0].label, "front desk");
  assert.equal(bootstrap.escalationOptions[1].label, "nurse");
});

test("buildEscalationAck uses config-aware labels with safe defaults", () => {
  const clinicRuleConfig = resolveClinicRuleConfig({
    tikidoc_rules: {
      ask: {
        escalation_labels: {
          nurse: { ko: "간호 코디", en: "nurse coordinator" },
        },
      },
    },
  });

  assert.equal(
    buildEscalationAck({ lang: "ko", requestType: "nurse", clinicRuleConfig }),
    "TikiBell이 간호 코디 확인 요청을 접수했습니다. 병원에서 확인 후 안내드릴 예정입니다.",
  );

  assert.equal(
    buildEscalationAck({ lang: "en", requestType: "doctor_confirmation", clinicRuleConfig }),
    "TikiBell received your request for doctor confirmation review. The clinic will review it and guide you.",
  );
});
