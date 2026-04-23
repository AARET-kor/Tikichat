import test from "node:test";
import assert from "node:assert/strict";

import {
  buildQrSvgHeaders,
  generateQrSvg,
  normalizeQrPayload,
} from "../src/lib/qr-code.js";

test("normalizeQrPayload accepts only concrete http app links", () => {
  assert.equal(
    normalizeQrPayload("https://app.tikidoc.xyz/t/abc123"),
    "https://app.tikidoc.xyz/t/abc123",
  );

  assert.throws(() => normalizeQrPayload(""), /QR payload required/);
  assert.throws(() => normalizeQrPayload("not-a-url"), /valid URL/);
});

test("generateQrSvg creates an SVG QR without external network dependency", async () => {
  const svg = await generateQrSvg("https://app.tikidoc.xyz/t/abc123");

  assert.match(svg, /^<svg/);
  assert.match(svg, /path/);
  assert.doesNotMatch(svg, /api\.qrserver\.com/);
});

test("buildQrSvgHeaders returns cacheable SVG response headers", () => {
  assert.deepEqual(buildQrSvgHeaders(), {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "private, max-age=300",
  });
});
