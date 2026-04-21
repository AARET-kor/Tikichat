-- ============================================================
-- 010_conversations.sql
-- ============================================================
-- PURPOSE
--   Conversation threads and individual messages. Supports
--   both AI chat sessions (Tiki Paste, Tiki Talk) and
--   messaging channel threads (WhatsApp, Kakao).
--
-- DESIGN
--   conversations: one row per thread/session
--   messages: one row per message (append-only, no updated_at)
--
--   external_id on conversations: The platform-assigned thread
--   ID (e.g. WhatsApp thread ID, Kakao channel thread ID).
--   Stored as TEXT — never as PK. Nullable for AI-only sessions
--   that have no external platform representation.
--
--   channel on messages: the originating channel for each
--   message. In a mixed session (AI + WhatsApp forwarding)
--   messages may come from different channels within one
--   conversation.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS messages CASCADE;
--   DROP TABLE IF EXISTS conversations CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id      UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id     UUID        REFERENCES patients(id) ON DELETE SET NULL,
  visit_id       UUID        REFERENCES visits(id) ON DELETE SET NULL,

  -- Channel this conversation lives on
  channel        TEXT        NOT NULL DEFAULT 'ai'
    CHECK (channel IN (
      'ai',        -- pure AI session (no external platform)
      'whatsapp',
      'kakao',
      'sms',
      'web'        -- My Tiki patient portal chat
    )),

  -- External platform thread ID (nullable for AI-only sessions)
  external_id    TEXT,

  -- Conversation status
  status         TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'archived')),

  -- Staff-visible summary generated at session end
  summary        TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id        UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message origin
  role             TEXT        NOT NULL
    CHECK (role IN ('user', 'assistant', 'system')),

  -- Channel this specific message came from (may differ from
  -- conversation.channel in forwarded/mixed threads)
  channel          TEXT        NOT NULL DEFAULT 'ai'
    CHECK (channel IN ('ai', 'whatsapp', 'kakao', 'sms', 'web')),

  -- Platform-assigned message ID (for dedup and threading)
  external_msg_id  TEXT,

  -- Message content
  content          TEXT        NOT NULL,

  -- AI telemetry (only set when role = 'assistant')
  model_used       TEXT,
  tokens_in        INT,
  tokens_out       INT,
  duration_ms      INT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

  -- No updated_at: messages are append-only, never modified.
);

-- ─────────────────────────────────────────────────────────────
-- Indexes — conversations
-- ─────────────────────────────────────────────────────────────

-- Patient conversation history
CREATE INDEX IF NOT EXISTS idx_conversations_patient
  ON conversations(patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

-- Clinic conversation feed
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_time
  ON conversations(clinic_id, created_at DESC);

-- External ID lookup (inbound webhook: find conversation by platform thread)
CREATE INDEX IF NOT EXISTS idx_conversations_external
  ON conversations(clinic_id, channel, external_id)
  WHERE external_id IS NOT NULL;

-- Visit-linked conversations
CREATE INDEX IF NOT EXISTS idx_conversations_visit
  ON conversations(visit_id)
  WHERE visit_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Indexes — messages
-- ─────────────────────────────────────────────────────────────

-- Primary: all messages in a conversation in order
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at ASC);

-- External message dedup
CREATE INDEX IF NOT EXISTS idx_messages_external_msg
  ON messages(external_msg_id)
  WHERE external_msg_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger (conversations only)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS — defined centrally in 015_rls.sql
-- ─────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
