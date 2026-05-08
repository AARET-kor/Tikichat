const ALLOWED_CSV_ALIAS_FIELDS = new Set([
  "name",
  "visit_date",
  "lang",
  "procedure",
  "phone",
  "email",
  "nationality",
  "note",
  "external_source",
  "external_patient_id",
  "external_chart_no",
  "external_visit_id",
  "external_profile_url",
  "external_memo",
]);

function cleanString(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function normalizeAliasList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanString(item, 80)).filter(Boolean))].slice(0, 30);
}

export function normalizeCsvAliasProfiles(rows = []) {
  return rows
    .map((row) => {
      const aliases = row?.import_format?.csv_aliases || row?.import_format?.aliases || {};
      const normalizedAliases = {};
      for (const [field, list] of Object.entries(aliases)) {
        if (!ALLOWED_CSV_ALIAS_FIELDS.has(field)) continue;
        const normalized = normalizeAliasList(list);
        if (normalized.length) normalizedAliases[field] = normalized;
      }
      if (!Object.keys(normalizedAliases).length) return null;
      return {
        id: row.id,
        system_name: row.system_name,
        system_label: row.system_label || row.system_name,
        aliases: normalizedAliases,
      };
    })
    .filter(Boolean);
}

export function validateCsvAliasProfilePatch(input = {}) {
  const systemName = cleanString(input.system_name || input.systemName, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const systemLabel = cleanString(input.system_label || input.systemLabel || "병원 preset", 80);
  const aliasesInput = input.aliases || input.csv_aliases || {};

  if (!systemName) {
    const error = new Error("system_name is required");
    error.statusCode = 400;
    throw error;
  }
  if (!aliasesInput || typeof aliasesInput !== "object" || Array.isArray(aliasesInput)) {
    const error = new Error("aliases object is required");
    error.statusCode = 400;
    throw error;
  }

  const aliases = {};
  const unknownFields = [];
  for (const [field, value] of Object.entries(aliasesInput)) {
    if (!ALLOWED_CSV_ALIAS_FIELDS.has(field)) {
      unknownFields.push(field);
      continue;
    }
    const normalized = normalizeAliasList(value);
    if (normalized.length) aliases[field] = normalized;
  }

  if (unknownFields.length) {
    const error = new Error(`unknown alias fields: ${unknownFields.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
  if (!Object.keys(aliases).length) {
    const error = new Error("at least one alias field is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    system_name: systemName,
    system_label: systemLabel,
    mode: "csv",
    import_format: {
      type: "csv_column_aliases",
      csv_aliases: aliases,
    },
  };
}
