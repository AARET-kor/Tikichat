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
