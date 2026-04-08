/**
 * src/workers/messageWorker.js
 * BullMQ Worker — Meta 인바운드 메시지 처리
 *
 * 처리 흐름:
 *   1. Meta 웹훅 페이로드 정규화 (WhatsApp / Instagram)
 *   2. Supabase에서 clinic_id + phone/igsid로 환자 조회
 *   3. Claude AI 답변 생성 (classifyIntent → RAG → Sonnet)
 *   4. 채널별 메시지 전송 (Meta / Solapi)
 *   5. messages + audit_logs 테이블 기록
 *   6. 실패 시 throw → BullMQ 자동 재시도
 */

import { Worker }         from "bullmq";
import { createHash }     from "crypto";
import Anthropic          from "@anthropic-ai/sdk";
import { redisConnection } from "../lib/queue.js";
import { supabaseAdmin, writeAuditLog } from "../lib/supabase-server.js";
import { sendMetaMessage }  from "../api/meta.js";
import { sendKakaoMessage } from "../api/solapi.js";

const MODEL_HAIKU  = process.env.MODEL_HAIKU  || "claude-haiku-4-5-20251001";
const MODEL_SONNET = process.env.MODEL_SONNET || "claude-sonnet-4-6-20260217";
const CLINIC_ID    = process.env.CLINIC_ID    || null;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 페이로드 정규화 ────────────────────────────────────────────────────
/**
 * Meta 웹훅 페이로드에서 메시지 목록 추출 (WhatsApp / Instagram 통합)
 * @returns {Array<{channel, senderId, senderName, text, timestamp}>}
 */
function extractMessages(payload) {
  const results = [];

  for (const entry of (payload.entry || [])) {
    // WhatsApp
    for (const change of (entry.changes || [])) {
      const val = change?.value;
      if (!val?.messages) continue;

      for (const msg of val.messages) {
        if (msg.type !== "text") continue; // 현재는 텍스트만 처리
        const contact = val.contacts?.find(c => c.wa_id === msg.from);
        results.push({
          channel:     "whatsapp",
          senderId:    msg.from,          // E.164 전화번호
          senderName:  contact?.profile?.name || msg.from,
          text:        msg.text?.body || "",
          timestamp:   new Date(Number(msg.timestamp) * 1000).toISOString(),
          rawMessageId: msg.id,
        });
      }
    }

    // Instagram
    for (const messaging of (entry.messaging || [])) {
      if (!messaging.message || messaging.message.is_echo) continue;
      results.push({
        channel:     "instagram",
        senderId:    messaging.sender.id,
        senderName:  null,
        text:        messaging.message.text || "",
        timestamp:   new Date(messaging.timestamp).toISOString(),
        rawMessageId: messaging.message.mid,
      });
    }
  }
  return results;
}

// ── Supabase 환자 조회 (clinic_id RLS 강제) ────────────────────────────
async function findPatient(clinicId, channel, senderId) {
  const field = channel === "whatsapp" ? "phone" : "instagram_id";

  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("id, name, nationality, phone, instagram_id, preferred_lang")
    .eq("clinic_id", clinicId)   // ← RLS 명시적 강제
    .eq(field, senderId)
    .maybeSingle();

  if (error) {
    console.warn(`[Worker] 환자 조회 오류 (${channel}/${senderId}):`, error.message);
    return null;
  }
  return data;
}

// ── Claude AI 답변 생성 (비스트리밍, Worker용) ─────────────────────────
async function generateReply(text, lang, clinicId) {
  const startMs = Date.now();

  // 1단계: Haiku 의도 분류
  let intent = "consultation", confidence = 0.5;
  try {
    const cls = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 100,
      system: `Classify this medical clinic patient message. Return ONLY JSON: {"intent":"greeting|booking|consultation|other","confidence":0.9}`,
      messages: [{ role: "user", content: `Message: "${text}"` }],
    });
    const raw = cls.content.find(b => b.type === "text")?.text || "{}";
    const parsed = JSON.parse(raw.match(/\{[^{}]*\}/s)?.[0] || "{}");
    intent     = parsed.intent     || "consultation";
    confidence = parsed.confidence || 0.5;
  } catch { /* Haiku 실패 → 기본값 사용 */ }

  // 2단계: Sonnet으로 최종 답변 (스트리밍 불필요)
  const tokensIn = 0, tokensOut = 0;
  let replyText = "", model = MODEL_SONNET;

  try {
    const resp = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 400,
      system: `너는 서울 강남 프리미엄 미용의원 AI 코디네이터다.
환자에게 보낼 답변을 ${lang || "Korean"}으로 작성해.
- 과장/보장 표현 금지 (의료법 준수)
- 정보 부족 시 "1:1 상담에서 알려드리겠습니다" 문구 포함
- 3~4문장 이내, 따뜻하고 전문적인 어조
- 무료 상담 예약 CTA로 마무리`,
      messages: [{ role: "user", content: text }],
    });
    replyText = resp.content.find(b => b.type === "text")?.text || "";
  } catch (sonnetErr) {
    // Sonnet 실패 → Haiku fallback
    console.warn("[Worker] Sonnet 실패 → Haiku fallback:", sonnetErr.message);
    model = MODEL_HAIKU;
    const fb = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 300,
      messages: [{ role: "user", content: `환자 문의: "${text}"\n간단하고 따뜻하게 한국어로 답변해줘. 3문장 이내.` }],
    });
    replyText = fb.content.find(b => b.type === "text")?.text || "안녕하세요! 문의 감사합니다. 자세한 내용은 상담 예약 후 알려드리겠습니다 😊";
  }

  return {
    replyText, model, intent, confidence,
    tokensIn, tokensOut,
    durationMs: Date.now() - startMs,
  };
}

