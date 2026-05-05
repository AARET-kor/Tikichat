import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildImportBatchInsert,
  buildImportRowInserts,
  buildIntakeQueueResponse,
} from "../src/lib/intake-queue.js";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const deskSource = readFileSync(
  new URL("../client/src/components/mytiki/MyTikiTab.jsx", import.meta.url),
  "utf8",
);
const csvImportSource = readFileSync(
  new URL("../client/src/components/mytiki/CsvImportModal.jsx", import.meta.url),
  "utf8",
);

test("buildImportBatchInsert stores compact CSV import operational summary", () => {
  const batch = buildImportBatchInsert({
    clinic_id: "clinic-1",
    created_by: "staff-1",
    filename: "afterdoc.csv",
    preview_stats: { importable: 8, warnings: 2, duplicateRows: 1, invalid: 3 },
    summary: { total: 14, created: 4, visit_created: 4, duplicates: 1, failed: 1 },
  });

  assert.equal(batch.clinic_id, "clinic-1");
  assert.equal(batch.created_by, "staff-1");
  assert.equal(batch.filename, "afterdoc.csv");
  assert.equal(batch.total_rows, 14);
  assert.equal(batch.importable_rows, 8);
  assert.equal(batch.warning_rows, 2);
  assert.equal(batch.same_file_duplicate_rows, 1);
  assert.equal(batch.invalid_rows, 3);
  assert.equal(batch.created_count, 4);
  assert.equal(batch.visit_created_count, 4);
  assert.equal(batch.duplicate_count, 1);
  assert.equal(batch.failed_count, 1);
});

test("buildImportRowInserts stores row-level queue details without raw CRM files", () => {
  const rows = buildImportRowInserts({
    clinic_id: "clinic-1",
    batch_id: "batch-1",
    input_rows: [
      { name: "Wang Fang", visit_date: "2026-05-03", external_patient_id: "P-1", external_chart_no: "C-1" },
    ],
    results: [
      { patient_id: "patient-1", visit_id: "visit-1", status: "created", portal_url: "https://app/t/abc", error_message: "" },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].clinic_id, "clinic-1");
  assert.equal(rows[0].batch_id, "batch-1");
  assert.equal(rows[0].patient_name, "Wang Fang");
  assert.equal(rows[0].status, "created");
  assert.equal(rows[0].external_refs.external_patient_id, "P-1");
  assert.equal(rows[0].raw_row, undefined);
});

test("buildIntakeQueueResponse combines pending TikiPaste and recent CSV imports", () => {
  const response = buildIntakeQueueResponse({
    conversation_intakes: [{ id: "intake-1", risk_level: "medium", source_channel: "kakao" }],
    import_batches: [{ id: "batch-1", filename: "afterdoc.csv", failed_count: 1 }],
  });

  assert.equal(response.summary.pending_intakes, 1);
  assert.equal(response.summary.recent_import_batches, 1);
  assert.equal(response.items.length, 2);
  assert.deepEqual(response.items.map(item => item.kind), ["tikipaste_intake", "csv_import"]);
});

test("staff intake queue route is staff-gated and scoped to authenticated clinic", () => {
  assert.match(serverSource, /app\.get\("\/api\/staff\/intake-queue", requireStaffAuth,/);
  assert.match(serverSource, /\.from\("conversation_intakes"\)[\s\S]{0,500}\.eq\("clinic_id", req\.clinic_id\)/);
  assert.match(serverSource, /\.from\("csv_import_batches"\)[\s\S]{0,500}\.eq\("clinic_id", req\.clinic_id\)/);
});

test("Tiki Desk exposes foreign patient intake queue and CSV import sends batch context", () => {
  assert.match(deskSource, /ForeignPatientIntakeQueue/);
  assert.match(deskSource, /\/api\/staff\/intake-queue/);
  assert.match(deskSource, /외국인 환자 유입 큐/);
  assert.match(csvImportSource, /preview_stats/);
  assert.match(csvImportSource, /filename/);
});
