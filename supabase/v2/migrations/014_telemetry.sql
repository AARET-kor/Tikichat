-- ============================================================
-- 014_telemetry.sql
-- ============================================================
-- PURPOSE
--   Three telemetry tables:
--
--   audit_logs — per-API-call telemetry. Written by server.js
--     after every AI call (auditLog() / writeAuditLog()).
--     clinic_id is TEXT (not UUID FK) — intentional decision
--     to prevent the telemetry write from failing if the
--     clinic row doesn't exist (e.g., misconfigured env).
--     Telemetry must never block the main request path.
--
--   session_logs — per-session aggregate. One row per complete
--     Tiki Paste / Tiki Talk / Tiki Room session. clinic_id
--     is UUID FK (session only starts if clinic is resolved).
--
--   exports — audit trail for every PDF/CSV/JSON export.
--     Required for HIPAA-adjacent compliance. clinic_id is
--     UUID FK (staff must be authenticated to export).
--
-- NOTE ON audit_logs.clinic_id
--   audit_logs.clinic_id is TEXT (not UUID, no FK). This is
--   intentional and approved. Do not add a FK constraint here.
--   The v1 bug where audit_logs silently failed because the
--   table didn't exist is fixed by this migration. The FK
--   absence is a separate deliberate choice.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS exports CASCADE;
--   DROP TABLE IF EXISTS session_logs CASCADE;
--   DROP TABLE IF EXISTS audit_logs CASCADE;
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- TABLE: audit_logs
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- TEXT, not UUID FK — intentional (see PURPOSE note above)
  clinic_id        TEXT        NOT NULL,

  -- Endpoint / action that triggered the AI call
  endpoint         TEXT,       -- e.g. '/api/tiki-paste', '/api/suggest'
  action           TEXT,       -- e.g. 'tiki_paste', 'stream_suggest'

  -- AI call details
  model_used       TEXT,
  tokens_in        INT         NOT NULL DEFAULT 0,
  tokens_out       INT         NOT NULL DEFAULT 0,
  duration_ms      INT         NOT NULL DEFAULT 0,

  -- Request context
  patient_id       TEXT,       -- TEXT to accept both old and new patient IDs
  session_type     TEXT,       -- 'tiki_paste' | 'tiki_talk' | 'suggest' | etc.
  lang             TEXT,       -- detected or declared language

  -- RAG telemetry
  rag_chunks_used  INT         NOT NULL DEFAULT 0,

  -- Error recording (null = success)
  error_code       TEXT,
  error_message    TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: append-only telemetry.
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_time
  ON audit_logs(clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint
  ON audit_logs(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_errors
  ON audit_logs(clinic_id, created_at DESC)
  WHERE error_code IS NOT NULL;

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- TABLE: session_logs
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS session_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id      UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  session_type   TEXT        NOT NULL
    CHECK (session_type IN (
      'tiki_paste',
      'tiki_talk',
      'tiki_room',
      'my_tiki_chat',
      'suggest'
    )),

  visit_id       UUID        REFERENCES visits(id) ON DELETE SET NULL,
  patient_id     UUID        REFERENCES patients(id) ON DELETE SET NULL,
  staff_user_id  TEXT,       -- auth.users.id of staff who initiated

  -- Aggregate telemetry across all turns in the session
  model_used     TEXT,
  turn_count     INT         NOT NULL DEFAULT 1,
  tokens_in      INT         NOT NULL DEFAULT 0,
  tokens_out     INT         NOT NULL DEFAULT 0,
  duration_ms    INT         NOT NULL DEFAULT 0,

  patient_lang   TEXT,       -- detected or declared language code
  summary        TEXT,       -- brief AI-generated session summary
  rag_chunks_used INT        NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: session record is written once at session end.
);

-- Indexes for session_logs
CREATE INDEX IF NOT EXISTS idx_session_logs_clinic_time
  ON session_logs(clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_type
  ON session_logs(clinic_id, session_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_visit
  ON session_logs(visit_id, created_at DESC)
  WHERE visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_logs_staff
  ON session_logs(staff_user_id, created_at DESC)
  WHERE staff_user_id IS NOT NULL;

-- RLS for session_logs
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- TABLE: exports
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  entity_type     TEXT        NOT NULL
    CHECK (entity_type IN (
      'form_submission',
      'patient',
      'visit',
      'patient_memory',
      'conversation',
      'session_log'
      -- 'quotation' deferred to Phase B
    )),

  -- TEXT to accommodate both UUID and TEXT PKs across entities
  entity_id       TEXT        NOT NULL,

  format          TEXT        NOT NULL
    CHECK (format IN ('pdf', 'csv', 'json', 'docx')),

  -- Staff who triggered the export (clinic_users.user_id)
  exported_by     UUID        NOT NULL,

  file_size_bytes INT,
  download_count  INT         NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: exports are immutable records.
);

-- Indexes for exports
CREATE INDEX IF NOT EXISTS idx_exports_clinic_time
  ON exports(clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exports_entity
  ON exports(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_exports_staff
  ON exports(exported_by, created_at DESC);

-- RLS for exports
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Analytics view: session cost by clinic + model + day
-- Used by billing dashboard and usage reports
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW clinic_session_costs AS
SELECT
  clinic_id,
  model_used,
  session_type,
  DATE_TRUNC('day', created_at)  AS day,
  COUNT(*)                        AS sessions,
  SUM(turn_count)                 AS total_turns,
  SUM(tokens_in)                  AS total_tokens_in,
  SUM(tokens_out)                 AS total_tokens_out,
  SUM(tokens_in + tokens_out)     AS total_tokens,
  ROUND(AVG(duration_ms))         AS avg_duration_ms
FROM session_logs
GROUP BY clinic_id, model_used, session_type, DATE_TRUNC('day', created_at);
