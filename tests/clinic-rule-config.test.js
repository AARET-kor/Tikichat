import test from "node:test";
import assert from "node:assert/strict";

import {
  applyClinicRulePatchToSettings,
  extractClinicRuleOverrides,
  getDefaultClinicRuleConfig,
  loadClinicRuleConfig,
  resolveClinicRuleConfig,
} from "../src/lib/clinic-rule-config.js";

test("getDefaultClinicRuleConfig returns the current safe defaults", () => {
  const config = getDefaultClinicRuleConfig();

  assert.equal(config.ask.quick_prompts.booked[0].id, "prepare_for_visit");
  assert.equal(config.rooms.room_ready.require_checked_in, true);
  assert.deepEqual(config.rooms.room_ready.allowed_stages, ["pre_visit", "treatment", "post_care"]);
});

test("extractClinicRuleOverrides only reads settings.tikidoc_rules", () => {
  const overrides = extractClinicRuleOverrides({
    ai_tone: "professional",
    tikidoc_rules: {
      ask: {
        escalation_labels: {
          coordinator: { ko: "프런트", en: "front desk" },
        },
      },
    },
  });

  assert.deepEqual(overrides, {
    ask: {
      escalation_labels: {
        coordinator: { ko: "프런트", en: "front desk" },
      },
    },
  });
});

test("resolveClinicRuleConfig preserves defaults when config is missing", () => {
  const config = resolveClinicRuleConfig({});

  assert.equal(config.ask.quick_prompts.arrived[0].id, "where_to_wait");
  assert.equal(config.ask.fallback_copy.en.escalate, "For safety, TikiBell will pass this to staff or the clinician for review.");
  assert.equal(config.rooms.room_ready.require_consent_done, true);
});

test("resolveClinicRuleConfig deep-merges object overrides and replaces arrays conservatively", () => {
  const config = resolveClinicRuleConfig({
    tikidoc_rules: {
      ask: {
        escalation_labels: {
          coordinator: { ko: "프런트", en: "front desk" },
        },
      },
      rooms: {
        room_ready: {
          allowed_stages: ["pre_visit"],
        },
      },
    },
  });

  assert.equal(config.ask.escalation_labels.coordinator.ko, "프런트");
  assert.equal(config.ask.escalation_labels.nurse.en, "nurse");
  assert.deepEqual(config.rooms.room_ready.allowed_stages, ["pre_visit"]);
  assert.equal(config.rooms.room_ready.require_checked_in, true);
});

test("loadClinicRuleConfig reads clinics.settings and falls back safely", async () => {
  const sb = {
    from(table) {
      assert.equal(table, "clinics");
      return {
        select(selection) {
          assert.equal(selection, "settings");
          return {
            eq(column, value) {
              assert.equal(column, "id");
              assert.equal(value, "clinic-1");
              return {
                maybeSingle: async () => ({
                  data: {
                    settings: {
                      tikidoc_rules: {
                        rooms: {
                          room_ready: {
                            require_consent_done: false,
                          },
                        },
                      },
                    },
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };

  const config = await loadClinicRuleConfig(sb, "clinic-1");

  assert.equal(config.rooms.room_ready.require_consent_done, false);
  assert.equal(config.rooms.room_ready.require_checked_in, true);
  assert.equal(config.ask.quick_prompts.booked[1].id, "complete_forms");
});

test("loadClinicRuleConfig returns defaults when clinicId or client is missing", async () => {
  const fromMissingSb = await loadClinicRuleConfig(null, "clinic-1");
  const fromMissingClinic = await loadClinicRuleConfig({}, "");

  assert.equal(fromMissingSb.rooms.room_ready.require_intake_done, true);
  assert.equal(fromMissingClinic.ask.escalation_labels.doctor_confirmation.en, "doctor confirmation");
});

test("applyClinicRulePatchToSettings merges partial tikidoc_rules overrides without replacing other settings", () => {
  const nextSettings = applyClinicRulePatchToSettings(
    {
      timezone: "Asia/Seoul",
      tikidoc_rules: {
        ask: {
          escalation_labels: {
            coordinator: { ko: "코디네이터", en: "coordinator" },
          },
        },
      },
    },
    {
      rooms: {
        room_ready: {
          require_consent_done: false,
        },
      },
    },
  );

  assert.equal(nextSettings.timezone, "Asia/Seoul");
  assert.equal(nextSettings.tikidoc_rules.ask.escalation_labels.coordinator.en, "coordinator");
  assert.equal(nextSettings.tikidoc_rules.rooms.room_ready.require_consent_done, false);
});
