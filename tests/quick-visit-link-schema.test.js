import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const quickVisitSource = readFileSync(
  new URL("../client/src/components/mytiki/QuickVisitCreate.jsx", import.meta.url),
  "utf8",
);
const intakeParserSource = readFileSync(
  new URL("../client/src/components/shared/IntakeParser.jsx", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("../client/src/pages/Dashboard.jsx", import.meta.url),
  "utf8",
);
const indexCssSource = readFileSync(
  new URL("../client/src/index.css", import.meta.url),
  "utf8",
);
const myTikiTabSource = readFileSync(
  new URL("../client/src/components/mytiki/MyTikiTab.jsx", import.meta.url),
  "utf8",
);
const tikiPasteSource = readFileSync(
  new URL("../client/src/components/magic/TikiPasteTab.jsx", import.meta.url),
  "utf8",
);
const patientAuthSource = readFileSync(
  new URL("../src/middleware/auth.js", import.meta.url),
  "utf8",
);

test("My Tiki link creation uses only broadly deployed patient_links columns", () => {
  const routeStart = serverSource.indexOf('app.post("/api/my-tiki/links"');
  const routeEnd = serverSource.indexOf("// ── GET /api/my-tiki/links", routeStart);
  const routeSource = serverSource.slice(routeStart, routeEnd);

  assert.ok(routeStart > -1, "link creation route should exist");
  for (const optionalColumn of [
    "custom_message",
    "patient_lang",
    "sent_via",
    "generated_by",
    "created_by",
    "revoked_by",
    "revoked_at",
    "link_type",
  ]) {
    assert.doesNotMatch(routeSource, new RegExp(optionalColumn));
  }
});

test("patient link list and token auth avoid optional patient_links extension columns", () => {
  const getStart = serverSource.indexOf('app.get("/api/my-tiki/links"');
  const getEnd = serverSource.indexOf("// ── POST /api/my-tiki/links/:id/revoke", getStart);
  const getSource = serverSource.slice(getStart, getEnd);
  const authStart = patientAuthSource.indexOf("export async function requirePatientToken");
  const authEnd = patientAuthSource.indexOf("// ─────────────────────────────────────────────────────────────────────────────", authStart + 1);
  const authSource = patientAuthSource.slice(authStart, authEnd);

  assert.ok(getStart > -1, "link list route should exist");
  assert.ok(authStart > -1, "patient token auth should exist");

  for (const optionalColumn of ["patient_lang", "sent_via", "generated_by", "custom_message", "link_type"]) {
    assert.doesNotMatch(getSource, new RegExp(optionalColumn));
  }
  const authSelectStart = authSource.indexOf(".select(`");
  const authSelectEnd = authSource.indexOf("`)", authSelectStart);
  const authSelectSource = authSource.slice(authSelectStart, authSelectEnd);

  assert.ok(authSelectStart > -1, "patient auth should select patient_links columns");
  for (const optionalColumn of ["patient_lang", "sent_via", "generated_by", "custom_message", "link_type", "access_count", "first_opened_at", "last_accessed_at"]) {
    assert.doesNotMatch(authSelectSource, new RegExp(optionalColumn));
  }
});

test("Quick Visit modal uses bounded touch-friendly scroll containers", () => {
  assert.match(quickVisitSource, /WebkitOverflowScrolling: 'touch'/);
  assert.match(quickVisitSource, /minHeight: 0/);
  assert.match(intakeParserSource, /overscrollBehavior: 'contain'/);
  assert.match(intakeParserSource, /overflowY: 'auto'/);
});

test("Dashboard shell uses dynamic viewport height and min-height containment", () => {
  assert.match(dashboardSource, /height: '100dvh'/);
  assert.match(dashboardSource, /min-h-0 overflow-hidden/);
  assert.match(indexCssSource, /html\s*\{[\s\S]*overflow: auto;/);
  assert.match(indexCssSource, /body\s*\{[\s\S]*overflow: auto;/);
});

test("Quick Visit creation surfaces stuck API steps and avoids duplicate retry creates", () => {
  assert.match(quickVisitSource, /async function requestJson/);
  assert.match(quickVisitSource, /AbortController/);
  assert.match(quickVisitSource, /creatingLabel/);
  assert.match(quickVisitSource, /partialCreateRef/);
});

test("Quick Visit visit creation avoids optional assignment columns", () => {
  const routeStart = serverSource.indexOf('app.post("/api/my-tiki/visits"');
  const routeEnd = serverSource.indexOf("// ── PATCH /api/my-tiki/visits/:id/stage", routeStart);
  const routeSource = serverSource.slice(routeStart, routeEnd);

  assert.ok(routeStart > -1, "visit creation route should exist");
  assert.doesNotMatch(routeSource, /coordinator_id/);
  assert.match(routeSource, /\.select\("id, patient_id, procedure_id, visit_date, notes, stage"\)/);
});

test("Quick Visit success remains visible after parent refresh callbacks", () => {
  const handleCreatedStart = myTikiTabSource.indexOf("function handleCreated");
  const handleCreatedEnd = myTikiTabSource.indexOf("// ── Today date label", handleCreatedStart);
  const handleCreatedSource = myTikiTabSource.slice(handleCreatedStart, handleCreatedEnd);
  const pasteCreatedStart = tikiPasteSource.indexOf("onCreated={() => {");
  const pasteCreatedEnd = tikiPasteSource.indexOf("}}", pasteCreatedStart);
  const pasteCreatedSource = tikiPasteSource.slice(pasteCreatedStart, pasteCreatedEnd);

  assert.ok(handleCreatedStart > -1, "MyTiki handleCreated should exist");
  assert.doesNotMatch(handleCreatedSource, /setShowQuickCreate\(false\)/);
  assert.match(handleCreatedSource, /setVisits\(prev => \[normalized/);
  assert.match(handleCreatedSource, /setDateRange\(nextRange\)/);
  assert.doesNotMatch(pasteCreatedSource, /setQuickVisitOpen\(false\)/);
});
