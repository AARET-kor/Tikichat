import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tikiPasteSource = readFileSync(
  new URL("../client/src/components/magic/TikiPasteTab.jsx", import.meta.url),
  "utf8",
);
const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

test("TikiPaste is a web sidecar workspace, not an overlay launcher", () => {
  assert.match(tikiPasteSource, /웹 사이드카/);
  assert.match(tikiPasteSource, /ScreenshotDropzone/);
  assert.match(tikiPasteSource, /선택한 채팅 텍스트 붙여넣기/);
  assert.doesNotMatch(tikiPasteSource, /window\.open\('\/overlay'/);
  assert.doesNotMatch(tikiPasteSource, /Read Screen|OCR Capture|오버레이 창 열기/);
});

test("TikiPaste supports practical handoff actions", () => {
  assert.match(tikiPasteSource, /QuickVisitCreate/);
  assert.match(tikiPasteSource, /Quick Visit/);
  assert.match(tikiPasteSource, /My Tiki 링크 준비/);
  assert.match(tikiPasteSource, /Tiki Desk로 보내기/);
});

test("/api/tiki-paste accepts either pasted text or uploaded screenshot data", () => {
  assert.match(serverSource, /const \{ message, imageData, imageMediaType, clinicId, clinicName: bodyClinicName \} = req\.body;/);
  assert.match(serverSource, /if \(!messageText && !hasImage\)\s*return res\.status\(400\)\.json\(\{ error: "message or image required" \}\);/);
  assert.match(serverSource, /media_type: imageMediaType/);
  assert.match(serverSource, /extracted_text/);
  assert.match(serverSource, /conversation_summary/);
  assert.match(serverSource, /last_message_intent/);
});
