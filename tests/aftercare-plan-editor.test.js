import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAftercareStepPreview,
  detectAftercareStepSafetyFlags,
  validateAftercareStepPatch,
} from "../src/lib/aftercare-plan-editor.js";

test("buildAftercareStepPreview shows exact patient-facing message and timing", () => {
  assert.deepEqual(
    buildAftercareStepPreview({
      step_key: "check_24h",
      trigger_offset_hours: 24,
      content_template: "Please tell us how swelling feels today.",
      next_action_type: "symptom_check",
    }),
    {
      step_key: "check_24h",
      timing_label: "24h after aftercare starts",
      patient_message: "Please tell us how swelling feels today.",
      next_action_type: "symptom_check",
    },
  );
});

test("detectAftercareStepSafetyFlags marks timing edits as requiring confirmation", () => {
  assert.deepEqual(
    detectAftercareStepSafetyFlags({
      before: { trigger_offset_hours: 24, content_template: "Old", next_action_type: "symptom_check" },
      patch: { trigger_offset_hours: 48, content_template: "New" },
    }),
    {
      requires_timing_confirmation: true,
      changed_fields: ["content_template", "trigger_offset_hours"],
    },
  );
});

test("validateAftercareStepPatch keeps editable scope narrow", () => {
  assert.throws(
    () => validateAftercareStepPatch({ message_template_key: "custom" }),
    /Unknown aftercare step key/,
  );
});
