-- ============================================================
-- 025_ops_board.sql
-- ============================================================
-- PURPOSE
--   Adds two columns to visits to support the Ops Board
--   (morning coordinator whiteboard):
--
--   checked_in_at TIMESTAMPTZ
--     Set when a coordinator marks the patient as physically
--     arrived at the clinic. Independent of the stage machine
--     (stage tracks the medical workflow; check-in tracks
--     physical presence). NULL = not yet checked in.
--
--   room TEXT
--     The treatment room / consultation room assigned to this
--     visit (e.g. "1호실", "Room A", "VIP"). Free text for now;
--     a rooms table with capacity and type can be added later.
--     NULL = not yet assigned.
--
-- SAFE TO RUN MULTIPLE TIMES (IF NOT EXISTS / IF NOT EXISTS)
--
-- ROLLBACK
--   ALTER TABLE visits DROP COLUMN IF EXISTS checked_in_at;
--   ALTER TABLE visits DROP COLUMN IF EXISTS room;
-- ============================================================

ALTER TABLE visits ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS room TEXT;

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Check-in dashboard: fast look-up of checked-in visits per clinic today
CREATE INDEX IF NOT EXISTS idx_visits_checkin
  ON visits(clinic_id, checked_in_at)
  WHERE checked_in_at IS NOT NULL;

-- Room board: find all visits in a given room right now
CREATE INDEX IF NOT EXISTS idx_visits_room
  ON visits(clinic_id, room)
  WHERE room IS NOT NULL;