// ── Supabase messages 테이블 저장 ─────────────────────────────────────
async function saveMessage({ clinicId, patientId, channel, direction, text, rawMessageId }) {
  try {
    await supabaseAdmin.from("messages").insert({
      clinic_id:      clinicId,
      patient_id:     patientId,
      channel,
      direction,
      content:        text,
      raw_message_id: rawMessageId || null,
      created_at:     new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[Worker] messages 저장 실패 (비차단):", err.message);
  }
}

// ── BullMQ Worker 시작 ─────────────────────────────────────────────────
export function startMessageWorker() {
  if (!redisConnection) {
    console.warn("[Worker] Redis 미연결 — messageWorker 비활성화");
    return null;
  }

  const worker = new Worker(
    "tikichat-messages",
    async (job) => {
      const { payload, clinicId: jobClinicId, receivedAt } = job.data;
      const clinicId = jobClinicId || CLINIC_ID;

      if (!clinicId) {
        console.warn("[Worker] CLINIC_ID 미설정 — 작업 건너뜀");
        return;
      }

      const messages = extractMessages(payload);
      if (!messages.length) return;

      for (const msg of messages) {
        const { channel, senderId, senderName, text, timestamp, rawMessageId } = msg;
        const msgHash = createHash("sha256").update(text).digest("hex").slice(0, 16);

        console.log(`[Worker] 처리 중 — channel=${channel} sender=${senderId} text="${text.slice(0, 40)}..."`);

        // ── 환자 조회 ────────────────────────────────────────────────
        const patient = await findPatient(clinicId, channel, senderId);

        // ── 수신 메시지 저장 ────────────────────────────────────────
        await saveMessage({
          clinicId,
          patientId:    patient?.id || null,
          channel,
          direction:    "inbound",
          text,
          rawMessageId,
        });

        // ── AI 답변 생성 ─────────────────────────────────────────────
        const lang = patient?.preferred_lang || "ko";
        const gen  = await generateReply(text, lang, clinicId);

        // ── 채널별 메시지 발송 ────────────────────────────────────────
        let sendError = null;
        try {
          if (channel === "kakao") {
            await sendKakaoMessage(senderId, gen.replyText);
          } else {
            await sendMetaMessage(channel, senderId, gen.replyText);
          }
        } catch (err) {
          sendError = err;
          console.error(`[Worker] 전송 실패 (${channel}/${senderId}):`, err.message);
          // 전송 실패 → throw하여 BullMQ 재시도 유도
          throw err;
        }

        // ── 발신 메시지 저장 ─────────────────────────────────────────
        if (!sendError) {
          await saveMessage({
            clinicId,
            patientId:    patient?.id || null,
            channel,
            direction:    "outbound",
            text:         gen.replyText,
            rawMessageId: null,
          });
        }

        // ── Audit log ────────────────────────────────────────────────
        await writeAuditLog({
          eventType:    "auto_reply",
          clinicId,
          patientId:    patient?.id || null,
          channel,
          direction:    "outbound",
          intent:       gen.intent,
          model:        gen.model,
          tokensIn:     gen.tokensIn,
          tokensOut:    gen.tokensOut,
          durationMs:   gen.durationMs,
          status:       sendError ? "error" : "success",
          errorMessage: sendError?.message || null,
          msgHash,
        });
      }
    },
    {
      connection:  redisConnection,
      concurrency: 10,
      limiter:     { max: 30, duration: 1_000 }, // Meta API rate limit 방어
    }
  );

  worker.on("completed", (job) =>
    console.log(`[Worker] ✅ Job ${job.id} 완료`)
  );
  worker.on("failed", (job, err) =>
    console.error(`[Worker] ❌ Job ${job?.id} 실패 (attempt ${job?.attemptsMade}):`, err.message)
  );
  worker.on("error", (err) =>
    console.error("[Worker] 워커 오류:", err.message)
  );

  console.log("[Worker] 🚀 messageWorker 시작");
  return worker;
}
