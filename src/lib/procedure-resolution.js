function compactValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s()[\]{}\-_/.,]+/g, "");
}

export function normalizeProcedureText(value) {
  return compactValue(value);
}

function getProcedureNames(procedure = {}) {
  return [
    procedure.name_ko,
    procedure.name_en,
    procedure.name_ja,
    procedure.name_zh,
  ].filter(Boolean);
}

export function resolveProcedureFromText(value, procedures = []) {
  const raw = String(value || "").trim();
  const normalized = normalizeProcedureText(raw);
  if (!normalized) return { status: "unmatched", procedure: null, normalized };

  if (/[,/]| · |&|\+/.test(raw)) {
    return { status: "unmatched", procedure: null, normalized };
  }

  const matches = procedures.filter((procedure) =>
    getProcedureNames(procedure).some((name) => normalizeProcedureText(name) === normalized)
  );

  if (matches.length === 1) {
    return { status: "matched", procedure: matches[0], normalized };
  }

  if (matches.length > 1) {
    return { status: "ambiguous", procedure: null, normalized };
  }

  return { status: "unmatched", procedure: null, normalized };
}

export function resolveProcedureFromCandidates(values = [], procedures = []) {
  const cleanValues = (values || []).map((value) => String(value || "").trim()).filter(Boolean);
  if (cleanValues.length === 0) return { status: "unmatched", procedure: null, candidates: [] };

  const resolved = cleanValues.map((value) => resolveProcedureFromText(value, procedures));
  const matchedIds = [...new Set(resolved.filter((item) => item.status === "matched").map((item) => item.procedure.id))];

  if (matchedIds.length === 1 && resolved.every((item) => item.status === "matched")) {
    return {
      status: "matched",
      procedure: resolved.find((item) => item.procedure?.id === matchedIds[0])?.procedure || null,
      candidates: resolved,
    };
  }

  if (matchedIds.length > 1) {
    return { status: "ambiguous", procedure: null, candidates: resolved };
  }

  if (matchedIds.length === 1) {
    return { status: "partial", procedure: null, candidates: resolved };
  }

  if (resolved.some((item) => item.status === "ambiguous")) {
    return { status: "ambiguous", procedure: null, candidates: resolved };
  }

  return { status: "unmatched", procedure: null, candidates: resolved };
}
