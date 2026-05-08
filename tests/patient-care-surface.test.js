import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const sidebarSource = readFileSync(new URL("../client/src/components/layout/Sidebar.jsx", import.meta.url), "utf8");
const dashboardSource = readFileSync(new URL("../client/src/pages/Dashboard.jsx", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../client/src/context/AuthContext.jsx", import.meta.url), "utf8");
const patientCareUrl = new URL("../client/src/components/patient-care/PatientCareTab.jsx", import.meta.url);
const patientCareSource = existsSync(patientCareUrl) ? readFileSync(patientCareUrl, "utf8") : "";

test("Patient Care appears directly after Tiki Desk in the staff sidebar", () => {
  assert.match(sidebarSource, /id:\s*'my_tiki'[\s\S]*id:\s*'patient_care'[\s\S]*id:\s*'tiki_memory'/);
  assert.match(sidebarSource, /label:\s*'환자 케어'/);
  assert.match(sidebarSource, /sublabel:\s*'확인·사후관리'/);
});

test("Dashboard routes the patient_care tab to the dedicated PatientCareTab", () => {
  assert.match(dashboardSource, /PatientCareTab/);
  assert.match(dashboardSource, /activeTab === 'patient_care'/);
  assert.match(authSource, /patient_care:\s*\['owner', 'admin'\]/);
});

test("Patient Care uses staff-friendly Korean labels instead of escalation jargon", () => {
  assert.match(patientCareSource, /환자 케어/);
  assert.match(patientCareSource, /확인 요청/);
  assert.match(patientCareSource, /사후관리/);
  assert.match(patientCareSource, /긴급 확인/);
  assert.match(patientCareSource, /지연된 확인 요청/);
  assert.match(patientCareSource, /아직 확인 안 됨/);
  assert.match(patientCareSource, /처리 완료/);
  assert.doesNotMatch(patientCareSource, />에스컬레이션</);
});
