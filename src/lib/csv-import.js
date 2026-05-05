export function buildImportVisitKey(row = {}) {
  const patientId = row._patient?.id || row.patient_id || "";
  const visitDate = row.visit_date || "";
  if (!patientId || !visitDate) return "";
  return `${patientId}_${visitDate}`;
}

export function partitionDuplicateImportVisits(rows = []) {
  const seen = new Map();
  const uniqueRows = [];
  const duplicateRows = [];

  for (const row of rows) {
    const key = buildImportVisitKey(row);
    if (!key) {
      uniqueRows.push(row);
      continue;
    }

    const first = seen.get(key);
    if (first) {
      duplicateRows.push({
        ...row,
        _duplicate_reason: "CSV 내부 중복",
        _duplicate_of: first._i,
      });
      continue;
    }

    seen.set(key, row);
    uniqueRows.push(row);
  }

  return { uniqueRows, duplicateRows };
}

const MEMORY_STATUSES = new Set(["created", "visit_created"]);
const RISK_ORDER = ["none", "low", "medium", "high"];

function cleanString(value, max = 1000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item, 180)).filter(Boolean);
}

function mergeUnique(...arrays) {
  return [...new Set(arrays.flatMap(cleanArray))];
}

function maxRisk(a = "none", b = "none") {
  const ai = RISK_ORDER.indexOf(a);
  const bi = RISK_ORDER.indexOf(b);
  return RISK_ORDER[Math.max(ai < 0 ? 0 : ai, bi < 0 ? 0 : bi)];
}

function buildProcedureInterest(row = {}, result = {}) {
  return cleanString(result.procedure_match_name || row.procedure, 180);
}

function buildCsvImportSummaryLine(row = {}, result = {}) {
  const parts = [
    "CRM/EMR CSV 가져오기",
    row.external_source ? `출처: ${row.external_source}` : "",
    row.external_patient_id ? `외부 환자 ID: ${row.external_patient_id}` : "",
    row.external_chart_no ? `차트번호: ${row.external_chart_no}` : "",
    row.external_visit_id ? `외부 방문/예약 ID: ${row.external_visit_id}` : "",
    row.visit_date ? `방문일: ${row.visit_date}` : "",
    row.procedure ? `관심 시술: ${row.procedure}` : "",
    row.note ? `메모: ${row.note}` : "",
    row.external_memo ? `외부 메모: ${row.external_memo}` : "",
    result.portal_url ? `My Tiki 링크: ${result.portal_url}` : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

export function buildCsvImportMemoryUpserts({
  clinic_id,
  rows = [],
  results = [],
  existingByPatientId = {},
} = {}) {
  if (!clinic_id) return [];

  const grouped = new Map();
  rows.forEach((row, index) => {
    const result = results[index] || {};
    const patientId = cleanString(result.patient_id, 120);
    if (!patientId || !MEMORY_STATUSES.has(result.status)) return;

    const current = grouped.get(patientId) || {
      patient_id: patientId,
      procedure_interests: [],
      summaries: [],
      count: 0,
    };

    const interest = buildProcedureInterest(row, result);
    if (interest) current.procedure_interests.push(interest);
    const summary = buildCsvImportSummaryLine(row, result);
    if (summary) current.summaries.push(summary);
    current.count += 1;
    grouped.set(patientId, current);
  });

  return [...grouped.values()].map((group) => {
    const existing = existingByPatientId[group.patient_id] || {};
    const previousSummary = cleanString(existing.ai_summary, 3000);
    const importSummary = group.summaries.join("\n");
    return {
      clinic_id,
      patient_id: group.patient_id,
      procedure_interests: mergeUnique(existing.procedure_interests, group.procedure_interests),
      concerns: cleanArray(existing.concerns),
      risk_flags: Array.isArray(existing.risk_flags) ? existing.risk_flags : [],
      risk_level: maxRisk(existing.risk_level || "none", "none"),
      ai_summary: [previousSummary, importSummary].filter(Boolean).join("\n\n").slice(0, 6000),
      session_count: Number(existing.session_count || 0) + group.count,
      last_session_at: new Date().toISOString(),
    };
  });
}
