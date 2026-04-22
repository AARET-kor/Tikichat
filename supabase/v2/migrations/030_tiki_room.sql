-- ============================================================
-- 030_tiki_room.sql
-- ============================================================
-- PURPOSE
--   Phase 9 — Tiki Room full mode
--   Minimal persistent room session + interaction logging for
--   doctor-controlled live communication in fixed clinic rooms.
-- ============================================================

CREATE TABLE IF NOT EXISTS room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'cleared')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_sessions_active_room
  ON room_sessions(room_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_room_sessions_clinic_room_started
  ON room_sessions(clinic_id, room_id, started_at DESC);

DROP TRIGGER IF EXISTS room_sessions_updated_at ON room_sessions;
CREATE TRIGGER room_sessions_updated_at
  BEFORE UPDATE ON room_sessions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TABLE IF NOT EXISTS room_interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_session_id UUID REFERENCES room_sessions(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'session_started',
      'live_input',
      'response_selected',
      'session_ended',
      'room_cleared'
    )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_events_session_created
  ON room_interaction_events(room_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_events_room_created
  ON room_interaction_events(room_id, created_at DESC);

