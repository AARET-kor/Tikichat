-- ============================================================
-- 035_memory_direct_edit.sql
-- ============================================================
-- PURPOSE
--   Allow staff to directly maintain patient-specific operating
--   Memory without turning Memory into raw CRM/EMR storage.
-- ============================================================

ALTER TABLE patient_interactions
  ADD COLUMN IF NOT EXISTS staff_precautions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS staff_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patient_interactions_last_edited
  ON patient_interactions(clinic_id, last_edited_at DESC)
  WHERE last_edited_at IS NOT NULL;
