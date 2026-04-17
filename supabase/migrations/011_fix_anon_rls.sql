-- ============================================================
-- TikiChat — anon 역할 RLS 임시 허용 (011_fix_anon_rls.sql)
--
-- 문제:
--   Railway에 SUPABASE_SERVICE_ROLE_KEY가 없으면 서버가 anon 키로
--   Supabase에 접속함. anon 역할에 대한 정책이 없어서 모든 INSERT/
--   SELECT가 RLS 위반 오류 또는 HTTP 500 발생.
--
-- 이 파일의 역할:
--   anon 역할에 대해 clinic_id 기반 접근 허용 정책 추가.
--   (Express 서버가 인증 후 clinic_id를 제공하므로 실질적으로 안전)
--
-- 영구 해결책:
--   Railway → Variables에 SUPABASE_SERVICE_ROLE_KEY 설정.
--   그러면 서버가 service_role로 접속하고 이 정책은 사용되지 않음.
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. procedures 테이블 — anon 역할 정책 추가
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_procedures_access" ON procedures;

CREATE POLICY "anon_procedures_access" ON procedures
  FOR ALL TO anon
  USING (
    clinic_id IS NOT NULL
    AND clinic_id != ''
  )
  WITH CHECK (
    clinic_id IS NOT NULL
    AND clinic_id != ''
  );

-- ─────────────────────────────────────────────────────────────
-- 2. procedures_knowledge 테이블 — anon 역할 정책 추가
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_knowledge_access" ON procedures_knowledge;

CREATE POLICY "anon_knowledge_access" ON procedures_knowledge
  FOR ALL TO anon
  USING (
    clinic_id IS NOT NULL
    AND clinic_id != ''
  )
  WITH CHECK (
    clinic_id IS NOT NULL
    AND clinic_id != ''
  );

-- ─────────────────────────────────────────────────────────────
-- 3. master_procedures — anon SELECT 허용 (템플릿 목록 읽기용)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_master_read" ON master_procedures;

CREATE POLICY "anon_master_read" ON master_procedures
  FOR SELECT TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 4. 확인 — 적용된 RLS 정책 목록 조회
-- ─────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('procedures', 'procedures_knowledge', 'master_procedures')
ORDER BY tablename, policyname;
