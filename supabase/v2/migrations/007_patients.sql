-- ============================================================
-- 007_patients.sql
-- ============================================================
-- PURPOSE
--   Patient records. UUID PK throughout — no platform-specific
--   IDs used as primary keys.
--
-- KEY DESIGN DECISIONS
--   channel_refs JSONB: Stores per-channel external IDs as a
--     map rather than columns. Avoids schema changes when a
--     new messaging channel is added.
--     Example: { "kakao": "kakao_uid_xyz", "whatsapp": "+821012345678" }
--
--   birth_year INT (not DATE): Reduces PII sensitivity while
--     preserving age-relevant treatment context for AI prompts.
--
--   tags TEXT[]: GIN-indexed free-form labels assigned by
--     staff (e.g. "VIP", "repeat", "allergy-latex"). TEXT[]
--     is simpler to query than JSONB for flat string arrays.
--
--   flag TEXT: High-priority alert visible in coordinator UI.
--     Intentionally a single string, not an array. Multiple
--     concerns should be consolidated into one clear warning.
--
--   No DOB, no full phone stored as PK: channel_refs holds
--     the platform-specific contact handle; staff access the
--     patient record by UUID or by name search.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS patients CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id    UUID    NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Identity
  name         TEXT    NOT NULL,
  birth_year   INT,    -- e.g. 1990 (not full DOB)
  gender       TEXT    CHECK (gender IN ('M', 'F', 'other', NULL)),
  nationality  TEXT,   -- ISO 3166-1 alpha-2, e.g. "KR", "CN"

  -- Per-channel external IDs (map: channel_name → external_id)
  -- e.g. { "kakao": "uid_xxx", "whatsapp": "+821099998888" }
  channel_refs JSONB   NOT NULL DEFAULT '{}',

  -- Staff-assigned labels (GIN-indexable)
  tags         TEXT[]  NOT NULL DEFAULT '{}',

  -- Single high-priority alert for coordinator UI
  -- e.g. "라텍스 알레르기 있음 — 시술 전 반드시 확인"
  flag         TEXT,

  -- Preferred language for AI responses
  lang         TEXT,   -- e.g. "ko", "en", "ja", "zh"

  -- Clinic-internal notes (staff only, not shown to patient)
  notes        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Name search (coordinator patient lookup)
CREATE INDEX IF NOT EXISTS idx_patients_clinic_name
  ON patients(clinic_id, name);

-- Channel ref lookups (find patient by WhatsApp number, Kakao ID, etc.)
-- GIN index supports @> containment queries:
--   WHERE channel_refs @> '{"kakao": "uid_xxx"}'
CREATE INDEX IF NOT EXISTS idx_patients_channel_refs
  ON patients USING GIN(channel_refs);

-- Tag filter (e.g. all VIP patients for a clinic)
CREATE INDEX IF NOT EXISTS idx_patients_tags
  ON patients USING GIN(tags);

-- Flag filter (all patients with a flag set)
CREATE INDEX IF NOT EXISTS idx_patients_flag
  ON patients(clinic_id)
  WHERE flag IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS patients_updated_at ON patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
