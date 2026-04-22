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

test("buildQrImageUrl creates a QR image endpoint for a concrete link", () => {
  assert.equal(
    buildQrImageUrl("https://app.tikidoc.xyz/t/abc123"),
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fapp.tikidoc.xyz%2Ft%2Fabc123",
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
