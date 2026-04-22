import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRoomLiveInput,
  buildRoomPrepPayload,
  pickNextRoomCandidate,
} from "../src/lib/tiki-room.js";

test("buildRoomPrepPayload creates a concise doctor prep card", () => {
  const payload = buildRoomPrepPayload({
    patient: {
      name: "Tanaka Yumi",
      lang: "ja",
      flag: "Latex allergy warning",
      notes: "Sensitive around under-eye filler history",
    },
    visit: {
      stage: "treatment",
      notes: "Worried about swelling before flight tomorrow",
      intake_done: true,
      consent_done: false,
      internal_tags: ["needs-quiet-explanation"],
    },
    procedure: {
      name_ko: "히알루론산 필러",
      cautions_ko: ["혈관 주입 위험", "멍·붓기 설명 필요"],
    },
  });

  assert.equal(payload.patient_name, "Tanaka Yumi");
  assert.equal(payload.patient_language, "ja");
  assert.equal(payload.procedure_name, "히알루론산 필러");
  assert.equal(payload.forms_status.consent_done, false);
  assert.equal(payload.concern.includes("swelling"), true);
  assert.equal(payload.caution_points.length > 0, true);
});

test("analyzeRoomLiveInput marks symptom-heavy utterances as sensitive and returns bounded responses", () => {
  const result = analyzeRoomLiveInput({
    text: "I suddenly feel dizzy and my lips are swelling. Is this dangerous?",
    patientLang: "en",
    visitStage: "treatment",
    procedureName: "Filler",
  });

  assert.equal(result.intent_summary.includes("dizziness"), true);
  assert.equal(result.sensitivity.level, "high");
  assert.equal(result.recommended_responses.length <= 4, true);
  assert.equal(result.recommended_responses.at(-1).response_type, "clinician_check");
});

test("analyzeRoomLiveInput keeps low-risk guidance short and doctor-selectable", () => {
  const result = analyzeRoomLiveInput({
    text: "Should I keep my eyes closed now?",
    patientLang: "en",
    visitStage: "treatment",
    procedureName: "Skin booster",
  });

  assert.equal(result.sensitivity.level, "low");
  assert.equal(result.recommended_responses[0].response_type, "instruction");
  assert.equal(result.recommended_responses.some((item) => item.response_type === "clinician_check"), true);
});

test("pickNextRoomCandidate prefers already-assigned visits for the room before the general ready queue", () => {
  const candidate = pickNextRoomCandidate({
    roomId: "room-1",
    visits: [
      {
        id: "visit-ready",
        room_id: null,
        room_cleared_at: null,
        checked_in_at: "2026-04-22T09:10:00.000Z",
        intake_done: true,
        consent_done: true,
        stage: "pre_visit",
      },
      {
        id: "visit-assigned",
        room_id: "room-1",
        room_cleared_at: "2026-04-22T09:00:00.000Z",
        checked_in_at: "2026-04-22T09:20:00.000Z",
        intake_done: true,
        consent_done: true,
        stage: "pre_visit",
      },
    ],
  });

  assert.equal(candidate.id, "visit-assigned");
});

