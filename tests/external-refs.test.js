import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExternalRefsFromImportRow,
  normalizeExternalRefs,
} from "../src/lib/external-refs.js";

test("normalizeExternalRefs keeps only lightweight CRM/EMR reference fields", () => {
  assert.deepEqual(normalizeExternalRefs({
    external_source: " Vegas ",
    external_patient_id: " 123 ",
    chart_number: " A-45 ",
    external_visit_id: " R-9 ",
    external_profile_url: " https://crm.example/p/123 ",
    source_handle: " wangfang2024 ",
    unknown: "ignored",
  }), {
    source: "Vegas",
    external_patient_id: "123",
    chart_no: "A-45",
    external_visit_id: "R-9",
    profile_url: "https://crm.example/p/123",
    source_handle: "wangfang2024",
  });
});

test("buildExternalRefsFromImportRow maps CSV import fields conservatively", () => {
  assert.deepEqual(buildExternalRefsFromImportRow({
    external_source: "afterdoc",
    external_patient_id: "P-001",
    external_chart_no: "C-001",
    external_visit_id: "V-001",
    external_profile_url: "https://afterdoc.example/p/P-001",
    external_memo: "copied manually",
    phone: "010-0000-0000",
  }), {
    source: "afterdoc",
    external_patient_id: "P-001",
    chart_no: "C-001",
    external_visit_id: "V-001",
    profile_url: "https://afterdoc.example/p/P-001",
    source_phone: "010-0000-0000",
    memo: "copied manually",
  });
});
