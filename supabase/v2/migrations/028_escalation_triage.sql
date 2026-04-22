-- ============================================================
-- 028_escalation_triage.sql
-- ============================================================
-- PURPOSE
--   Phase 7 — Escalation triage engine
--   Extends escalation_requests from a minimal patient request
--   into an operational triage object with assignment, status,
--   priority, timestamps, and Ops Board task visibility.
-- ============================================================

ALTER TABLE escalation_requests
  ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalation_type TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS assigned_role TEXT,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE escalation_requests
SET
  source_message_id = COALESCE(source_message_id, message_id),
  escalation_type = COALESCE(
    escalation_type,
    CASE reason_category
      WHEN 'logistics' THEN 'simple_logistics'
      WHEN 'forms_or_consent' THEN 'simple_logistics'
      WHEN 'procedure_prep' THEN 'simple_logistics'
      WHEN 'booking_or_billing' THEN 'billing_or_booking'
      WHEN 'aftercare_concern' THEN 'aftercare_concern'
      WHEN 'symptom_concern' THEN 'symptom_concern'
      WHEN 'urgent_risk' THEN 'urgent_risk'
      WHEN 'doctor_required' THEN 'doctor_required'
      ELSE 'simple_logistics'
    END
  ),
  priority = COALESCE(
    priority,
    CASE reason_category
      WHEN 'urgent_risk' THEN 'urgent'
      WHEN 'doctor_required' THEN 'high'
      WHEN 'symptom_concern' THEN 'high'
      WHEN 'aftercare_concern' THEN 'high'
      ELSE 'normal'
    END
  ),
  assigned_role = COALESCE(
    assigned_role,
    CASE request_type
      WHEN 'doctor_confirmation' THEN 'doctor'
      WHEN 'nurse' THEN 'nurse'
      WHEN 'coordinator' THEN 'coordinator'
      ELSE 'front_desk'
    END
  ),
  opened_at = COALESCE(opened_at, created_at)
WHERE escalation_type IS NULL
   OR priority IS NULL
   OR assigned_role IS NULL
   OR opened_at IS NULL
   OR source_message_id IS NULL;

ALTER TABLE escalation_requests
  ALTER COLUMN escalation_type SET NOT NULL,
  ALTER COLUMN priority SET NOT NULL,
  ALTER COLUMN assigned_role SET NOT NULL,
  ALTER COLUMN opened_at SET NOT NULL;

ALTER TABLE escalation_requests
  DROP CONSTRAINT IF EXISTS escalation_requests_status_check;

ALTER TABLE escalation_requests
  ADD CONSTRAINT escalation_requests_status_check
  CHECK (status IN ('requested', 'assigned', 'acknowledged', 'responded', 'resolved', 'closed'));

ALTER TABLE escalation_requests
  ADD CONSTRAINT escalation_requests_type_check
  CHECK (escalation_type IN (
    'simple_logistics',
    'billing_or_booking',
    'symptom_concern',
    'aftercare_concern',
    'urgent_risk',
    'doctor_required'
  ));

ALTER TABLE escalation_requests
  ADD CONSTRAINT escalation_requests_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE escalation_requests
  ADD CONSTRAINT escalation_requests_assigned_role_check
  CHECK (assigned_role IN ('coordinator', 'nurse', 'doctor', 'front_desk'));

CREATE INDEX IF NOT EXISTS idx_escalation_requests_ops
  ON escalation_requests(clinic_id, status, priority, assigned_role, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalation_requests_assignee
  ON escalation_requests(clinic_id, assigned_user_id, status, opened_at DESC)
  WHERE assigned_user_id IS NOT NULL;
