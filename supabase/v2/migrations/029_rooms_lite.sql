-- ============================================================
-- 029_rooms_lite.sql
-- ============================================================
-- PURPOSE
--   Phase 8 — Rooms Lite
--   Adds clinic-level room presets plus visit-level room assignment
--   timestamps so Ops Board can behave like lightweight room traffic control.
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'consultation',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_room_type_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_room_type_check
  CHECK (room_type IN ('consultation', 'vip', 'procedure', 'care', 'other'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_clinic_name_active
  ON rooms(clinic_id, lower(name))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_rooms_clinic_sort
  ON rooms(clinic_id, is_active, sort_order, created_at);

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS room_cleared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_visits_room_active
  ON visits(clinic_id, room_id, room_assigned_at DESC)
  WHERE room_id IS NOT NULL;

INSERT INTO rooms (clinic_id, name, room_type, sort_order)
SELECT clinics.id, preset.name, preset.room_type, preset.sort_order
FROM clinics
CROSS JOIN (
  VALUES
    ('Consultation Room 1', 'consultation', 10),
    ('Consultation Room 2', 'consultation', 20),
    ('Procedure Room 1', 'procedure', 30),
    ('Care Room 1', 'care', 40)
) AS preset(name, room_type, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM rooms existing
  WHERE existing.clinic_id = clinics.id
);

