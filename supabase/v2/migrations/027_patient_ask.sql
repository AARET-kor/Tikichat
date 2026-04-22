-- ============================================================
-- 027_patient_ask.sql
-- ============================================================
-- PURPOSE
--   Phase 6 — My Tiki Ask
--   Reuses conversations/messages for patient Ask sessions and
--   adds minimal escalation request tracking.
--
-- ROLLBACK
--   ALTER TABLE messages DROP COLUMN IF EXISTS metadata;
--   ALTER TABLE conversations DROP COLUMN IF EXISTS kind;
--   ALTER TABLE conversations DROP COLUMN IF EXISTS metadata;
--   DROP TABLE IF EXISTS escalation_requests CASCADE;
-- ============================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general'
    CHECK (kind IN ('general', 'ask'));

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_conversations_kind
  ON conversations(clinic_id, channel, kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS escalation_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id                  UUID REFERENCES patients(id) ON DELETE SET NULL,
  visit_id                    UUID REFERENCES visits(id) ON DELETE SET NULL,
  conversation_id             UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id                  UUID REFERENCES messages(id) ON DELETE SET NULL,
  request_type                TEXT NOT NULL
    CHECK (request_type IN ('coordinator', 'nurse', 'doctor_confirmation')),
  reason_category             TEXT NOT NULL
    CHECK (reason_category IN (
      'symptom_concern',
      'urgent_risk',
      'doctor_required',
      'uncertain',
      'manual_patient_request',
      'aftercare_concern',
      'forms_or_consent',
      'logistics',
      'booking_or_billing',
      'procedure_prep'
    )),
  status                      TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'acknowledged', 'closed')),
  patient_visible_status_text TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_requests_visit
  ON escalation_requests(clinic_id, visit_id, created_at DESC)
  WHERE visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalation_requests_status
  ON escalation_requests(clinic_id, status, created_at DESC);

DROP TRIGGER IF EXISTS escalation_requests_updated_at ON escalation_requests;
CREATE TRIGGER escalation_requests_updated_at
  BEFORE UPDATE ON escalation_requests
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

ALTER TABLE escalation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY escalation_requests_service_all ON escalation_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY escalation_requests_staff_own ON escalation_requests
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id
      FROM clinic_users cu
      WHERE cu.user_id = auth.uid()
    )
  );
