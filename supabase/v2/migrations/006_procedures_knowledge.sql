-- ============================================================
-- 006_procedures_knowledge.sql
-- ============================================================
-- PURPOSE
--   RAG knowledge base: chunked text + embeddings for each
--   clinic's procedures. Powers the context retrieval step
--   in Tiki Paste and Tiki Talk.
--
--   Two RPC functions provide the retrieval interface:
--     match_procedures(UUID, vector, float, int)
--       — cosine similarity search
--     search_procedures_keyword(UUID, text, int)
--       — full-text search fallback (no embedding needed)
--
--   Both take clinic_id as UUID (not TEXT as in v1).
--
-- ROLLBACK
--   DROP FUNCTION IF EXISTS search_procedures_keyword(UUID, TEXT, INT);
--   DROP FUNCTION IF EXISTS match_procedures(UUID, vector, FLOAT, INT);
--   DROP TABLE IF EXISTS procedures_knowledge CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS procedures_knowledge (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id    UUID    NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  procedure_id UUID    REFERENCES procedures(id) ON DELETE CASCADE,

  -- The raw text chunk that was embedded
  content      TEXT    NOT NULL,

  -- OpenAI text-embedding-ada-002 → 1536 dims
  -- (or any model producing 1536-dim vectors)
  embedding    vector(1536),

  -- Source metadata for debugging and re-embedding
  source_type  TEXT    NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'pdf', 'url', 'docx')),
  source_url   TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: chunks are replaced (delete + reinsert),
  -- not updated in place.
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- IVFFlat ANN index for cosine similarity search
-- lists=100 is appropriate for up to ~1M rows per clinic.
-- Rebuild with CREATE INDEX (no CONCURRENTLY) on fresh project.
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON procedures_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Clinic filter used in every query
CREATE INDEX IF NOT EXISTS idx_knowledge_clinic
  ON procedures_knowledge(clinic_id);

-- Procedure filter (to pull all chunks for one procedure)
CREATE INDEX IF NOT EXISTS idx_knowledge_procedure
  ON procedures_knowledge(procedure_id)
  WHERE procedure_id IS NOT NULL;

-- Full-text search index for keyword fallback
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts
  ON procedures_knowledge
  USING GIN (to_tsvector('simple', content));

-- ─────────────────────────────────────────────────────────────
-- RPC: match_procedures
--   Cosine similarity ANN search within a clinic.
--   Called by server.js ragRetrieve() when an embedding is
--   available (Tiki Paste, Tiki Talk).
--
--   Parameters:
--     p_clinic_id        UUID   — clinic to search within
--     p_query_embedding  vector — query embedding (1536 dims)
--     p_match_threshold  float8 — minimum similarity (e.g. 0.75)
--     p_match_count      int    — max rows to return (e.g. 5)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_procedures(
  p_clinic_id        UUID,
  p_query_embedding  vector(1536),
  p_match_threshold  float8  DEFAULT 0.75,
  p_match_count      int     DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  procedure_id UUID,
  content      TEXT,
  similarity   float8
)
LANGUAGE sql STABLE AS $$
  SELECT
    pk.id,
    pk.procedure_id,
    pk.content,
    1 - (pk.embedding <=> p_query_embedding) AS similarity
  FROM procedures_knowledge pk
  WHERE pk.clinic_id = p_clinic_id
    AND pk.embedding IS NOT NULL
    AND 1 - (pk.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY pk.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: search_procedures_keyword
--   Full-text search fallback for when embeddings are not
--   available (cold start, embedding API down, keyword-only
--   queries). Uses PostgreSQL simple dictionary (language
--   agnostic — handles Korean, Japanese, mixed text).
--
--   Parameters:
--     p_clinic_id  UUID   — clinic to search within
--     p_query      text   — raw search terms
--     p_match_count int   — max rows to return (e.g. 10)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_procedures_keyword(
  p_clinic_id   UUID,
  p_query       TEXT,
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id           UUID,
  procedure_id UUID,
  content      TEXT,
  rank         float4
)
LANGUAGE sql STABLE AS $$
  SELECT
    pk.id,
    pk.procedure_id,
    pk.content,
    ts_rank(
      to_tsvector('simple', pk.content),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM procedures_knowledge pk
  WHERE pk.clinic_id = p_clinic_id
    AND to_tsvector('simple', pk.content) @@ plainto_tsquery('simple', p_query)
  ORDER BY rank DESC
  LIMIT p_match_count;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedures_knowledge ENABLE ROW LEVEL SECURITY;
