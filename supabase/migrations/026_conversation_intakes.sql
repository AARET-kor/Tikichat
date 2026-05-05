-- ============================================================
-- 026_conversation_intakes.sql
-- ============================================================
-- PURPOSE
--   Manual conversation capture staging for TikiPaste.
--   This is a conversion gateway, not an omnichannel inbox.
--
-- SCOPE
--   Staff-pasted consultation context can be saved as a
--   pending intake before staff creates/links a patient + visit.
--   No channel sync, no unread state, no outbound sending.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_intakes (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                  TEXT NOT NULL REFERENCES clinics(clinic_id) ON DELETE CASCADE,
  created_by                 TEXT,

  status                     TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'converted', 'linked', 'dismissed')),

  source_channel             TEXT NOT NULL DEFAULT 'manual',
  source_handle              TEXT,
  source_phone               TEXT,
  source_memo                TEXT,

  raw_text                   TEXT,
  raw_screenshot_url         TEXT,

  patient_candidate          JSONB NOT NULL DEFAULT '{}'::jsonb,
  visit_candidate            JSONB NOT NULL DEFAULT '{}'::jsonb,
  parsed_language            TEXT,
  parsed_procedure_interests TEXT[] NOT NULL DEFAULT '{}',
  last_patient_intent        TEXT,
  risk_level                 TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
  recommended_replies        JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields             TEXT[] NOT NULL DEFAULT '{}',
  next_suggested_action      TEXT,
  analysis_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,

  linked_patient_id          TEXT REFERENCES patients(id) ON DELETE SET NULL,
  linked_visit_id            UUID REFERENCES visits(id) ON DELETE SET NULL,
  converted_at               TIMESTAMPTZ,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_intakes_clinic_status
  ON conversation_intakes(clinic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_intakes_risk
  ON conversation_intakes(clinic_id, risk_level)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_conversation_intakes_created_at
  ON conversation_intakes(created_at DESC);

ALTER TABLE conversation_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_intakes_service_all ON conversation_intakes FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS conversation_intakes_updated_at ON conversation_intakes;
CREATE TRIGGER conversation_intakes_updated_at
  BEFORE UPDATE ON conversation_intakes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
