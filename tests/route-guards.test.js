import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

test("/api/memory is guarded by requireStaffAuth", () => {
  assert.match(
    serverSource,
    /app\.post\(\"\/api\/memory\", requireStaffAuth,/,
  );
  assert.match(
    serverSource,
    /const clinic_id = req\.clinic_id \|\| CLINIC_UUID;/,
  );
});

test("/api/room routes are guarded by requireStaffAuth", () => {
  const guardedRoutes = [
    /app\.get\(\"\/api\/room\/current\", requireStaffAuth,/,
    /app\.post\(\"\/api\/room\/live-input\", requireStaffAuth,/,
    /app\.post\(\"\/api\/room\/respond\", requireStaffAuth,/,
    /app\.post\(\"\/api\/room\/end-session\", requireStaffAuth,/,
    /app\.post\(\"\/api\/room\/load-next\", requireStaffAuth,/,
    /app\.post\(\"\/api\/room\/clear\", requireStaffAuth,/,
  ];

  for (const routePattern of guardedRoutes) {
    assert.match(serverSource, routePattern);
  }
});

test("/api/room routes scope room access to the authenticated clinic", () => {
  assert.match(
    serverSource,
    /\.eq\(\"clinic_id\", clinic_id\)\s*\.eq\(\"is_active\", true\)/,
  );
  assert.match(
    serverSource,
    /async function buildRoomCurrentPayload\(sb, roomId, expectedClinicId = null\)/,
  );
  assert.match(
    serverSource,
    /if \(expectedClinicId && room\.clinic_id !== expectedClinicId\) return null;/,
  );
  assert.match(
    serverSource,
    /if \(!room \|\| room\.clinic_id !== clinic_id\) return res\.status\(404\)\.json\(\{ error: "Room not found" \}\);/,
  );
});

test("/api/clinic-procedures only returns active procedures for picker flows", () => {
  assert.match(
    serverSource,
    /app\.get\(\"\/api\/clinic-procedures\"[\s\S]*?\.eq\(\"clinic_id\", clinicId\)[\s\S]*?\.eq\(\"is_active\", true\)/,
  );
});

test("/api/staff/clinic-rule-config routes are staff-gated and patch is admin-only", () => {
  assert.match(
    serverSource,
    /app\.get\(\"\/api\/staff\/clinic-rule-config\", requireStaffAuth,/,
  );
  assert.match(
    serverSource,
    /app\.patch\(\"\/api\/staff\/clinic-rule-config\", requireStaffAuth, requireRole\(\"owner\", \"admin\"\),/,
  );
});

test("/api/staff/clinic-rule-config patch only uses authenticated clinic context", () => {
  const routeStart = serverSource.indexOf('app.patch("/api/staff/clinic-rule-config"');
  const routeEnd = serverSource.indexOf('// ── POST /api/my-tiki/links', routeStart);
  const routeBlockMatch = routeStart >= 0 && routeEnd > routeStart
    ? serverSource.slice(routeStart, routeEnd)
    : "";
  assert.ok(routeBlockMatch, "clinic rule config patch route block should exist");
  const routeBlock = routeBlockMatch;
  assert.match(routeBlock, /const clinic_id = req\.clinic_id;/);
  assert.doesNotMatch(routeBlock, /req\.(body|query)\?\.clinicId|req\.(body|query)\.clinicId/);
});

test("escalation, aftercare, and room hardening paths write append-only journey events", () => {
  assert.match(
    serverSource,
    /eventTypeMap = \{\s*acknowledge: "escalation_acknowledged",\s*assign: "escalation_assigned",\s*respond: "escalation_responded",\s*resolve: "escalation_resolved",\s*close: "escalation_closed"/s,
  );
  assert.match(
    serverSource,
    /event_type: "aftercare_response_recorded"/,
  );
  assert.match(
    serverSource,
    /event_type: "aftercare_reviewed"/,
  );
  assert.match(
    serverSource,
    /event_type: "room_session_ended"/,
  );
  assert.match(
    serverSource,
    /event_type: "room_next_loaded"/,
  );
  assert.match(
    serverSource,
    /event_type: "room_cleared"/,
  );
});

test("staff aftercare API exposes scheduler health for operational visibility", () => {
  assert.match(
    serverSource,
    /res\.json\(\{ items, summary, scheduler: getAftercareSchedulerHealth\(\) \}\)/,
  );
});

test("staff aftercare editor routes are staff-gated and writes are admin-only", () => {
  assert.match(
    serverSource,
    /app\.get\(\"\/api\/staff\/aftercare\/plans\", requireStaffAuth,/,
  );
  assert.match(
    serverSource,
    /app\.post\(\"\/api\/staff\/aftercare\/plans\/ensure\", requireStaffAuth, requireRole\(\"owner\", \"admin\"\),/,
  );
  assert.match(
    serverSource,
    /app\.patch\(\"\/api\/staff\/aftercare\/steps\/:stepId\", requireStaffAuth, requireRole\(\"owner\", \"admin\"\),/,
  );
});

test("staff audit history browse route is staff-gated", () => {
  assert.match(
    serverSource,
    /app\.get\(\"\/api\/staff\/audit-history\", requireStaffAuth,/,
  );
});
