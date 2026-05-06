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
  assert.match(tikiPasteSource, /직접 새 환자 등록/);
  assert.match(tikiPasteSource, /My Tiki 링크는 환자와 방문이 확정된 뒤에만 표시됩니다/);
  assert.match(tikiPasteSource, /My Tiki 링크 복사/);
  assert.match(tikiPasteSource, /상담 유입으로 보류 저장/);
  assert.match(tikiPasteSource, /기존 환자 확인 \/ 새 환자 등록/);
  assert.match(tikiPasteSource, /기존 환자로 저장/);
  assert.match(tikiPasteSource, /새 환자 등록/);
  assert.match(tikiPasteSource, /\/api\/conversation-intakes/);
});

test("TikiPaste stays focused on manual conversation capture, not CRM/EMR import", () => {
  assert.doesNotMatch(tikiPasteSource, /value: 'crm'|value: 'emr'/);
  assert.doesNotMatch(tikiPasteSource, /기존 CRM|기존 EMR|CRM\/EMR에 다시 붙여넣/);
  assert.match(tikiPasteSource, /상담 출처 메모/);
});

test("/api/tiki-paste accepts either pasted text or uploaded screenshot data", () => {
  assert.match(serverSource, /const \{ message, imageData, imageMediaType, clinicId, clinicName: bodyClinicName \} = req\.body;/);
  assert.match(serverSource, /if \(!messageText && !hasImage\)\s*return res\.status\(400\)\.json\(\{ error: "message or image required" \}\);/);
  assert.match(serverSource, /media_type: imageMediaType/);
  assert.match(serverSource, /extracted_text/);
  assert.match(serverSource, /conversation_summary/);
  assert.match(serverSource, /last_message_intent/);
  assert.match(serverSource, /patient_candidate/);
  assert.match(serverSource, /visit_candidate/);
  assert.match(serverSource, /missing_fields/);
});

test("TikiPaste patient matching is staff-gated and clinic-scoped", () => {
  assert.match(serverSource, /app\.post\("\/api\/patients\/match-candidates", requireStaffAuth,/);
  assert.match(serverSource, /buildPatientMatchSignals/);
  assert.match(serverSource, /rankPatientMatches/);
  assert.match(serverSource, /\.eq\("clinic_id", req\.clinic_id\)/);
  assert.match(tikiPasteSource, /\/api\/patients\/match-candidates/);
});

test("/api/conversation-intakes is staff-gated and scoped to authenticated clinic", () => {
  assert.match(serverSource, /app\.post\("\/api\/conversation-intakes", requireStaffAuth,/);
  assert.match(serverSource, /app\.post\("\/api\/conversation-intakes\/:id\/convert", requireStaffAuth,/);
  assert.match(serverSource, /app\.get\("\/api\/conversation-intakes", requireStaffAuth,/);
  assert.match(serverSource, /clinic_id: req\.clinic_id/);
  assert.match(serverSource, /\.eq\("clinic_id", req\.clinic_id\)/);
  assert.doesNotMatch(serverSource, /conversation_intakes[\s\S]{0,600}req\.body\.clinicId/);
});

test("conversation intake conversion creates/link visits and My Tiki links only after staff action", () => {
  assert.match(serverSource, /buildConversationIntakeConversionPlan/);
  assert.match(serverSource, /\.from\("conversation_intakes"\)[\s\S]{0,400}\.eq\("clinic_id", req\.clinic_id\)/);
  assert.match(serverSource, /\.update\(\{[\s\S]{0,160}status: "converted"/);
  assert.match(serverSource, /generatePatientToken\(\)/);
  assert.match(tikiPasteSource, /PendingIntakeQueue/);
  assert.match(tikiPasteSource, /기존 환자 연결/);
  assert.match(tikiPasteSource, /새 환자로 전환/);
});
