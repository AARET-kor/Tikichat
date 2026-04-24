import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickVisitSource = readFileSync(
  new URL("../client/src/components/mytiki/QuickVisitCreate.jsx", import.meta.url),
  "utf8",
);
const intakeParserSource = readFileSync(
  new URL("../client/src/components/shared/IntakeParser.jsx", import.meta.url),
  "utf8",
);

test("Quick Visit waits for staff auth before rendering Tiki Brief parser", () => {
  assert.match(quickVisitSource, /parserAuthReady/);
  assert.match(quickVisitSource, /if \(!headers\.Authorization\) throw new Error\('staff session required'\);/);
  assert.match(quickVisitSource, /step === 'parse' && parserAuthReady/);
});

test("Quick Visit creation requires bearer auth and does not send caller clinicId", () => {
  assert.match(quickVisitSource, /if \(!headers\.Authorization\) \{/);
  const patientCreateStart = quickVisitSource.indexOf("const patRes = await fetch('/api/patients'");
  const patientCreateEnd = quickVisitSource.indexOf("// Step 2: Create visit", patientCreateStart);
  const patientCreateBlock = quickVisitSource.slice(patientCreateStart, patientCreateEnd);

  assert.ok(patientCreateBlock, "patient creation block should exist");
  assert.doesNotMatch(patientCreateBlock, /clinicId,/);
});

test("IntakeParser does not call parse API without staff auth header", () => {
  assert.match(intakeParserSource, /if \(!authHeaders\?\.Authorization\) \{/);
  assert.match(intakeParserSource, /fetch\('\/api\/intake\/parse'/);
});
