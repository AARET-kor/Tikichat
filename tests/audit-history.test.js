import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuditHistoryResponse,
  normalizeAuditHistoryRows,
} from "../src/lib/audit-history.js";

test("normalizeAuditHistoryRows combines journey events and audit logs into a compact staff shape", () => {
  const items = normalizeAuditHistoryRows({
    journeyEvents: [{
      id: "journey-1",
      event_type: "room_cleared",
      created_at: "2026-04-23T10:00:00.000Z",
      actor_type: "staff",
      actor_id: "user-1",
      patient_id: "patient-1",
      visit_id: "visit-1",
      payload: { current_status: "room_cleared" },
    }],
    auditLogs: [{
      id: "audit-1",
      event_type: "clinic_rule_config_updated",
      created_at: "2026-04-23T10:05:00.000Z",
      status: "success",
      channel: "dashboard",
      query_type: "clinic_rule_config",
      patient_id: null,
      error_message: JSON.stringify({
        actor_user_id: "user-2",
        changed_paths: ["rooms.room_ready.require_consent_done"],
      }),
    }],
  });

  assert.deepEqual(items.map((item) => item.source), ["audit", "journey"]);
  assert.equal(items[0].event_type, "clinic_rule_config_updated");
  assert.equal(items[0].actor_id, "user-2");
  assert.deepEqual(items[0].changed_paths, ["rooms.room_ready.require_consent_done"]);
  assert.equal(items[1].event_type, "room_cleared");
  assert.equal(items[1].actor_type, "staff");
});

test("buildAuditHistoryResponse caps limits conservatively", () => {
  const response = buildAuditHistoryResponse({
    journeyEvents: Array.from({ length: 40 }, (_, index) => ({
      id: `journey-${index}`,
      event_type: "event",
      created_at: new Date(2026, 3, 23, 10, index).toISOString(),
    })),
    auditLogs: [],
    requestedLimit: 200,
  });

  assert.equal(response.limit, 50);
  assert.equal(response.items.length, 40);
  assert.equal(response.summary.total, 40);
});
