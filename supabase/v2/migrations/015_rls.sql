-- ============================================================
-- 015_rls.sql
-- ============================================================
-- PURPOSE
--   Centralized Row Level Security policies for all v2 tables.
--
--   All tables have RLS ENABLED by their individual migration
--   files. Policies are defined here in one place so the
--   full security surface is visible and auditable.
--
-- POLICY PATTERN
--   service_role: full access to everything (Express server
--     uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS entirely,
--     but an explicit policy makes intent clear and provides
--     a safety net if the key is accidentally downgraded).
--
--   authenticated (staff): can read/write their own clinic's
--     data only. Clinic is resolved from JWT app_metadata:
--       (auth.jwt()->'app_metadata'->>'clinic_id')::uuid
--     This is the UUID set by the signup trigger in 003.
--
--   anon: NO access to any table. All patient access goes
--     through the Express server with requirePatientToken()
--     middleware, not through direct Supabase client calls.
--     This closes the cross-tenant data leak that existed in v1.
--
-- TABLES NOT COVERED HERE
--   master_procedures: global catalog, readable by all
--     authenticated users regardless of clinic.
--
-- ROLLBACK
--   To remove all policies, run:
--     DO $$ DECLARE r RECORD;
--     BEGIN
--       FOR r IN SELECT policyname, tablename FROM pg_policies
--                WHERE schemaname = 'public'
--       LOOP
--         EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
--       END LOOP;
--     END $$;
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Helper: resolve clinic_id from JWT (authenticated staff)
--   Returns NULL if not authenticated or no clinic_id in JWT.
--   Used in USING / WITH CHECK clauses below.
-- ─────────────────────────────────────────────────────────────
-- NOTE: Not a function — inlined as expression for performance.
-- Expression: (auth.jwt()->'app_metadata'->>'clinic_id')::uuid

-- ─────────────────────────────────────────────────────────────
-- clinics
-- ─────────────────────────────────────────────────────────────
CREATE POLICY clinics_service_all ON clinics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY clinics_staff_own ON clinics
  FOR SELECT TO authenticated
  USING (id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- clinic_users
-- ─────────────────────────────────────────────────────────────
CREATE POLICY clinic_users_service_all ON clinic_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY clinic_users_staff_own ON clinic_users
  FOR SELECT TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- master_procedures (global catalog — any authenticated user)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY master_procedures_service_all ON master_procedures
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY master_procedures_staff_read ON master_procedures
  FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- procedures
-- ─────────────────────────────────────────────────────────────
CREATE POLICY procedures_service_all ON procedures
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY procedures_staff_own ON procedures
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- procedures_knowledge
-- ─────────────────────────────────────────────────────────────
CREATE POLICY knowledge_service_all ON procedures_knowledge
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY knowledge_staff_own ON procedures_knowledge
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- patients
-- ─────────────────────────────────────────────────────────────
CREATE POLICY patients_service_all ON patients
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY patients_staff_own ON patients
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- visits
-- ─────────────────────────────────────────────────────────────
CREATE POLICY visits_service_all ON visits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY visits_staff_own ON visits
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- patient_links
-- ─────────────────────────────────────────────────────────────
CREATE POLICY patient_links_service_all ON patient_links
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY patient_links_staff_own ON patient_links
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- conversations
-- ─────────────────────────────────────────────────────────────
CREATE POLICY conversations_service_all ON conversations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY conversations_staff_own ON conversations
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────────────────────────
CREATE POLICY messages_service_all ON messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY messages_staff_own ON messages
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- form_templates
-- ─────────────────────────────────────────────────────────────
CREATE POLICY form_templates_service_all ON form_templates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY form_templates_staff_own ON form_templates
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- form_submissions
-- ─────────────────────────────────────────────────────────────
CREATE POLICY form_submissions_service_all ON form_submissions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY form_submissions_staff_own ON form_submissions
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- patient_interactions
-- ─────────────────────────────────────────────────────────────
CREATE POLICY patient_interactions_service_all ON patient_interactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY patient_interactions_staff_own ON patient_interactions
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- patient_journey_events
-- ─────────────────────────────────────────────────────────────
CREATE POLICY journey_events_service_all ON patient_journey_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY journey_events_staff_own ON patient_journey_events
  FOR SELECT TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- Staff can insert events but not update/delete (append-only enforced via policy)
CREATE POLICY journey_events_staff_insert ON patient_journey_events
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- audit_logs
-- ─────────────────────────────────────────────────────────────
CREATE POLICY audit_logs_service_all ON audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- audit_logs.clinic_id is TEXT — cast comparison
CREATE POLICY audit_logs_staff_read ON audit_logs
  FOR SELECT TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::text);

-- ─────────────────────────────────────────────────────────────
-- session_logs
-- ─────────────────────────────────────────────────────────────
CREATE POLICY session_logs_service_all ON session_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY session_logs_staff_own ON session_logs
  FOR SELECT TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- exports
-- ─────────────────────────────────────────────────────────────
CREATE POLICY exports_service_all ON exports
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY exports_staff_own ON exports
  FOR ALL TO authenticated
  USING (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid)
  WITH CHECK (clinic_id = (auth.jwt()->'app_metadata'->>'clinic_id')::uuid);

-- ─────────────────────────────────────────────────────────────
-- Verification query (run after applying to confirm coverage)
-- ─────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
