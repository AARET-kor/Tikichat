import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authContextSource = readFileSync(
  new URL("../client/src/context/AuthContext.jsx", import.meta.url),
  "utf8",
);

test("production Supabase auth does not restore mock staff sessions by default", () => {
  assert.match(authContextSource, /function allowsMockAuth\(\) \{/);
  assert.match(authContextSource, /VITE_ENABLE_MOCK_AUTH === 'true'/);
  assert.match(authContextSource, /else if \(allowsMockAuth\(\)\) \{\s*\/\/ 로컬\/명시적 데모 모드에서만 mock 세션 복원\s*restoreMockSession\(\);/);
  assert.match(authContextSource, /sessionStorage\.removeItem\('tikidoc_session'\);/);
});

test("Supabase login failures do not fall back to mock unless mock auth is explicitly allowed", () => {
  assert.match(authContextSource, /const mockAuthAllowed = allowsMockAuth\(\);/);
  assert.match(authContextSource, /if \(error && \(!mockAuthAllowed \|\| !MOCK_TENANTS\[email\.toLowerCase\(\)\]\)\) \{/);
  assert.match(authContextSource, /if \(!mockAuthAllowed\) \{/);
});
