import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

const routeStart = serverSource.indexOf('app.post("/api/auth/register"');
const routeEnd = serverSource.indexOf("// ════════════════════════════════════════════════════════════════════════════", routeStart + 1);
const registerRoute = routeStart >= 0 && routeEnd > routeStart
  ? serverSource.slice(routeStart, routeEnd)
  : "";

test("signup route creates a real Supabase Auth user with login metadata", () => {
  assert.ok(registerRoute, "register route should exist");
  assert.match(registerRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(registerRoute, /\.from\("clinics"\)\s*\.insert/);
  assert.match(registerRoute, /auth\.admin\.createUser/);
  assert.match(registerRoute, /app_metadata:\s*\{\s*clinic_id:\s*createdClinicId,\s*role:\s*"owner"/s);
  assert.match(registerRoute, /\.from\("clinic_users"\)\s*\.insert/);
});

test("signup route no longer relies on DB trigger side effects for clinic provisioning", () => {
  assert.doesNotMatch(registerRoute, /트리거가 clinic 생성 \+ app_metadata 주입까지 처리함/);
  assert.doesNotMatch(registerRoute, /await new Promise\(r => setTimeout\(r, 300\)\)/);
  assert.match(registerRoute, /Auth metadata clinic_id was not provisioned/);
});

test("signup route rolls back partial clinic or auth user creation on failure", () => {
  assert.match(registerRoute, /createdClinicId/);
  assert.match(registerRoute, /createdUserId/);
  assert.match(registerRoute, /auth\.admin\.deleteUser\(createdUserId\)/);
  assert.match(registerRoute, /\.from\("clinics"\)\.delete\(\)\.eq\("id", createdClinicId\)/);
});
