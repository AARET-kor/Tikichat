import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMemoryPatchUpdate,
  normalizeMemoryPatch,
} from "../src/lib/memory-editor.js";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const memoryUiSource = readFileSync(
  new URL("../client/src/components/insights/InsightsTab.jsx", import.meta.url),
  "utf8",
);

test("normalizeMemoryPatch keeps Memory editing to patient operating context fields", () => {
  const patch = normalizeMemoryPatch({
    ai_summary: "요약",
    procedure_interests: ["리프팅", "리프팅", " "],
    concerns: ["붓기 우려"],
    staff_precautions: ["통역 확인 필요"],
    staff_notes: "CRM raw dump 금지. 필요한 운영 메모만.",
    risk_level: "high",
    risk_flags: [{ type: "allergy", detail: "라텍스 우려", severity: "high" }],
    raw_csv: "should not pass",
  });

  assert.deepEqual(patch.procedure_interests, ["리프팅"]);
  assert.deepEqual(patch.concerns, ["붓기 우려"]);
  assert.deepEqual(patch.staff_precautions, ["통역 확인 필요"]);
  assert.equal(patch.staff_notes, "CRM raw dump 금지. 필요한 운영 메모만.");
  assert.equal(patch.risk_level, "high");
  assert.deepEqual(patch.risk_flags, [{ type: "allergy", detail: "라텍스 우려", severity: "high" }]);
  assert.equal(patch.raw_csv, undefined);
});

test("buildMemoryPatchUpdate stamps actor metadata without changing session counters", () => {
  const update = buildMemoryPatchUpdate({
    patch: {
      ai_summary: "요약",
      procedure_interests: ["보톡스"],
      risk_level: "medium",
    },
    actorId: "staff-1",
  });

  assert.equal(update.update.ai_summary, "요약");
  assert.deepEqual(update.update.procedure_interests, ["보톡스"]);
  assert.equal(update.update.risk_level, "medium");
  assert.equal(update.update.last_edited_by, "staff-1");
  assert.ok(update.update.last_edited_at);
  assert.deepEqual(update.changedFields, ["ai_summary", "procedure_interests", "risk_level"]);
  assert.equal(update.update.session_count, undefined);
});

test("staff Memory edit API is admin-gated, clinic-scoped, and audit-backed", () => {
  assert.match(
    serverSource,
    /app\.patch\(\"\/api\/staff\/memory\/:patientId\", requireStaffAuth, requireRole\(\"owner\", \"admin\"\),/,
  );
  assert.match(serverSource, /const clinic_id = req\.clinic_id;/);
  assert.match(serverSource, /\.eq\(\"clinic_id\", clinic_id\)[\s\S]*?\.eq\(\"id\", patientId\)/);
  assert.match(serverSource, /event_type: "note_added"/);
  assert.match(serverSource, /actor_id: req\.staff_user_id/);
  assert.match(serverSource, /eventType: "memory_updated"/);
});

test("Tiki Memory UI loads real Memory and exposes direct edit controls", () => {
  assert.match(memoryUiSource, /\/api\/staff\/memory/);
  assert.match(memoryUiSource, /MemoryEditPanel/);
  assert.match(memoryUiSource, /환자 케어 정보 수정/);
  assert.match(memoryUiSource, /staff_precautions/);
  assert.match(memoryUiSource, /staff_notes/);
});

test("Tiki Memory UI uses clinic-grade Korean labels for patient context", () => {
  assert.match(memoryUiSource, /환자 케어 정보 수정/);
  assert.match(memoryUiSource, /환자 파악 정보/);
  assert.match(memoryUiSource, /상담·방문 이력/);
  assert.match(memoryUiSource, /컴플레인 가능성/);
  assert.doesNotMatch(memoryUiSource, /추출 컨텍스트/);
  assert.doesNotMatch(memoryUiSource, /대화 타임라인/);
  assert.doesNotMatch(memoryUiSource, /컴플레인 위험도/);
});

test("Tiki Memory edit panel starts from a more readable staff type scale", () => {
  assert.match(memoryUiSource, /fontSize:\s*14,[\s\S]*lineHeight:\s*1\.6/);
  assert.match(memoryUiSource, /labelStyle/);
  assert.doesNotMatch(memoryUiSource, /fontSize:\s*11,\s*fontWeight:\s*800/);
});

test("Tiki Memory patient context cards expose a narrow edit flow without timeline mutation", () => {
  assert.match(memoryUiSource, /PatientContextEditPanel/);
  assert.match(memoryUiSource, /환자 파악 정보 수정/);
  assert.match(memoryUiSource, /savePatientContext/);
  assert.match(memoryUiSource, /procedure_interests/);
  assert.match(memoryUiSource, /staff_precautions/);
  assert.match(memoryUiSource, /risk_flags/);
  assert.doesNotMatch(memoryUiSource, /timeline:\s*splitLines/);
});

test("Tiki Memory timeline correction adds staff notes without mutating timeline items", () => {
  assert.match(memoryUiSource, /TimelineCorrectionPanel/);
  assert.match(memoryUiSource, /타임라인 정정 메모/);
  assert.match(memoryUiSource, /saveTimelineCorrection/);
  assert.match(memoryUiSource, /buildTimelineCorrectionNotes/);
  assert.match(memoryUiSource, /staff_notes:\s*buildTimelineCorrectionNotes/);
  assert.doesNotMatch(memoryUiSource, /session\.summary\s*=/);
  assert.doesNotMatch(memoryUiSource, /sessions:\s*splitLines/);
});

test("Tiki Memory does not flash mock patients while real Memory is loading", () => {
  assert.doesNotMatch(memoryUiSource, /memoryItems\.length\s*>\s*0\s*\?\s*memoryItems\s*:\s*MEMORY_RECORDS/);
  assert.doesNotMatch(memoryUiSource, /예시 기록을 표시합니다/);
});

test("staff Memory patch does not require optional last_edited columns in deployed schema", () => {
  assert.match(serverSource, /includeActorColumns:\s*false/);
  assert.doesNotMatch(serverSource, /\.from\("patient_interactions"\)[\s\S]{0,800}last_edited_at/);
});
