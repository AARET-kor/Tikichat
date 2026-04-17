-- ============================================================
-- TikiChat — procedures.name 컬럼 스키마 충돌 해결 (012)
--
-- 문제:
--   구 스키마에 name TEXT NOT NULL 컬럼이 남아있고,
--   서버는 name_ko / name_en / name_ja / name_zh로 INSERT함.
--   → null value in column "name" violates not-null constraint
--
-- 해결:
--   1. name 컬럼을 nullable + 빈 문자열 기본값으로 변경
--   2. name_ko가 비어있는 경우 name 값으로 채우기 (데이터 보존)
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. name_ko 컬럼이 없으면 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS name_ko TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_ja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name_zh TEXT NOT NULL DEFAULT '';

-- ─────────────────────────────────────────────────────────────
-- 2. 기존 name 값을 name_ko로 복사 (데이터 유실 방지)
-- ─────────────────────────────────────────────────────────────
UPDATE procedures
SET name_ko = name
WHERE name_ko = ''
  AND name IS NOT NULL
  AND name != '';

-- ─────────────────────────────────────────────────────────────
-- 3. name 컬럼을 nullable로 변경 (서버는 더 이상 이 컬럼에 값 안 보냄)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedures
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN name SET DEFAULT '';

-- ─────────────────────────────────────────────────────────────
-- 4. 확인 — 컬럼 목록 및 NOT NULL 여부 확인
-- ─────────────────────────────────────────────────────────────
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'procedures'
ORDER BY ordinal_position;
