import test from "node:test";
import assert from "node:assert/strict";

import { buildEscalationUpdateForAction } from "../src/lib/escalation-service.js";

test("buildEscalationUpdateForAction stamps actor fields for acknowledge/respond/resolve/close", () => {
  const acknowledge = buildEscalationUpdateForAction({
    currentStatus: "requested",
    action: "acknowledge",
    escalation_type: "symptom_concern",
    patientLang: "en",
    assigned_role: "nurse",
    assigned_user_id: null,
    staff_user_id: "11111111-1111-1111-1111-111111111111",
  });
  assert.equal(acknowledge.acknowledged_by, "11111111-1111-1111-1111-111111111111");

  const responded = buildEscalationUpdateForAction({
    currentStatus: "acknowledged",
    action: "respond",
    escalation_type: "symptom_concern",
    patientLang: "en",
    assigned_role: "nurse",
    assigned_user_id: null,
    staff_user_id: "22222222-2222-2222-2222-222222222222",
  });
  assert.equal(responded.responded_by, "22222222-2222-2222-2222-222222222222");

  const resolved = buildEscalationUpdateForAction({
    currentStatus: "responded",
    action: "resolve",
    escalation_type: "symptom_concern",
    patientLang: "en",
    assigned_role: "nurse",
    assigned_user_id: null,
    staff_user_id: "33333333-3333-3333-3333-333333333333",
  });
  assert.equal(resolved.resolved_by, "33333333-3333-3333-3333-333333333333");

  const closed = buildEscalationUpdateForAction({
    currentStatus: "resolved",
    action: "close",
    escalation_type: "symptom_concern",
    patientLang: "en",
    assigned_role: "nurse",
    assigned_user_id: null,
    staff_user_id: "44444444-4444-4444-4444-444444444444",
  });
  assert.equal(closed.closed_by, "44444444-4444-4444-4444-444444444444");
});

test("buildEscalationUpdateForAction allows idempotent staff clicks for handled states", () => {
  const acknowledgeHandled = buildEscalationUpdateForAction({
    currentStatus: "resolved",
    action: "acknowledge",
    escalation_type: "billing_or_booking",
    patientLang: "zh",
    assigned_role: "coordinator",
    assigned_user_id: null,
    staff_user_id: "55555555-5555-5555-5555-555555555555",
  });
  assert.equal(acknowledgeHandled.status, "resolved");

  const resolveHandled = buildEscalationUpdateForAction({
    currentStatus: "resolved",
    action: "resolve",
    escalation_type: "billing_or_booking",
    patientLang: "zh",
    assigned_role: "coordinator",
    assigned_user_id: null,
    staff_user_id: "66666666-6666-6666-6666-666666666666",
  });
  assert.equal(resolveHandled.status, "resolved");
});
