-- ============================================================
-- 001_extensions.sql
-- ============================================================
-- PURPOSE
--   Bootstrap: enable required extensions and define the
--   single canonical trigger function used by all tables with
--   updated_at columns. Must run first.
--
-- EXTENSIONS
--   pgvector  — 1536-dim embeddings for RAG (006_procedures_knowledge)
--   pgcrypto  — gen_random_uuid() used by all UUID PKs
--
-- ROLLBACK
--   DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
--   DROP EXTENSION IF EXISTS vector;
--   DROP EXTENSION IF EXISTS pgcrypto;
--   (Extensions rarely dropped in practice — only on full project teardown)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Canonical updated_at trigger function
-- Used by: clinics, clinic_users, patients, visits,
--           conversations, form_templates, patient_interactions
-- NOT used by append-only tables (journey_events, messages,
--   audit_logs, session_logs, exports, patient_links).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
