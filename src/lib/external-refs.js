const MAX_REF_LENGTH = 500;

const KEY_ALIASES = {
  source: "source",
  source_system: "source",
  external_source: "source",
  crm: "source",
  emr: "source",
  patient_id: "external_patient_id",
  external_patient_id: "external_patient_id",
  chart_no: "chart_no",
  chart_number: "chart_no",
  external_visit_id: "external_visit_id",
  visit_id: "external_visit_id",
  profile_url: "profile_url",
  external_profile_url: "profile_url",
  source_channel: "source_channel",
  source_handle: "source_handle",
  source_phone: "source_phone",
  memo: "memo",
  external_memo: "memo",
};

export const EXTERNAL_REF_KEYS = [
  "source",
  "external_patient_id",
  "chart_no",
  "external_visit_id",
  "profile_url",
  "source_channel",
  "source_handle",
  "source_phone",
  "memo",
];

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, MAX_REF_LENGTH);
}

export function normalizeExternalRefs(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const out = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = KEY_ALIASES[rawKey];
    if (!key) continue;
    const value = normalizeValue(rawValue);
    if (value) out[key] = value;
  }

  return out;
}

export function hasExternalRefs(input = {}) {
  return Object.keys(normalizeExternalRefs(input)).length > 0;
}

export function buildExternalRefsFromImportRow(row = {}) {
  return normalizeExternalRefs({
    source: row.external_source,
    external_patient_id: row.external_patient_id,
    chart_no: row.external_chart_no,
    external_visit_id: row.external_visit_id,
    profile_url: row.external_profile_url,
    source_channel: row.source_channel,
    source_handle: row.source_handle,
    source_phone: row.phone,
    memo: row.external_memo,
  });
}
