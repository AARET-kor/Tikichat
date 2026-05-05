-- ============================================================
-- 028_memory_direct_edit.sql
-- ============================================================
-- PURPOSE
--   Backfill-compatible direct edit fields for patient Memory.
--   This stores compact patient operating context only, not raw
--   CRM/EMR files or full conversation transcripts.
-- ============================================================

ALTER TABLE patient_interactions
  ADD COLUMN IF NOT EXISTS concerns JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS session_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_precautions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS staff_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_edited_by TEXT,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pi_last_edited
  ON patient_interactions(clinic_id, last_edited_at DESC)
  WHERE last_edited_at IS NOT NULL;
