-- ============================================================
-- 012_patient_interactions.sql
-- ============================================================
-- PURPOSE
--   Tiki Memory: structured records of what the AI has learned
--   about a patient across all sessions. One row per patient
--   (upserted by the AI layer after each session).
--
--   This is the AI's persistent patient profile — updated
--   incrementally, not replaced wholesale. Think of it as
--   the AI's notepad about a patient that survives across
--   conversations.
--
-- KEY DESIGN DECISIONS
--   procedure_interests TEXT[]: procedures the patient has
--     expressed interest in. TEXT[] is preferred over JSONB
--     for a flat list of identifiers — GIN indexable, simple
--     to query with @> or ANY().
--
--   risk_flags JSONB: structured risk information where each
--     flag has type, description, and severity. JSONB is right
--     here because the structure varies by risk type.
--     Example: [{ "type": "allergy", "detail": "latex", "severity": "high" }]
--
--   concerns TEXT[]: free-form patient-reported concerns
--     (e.g. ["붓기 걱정됨", "자연스러운 결과 원함"]). TEXT[].
--
-- ROLLBACK
--   DROP TABLE IF EXISTS patient_interactions CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_interactions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id            UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id           UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Procedures the patient has mentioned interest in
  -- Updated incrementally; not cleared between sessions
  procedure_interests  TEXT[]      NOT NULL DEFAULT '{}',

  -- Patient-reported concerns (language the patient used)
  concerns             TEXT[]      NOT NULL DEFAULT '{}',

  -- Structured risk flags (see design decisions above)
  risk_flags           JSONB       NOT NULL DEFAULT '[]',

  -- Overall risk level (denormalized from risk_flags for fast queries)
  risk_level           TEXT        NOT NULL DEFAULT 'none'
    CHECK (risk_level IN ('none', 'low', 'medium', 'high')),

  -- Free-form AI-generated summary of what it knows about this patient
  -- Updated after each session that adds new information
  ai_summary           TEXT,

  -- Interaction counters
  session_count        INT         NOT NULL DEFAULT 0,
  last_session_at      TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One record per patient per clinic
  UNIQUE (clinic_id, patient_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Primary lookup: patient memory record
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_interactions_patient
  ON patient_interactions(clinic_id, patient_id);

-- Risk flag filter: all high-risk patients for a clinic
CREATE INDEX IF NOT EXISTS idx_patient_interactions_risk
  ON patient_interactions(clinic_id, risk_level)
  WHERE risk_level != 'none';

-- Procedure interest search: find all patients interested in a procedure
CREATE INDEX IF NOT EXISTS idx_patient_interactions_interests
  ON patient_interactions USING GIN(procedure_interests);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS patient_interactions_updated_at ON patient_interactions;
CREATE TRIGGER patient_interactions_updated_at
  BEFORE UPDATE ON patient_interactions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE patient_interactions ENABLE ROW LEVEL SECURITY;
