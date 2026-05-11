const RISK_LEVELS = new Set(["none", "low", "medium", "high"]);
const ALLOWED_FIELDS = [
  "ai_summary",
  "procedure_interests",
  "concerns",
  "risk_flags",
  "risk_level",
  "staff_precautions",
  "staff_notes",
];

function cleanString(value, max = 1200) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function cleanStringArray(value, maxItems = 30) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map(item => cleanString(item, 220))
      .filter(Boolean),
  )].slice(0, maxItems);
}

function cleanRiskFlags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((flag) => {
      if (typeof flag === "string") {
        const detail = cleanString(flag, 500);
        return detail ? { type: "manual", detail, severity: "medium" } : null;
      }
      if (!flag || typeof flag !== "object") return null;
      const detail = cleanString(flag.detail || flag.description || flag.phrase, 500);
      if (!detail) return null;
      const severity = RISK_LEVELS.has(flag.severity) ? flag.severity : "medium";
      return {
        type: cleanString(flag.type || flag.cat || "manual", 80) || "manual",
        detail,
        severity,
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

export function normalizeMemoryPatch(input = {}) {
  const normalized = {};

  if (Object.hasOwn(input, "ai_summary")) {
    normalized.ai_summary = cleanString(input.ai_summary, 6000) || null;
  }
  if (Object.hasOwn(input, "procedure_interests")) {
    normalized.procedure_interests = cleanStringArray(input.procedure_interests);
  }
  if (Object.hasOwn(input, "concerns")) {
    normalized.concerns = cleanStringArray(input.concerns);
  }
  if (Object.hasOwn(input, "staff_precautions")) {
    normalized.staff_precautions = cleanStringArray(input.staff_precautions);
  }
  if (Object.hasOwn(input, "staff_notes")) {
    normalized.staff_notes = cleanString(input.staff_notes, 4000) || null;
  }
  if (Object.hasOwn(input, "risk_flags")) {
    normalized.risk_flags = cleanRiskFlags(input.risk_flags);
  }
  if (Object.hasOwn(input, "risk_level")) {
    normalized.risk_level = RISK_LEVELS.has(input.risk_level) ? input.risk_level : "none";
  }

  return normalized;
}

export function buildMemoryPatchUpdate({ patch = {}, actorId = null, includeActorColumns = true } = {}) {
  const normalized = normalizeMemoryPatch(patch);
  const changedFields = ALLOWED_FIELDS.filter(field => Object.hasOwn(normalized, field));
  const actorUpdate = includeActorColumns
    ? {
        last_edited_by: actorId || null,
        last_edited_at: new Date().toISOString(),
      }
    : {};
  return {
    update: {
      ...Object.fromEntries(changedFields.map(field => [field, normalized[field]])),
      ...actorUpdate,
    },
    changedFields,
  };
}

export function mapMemoryRowsForStaff({ memoryRows = [], patients = [] } = {}) {
  const patientById = new Map((patients || []).map(patient => [patient.id, patient]));
  return (memoryRows || []).map((row) => {
    const patient = patientById.get(row.patient_id) || {};
    return {
      id: row.id,
      patient_id: row.patient_id,
      patient: {
        id: patient.id || row.patient_id,
        name: patient.name || "이름 없는 환자",
        lang: patient.lang || null,
        flag: patient.flag || null,
        nationality: patient.nationality || null,
        birth_year: patient.birth_year || null,
      },
      ai_summary: row.ai_summary || "",
      procedure_interests: Array.isArray(row.procedure_interests) ? row.procedure_interests : [],
      concerns: Array.isArray(row.concerns) ? row.concerns : [],
      risk_flags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
      risk_level: row.risk_level || "none",
      staff_precautions: Array.isArray(row.staff_precautions) ? row.staff_precautions : [],
      staff_notes: row.staff_notes || "",
      session_count: Number(row.session_count || 0),
      last_session_at: row.last_session_at || null,
      last_edited_by: row.last_edited_by || null,
      last_edited_at: row.last_edited_at || null,
      updated_at: row.updated_at || row.last_session_at || null,
    };
  });
}
