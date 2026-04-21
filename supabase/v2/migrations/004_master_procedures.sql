-- ============================================================
-- 004_master_procedures.sql
-- ============================================================
-- PURPOSE
--   Global procedure catalog. Clinic-specific procedures
--   (005_procedures) may optionally reference a master entry
--   via master_id for standardization and future marketplace
--   features.
--
--   This table is NOT tenant-scoped — it is shared across all
--   clinics. Only service_role and authenticated staff can
--   read it (see 015_rls.sql).
--
-- ROLLBACK
--   DROP TABLE IF EXISTS master_procedures CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS master_procedures (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Machine-readable slug for API lookups and seeding
  -- e.g. "filler-nasolabial", "botox-forehead"
  slug        TEXT    NOT NULL UNIQUE,

  -- Display names by language
  name_ko     TEXT    NOT NULL,
  name_en     TEXT,
  name_ja     TEXT,
  name_zh     TEXT,

  -- Broad treatment category for filtering
  category    TEXT,   -- e.g. "filler", "botox", "laser", "thread"

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: master catalog is append-only in practice.
  -- Changes to procedure data happen in clinic-specific procedures.
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_procedures_slug
  ON master_procedures(slug);

CREATE INDEX IF NOT EXISTS idx_master_procedures_category
  ON master_procedures(category);

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE master_procedures ENABLE ROW LEVEL SECURITY;
