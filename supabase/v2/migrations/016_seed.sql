-- ============================================================
-- 016_seed.sql
-- ============================================================
-- PURPOSE
--   Seed data for a demo/development clinic.
--   Run this after applying 001–015 on a fresh project.
--
--   This file is IDEMPOTENT — safe to run multiple times.
--   All inserts use ON CONFLICT DO NOTHING.
--
--   DO NOT apply this to production. Production clinics are
--   created via the admin API or Supabase dashboard, not seeds.
--
-- WHAT THIS SEEDS
--   1. Master procedures (global catalog baseline)
--   2. Demo clinic (slug: "tiki-demo")
--   3. Demo clinic procedures (linked to master)
--   4. Two knowledge chunks per procedure (for RAG testing)
--      Note: embeddings are NULL — run the embedding job
--      separately after seeding to populate vectors.
--
-- RAILWAY USAGE
--   Set CLINIC_SLUG=tiki-demo in Railway env vars.
--   The server will resolve this to the seeded clinic UUID
--   on startup.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Master procedures
-- ─────────────────────────────────────────────────────────────
INSERT INTO master_procedures (slug, name_ko, name_en, category) VALUES
  ('filler-nasolabial',    '팔자주름 필러',     'Nasolabial Fold Filler',    'filler'),
  ('filler-lips',          '입술 필러',         'Lip Filler',                'filler'),
  ('filler-cheeks',        '볼 필러',           'Cheek Filler',              'filler'),
  ('botox-forehead',       '이마 보톡스',       'Forehead Botox',            'botox'),
  ('botox-jawline',        '사각턱 보톡스',     'Jawline Botox',             'botox'),
  ('botox-eyes',           '눈가 보톡스',       'Eye Area Botox',            'botox'),
  ('laser-pigmentation',   '색소 레이저',       'Pigmentation Laser',        'laser'),
  ('thread-lift',          '실리프팅',          'Thread Lift',               'thread')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. Demo clinic
