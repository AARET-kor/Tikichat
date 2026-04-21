-- ============================================================
-- 011_forms.sql
-- ============================================================
-- PURPOSE
--   Form templates and patient form submissions.
--
--   form_templates: clinic-specific form definitions (intake,
--     consent, followup). The fields column holds the form
--     schema as JSONB (question type, order, required flag,
--     i18n labels). This is the one place where JSONB is the
--     right choice because form structure is genuinely flexible
--     and varies per clinic.
--
--   form_submissions: patient answers. data JSONB holds the
--     submitted answers keyed by field_id. Submissions are
--     immutable records — never updated after insert.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS form_submissions CASCADE;
--   DROP TABLE IF EXISTS form_templates CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS form_templates (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id     UUID    NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  form_type     TEXT    NOT NULL
    CHECK (form_type IN ('intake', 'consent', 'followup', 'custom')),

  -- Display name shown to staff and patient
  title_ko      TEXT    NOT NULL,
  title_en      TEXT,

  -- Form schema: array of field definitions
  -- Each field: { id, type, label_ko, label_en, required, options? }
  -- types: "text", "textarea", "radio", "checkbox", "date", "signature"
  fields        JSONB   NOT NULL DEFAULT '[]',

  -- Whether this template is currently offered to patients
  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- Version tracking: increment when fields change so submissions
  -- can be matched to the schema version they were filled against
  version       INT     NOT NULL DEFAULT 1,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id       UUID    NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  template_id     UUID    NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
  patient_id      UUID    NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id        UUID    REFERENCES visits(id) ON DELETE SET NULL,

  -- The template version at time of submission (schema snapshot)
  template_version INT   NOT NULL DEFAULT 1,

  -- Patient answers: { field_id: answer_value }
  data            JSONB   NOT NULL DEFAULT '{}',

  -- Submission status
  status          TEXT    NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reviewed')),

  -- Staff reviewer (clinic_users.user_id) and review timestamp
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,

  -- Access context: which patient_link was used to submit
  submitted_via   UUID    REFERENCES patient_links(id) ON DELETE SET NULL,

  -- Denormalized form type for fast filtering (intake / consent / followup)
  -- Mirrors form_templates.form_type at submission time
  form_type       TEXT    CHECK (form_type IN ('intake', 'consent', 'followup', 'custom')),

  -- Patient's preferred language at time of submission
  patient_lang    TEXT,

  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: submissions are immutable records.
  -- Status changes (draft→submitted→reviewed) are the only
  -- mutations, tracked via status + reviewed_by + reviewed_at.
);

-- ─────────────────────────────────────────────────────────────
-- Indexes — form_templates
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_form_templates_clinic_type
  ON form_templates(clinic_id, form_type)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────
-- Indexes — form_submissions
-- ─────────────────────────────────────────────────────────────

-- Visit forms dashboard: all submissions for a visit
CREATE INDEX IF NOT EXISTS idx_form_submissions_visit
  ON form_submissions(visit_id, template_id)
  WHERE visit_id IS NOT NULL;

-- Patient form history
CREATE INDEX IF NOT EXISTS idx_form_submissions_patient
  ON form_submissions(patient_id, submitted_at DESC);

-- Unreviewed submissions queue
CREATE INDEX IF NOT EXISTS idx_form_submissions_unreviewed
  ON form_submissions(clinic_id, submitted_at DESC)
  WHERE status = 'submitted' AND reviewed_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger (form_templates only)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS form_templates_updated_at ON form_templates;
CREATE TRIGGER form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
