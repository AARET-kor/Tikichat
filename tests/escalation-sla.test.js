import test from "node:test";
import assert from "node:assert/strict";

import {
  attachEscalationSla,
  deriveEscalationSlaState,
  summarizeEscalationCounts,
} from "../src/lib/escalation-service.js";

const NOW = "2026-04-23T12:00:00.000Z";

function minutesAgo(minutes) {
  return new Date(new Date(NOW).getTime() - minutes * 60 * 1000).toISOString();
}

test("urgent active escalations become overdue after the operational SLA window", () => {
  const state = deriveEscalationSlaState({
    priority: "urgent",
    status: "requested",
    opened_at: minutesAgo(16),
  }, { now: NOW });

  assert.equal(state.status, "overdue");
  assert.equal(state.age_minutes, 16);
  assert.equal(state.threshold_minutes, 15);
});

test("high-priority active escalations surface due-soon before they become overdue", () => {
  const state = deriveEscalationSlaState({
    priority: "high",
    status: "assigned",
    opened_at: minutesAgo(25),
  }, { now: NOW });

  assert.equal(state.status, "due_soon");
  assert.equal(state.threshold_minutes, 30);
  assert.equal(state.due_in_minutes, 5);
});

test("handled escalations do not continue to count as overdue", () => {
  const state = deriveEscalationSlaState({
    priority: "urgent",
    status: "acknowledged",
    opened_at: minutesAgo(90),
  }, { now: NOW });

  assert.equal(state.status, "handled");
  assert.equal(state.age_minutes, null);
});

test("summary includes SLA attention counts without changing existing counts", () => {
  const items = attachEscalationSla([
    { id: "one", priority: "urgent", status: "requested", opened_at: minutesAgo(16) },
    { id: "two", priority: "high", status: "assigned", opened_at: minutesAgo(25) },
    { id: "three", priority: "normal", status: "acknowledged", opened_at: minutesAgo(180) },
  ], { now: NOW });

  assert.deepEqual(summarizeEscalationCounts(items, { now: NOW }), {
    open: 3,
    urgent: 1,
    unanswered: 2,
    overdue: 1,
    due_soon: 1,
  });
});
