import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPatientTodayTasks,
  buildQrImageUrl,
  shouldPollOpsBoard,
} from "../client/src/lib/opsLite.js";

test("shouldPollOpsBoard only enables lightweight polling for today view", () => {
  assert.equal(shouldPollOpsBoard("today"), true);
  assert.equal(shouldPollOpsBoard("week"), false);
  assert.equal(shouldPollOpsBoard("all"), false);
});

test("buildQrImageUrl creates an internal QR image endpoint for a concrete link", () => {
  assert.equal(
    buildQrImageUrl("https://app.tikidoc.xyz/t/abc123"),
    "/api/qr?data=https%3A%2F%2Fapp.tikidoc.xyz%2Ft%2Fabc123",
  );
});

test("buildPatientTodayTasks prioritizes arrival before forms for same-day visit", () => {
  const tasks = buildPatientTodayTasks({
    visit: {
      visit_date: new Date().toISOString(),
      intake_done: false,
      consent_done: false,
      patient_arrived_at: null,
    },
    formsStatus: {
      hasIntake: true,
      hasConsent: true,
    },
    now: new Date().toISOString(),
  });

  assert.deepEqual(
    tasks.map((task) => task.key),
    ["arrival", "intake_form", "consent_form"],
  );
});

test("buildPatientTodayTasks returns a calm ready state when today's tasks are complete", () => {
  const tasks = buildPatientTodayTasks({
    visit: {
      visit_date: new Date().toISOString(),
      intake_done: true,
      consent_done: true,
      patient_arrived_at: new Date().toISOString(),
    },
    formsStatus: {
      hasIntake: true,
      hasConsent: true,
    },
    now: new Date().toISOString(),
  });

  assert.deepEqual(tasks.map((task) => task.key), ["ready"]);
});

test("buildPatientTodayTasks includes aftercare due and clinic acknowledgement when present", () => {
  const tasks = buildPatientTodayTasks({
    visit: {
      visit_date: new Date().toISOString(),
      intake_done: true,
      consent_done: true,
      patient_arrived_at: new Date().toISOString(),
    },
    formsStatus: {
      hasIntake: true,
      hasConsent: true,
    },
    aftercareState: {
      due_items: [{ id: "event-1" }],
      acknowledgement: "A nurse is reviewing your recovery check.",
    },
    now: new Date().toISOString(),
  });

  assert.deepEqual(tasks.map((task) => task.key), ["aftercare_due", "aftercare_ack"]);
});

test("buildPatientTodayTasks includes safe return when recovery is stable", () => {
  const tasks = buildPatientTodayTasks({
    visit: {
      visit_date: new Date().toISOString(),
      intake_done: true,
      consent_done: true,
      patient_arrived_at: new Date().toISOString(),
    },
    formsStatus: {
      hasIntake: true,
      hasConsent: true,
    },
    aftercareState: {
      due_items: [],
      acknowledgement: null,
      safe_for_return: true,
    },
    now: new Date().toISOString(),
  });

  assert.deepEqual(tasks.map((task) => task.key), ["aftercare_return"]);
});

test("buildPatientTodayTasks respects clinic config for patient task visibility", () => {
  const tasks = buildPatientTodayTasks({
    visit: {
      visit_date: new Date().toISOString(),
      intake_done: true,
      consent_done: true,
      patient_arrived_at: new Date().toISOString(),
    },
    formsStatus: {
      hasIntake: true,
      hasConsent: true,
    },
    aftercareState: {
      due_items: [{ id: "event-1" }],
      acknowledgement: "The clinic is reviewing your recovery check.",
      safe_for_return: true,
    },
    clinicRuleConfig: {
      patient_portal: {
        tasks: {
          show_aftercare_due: false,
          show_aftercare_ack: true,
          show_safe_return: false,
        },
      },
    },
    now: new Date().toISOString(),
  });

  assert.deepEqual(tasks.map((task) => task.key), ["aftercare_ack"]);
});
