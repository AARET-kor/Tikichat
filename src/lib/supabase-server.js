/**
 * src/lib/supabase-server.js
 * 서버 전용 Supabase 클라이언트 (서비스 롤 키 사용)
 *
 * ⚠️  VITE_ 접두사 절대 금지 — 이 키는 절대 클라이언트로 노출되지 않음
 * ⚠️  RLS가 bypass되므로 반드시 clinic_id 필터를 명시적으로 추가할 것
 *
 * Supabase audit_logs 테이블 DDL (Supabase SQL Editor에서 실행):
 * ─────────────────────────────────────────────────────────────────
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS clinic_id      TEXT;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS patient_id     UUID;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS channel        TEXT;     -- whatsapp|instagram|kakao|dashboard
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS direction      TEXT;     -- inbound|outbound
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status         TEXT;     -- success|error
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tokens_in      INT DEFAULT 0;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tokens_out     INT DEFAULT 0;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms    INT DEFAULT 0;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message  TEXT;
 * ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS patient_message_hash TEXT;
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.SUPABASE_URL            || "";
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_SVC_KEY) {
  console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY 미설정 — ANON KEY로 fallback (RLS 적용됨)");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * audit_logs 테이블에 기록 (fire-and-forget, 실패해도 앱 크래시 없음)
 * @param {object} entry
 */
export async function writeAuditLog(entry) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      event_type:           entry.eventType        || "ai_reply",
      clinic_id:            entry.clinicId          || process.env.CLINIC_ID || null,
      patient_id:           entry.patientId         || null,
      patient_lang:         entry.patientLang       || null,
      channel:              entry.channel           || "dashboard",
      direction:            entry.direction         || "outbound",
      query_type:           entry.intent            || null,
      model_used:           entry.model             || null,
      rag_chunks_used:      entry.ragChunks         || 0,
      tokens_in:            entry.tokensIn          || 0,
      tokens_out:           entry.tokensOut         || 0,
      duration_ms:          entry.durationMs        || 0,
      cached:               entry.cacheHit          || false,
      status:               entry.status            || "success",
      error_message:        entry.errorMessage      || null,
      patient_message_hash: entry.msgHash           || null,
      created_at:           new Date().toISOString(),
    });
  } catch (err) {
    console.error("[AuditLog] 기록 실패 (비차단):", err.message);
  }
}
