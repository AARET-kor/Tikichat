import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeProcedureText,
  resolveProcedureFromCandidates,
  resolveProcedureFromText,
} from "../src/lib/procedure-resolution.js";

const PROCEDURES = [
  { id: "p1", name_ko: "보톡스", name_en: "Botox", name_ja: "ボトックス", name_zh: "保妥适" },
  { id: "p2", name_ko: "필러", name_en: "Filler", name_ja: "フィラー", name_zh: "玻尿酸填充" },
  { id: "p3", name_ko: "윤곽주사", name_en: "Contour Injection", name_ja: "", name_zh: "" },
];

test("normalizeProcedureText removes spacing and punctuation conservatively", () => {
  assert.equal(normalizeProcedureText("  보 톡 스  "), "보톡스");
  assert.equal(normalizeProcedureText("Botox /"), "botox");
});

test("resolveProcedureFromText matches exact normalized procedure names only", () => {
  const result = resolveProcedureFromText("보톡스", PROCEDURES);
  assert.equal(result.status, "matched");
  assert.equal(result.procedure?.id, "p1");
});

test("resolveProcedureFromText does not auto-assign ambiguous multi-value strings", () => {
  const result = resolveProcedureFromText("보톡스, 필러", PROCEDURES);
  assert.equal(result.status, "unmatched");
  assert.equal(result.procedure, null);
});

test("resolveProcedureFromText leaves unmatched values unresolved", () => {
  const result = resolveProcedureFromText("리프팅", PROCEDURES);
  assert.equal(result.status, "unmatched");
  assert.equal(result.procedure, null);
});

test("resolveProcedureFromCandidates resolves only when all matched candidates collapse to one procedure", () => {
  const matched = resolveProcedureFromCandidates(["보톡스", "Botox"], PROCEDURES);
  assert.equal(matched.status, "matched");
  assert.equal(matched.procedure?.id, "p1");

  const ambiguous = resolveProcedureFromCandidates(["보톡스", "필러"], PROCEDURES);
  assert.equal(ambiguous.status, "ambiguous");
  assert.equal(ambiguous.procedure, null);
});
