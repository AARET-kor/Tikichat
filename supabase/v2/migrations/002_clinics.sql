-- ============================================================
-- 002_clinics.sql
-- ============================================================
-- PURPOSE
--   The tenant anchor table. Every other table with a clinic_id
--   column references clinics(id) ON DELETE CASCADE.
--
--   slug is the human-readable identifier used in:
--     • CLINIC_SLUG env var on Railway
--     • server.js startup resolution (slug → UUID)
--     • Supabase dashboard queries during ops
--
-- ROLLBACK
--   DROP TABLE IF EXISTS clinics CASCADE;
--   (CASCADE removes all dependent FKs across the schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS clinics (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable stable identifier for ops and env vars
  -- e.g. "libhib-gangnam", "tiki-demo"
  slug           TEXT        NOT NULL UNIQUE,

  -- Display names
  clinic_name    TEXT        NOT NULL,
  clinic_short_name TEXT,
  location       TEXT,

  -- Flexible per-clinic settings: working hours, AI tone,
  -- enabled features, notification channels, etc.
  settings       JSONB       NOT NULL DEFAULT '{}',

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- slug lookup on every server startup (slug → UUID resolution)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_slug
  ON clinics(slug);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS clinics_updated_at ON clinics;
CREATE TRIGGER clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
