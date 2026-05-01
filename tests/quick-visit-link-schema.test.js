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

test("My Tiki link creation avoids optional patient_links custom_message column", () => {
  const routeStart = serverSource.indexOf('app.post("/api/my-tiki/links"');
  const routeEnd = serverSource.indexOf("// ── GET /api/my-tiki/links", routeStart);
  const routeSource = serverSource.slice(routeStart, routeEnd);

  assert.ok(routeStart > -1, "link creation route should exist");
  assert.doesNotMatch(routeSource, /custom_message/);
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
});
