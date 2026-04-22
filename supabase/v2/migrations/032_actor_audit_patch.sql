-- ============================================================
-- 032_actor_audit_patch.sql
-- ============================================================
-- PURPOSE
--   Batch 4B
--   1. Track staff actors for escalation state transitions
--   2. Extend patient_journey_events for explicit room/check-in events
-- ============================================================

ALTER TABLE escalation_requests
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID,
  ADD COLUMN IF NOT EXISTS responded_by UUID,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS closed_by UUID;

CREATE INDEX IF NOT EXISTS idx_escalation_requests_acknowledged_by
  ON escalation_requests(clinic_id, acknowledged_by, acknowledged_at DESC)
  WHERE acknowledged_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalation_requests_responded_by
  ON escalation_requests(clinic_id, responded_by, responded_at DESC)
  WHERE responded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalation_requests_resolved_by
  ON escalation_requests(clinic_id, resolved_by, resolved_at DESC)
  WHERE resolved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalation_requests_closed_by
  ON escalation_requests(clinic_id, closed_by, closed_at DESC)
  WHERE closed_by IS NOT NULL;

ALTER TABLE patient_journey_events
  DROP CONSTRAINT IF EXISTS patient_journey_events_event_type_check;

ALTER TABLE patient_journey_events
  ADD CONSTRAINT patient_journey_events_event_type_check
  CHECK (event_type IN (
    'visit_created',
    'stage_changed',
    'patient_arrived',
    'check_in_completed',
    'room_assigned',
    'room_cleared',
    'link_generated',
    'link_sent',
    'link_opened',
    'link_revoked',
    'link_expired',
    'form_sent',
    'form_submitted',
    'form_reviewed',
    'aftercare_d1_sent',
    'aftercare_d1_replied',
    'aftercare_d3_sent',
    'aftercare_d3_replied',
    'aftercare_d7_sent',
    'aftercare_d7_replied',
    'risk_flagged',
    'risk_cleared',
    'note_added',
    'coordinator_assigned',
    'no_show',
    'tiki_talk_session',
    'tiki_room_session',
    'tiki_paste_used',
    'export_created',
    'manual_entry'
  ));
