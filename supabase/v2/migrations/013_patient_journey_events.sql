-- ============================================================
-- 013_patient_journey_events.sql
-- ============================================================
-- PURPOSE
--   Append-only event log for the patient journey. Every
--   meaningful state change, communication, or staff action
--   is recorded here as an immutable event.
--
--   This is the audit trail and the data source for:
--     • Visit timeline in coordinator dashboard
--     • Patient history in My Tiki portal
--     • Aftercare follow-up tracking
--     • Analytics (funnel, drop-off, stage duration)
--
-- IMMUTABILITY
--   Do NOT update or delete rows. If an event was recorded
--   incorrectly, add a corrective event (e.g. 'manual_entry'
--   with a note explaining the correction).
--
-- EVENT PAYLOAD
--   The payload column is type-specific JSONB. Examples:
--
--   stage_changed:
--     { "from": "booked", "to": "pre_visit" }
--
--   link_generated:
--     { "link_id": "uuid", "link_type": "intake",
--       "expires_at": "2025-12-01T00:00:00Z" }
--
--   aftercare_d1_sent:
--     { "channel": "kakao", "message_id": "...", "lang": "ko" }
--
--   risk_flagged:
--     { "risk_type": "allergy", "detail": "latex 알레르기",
--       "severity": "high" }
--
--   note_added:
--     { "text": "환자 내원 확인", "visibility": "staff_only" }
--
--   export_created:
--     { "format": "pdf", "entity": "form_submission",
--       "entity_id": "uuid" }
--
-- ROLLBACK
--   DROP TABLE IF EXISTS patient_journey_events CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_journey_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id    UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id   UUID        REFERENCES patients(id) ON DELETE SET NULL,
  visit_id     UUID        REFERENCES visits(id) ON DELETE SET NULL,

  event_type   TEXT        NOT NULL
    CHECK (event_type IN (
      -- Visit lifecycle
      'visit_created',
      'stage_changed',
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
    )),

  actor_type   TEXT        NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('staff', 'patient', 'system')),
  actor_id     TEXT,       -- clinic_users.user_id::text or 'system'

  -- Type-specific payload (see examples in PURPOSE above)
  payload      JSONB       NOT NULL DEFAULT '{}',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: this table is append-only.
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Visit timeline (primary coordinator view)
CREATE INDEX IF NOT EXISTS idx_journey_events_visit
  ON patient_journey_events(visit_id, created_at DESC)
  WHERE visit_id IS NOT NULL;

-- Patient history feed (My Tiki portal)
CREATE INDEX IF NOT EXISTS idx_journey_events_patient
  ON patient_journey_events(patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

-- Clinic-level event feed
CREATE INDEX IF NOT EXISTS idx_journey_events_clinic_time
  ON patient_journey_events(clinic_id, created_at DESC);

-- Event type filter (e.g. all risk_flagged events for a clinic)
CREATE INDEX IF NOT EXISTS idx_journey_events_type
  ON patient_journey_events(clinic_id, event_type, created_at DESC);

-- Actor filter (all events by a specific staff member)
CREATE INDEX IF NOT EXISTS idx_journey_events_actor
  ON patient_journey_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Useful view: risk events for coordinator dashboard
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW clinic_risk_events AS
SELECT
  e.clinic_id,
  e.patient_id,
  p.name          AS patient_name,
  p.flag          AS patient_flag,
  e.visit_id,
  e.event_type,
  e.payload,
  e.actor_id,
  e.created_at
FROM patient_journey_events e
LEFT JOIN patients p ON p.id = e.patient_id
WHERE e.event_type IN ('risk_flagged', 'risk_cleared')
ORDER BY e.created_at DESC;

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE patient_journey_events ENABLE ROW LEVEL SECURITY;
