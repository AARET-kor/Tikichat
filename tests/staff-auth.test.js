import test from "node:test";
import assert from "node:assert/strict";

import { requireStaffAuth } from "../src/middleware/auth.js";

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("requireStaffAuth blocks unauthenticated staff requests", async () => {
  const originalUrl = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = "https://example.supabase.co";

  const req = {
    headers: {},
    body: {},
    query: {},
  };
  const res = makeRes();
  let nextCalled = false;

  await requireStaffAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body?.error || "", /Authorization header required/);

  if (originalUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalUrl;
});
