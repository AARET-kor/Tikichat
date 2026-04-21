-- ============================================================
-- 026_arrival_mode.sql
-- ============================================================
-- PURPOSE
--   Adds patient self-arrival support (Phase 5 — Arrival Mode).
--
--   patient_arrived_at TIMESTAMPTZ
--     Set when the patient taps "I'm here" in My Tiki portal.
--     Distinct from checked_in_at (set by staff at front desk).
--     NULL = patient has not self-signalled arrival yet.
--
--   Extends patient_journey_events.event_type CHECK constraint
--   to allow 'patient_arrived' event.
--
-- ROLLBACK
--   ALTER TABLE visits DROP COLUMN IF EXISTS patient_arrived_at;
--   ALTER TABLE patient_journey_events
--     DROP CONSTRAINT IF EXISTS patient_journey_events_event_type_check;
--   -- Re-add original constraint without 'patient_arrived'
-- ============================================================

ALTER TABLE visits ADD COLUMN IF NOT EXISTS patient_arrived_at TIMESTAMPTZ;

-- Index: Ops Board arrival-signal query (today's arrived patients per clinic)
CREATE INDEX IF NOT EXISTS idx_visits_patient_arrived
  ON visits(clinic_id, patient_arrived_at)
  WHERE patient_arrived_at IS NOT NULL;

-- Extend event_type CHECK to include 'patient_arrived'
-- (Postgres allows DROP + re-ADD constraint without table lock on small tables)
ALTER TABLE patient_journey_events
  DROP CONSTRAINT IF EXISTS patient_journey_events_event_type_check;

ALTER TABLE patient_journey_events
  ADD CONSTRAINT patient_journey_events_event_type_check
  CHECK (event_type IN (
    -- Visit lifecycle
    'visit_created',
    'stage_changed',
    -- Patient self-arrival (Phase 5)
    'patient_arrived',
    -- Communication
    'link_generated',
    'link_sent',
    'link_opened',
    'link_revoked',
    'link_expired',
    -- Forms
    'form_sent',
    'form_submitted',
    'form_reviewed',
    -- Aftercare
    'aftercare_d1_sent',
    'aftercare_d1_replied',
    'aftercare_d3_sent',
    'aftercare_d3_replied',
    'aftercare_d7_sent',
    'aftercare_d7_replied',
    -- Clinical flags
    'risk_flagged',
    'risk_cleared',
    -- Staff workflow
    'note_added',
    'coordinator_assigned',
    'no_show',
    -- AI sessions
    'tiki_talk_session',
    'tiki_room_session',
    'tiki_paste_used',
    -- Exports
    'export_created',
    -- General
    'manual_entry'
  ));
