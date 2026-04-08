/**
 * src/api/webhook/meta.js
 * Meta (Facebook/Instagram/WhatsApp) Webhook 수신부
 *
 * 마운트 위치: server.js에서 express.json() 보다 먼저 등록
 *   app.use("/webhook/meta",
 *     express.raw({ type: "application/json" }),
 *     metaWebhookRouter
 *   );
 *
 * 필수 환경변수:
 *   META_APP_SECRET      — X-Hub-Signature-256 HMAC 검증용
 *   META_VERIFY_TOKEN    — GET 구독 인증용
 */

import { Router } from "express";
import crypto    from "crypto";
import { messageQueue, safeEnqueue } from "../../lib/queue.js";

const router = Router();

// ── GET: Meta 웹훅 구독 검증 ─────────────────────────────────────────────
router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("[Meta Webhook] ✅ 구독 검증 성공");
    return res.status(200).send(challenge);
  }

  console.warn("[Meta Webhook] ❌ 구독 검증 실패 — verify_token 불일치");
  res.sendStatus(403);
});

// ── POST: 메시지 수신 ───────────────────────────────────────────────────
// req.body는 Buffer (express.raw 미들웨어가 적용된 상태)
router.post("/", async (req, res) => {
  // ① X-Hub-Signature-256 HMAC 검증 (반드시 raw body로 검증)
  const signature = req.headers["x-hub-signature-256"];
  if (!verifyHmac(req.body, signature)) {
    console.warn("[Meta Webhook] ❌ 서명 검증 실패 — 403 응답");
    return res.sendStatus(403);
  }

  // ② Meta는 200을 0.1초 안에 받아야 함 — 먼저 응답 후 비동기 처리
  res.status(200).send("EVENT_RECEIVED");

  // ③ JSON 파싱 후 BullMQ 큐에 투입 (무거운 작업 절대 금지)
  try {
    const payload = JSON.parse(req.body.toString("utf8"));

    // 단순 상태 업데이트(read receipt, delivery 등)는 스킵
    const hasMessages = hasInboundMessage(payload);
    if (!hasMessages) return;

    await safeEnqueue(messageQueue, "incoming-message", {
      receivedAt: new Date().toISOString(),
      clinicId:   process.env.CLINIC_ID || null,
      payload,
    });

    console.log(`[Meta Webhook] 큐 투입 완료 — object=${payload.object}`);
  } catch (err) {
    // 큐 투입 실패는 로그만 남기고 200 응답은 이미 보냄 (재시도 유발하지 않음)
    console.error("[Meta Webhook] 큐 투입 오류:", err.message);
  }
});

// ── HMAC-SHA256 검증 ────────────────────────────────────────────────────
function verifyHmac(rawBody, signatureHeader) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.warn("[Meta Webhook] META_APP_SECRET 미설정 — 서명 검증 스킵 (비프로덕션 허용)");
    return true; // 개발환경 허용 (프로덕션에서는 반드시 설정)
  }
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false; // 길이 불일치 등
  }
}

// ── 실제 인바운드 메시지가 있는지 확인 ─────────────────────────────────
function hasInboundMessage(payload) {
  if (!payload?.entry?.length) return false;
  for (const entry of payload.entry) {
    // WhatsApp
    for (const change of (entry.changes || [])) {
      if (change?.value?.messages?.length) return true;
    }
    // Instagram
    for (const msg of (entry.messaging || [])) {
      if (msg?.message && !msg?.message?.is_echo) return true;
    }
  }
  return false;
}

export default router;
