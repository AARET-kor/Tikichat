import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDefaultAftercareSteps,
  evaluateAftercareResponse,
  getAftercarePatientAcknowledgement,
} from "../src/lib/aftercare-engine.js";
import {
  buildAftercareOutboundMessage,
  computeAftercareBaseTime,
  isAftercareEligibleVisit,
  pickAftercareDeliveryTarget,
} from "../src/lib/aftercare-service.js";

test("buildDefaultAftercareSteps returns stage-timed checkpoints including 6h, 1d, 3d, 7d", () => {
  const steps = buildDefaultAftercareSteps({
    procedureName: "히알루론산 필러",
    procedureCategory: "filler",
  });

  assert.deepEqual(
    steps.map((step) => step.step_key),
    ["check_6h", "check_24h", "check_72h", "check_168h"],
  );
  assert.deepEqual(
    steps.map((step) => step.trigger_offset_hours),
    [6, 24, 72, 168],
  );
});

test("evaluateAftercareResponse marks severe pain and bleeding as urgent", () => {
  const result = evaluateAftercareResponse({
    pain_level: 9,
    swelling_level: "severe",
    bleeding: true,
    anxiety_level: "high",
    worsening: true,
  });

  assert.equal(result.risk_level, "urgent");
  assert.equal(result.urgent_flag, true);
  assert.equal(result.should_create_escalation, true);
  assert.equal(result.escalation_type, "urgent_risk");
});

test("evaluateAftercareResponse marks moderate swelling as concern and safe patients as return-ready", () => {
  const concern = evaluateAftercareResponse({
    pain_level: 5,
    swelling_level: "moderate",
    bleeding: false,
    anxiety_level: "low",
    worsening: false,
  });
  assert.equal(concern.risk_level, "concern");
  assert.equal(concern.safe_for_return, false);

  const normal = evaluateAftercareResponse({
    pain_level: 1,
    swelling_level: "mild",
    bleeding: false,
    anxiety_level: "low",
    worsening: false,
    satisfaction_score: 5,
  });
  assert.equal(normal.risk_level, "normal");
  assert.equal(normal.safe_for_return, true);
  assert.equal(normal.next_action_type, "return_prompt");
});

test("patient acknowledgement text changes by risk level", () => {
  assert.equal(
    getAftercarePatientAcknowledgement("urgent").includes("contact"),
    true,
  );
  assert.equal(
    getAftercarePatientAcknowledgement("concern").includes("review"),
    true,
  );
  assert.equal(
    getAftercarePatientAcknowledgement("normal").includes("continue"),
    true,
  );
});

test("aftercare eligibility and base time stay explicit", () => {
  assert.equal(
    isAftercareEligibleVisit({
      id: "visit-1",
      procedure_id: "proc-1",
      stage: "post_care",
    }),
    true,
  );

  assert.equal(
    isAftercareEligibleVisit({
      id: "visit-2",
      procedure_id: null,
      stage: "post_care",
    }),
    false,
  );

  assert.equal(
    computeAftercareBaseTime({
      room_cleared_at: "2026-04-20T12:00:00.000Z",
      updated_at: "2026-04-20T13:00:00.000Z",
    }),
    "2026-04-20T12:00:00.000Z",
  );
});

test("aftercare delivery target prefers explicit supported channels conservatively", () => {
  assert.deepEqual(
    pickAftercareDeliveryTarget({
      whatsapp: "+82 10-1234-5678",
      instagram: "igsid_1",
      phone: "+82 10-9876-5432",
    }),
    {
      channel: "whatsapp",
      recipient: "821012345678",
      sent_via: "whatsapp",
    },
  );

  assert.deepEqual(
    pickAftercareDeliveryTarget({
      instagram: "igsid_1",
      phone: "+82 10-9876-5432",
    }),
    {
      channel: "instagram",
      recipient: "igsid_1",
      sent_via: null,
    },
  );

  assert.deepEqual(
    pickAftercareDeliveryTarget({
      phone: "+82 10-9876-5432",
    }),
    {
      channel: "sms",
      recipient: "01098765432",
      sent_via: "sms",
    },
  );

  assert.equal(
    pickAftercareDeliveryTarget({
      email: "patient@example.com",
      line: "line-id",
    }),
    null,
  );
});

test("aftercare outbound message stays template-based and routes back to My Tiki", () => {
  const text = buildAftercareOutboundMessage({
    contentTemplate: "Day 1 filler check. Mild swelling or bruising can occur.",
    portalUrl: "https://app.tikidoc.xyz/t/token123",
  });

  assert.equal(
    text,
    "Day 1 filler check. Mild swelling or bruising can occur.\n\nOpen your My Tiki follow-up here: https://app.tikidoc.xyz/t/token123",
  );
});
