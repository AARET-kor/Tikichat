import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeCsvAliasProfiles,
  validateCsvAliasProfilePatch,
} from "../src/lib/csv-import-config.js";
import {
  buildCsvImportMemoryUpserts,
  buildImportVisitKey,
  partitionDuplicateImportVisits,
} from "../src/lib/csv-import.js";

const csvImportSource = readFileSync(
  new URL("../client/src/components/mytiki/CsvImportModal.jsx", import.meta.url),
  "utf8",
);
const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

test("buildImportVisitKey uses resolved patient id and normalized visit date", () => {
  assert.equal(
    buildImportVisitKey({ _patient: { id: "patient-1" }, visit_date: "2026-05-03" }),
    "patient-1_2026-05-03",
  );
  assert.equal(buildImportVisitKey({ visit_date: "2026-05-03" }), "");
});

test("partitionDuplicateImportVisits keeps first row and marks later same-patient same-day rows as CSV duplicates", () => {
  const rows = [
    { _i: 0, _patient: { id: "patient-1" }, visit_date: "2026-05-03", name: "Wang Fang" },
    { _i: 1, _patient: { id: "patient-1" }, visit_date: "2026-05-03", name: "Wang Fang" },
    { _i: 2, _patient: { id: "patient-1" }, visit_date: "2026-05-04", name: "Wang Fang" },
  ];

  const result = partitionDuplicateImportVisits(rows);

  assert.deepEqual(result.uniqueRows.map(row => row._i), [0, 2]);
  assert.deepEqual(result.duplicateRows.map(row => row._i), [1]);
  assert.equal(result.duplicateRows[0]._duplicate_reason, "CSV 내부 중복");
  assert.equal(result.duplicateRows[0]._duplicate_of, 0);
});

test("CSV import preview exposes duplicate and warning categories before import", () => {
  assert.match(csvImportSource, /duplicateRows/);
  assert.match(csvImportSource, /warningRows/);
  assert.match(csvImportSource, /CSV 내부 중복/);
  assert.match(csvImportSource, /가져오기 전 확인/);
});

test("CSV import supports manual column mapping when CRM export headers are not recognized", () => {
  assert.match(csvImportSource, /applyManualMapping/);
  assert.match(csvImportSource, /열 직접 매핑/);
  assert.match(csvImportSource, /이름 열과 방문일 열은 반드시 지정해야 합니다/);
});

test("CSV import exposes CRM/EMR export presets for common Korean clinic systems", () => {
  assert.match(csvImportSource, /CRM_EXPORT_PRESETS/);
  assert.match(csvImportSource, /Vegas/);
  assert.match(csvImportSource, /AfterDoc/);
  assert.match(csvImportSource, /의사랑/);
  assert.match(csvImportSource, /Dr\.Palette/);
  assert.match(csvImportSource, /selectedPreset/);
  assert.match(csvImportSource, /병원별 컬럼 preset/);
});

test("CSV import done state provides copy-back text for existing CRM/EMR", () => {
  assert.match(csvImportSource, /CopyBackPanel/);
  assert.match(csvImportSource, /CRM\/EMR에 붙여넣기/);
  assert.match(csvImportSource, /copyBackText/);
  assert.match(csvImportSource, /portal_url/);
  assert.match(csvImportSource, /외부 환자 ID/);
  assert.match(csvImportSource, /처리 결과/);
});

test("CSV import supports retrying only failed result rows", () => {
  assert.match(csvImportSource, /retryFailedRows/);
  assert.match(csvImportSource, /실패 행만 다시 처리/);
  assert.match(csvImportSource, /downloadFailedRowsCSV/);
  assert.match(csvImportSource, /실패 행 CSV/);
  assert.match(csvImportSource, /failedRowEdits/);
  assert.match(csvImportSource, /실패 행 수정/);
});

