-- ============================================================
-- 031_aftercare_engine.sql
-- ============================================================
-- PURPOSE
--   Phase 10 — Aftercare / follow-up automation
--   Minimal v2 aftercare engine for safety + retention automation.
-- ============================================================

CREATE TABLE IF NOT EXISTS aftercare_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aftercare_plans_clinic_procedure
  ON aftercare_plans(clinic_id, procedure_id, is_active);

DROP TRIGGER IF EXISTS aftercare_plans_updated_at ON aftercare_plans;
CREATE TRIGGER aftercare_plans_updated_at
  BEFORE UPDATE ON aftercare_plans
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TABLE IF NOT EXISTS aftercare_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES aftercare_plans(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  trigger_offset_hours INTEGER NOT NULL,
  message_template_key TEXT NOT NULL,
  form_template_key TEXT,
  escalation_policy_key TEXT,
  next_action_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  content_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aftercare_steps_plan_key
  ON aftercare_steps(plan_id, step_key);

CREATE INDEX IF NOT EXISTS idx_aftercare_steps_plan_sort
  ON aftercare_steps(plan_id, sort_order, trigger_offset_hours);

DROP TRIGGER IF EXISTS aftercare_steps_updated_at ON aftercare_steps;
CREATE TRIGGER aftercare_steps_updated_at
  BEFORE UPDATE ON aftercare_steps
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TABLE IF NOT EXISTS patient_aftercare_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES aftercare_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_aftercare_runs_visit
  ON patient_aftercare_runs(visit_id);

CREATE INDEX IF NOT EXISTS idx_patient_aftercare_runs_clinic_status
  ON patient_aftercare_runs(clinic_id, status, started_at DESC);

DROP TRIGGER IF EXISTS patient_aftercare_runs_updated_at ON patient_aftercare_runs;
CREATE TRIGGER patient_aftercare_runs_updated_at
  BEFORE UPDATE ON patient_aftercare_runs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TABLE IF NOT EXISTS patient_aftercare_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES patient_aftercare_runs(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES aftercare_steps(id) ON DELETE RESTRICT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (response_status IN ('scheduled', 'due', 'responded', 'reviewed')),
  risk_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (risk_level IN ('normal', 'watch', 'concern', 'urgent')),
  escalation_request_id UUID REFERENCES escalation_requests(id) ON DELETE SET NULL,
  urgent_flag BOOLEAN NOT NULL DEFAULT FALSE,
  next_action_status TEXT,
  safe_for_return BOOLEAN NOT NULL DEFAULT FALSE,
  staff_reviewed_at TIMESTAMPTZ,
  staff_reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_aftercare_events_due
  ON patient_aftercare_events(response_status, scheduled_for, risk_level);

CREATE INDEX IF NOT EXISTS idx_patient_aftercare_events_run
  ON patient_aftercare_events(run_id, scheduled_for);

DROP TRIGGER IF EXISTS patient_aftercare_events_updated_at ON patient_aftercare_events;
CREATE TRIGGER patient_aftercare_events_updated_at
  BEFORE UPDATE ON patient_aftercare_events
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TABLE IF NOT EXISTS patient_aftercare_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES patient_aftercare_events(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived_signals_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_aftercare_responses_event
  ON patient_aftercare_responses(event_id);

DROP TRIGGER IF EXISTS patient_aftercare_responses_updated_at ON patient_aftercare_responses;
CREATE TRIGGER patient_aftercare_responses_updated_at
  BEFORE UPDATE ON patient_aftercare_responses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

