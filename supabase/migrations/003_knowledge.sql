-- ============================================================
-- TikiChat — AI 지식 베이스 테이블 + RAG 함수 마이그레이션
-- Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. pgvector 확장 (Supabase Pro는 기본 활성화)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- 1. procedures_knowledge 테이블
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedures_knowledge (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      TEXT NOT NULL,
  file_name      TEXT NOT NULL,                    -- 원본 파일명
  file_type      TEXT NOT NULL DEFAULT 'txt',      -- pdf | docx | txt | csv
  file_size      INT DEFAULT 0,                    -- bytes
  procedure_name TEXT NOT NULL DEFAULT '',         -- 파일명 또는 수동 라벨
  chunk_index    INT NOT NULL DEFAULT 0,
  content        TEXT NOT NULL,
  embedding      vector(1536),                     -- OpenAI text-embedding-3-small
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_clinic_id   ON procedures_knowledge(clinic_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_file        ON procedures_knowledge(clinic_id, file_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding   ON procedures_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedures_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_select_own" ON procedures_knowledge;
DROP POLICY IF EXISTS "knowledge_insert_own" ON procedures_knowledge;
DROP POLICY IF EXISTS "knowledge_delete_own" ON procedures_knowledge;

CREATE POLICY "knowledge_select_own" ON procedures_knowledge
  FOR SELECT USING (
    clinic_id = coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'clinic_id'),
      current_setting('app.current_clinic_id', true)
    )
  );

CREATE POLICY "knowledge_insert_own" ON procedures_knowledge
  FOR INSERT WITH CHECK (
    clinic_id = coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'clinic_id'),
      current_setting('app.current_clinic_id', true)
    )
  );

CREATE POLICY "knowledge_delete_own" ON procedures_knowledge
  FOR DELETE USING (
    clinic_id = coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'clinic_id'),
      current_setting('app.current_clinic_id', true)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. match_procedures — 벡터 유사도 검색 (clinic_id 필터 추가)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_procedures(
  query_embedding  vector(1536),
  query_text       TEXT,
  match_count      INT     DEFAULT 5,
  clinic_id_filter TEXT    DEFAULT NULL   -- NULL = 전체 (하위호환)
)
RETURNS TABLE (
  id             UUID,
  clinic_id      TEXT,
  procedure_name TEXT,
  content        TEXT,
  similarity     FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pk.id,
    pk.clinic_id,
    pk.procedure_name,
    pk.content,
    1 - (pk.embedding <=> query_embedding) AS similarity
  FROM procedures_knowledge pk
  WHERE
    pk.embedding IS NOT NULL
    AND (clinic_id_filter IS NULL OR pk.clinic_id = clinic_id_filter)
  ORDER BY pk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. search_procedures_keyword — 전문 검색 (clinic_id 필터 추가)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_procedures_keyword(
  query_text       TEXT,
  match_count      INT  DEFAULT 5,
  clinic_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  clinic_id      TEXT,
  procedure_name TEXT,
  content        TEXT,
  rank           FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pk.id,
    pk.clinic_id,
    pk.procedure_name,
    pk.content,
    ts_rank(
      to_tsvector('simple', pk.content),
      plainto_tsquery('simple', query_text)
    ) AS rank
  FROM procedures_knowledge pk
  WHERE
    (clinic_id_filter IS NULL OR pk.clinic_id = clinic_id_filter)
    AND to_tsvector('simple', pk.content) @@ plainto_tsquery('simple', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 완료 확인
-- ─────────────────────────────────────────────────────────────
SELECT
  'procedures_knowledge' AS "table",
  COUNT(*) AS rows
FROM procedures_knowledge;
