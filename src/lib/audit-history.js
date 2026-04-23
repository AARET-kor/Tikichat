const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function safeJson(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeCreatedAt(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function normalizeJourneyEvent(row = {}) {
  return {
    id: row.id,
    source: "journey",
    event_type: row.event_type || "journey_event",
    created_at: normalizeCreatedAt(row.created_at),
    actor_type: row.actor_type || null,
    actor_id: row.actor_id || null,
    patient_id: row.patient_id || null,
    visit_id: row.visit_id || null,
    status: null,
    changed_paths: [],
    details: row.payload || {},
  };
}

function normalizeAuditLog(row = {}) {
  const details = safeJson(row.error_message) || {};
  return {
    id: row.id,
    source: "audit",
    event_type: row.event_type || row.action || "audit_log",
    created_at: normalizeCreatedAt(row.created_at),
    actor_type: details.actor_user_id ? "staff" : "system",
    actor_id: details.actor_user_id || null,
    patient_id: row.patient_id || null,
    visit_id: null,
    status: row.status || null,
    changed_paths: Array.isArray(details.changed_paths) ? details.changed_paths : [],
    details: {
      channel: row.channel || null,
      query_type: row.query_type || null,
      ...details,
    },
  };
}

export function normalizeAuditHistoryRows({ journeyEvents = [], auditLogs = [] } = {}) {
  return [
    ...(auditLogs || []).map(normalizeAuditLog),
    ...(journeyEvents || []).map(normalizeJourneyEvent),
  ]
    .filter((item) => item.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function normalizeAuditHistoryLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function buildAuditHistoryResponse({
  journeyEvents = [],
  auditLogs = [],
  requestedLimit = DEFAULT_LIMIT,
} = {}) {
  const limit = normalizeAuditHistoryLimit(requestedLimit);
  const items = normalizeAuditHistoryRows({ journeyEvents, auditLogs }).slice(0, limit);
  return {
    ok: true,
    limit,
    items,
    summary: {
      total: items.length,
      journey: items.filter((item) => item.source === "journey").length,
      audit: items.filter((item) => item.source === "audit").length,
    },
  };
}
