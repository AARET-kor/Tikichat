/**
 * src/api/solapi.js
 * 솔라피(Solapi) — 카카오 알림톡 / 친구톡 전송
 *
 * 필수 환경변수:
 *   SOLAPI_API_KEY      — 솔라피 API Key
 *   SOLAPI_API_SECRET   — 솔라피 API Secret
 *   SOLAPI_SENDER       — 발신 번호 (예: 0212345678)
 *   SOLAPI_PF_ID        — 카카오 플러스친구 ID
 */

let SolapiMessageService = null;

// 동적 import — 솔라피 패키지 없으면 graceful degradation
async function getSolapi() {
  if (SolapiMessageService) return SolapiMessageService;
  try {
    const mod = await import("solapi");
    SolapiMessageService = mod.default ?? mod.SolapiMessageService ?? mod;
    return SolapiMessageService;
  } catch {
    throw new Error("solapi 패키지를 찾을 수 없습니다. npm install solapi 실행 필요.");
  }
}

function getService() {
  const key    = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  if (!key || !secret) throw new Error("SOLAPI_API_KEY / SOLAPI_API_SECRET 미설정");
  return new SolapiMessageService(key, secret);
}

// ── 카카오 알림톡 전송 ─────────────────────────────────────────────────
/**
 * 승인된 비즈니스 템플릿 기반 알림톡
 * @param {object} param0
 * @param {string} param0.to           — 수신자 번호 (010XXXXXXXX)
 * @param {string} param0.templateId   — 카카오 템플릿 ID
 * @param {object} param0.variables    — 템플릿 변수 (예: { "#{이름}": "김민지" })
 * @param {boolean} [param0.failover]  — SMS fallback 허용 여부 (기본 true)
 */
export async function sendKakaoAlimTalk({ to, templateId, variables = {}, failover = true }) {
  await getSolapi();
  const service = getService();

  return service.sendOne({
    to,
    from:  process.env.SOLAPI_SENDER || "",
    kakaoOptions: {
      pfId:         process.env.SOLAPI_PF_ID || "",
      templateId,
      variables,
      disableSms:   !failover,
    },
  });
}

// ── 카카오 친구톡 (자유 텍스트) ────────────────────────────────────────
/**
 * 플러스친구 구독자에게 자유 텍스트 발송
 * @param {object} param0
 * @param {string} param0.to
 * @param {string} param0.text
 * @param {Array}  [param0.buttons]  — 버튼 배열 (선택)
 */
export async function sendKakaoFriendTalk({ to, text, buttons = [] }) {
  await getSolapi();
  const service = getService();

  const kakaoOptions = {
    pfId: process.env.SOLAPI_PF_ID || "",
    text,
  };
  if (buttons.length) kakaoOptions.buttons = buttons;

  return service.sendOne({
    to,
    from: process.env.SOLAPI_SENDER || "",
    kakaoOptions,
  });
}

// ── 일반 SMS (fallback용) ──────────────────────────────────────────────
export async function sendSms({ to, text }) {
  await getSolapi();
  const service = getService();
  return service.sendOne({
    to,
    from: process.env.SOLAPI_SENDER || "",
    text,
  });
}

// ── 채널 통합 전송 (messageWorker에서 사용) ────────────────────────────
export async function sendKakaoMessage(to, text) {
  return sendKakaoFriendTalk({ to, text });
}