test("clinic custom CSV aliases are validated before saving", () => {
  const patch = validateCsvAliasProfilePatch({
    system_name: "Gangnam CRM",
    system_label: "강남 CRM",
    aliases: {
      name: ["고객명", "고객명", ""],
      visit_date: ["예약일"],
      phone: ["휴대폰"],
    },
  });

  assert.equal(patch.system_name, "gangnam_crm");
  assert.equal(patch.system_label, "강남 CRM");
  assert.deepEqual(patch.import_format.csv_aliases.name, ["고객명"]);
  assert.equal(patch.mode, "csv");

  assert.throws(
    () => validateCsvAliasProfilePatch({ system_name: "bad", aliases: { raw_sql: ["x"] } }),
    /unknown alias fields/,
  );
});

test("clinic custom CSV alias profiles normalize integration profile rows", () => {
  const profiles = normalizeCsvAliasProfiles([
    {
      id: "profile-1",
      system_name: "gangnam_crm",
      system_label: "강남 CRM",
      import_format: {
        csv_aliases: {
          name: ["고객명"],
          visit_date: ["예약일"],
          raw_sql: ["ignored"],
        },
      },
    },
  ]);

  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].system_label, "강남 CRM");
  assert.deepEqual(profiles[0].aliases, { name: ["고객명"], visit_date: ["예약일"] });
});

test("staff CSV import config routes are staff-gated and admin-write only", () => {
  assert.match(serverSource, /app\.get\("\/api\/staff\/csv-import-config", requireStaffAuth,/);
  assert.match(serverSource, /app\.patch\("\/api\/staff\/csv-import-config", requireStaffAuth, requireRole\("owner", "admin"\),/);
  assert.match(serverSource, /\.from\("integration_profiles"\)/);
});

test("CSV import builds patient Memory context from external CRM/EMR rows", () => {
  const upserts = buildCsvImportMemoryUpserts({
    clinic_id: "clinic-1",
    rows: [
      {
        name: "Wang Fang",
        visit_date: "2026-05-03",
        procedure: "리프팅",
        note: "상담 후 방문 예정",
        external_source: "Vegas",
        external_patient_id: "P-001",
        external_chart_no: "C-001",
        external_visit_id: "V-001",
        external_memo: "CRM 상담 메모",
      },
      {
        name: "Wang Fang",
        visit_date: "2026-05-10",
        procedure: "보톡스",
        external_source: "Vegas",
      },
      {
        name: "Failed",
        visit_date: "2026-05-10",
        procedure: "필러",
      },
    ],
    results: [
      { patient_id: "patient-1", status: "created", procedure_match_name: "리프팅" },
      { patient_id: "patient-1", status: "visit_created", procedure_match_status: "unmatched" },
      { patient_id: "", status: "failed" },
    ],
    existingByPatientId: {
      "patient-1": {
        procedure_interests: ["기존 관심"],
        concerns: ["기존 우려"],
        risk_flags: [],
        risk_level: "low",
        session_count: 2,
        ai_summary: "기존 메모",
      },
    },
  });

  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].clinic_id, "clinic-1");
  assert.equal(upserts[0].patient_id, "patient-1");
  assert.deepEqual(upserts[0].procedure_interests, ["기존 관심", "리프팅", "보톡스"]);
  assert.deepEqual(upserts[0].concerns, ["기존 우려"]);
  assert.equal(upserts[0].risk_level, "low");
  assert.equal(upserts[0].session_count, 4);
  assert.match(upserts[0].ai_summary, /기존 메모/);
  assert.match(upserts[0].ai_summary, /CRM\/EMR CSV 가져오기/);
  assert.match(upserts[0].ai_summary, /Vegas/);
  assert.match(upserts[0].ai_summary, /P-001/);
  assert.match(upserts[0].ai_summary, /CRM 상담 메모/);
});

test("server import path uses duplicate partitioning before visit insert", () => {
  assert.match(serverSource, /partitionDuplicateImportVisits/);
  assert.match(serverSource, /row\._duplicate_reason/);
});

test("server import path writes successful CSV imports into patient Memory", () => {
  assert.match(serverSource, /buildCsvImportMemoryUpserts/);
  assert.match(serverSource, /\.from\("patient_interactions"\)/);
  assert.match(serverSource, /onConflict: "clinic_id,patient_id"/);
});
