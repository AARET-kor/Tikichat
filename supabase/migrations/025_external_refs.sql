-- ============================================================
-- 025_external_refs.sql
-- ============================================================
-- PURPOSE
--   Keep TikiDoc lightweight beside existing CRM/EMR systems.
--   These columns store only external record references needed
--   to match/import/export foreign-patient journey context.
--
-- SCOPE
--   Additive only. No inbox, no message sync, no CRM replacement.
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS external_refs JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS external_refs JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_patients_external_refs_gin
  ON patients USING gin (external_refs);

CREATE INDEX IF NOT EXISTS idx_visits_external_refs_gin
  ON visits USING gin (external_refs);

-- Optional targeted lookup helpers for common CRM/EMR matching.
CREATE INDEX IF NOT EXISTS idx_patients_external_source_patient_id
  ON patients (
    (external_refs ->> 'source'),
    (external_refs ->> 'external_patient_id')
  );

CREATE INDEX IF NOT EXISTS idx_visits_external_source_visit_id
  ON visits (
    (external_refs ->> 'source'),
    (external_refs ->> 'external_visit_id')
  );
