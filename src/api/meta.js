/**
 * src/api/meta.js
 * Meta Graph API — WhatsApp / Instagram DM 메시지 전송
 *
 * 필수 환경변수:
 *   META_ACCESS_TOKEN      — 페이지/비즈니스 액세스 토큰
 *   META_PHONE_NUMBER_ID   — WhatsApp 발신 전화번호 ID
 */

const GRAPH_VER = "v21.0";
const BASE_URL  = `https://graph.facebook.com/${GRAPH_VER}`;

/**
 * Meta Graph API 공통 POST 헬퍼
 * @param {string} path
 * @param {object} body
 * @returns {Promise<object>}
 */
async function graphPost(path, body) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN 미설정");

  const resp = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Meta API ${resp.status}: ${msg}`);
  }
  return data;
}

// ── WhatsApp 텍스트 메시지 전송 ────────────────────────────────────────
/**
 * @param {string} to       — E.164 형식 수신자 전화번호 (예: 821012345678)
 * @param {string} text     — 전송할 텍스트
 * @param {string} [phoneNumberId] — 기본값: META_PHONE_NUMBER_ID 환경변수
 */
export async function sendWhatsApp(to, text, phoneNumberId) {
  const phoneId = phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  if (!phoneId) throw new Error("META_PHONE_NUMBER_ID 미설정");

  return graphPost(`/${phoneId}/messages`, {
    messaging_product: "whatsapp",
    recipient_type:    "individual",
    to,
    type:  "text",
    text:  { preview_url: false, body: text },
  });
}

// ── WhatsApp 템플릿 메시지 (애프터케어용) ──────────────────────────────
/**
 * @param {string} to
 * @param {string} templateName
 * @param {string} languageCode  — 예: "ko", "en_US"
 * @param {Array}  components    — https://developers.facebook.com/docs/whatsapp/api/messages/message-templates
 */
export async function sendWhatsAppTemplate(to, templateName, languageCode = "ko", components = []) {
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  if (!phoneId) throw new Error("META_PHONE_NUMBER_ID 미설정");

  return graphPost(`/${phoneId}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name:     templateName,
      language: { code: languageCode },
      components,
    },
  });
}

// ── Instagram DM 텍스트 전송 ───────────────────────────────────────────
/**
 * @param {string} recipientIgsid — Instagram 수신자 IGSID
 * @param {string} text
 */
export async function sendInstagramDM(recipientIgsid, text) {
  return graphPost("/me/messages", {
    recipient: { id: recipientIgsid },
    message:   { text },
  });
}

// ── 채널 통합 전송 (messageWorker에서 사용) ────────────────────────────
/**
 * @param {"whatsapp"|"instagram"} channel
 * @param {string} recipientId   — WhatsApp: 전화번호, Instagram: IGSID
 * @param {string} text
 */
export async function sendMetaMessage(channel, recipientId, text) {
  if (channel === "whatsapp") return sendWhatsApp(recipientId, text);
  if (channel === "instagram") return sendInstagramDM(recipientId, text);
  throw new Error(`지원하지 않는 채널: ${channel}`);
}
