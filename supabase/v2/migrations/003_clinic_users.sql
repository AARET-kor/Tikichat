-- ============================================================
-- 003_clinic_users.sql
-- ============================================================
-- PURPOSE
--   Authoritative staff ↔ clinic membership table.
--   auth.users handles authentication only; clinic_users
--   answers: "who are the staff of clinic X, what role do
--   they have, and are they still active?"
--
-- AUTH INTEGRATION
--   • user_id is auth.users.id (UUID) — no FK possible across
--     schemas in standard migrations, stored for cross-reference
--   • The signup trigger below stamps clinic_id (UUID string)
--     and role into auth.users.raw_app_meta_data so that JWTs
--     carry app_metadata.clinic_id and app_metadata.role
--   • Express server reads JWT app_metadata to verify access;
--     clinic_users is used for roster queries and deactivation
--
-- ROLLBACK
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS handle_new_staff_signup();
--   DROP TABLE IF EXISTS clinic_users CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id    UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Supabase auth link (no cross-schema FK)
  user_id      UUID        NOT NULL,
  email        TEXT        NOT NULL,

  role         TEXT        NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'admin', 'staff')),
  is_active    BOOLEAN     NOT NULL DEFAULT true,

  invited_by   UUID,       -- auth.users.id of inviting user
  invited_at   TIMESTAMPTZ,

  last_seen_at TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (clinic_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Login check: user_id → their clinic(s)
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_id
  ON clinic_users(user_id);

-- Roster: all active staff for a clinic
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic_active
  ON clinic_users(clinic_id, is_active)
  WHERE is_active = true;

-- Role filter: find all owners / admins for a clinic
CREATE INDEX IF NOT EXISTS idx_clinic_users_role
  ON clinic_users(clinic_id, role);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS clinic_users_updated_at ON clinic_users;
CREATE TRIGGER clinic_users_updated_at
  BEFORE UPDATE ON clinic_users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Auth signup trigger
--   When a new Supabase auth user signs up, if their raw_user_meta_data
--   contains a clinic_id (UUID string) and a clinic_users row
--   exists for that (clinic_id, user_id) pair, stamp the
--   app_metadata so the JWT carries the correct clinic_id and role.
--
--   NOTE: This trigger fires AFTER INSERT on auth.users.
--   The clinic_users row must already exist (inserted via
--   service_role invite flow) before the user completes signup.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_staff_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clinic_id UUID;
  v_role      TEXT;
BEGIN
  -- Resolve clinic_id from signup metadata
  v_clinic_id := (NEW.raw_user_meta_data ->> 'clinic_id')::uuid;

  IF v_clinic_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up role from clinic_users
  SELECT role INTO v_role
  FROM public.clinic_users
  WHERE clinic_id = v_clinic_id AND user_id = NEW.id;

  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  -- Stamp app_metadata so the JWT carries clinic_id (as string) + role
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object(
         'clinic_id', v_clinic_id::text,
         'role',      v_role
       )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_staff_signup();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
