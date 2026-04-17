-- ============================================================
-- 013 — patients 테이블 anon RLS + channel_user_id 컬럼 추가
-- Supabase SQL Editor → Run
-- ============================================================

-- 1. channel_user_id 컬럼 추가 (채널별 고유 ID)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS channel_user_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS patients_channel_uid_idx ON patients(clinic_id, channel_user_id);

-- 2. anon 역할 접근 허용 (서버가 service_role_key 없이 anon으로 접근하는 경우 대비)
DROP POLICY IF EXISTS "patients_anon_access" ON patients;
CREATE POLICY "patients_anon_access" ON patients
  FOR ALL TO anon
  USING (clinic_id IS NOT NULL AND clinic_id != '')
  WITH CHECK (clinic_id IS NOT NULL AND clinic_id != '');

-- 3. authenticated 역할 접근 허용
DROP POLICY IF EXISTS "patients_auth_access" ON patients;
CREATE POLICY "patients_auth_access" ON patients
  FOR ALL TO authenticated
  USING (clinic_id IS NOT NULL AND clinic_id != '')
  WITH CHECK (clinic_id IS NOT NULL AND clinic_id != '');

-- 4. 확인
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'patients';
