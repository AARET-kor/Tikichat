-- ============================================================
-- 005_procedures.sql
-- ============================================================
-- PURPOSE
--   Clinic-specific procedure catalog. Each row belongs to one
--   clinic and represents a procedure that clinic offers, with
--   pricing, timing, and AI-visible effect/caution text.
--
--   master_id (nullable) links to master_procedures for
--   standardization. If NULL, this is a clinic-exclusive
--   procedure not in the global catalog.
--
-- SERVER USAGE
--   buildSystemBase() reads:
--     name_ko, price_range, downtime, duration, effects_ko
--   These column names must not be changed without updating
--   the system prompt builder.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS procedures CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS procedures (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id    UUID    NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Optional link to global catalog
  master_id    UUID    REFERENCES master_procedures(id) ON DELETE SET NULL,

  -- Display names
  name_ko      TEXT    NOT NULL,
  name_en      TEXT,
  name_ja      TEXT,
  name_zh      TEXT,

  -- Patient-facing info shown in AI system prompt
  description  TEXT,
  price_range  TEXT,   -- e.g. "30만원~50만원"
  duration     TEXT,   -- e.g. "20-30분"
  downtime     TEXT,   -- e.g. "1-2일"

  -- Arrays of effects and cautions for system prompt (Korean)
  -- TEXT[] is GIN-indexable and easier to query than JSONB
  effects_ko   TEXT[]  NOT NULL DEFAULT '{}',
  cautions_ko  TEXT[]  NOT NULL DEFAULT '{}',

  -- Ordering within clinic's procedure list
  sort_order   INT     NOT NULL DEFAULT 0,

  is_active    BOOLEAN NOT NULL DEFAULT true,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Primary: all active procedures for a clinic (system prompt build)
CREATE INDEX IF NOT EXISTS idx_procedures_clinic_active
  ON procedures(clinic_id, is_active, sort_order)
  WHERE is_active = true;

-- Master catalog link
CREATE INDEX IF NOT EXISTS idx_procedures_master
  ON procedures(master_id)
  WHERE master_id IS NOT NULL;

-- GIN indexes for array search
CREATE INDEX IF NOT EXISTS idx_procedures_effects_gin
  ON procedures USING GIN(effects_ko);

CREATE INDEX IF NOT EXISTS idx_procedures_cautions_gin
  ON procedures USING GIN(cautions_ko);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS procedures_updated_at ON procedures;
CREATE TRIGGER procedures_updated_at
  BEFORE UPDATE ON procedures
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
