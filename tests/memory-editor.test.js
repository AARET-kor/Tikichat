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
  assert.match(memoryUiSource, /운영 기억 편집/);
  assert.match(memoryUiSource, /staff_precautions/);
  assert.match(memoryUiSource, /staff_notes/);
});
