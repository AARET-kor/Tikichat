import test from "node:test";
import assert from "node:assert/strict";

import { validateClinicRulePatch } from "../src/lib/clinic-rule-config-validate.js";

test("validateClinicRulePatch accepts allowed partial ask and room-ready overrides", () => {
  const result = validateClinicRulePatch({
    ask: {
      quick_prompts: {
        booked: [{ id: "prepare", text: "What should I prepare?" }],
      },
      fallback_copy: {
        en: { fallback: "Please ask staff to confirm." },
      },
    },
    rooms: {
      room_ready: {
        require_consent_done: false,
        allowed_stages: ["pre_visit", "treatment"],
      },
    },
  });

  assert.deepEqual(result.patch.ask.quick_prompts.booked, [{ id: "prepare", text: "What should I prepare?" }]);
  assert.equal(result.patch.rooms.room_ready.require_consent_done, false);
  assert.deepEqual(result.patch.rooms.room_ready.allowed_stages, ["pre_visit", "treatment"]);
  assert.deepEqual(result.changedPaths, [
    "ask.fallback_copy.en.fallback",
    "ask.quick_prompts.booked",
    "rooms.room_ready.allowed_stages",
    "rooms.room_ready.require_consent_done",
  ]);
});

test("validateClinicRulePatch accepts allowed patient portal task overrides", () => {
  const result = validateClinicRulePatch({
    patient_portal: {
      tasks: {
        show_aftercare_due: true,
        show_aftercare_ack: false,
        show_safe_return: true,
      },
    },
  });

  assert.deepEqual(result.patch.patient_portal.tasks, {
    show_aftercare_due: true,
    show_aftercare_ack: false,
    show_safe_return: true,
  });
  assert.deepEqual(result.changedPaths, [
    "patient_portal.tasks.show_aftercare_ack",
    "patient_portal.tasks.show_aftercare_due",
    "patient_portal.tasks.show_safe_return",
  ]);
});

test("validateClinicRulePatch rejects unknown keys and full replace wrapper", () => {
  assert.throws(
    () => validateClinicRulePatch({ tikidoc_rules: {} }),
    /Full replace is forbidden/,
  );
  assert.throws(
    () => validateClinicRulePatch({ ask: { unknown_key: true } }),
    /Unknown config key: ask\.unknown_key/,
  );
  assert.throws(
    () => validateClinicRulePatch({ rooms: { room_ready: { mystery: true } } }),
    /Unknown config key: rooms\.room_ready\.mystery/,
  );
});

test("validateClinicRulePatch rejects invalid value types", () => {
  assert.throws(
    () => validateClinicRulePatch({ rooms: { room_ready: { require_checked_in: "yes" } } }),
    /must be a boolean/,
  );
  assert.throws(
    () => validateClinicRulePatch({ ask: { quick_prompts: { booked: [{ id: "", text: "Hello" }] } } }),
    /cannot be empty/,
  );
  assert.throws(
    () => validateClinicRulePatch({ ask: { fallback_copy: { en: { fallback: 123 } } } }),
    /must be a string/,
  );
  assert.throws(
    () => validateClinicRulePatch({ rooms: { room_ready: { allowed_stages: ["arrived"] } } }),
    /Invalid room-ready stage/,
  );
});

test("validateClinicRulePatch rejects empty patch objects", () => {
  assert.throws(
    () => validateClinicRulePatch({}),
    /cannot be empty/,
  );
});