-- ─────────────────────────────────────────────────────────────
INSERT INTO clinics (slug, clinic_name, clinic_short_name, location, settings)
VALUES (
  'tiki-demo',
  '티키 데모 클리닉',
  '티키 데모',
  '서울시 강남구 테헤란로 123',
  '{
    "lang": "ko",
    "ai_tone": "professional",
    "working_hours": "09:00-18:00",
    "kakao_enabled": false,
    "whatsapp_enabled": false
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. Demo clinic procedures
--    References master_procedures via master_id (JOIN by slug)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_clinic_id   UUID;
  v_master_id   UUID;
BEGIN
  SELECT id INTO v_clinic_id FROM clinics WHERE slug = 'tiki-demo';

  IF v_clinic_id IS NULL THEN
    RAISE NOTICE '[016] Demo clinic not found — skipping procedure seed';
    RETURN;
  END IF;

  -- Filler: 팔자주름
  SELECT id INTO v_master_id FROM master_procedures WHERE slug = 'filler-nasolabial';
  INSERT INTO procedures (clinic_id, master_id, name_ko, name_en,
    description, price_range, duration, downtime,
    effects_ko, cautions_ko, sort_order)
  VALUES (
    v_clinic_id, v_master_id,
    '팔자주름 필러', 'Nasolabial Fold Filler',
    '팔자주름 부위에 히알루론산 필러를 주입하여 자연스럽게 볼륨을 채워주는 시술입니다.',
    '40만원~80만원', '20~30분', '1~2일',
    ARRAY['즉각적인 볼륨 개선', '자연스러운 윤곽 교정', '최소 1년 지속'],
    ARRAY['시술 후 48시간 음주 삼가', '격렬한 운동 1주일 자제', '부기 및 멍 발생 가능'],
    1
  ) ON CONFLICT DO NOTHING;

  -- Botox: 사각턱
  SELECT id INTO v_master_id FROM master_procedures WHERE slug = 'botox-jawline';
  INSERT INTO procedures (clinic_id, master_id, name_ko, name_en,
    description, price_range, duration, downtime,
    effects_ko, cautions_ko, sort_order)
  VALUES (
    v_clinic_id, v_master_id,
    '사각턱 보톡스', 'Jawline Botox',
    '교근(씹는 근육)에 보톡스를 주입하여 사각턱을 갸름하게 개선하는 시술입니다.',
    '20만원~40만원', '10~15분', '없음',
    ARRAY['사각턱 개선', '갸름한 얼굴 라인', '효과 4~6개월 지속'],
    ARRAY['시술 후 4시간 눕지 않기', '당일 격렬한 운동 자제', '효과 발현까지 2주 소요'],
    2
  ) ON CONFLICT DO NOTHING;

  -- Laser: 색소
  SELECT id INTO v_master_id FROM master_procedures WHERE slug = 'laser-pigmentation';
  INSERT INTO procedures (clinic_id, master_id, name_ko, name_en,
    description, price_range, duration, downtime,
    effects_ko, cautions_ko, sort_order)
  VALUES (
    v_clinic_id, v_master_id,
    '색소 레이저', 'Pigmentation Laser',
    '기미, 잡티, 색소 침착을 레이저로 효과적으로 개선하는 시술입니다.',
    '5만원~30만원', '15~30분', '3~7일',
    ARRAY['색소 침착 개선', '피부 톤 균일화', '잡티 제거'],
    ARRAY['시술 후 자외선 차단 필수', '딱지 강제 제거 금지', '색소 침착 재발 가능'],
    3
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE '[016] Demo procedures seeded for clinic: %', v_clinic_id;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Knowledge chunks (no embeddings — fill via embedding job)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_clinic_id    UUID;
  v_procedure_id UUID;
BEGIN
  SELECT id INTO v_clinic_id FROM clinics WHERE slug = 'tiki-demo';
  IF v_clinic_id IS NULL THEN RETURN; END IF;

  -- Chunks for 팔자주름 필러
  SELECT id INTO v_procedure_id
    FROM procedures WHERE clinic_id = v_clinic_id AND name_ko = '팔자주름 필러';

  IF v_procedure_id IS NOT NULL THEN
    INSERT INTO procedures_knowledge
      (clinic_id, procedure_id, content, source_type)
    VALUES
      (v_clinic_id, v_procedure_id,
       '팔자주름 필러 시술은 히알루론산을 팔자 부위에 주입합니다. 시술 시간은 20~30분이며 가격은 40만원에서 80만원 사이입니다. 지속 기간은 약 12~18개월입니다.',
       'manual'),
      (v_clinic_id, v_procedure_id,
       '팔자주름 필러 주의사항: 시술 후 48시간 음주 금지, 1주일 격렬한 운동 자제, 고온 환경(사우나, 찜질방) 1주일 자제, 시술 부위 마사지 금지. 부기와 멍은 보통 3~5일 내 사라집니다.',
       'manual')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Chunks for 사각턱 보톡스
  SELECT id INTO v_procedure_id
    FROM procedures WHERE clinic_id = v_clinic_id AND name_ko = '사각턱 보톡스';

  IF v_procedure_id IS NOT NULL THEN
    INSERT INTO procedures_knowledge
      (clinic_id, procedure_id, content, source_type)
    VALUES
      (v_clinic_id, v_procedure_id,
       '사각턱 보톡스는 교근에 보툴리눔 톡신을 주입하여 근육을 약화시켜 턱선을 갸름하게 만듭니다. 시술 시간 10~15분, 가격 20~40만원, 효과 지속 4~6개월입니다.',
       'manual'),
      (v_clinic_id, v_procedure_id,
       '사각턱 보톡스 주의사항: 시술 직후 4시간은 눕지 않기, 당일 격렬한 운동 자제, 시술 부위 마사지 금지. 효과는 시술 후 2주 후부터 나타나며 6개월마다 재시술을 권장합니다.',
       'manual')
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '[016] Knowledge chunks seeded (embeddings NULL — run embedding job next)';
END $$;

-- ─────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────
-- SELECT c.slug, c.clinic_name, COUNT(p.id) AS procedures
-- FROM clinics c
-- LEFT JOIN procedures p ON p.clinic_id = c.id
-- WHERE c.slug = 'tiki-demo'
-- GROUP BY c.slug, c.clinic_name;
--
-- SELECT name_ko, price_range, duration, downtime
-- FROM procedures
-- WHERE clinic_id = (SELECT id FROM clinics WHERE slug = 'tiki-demo')
-- ORDER BY sort_order;
