import { buildExternalRefsFromImportRow } from "./external-refs.js";

function cleanString(value, max = 500) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function cleanNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function buildImportBatchInsert({
  clinic_id,
  created_by,
  filename,
  preview_stats = {},
  summary = {},
} = {}) {
  const totalRows = cleanNumber(summary.total || preview_stats.total);
  return {
    clinic_id,
    created_by: created_by || null,
    filename: cleanString(filename, 240) || null,
    source: "csv",
    status: cleanNumber(summary.failed) > 0 ? "completed_with_errors" : "completed",
    total_rows: totalRows,
    importable_rows: cleanNumber(preview_stats.importable),
    warning_rows: cleanNumber(preview_stats.warnings),
    same_file_duplicate_rows: cleanNumber(preview_stats.duplicateRows),
    invalid_rows: cleanNumber(preview_stats.invalid),
    created_count: cleanNumber(summary.created),
    visit_created_count: cleanNumber(summary.visit_created),
    duplicate_count: cleanNumber(summary.duplicates),
    failed_count: cleanNumber(summary.failed),
  };
}

export function buildImportRowInserts({
  clinic_id,
  batch_id,
  input_rows = [],
  results = [],
} = {}) {
  if (!clinic_id || !batch_id) return [];
  return input_rows.map((row, index) => {
    const result = results[index] || {};
    const externalRefs = buildExternalRefsFromImportRow(row);
    return {
      clinic_id,
      batch_id,
      row_num: cleanNumber(row._rowNum || index + 2),
      patient_id: result.patient_id || null,
      visit_id: result.visit_id || null,
      patient_name: cleanString(row.name, 180) || null,
      visit_date: /^\d{4}-\d{2}-\d{2}$/.test(row.visit_date || "") ? row.visit_date : null,
      status: cleanString(result.status, 80) || "unknown",
      warning_messages: Array.isArray(row._warnings) ? row._warnings.slice(0, 8).map(item => cleanString(item, 160)).filter(Boolean) : [],
      error_message: cleanString(result.error_message || result.procedure_match_error, 500) || null,
      portal_url: cleanString(result.portal_url, 500) || null,
      procedure_match_status: cleanString(result.procedure_match_status, 80) || null,
      procedure_match_name: cleanString(result.procedure_match_name, 180) || null,
      external_refs: Object.keys(externalRefs).length ? externalRefs : {},
      result_payload: result && typeof result === "object" ? result : {},
    };
  });
}

export function buildIntakeQueueResponse({
  conversation_intakes = [],
  import_batches = [],
} = {}) {
  const intakeItems = (conversation_intakes || []).map(item => ({
    kind: "tikipaste_intake",
    id: item.id,
    created_at: item.created_at,
    status: item.status || "pending",
    risk_level: item.risk_level || "low",
    source_channel: item.source_channel || "manual",
    source_handle: item.source_handle || "",
    patient_candidate: item.patient_candidate || {},
    visit_candidate: item.visit_candidate || {},
    last_patient_intent: item.last_patient_intent || "",
    missing_fields: item.missing_fields || [],
  }));

  const importItems = (import_batches || []).map(batch => ({
    kind: "csv_import",
    id: batch.id,
    created_at: batch.created_at,
    status: batch.status || "completed",
    filename: batch.filename || "",
    total_rows: batch.total_rows || 0,
    importable_rows: batch.importable_rows || 0,
    warning_rows: batch.warning_rows || 0,
    same_file_duplicate_rows: batch.same_file_duplicate_rows || 0,
    invalid_rows: batch.invalid_rows || 0,
    created_count: batch.created_count || 0,
    visit_created_count: batch.visit_created_count || 0,
    duplicate_count: batch.duplicate_count || 0,
    failed_count: batch.failed_count || 0,
    rows: batch.csv_import_rows || [],
  }));

  const items = [...intakeItems, ...importItems]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return {
    summary: {
      pending_intakes: intakeItems.filter(item => item.status === "pending").length,
      recent_import_batches: importItems.length,
      import_errors: importItems.reduce((sum, item) => sum + (item.failed_count || 0), 0),
      review_needed: intakeItems.filter(item => (item.missing_fields || []).length > 0 || item.risk_level === "high").length
        + importItems.reduce((sum, item) => sum + (item.warning_rows || 0) + (item.failed_count || 0), 0),
    },
    items,
  };
}
