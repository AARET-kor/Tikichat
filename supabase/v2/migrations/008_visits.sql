-- ============================================================
-- 008_visits.sql
-- ============================================================
-- PURPOSE
--   Visit records: the single stage machine for a patient's
--   treatment journey. Replaces the dual-tracking pattern
--   (aftercare_records kanban + visits stage) from v1.
--
-- STAGE MACHINE
--   booked → pre_visit → treatment → post_care → followup → closed
--
--   Stage transitions are recorded as patient_journey_events
--   (013_patient_journey_events). Do not store transition
--   history in the visits row itself.
--
-- FORM COMPLETION DENORM
--   intake_done / consent_done / followup_done are boolean
--   denormalized flags kept in sync by the Express server
--   after each form_submission INSERT. They exist for fast
--   visual indicators in the coordinator dashboard without
--   joining form_submissions on every row.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS visits CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS visits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_id    UUID        REFERENCES procedures(id) ON DELETE SET NULL,

  -- Stage machine
  stage           TEXT        NOT NULL DEFAULT 'booked'
    CHECK (stage IN (
      'booked',
      'pre_visit',
      'treatment',
      'post_care',
      'followup',
      'closed'
    )),

  -- Scheduled appointment datetime
  visit_date      TIMESTAMPTZ,

  -- Coordinator assignment (clinic_users.user_id)
  coordinator_id  UUID,

  -- Denormalized form completion indicators (see PURPOSE above)
  intake_done     BOOLEAN     NOT NULL DEFAULT false,
  consent_done    BOOLEAN     NOT NULL DEFAULT false,
  followup_done   BOOLEAN     NOT NULL DEFAULT false,

  -- Staff-visible internal tags (e.g. ["needs-interpreter", "high-risk"])
  internal_tags   TEXT[]      NOT NULL DEFAULT '{}',

  -- Staff-visible notes for this specific visit
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Coordinator dashboard: all visits for a clinic ordered by date
CREATE INDEX IF NOT EXISTS idx_visits_clinic_date
  ON visits(clinic_id, visit_date DESC NULLS LAST);

-- Patient history view
CREATE INDEX IF NOT EXISTS idx_visits_patient
  ON visits(patient_id, created_at DESC);

-- Stage filter (e.g. all booked visits for today)
CREATE INDEX IF NOT EXISTS idx_visits_clinic_stage
  ON visits(clinic_id, stage, visit_date DESC NULLS LAST);

-- Coordinator workload (their assigned open visits)
CREATE INDEX IF NOT EXISTS idx_visits_coordinator
  ON visits(coordinator_id, stage)
  WHERE coordinator_id IS NOT NULL;

-- Internal tag search
CREATE INDEX IF NOT EXISTS idx_visits_internal_tags
  ON visits USING GIN(internal_tags);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS visits_updated_at ON visits;
CREATE TRIGGER visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
