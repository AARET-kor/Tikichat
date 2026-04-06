import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env"), override: true });

import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";
import { procedures, clinicInfo } from "./data/procedures.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANG_NAME = {
  ko: "Korean", en: "English", ja: "Japanese",
  zh: "Chinese (Simplified)", ar: "Arabic",
};

function sseStream(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

async function streamClaude(res, systemPrompt, userMessage, maxTokens = 512) {
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  for await (const e of stream) {
    if (e.type === "content_block_delta" && e.delta.type === "text_delta") {
      res.write(`data: ${JSON.stringify({ text: e.delta.text })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

// ──────────────────────────────────────────
// 1. 환자 메시지 → 한국어 번역 (직원용)
// POST /api/translate  { text, sourceLang }
// ──────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sseStream(res);
  const lang = LANG_NAME[sourceLang] || sourceLang || "unknown";
  await streamClaude(res,
    `You are a professional medical translator. Translate the following ${lang} patient message to Korean accurately and naturally. Output ONLY the Korean translation, no explanations.`,
    text, 300
  );
});

// ──────────────────────────────────────────
// 2. AI 추천 답변 생성 (한국어, 직원이 수정 가능)
// POST /api/suggest  { patientMessage, patientLang, procedureHint }
// ──────────────────────────────────────────
function buildProcedureContext(id) {
  const p = procedures.find(x => x.id === id);
  if (!p) return procedures.slice(0, 4).map(pr =>
    `${pr.name.ko}(${pr.name.en}): ${pr.price_range}, ${pr.effects.join(", ")}`
  ).join("\n");
  return [
    `시술명: ${p.name.ko} (${p.name.en})`,
    `효과: ${p.effects.join(", ")}`,
    `다운타임: ${p.downtime}`,
    `지속: ${p.duration}`,
    `가격: ${p.price_range}`,
    `주의: ${p.cautions.join("; ")}`,
  ].join("\n");
}

app.post("/api/suggest", async (req, res) => {
  const { patientMessage, patientLang, procedureHint } = req.body;
  if (!patientMessage) return res.status(400).json({ error: "patientMessage required" });
  sseStream(res);
  const lang = LANG_NAME[patientLang] || "unknown";
  const procInfo = buildProcedureContext(procedureHint);
  await streamClaude(res,
    `You are a professional medical aesthetics consultant at LIBHIB Clinic, Gangnam, Seoul.
A ${lang}-speaking patient sent a message. Write a KOREAN reply for clinic staff to review and send.

CLINIC PROCEDURE INFO:
${procInfo}

RULES:
- Write in Korean only (staff will review before sending)
- Be warm, professional, concise (3-5 sentences max)
- Include relevant price/effect info from the procedure data
- End with an invitation to book a free consultation
- Do NOT mention that you are AI`,
    `Patient message (${lang}): "${patientMessage}"`,
    512
  );
});

// ──────────────────────────────────────────
// 3. 한국어 답변 → 환자 언어 번역 (발송 직전)
// POST /api/translate-reply  { text, targetLang }
// ──────────────────────────────────────────
app.post("/api/translate-reply", async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: "text and targetLang required" });
  const lang = LANG_NAME[targetLang] || targetLang;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 600,
      system: `You are a professional medical translator. Translate the following Korean medical aesthetics clinic reply to ${lang}. Output ONLY the translation, no explanations, no notes.`,
      messages: [{ role: "user", content: text }],
    });
    const translated = response.content.find(b => b.type === "text")?.text || "";
    res.json({ translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────
// 4. 애프터케어 메시지 생성 (D+1 / D+3 / D+7)
// POST /api/aftercare-msg  { procedureId, day, targetLang, patientName }
// ──────────────────────────────────────────
const AFTERCARE_GUIDE = {
  botox: {
    1: "시술 부위를 만지거나 마사지하지 마세요. 붉어짐은 정상이며 수 시간 내 사라집니다. 격렬한 운동은 48시간 후부터 가능합니다.",
    3: "보톡스 효과가 나타나기 시작하는 시기입니다. 표정 움직임이 자연스러워지고 있나요? 음주와 사우나는 1주일 후부터 권장합니다.",
    7: "효과를 느끼고 계신가요? 보톡스는 2주 뒤 최종 효과가 완성됩니다. 궁금한 점이나 사진 공유를 원하시면 언제든 연락주세요!",
  },
  filler: {
    1: "시술 부위에 붓기와 멍이 있을 수 있습니다. 아이스팩을 수건에 감싸 10~15분씩 간헐적으로 냉찜질해 주세요. 술과 혈액희석제는 피해주세요.",
    3: "붓기가 빠지고 자연스러운 윤곽이 나타나는 시기입니다. 여전히 강한 압박은 피해주세요. 수분 섭취를 충분히 해주세요.",
    7: "필러가 자리를 잡고 최종 효과가 나타납니다. 경과가 어떠신가요? 사진을 보내주시면 확인해 드리겠습니다.",
  },
  laser_toning: {
    1: "자외선 차단은 필수입니다! SPF 50+ 선크림을 매일 발라주세요. 시술 부위가 민감할 수 있으니 자극적인 제품은 피해주세요.",
    3: "피부 톤이 밝아지고 있나요? 보습에 신경 써주세요. 각질 제거제, 레티놀 등 강한 성분은 1주일 후부터 사용하세요.",
    7: "레이저 효과가 안정화되고 있습니다. 꾸준한 자외선 차단으로 효과를 유지하세요. 다음 세션은 4주 후 권장합니다.",
  },
  ulthera: {
    1: "시술 부위에 약간의 붓기와 붉어짐은 정상입니다. 충분한 수면과 수분 섭취가 도움이 됩니다.",
    3: "초음파 에너지가 콜라겐 생성을 자극하고 있습니다. 지금은 변화가 미미하지만 1~3개월 후 효과가 본격화됩니다.",
    7: "회복은 잘 되고 계신가요? 궁금한 점이 있으시면 언제든지 연락주세요. 최종 효과는 3개월 후 체감하실 수 있습니다.",
  },
};

app.post("/api/aftercare-msg", async (req, res) => {
  const { procedureId, day, targetLang, patientName } = req.body;
  if (!day || !targetLang) return res.status(400).json({ error: "day and targetLang required" });
  sseStream(res);

  const guide = AFTERCARE_GUIDE[procedureId]?.[day] ||
    `시술 후 ${day}일이 되었습니다. 경과는 어떠신가요? 궁금한 점이 있으시면 언제든지 연락주세요!`;
  const lang = LANG_NAME[targetLang] || targetLang;
  const proc = procedures.find(p => p.id === procedureId);
  const procName = proc?.name?.[targetLang] || proc?.name?.ko || "시술";
  const nameStr = patientName ? `${patientName}님, ` : "";

  await streamClaude(res,
    `You are a warm and professional medical aesthetics clinic assistant at LIBHIB Clinic, Seoul.
Write a D+${day} aftercare message to a patient in ${lang}.
- Warm, caring tone
- Natural ${lang} (as if written by a native speaker)
- 3-4 sentences max
- Include the aftercare guideline naturally
- Sign off from "LIBHIB Clinic Team"
- Output ONLY the message text in ${lang}, nothing else`,
    `Patient name: ${nameStr || "고객님"}
Procedure: ${procName}
Day after procedure: ${day}
Aftercare guideline (Korean): ${guide}`,
    400
  );
});

// ──────────────────────────────────────────
// 5. 환자 챗봇 (기존 — 웹사이트 위젯용)
// POST /api/chat
// ──────────────────────────────────────────
function buildPatientSystemPrompt(procedureId) {
  const base = `You are a structured medical aesthetics consultation AI for LIBHIB Clinic, ${clinicInfo.location}.
LANGUAGE RULE: Always respond in the SAME language as the user's message.
TONE: Warm, concise, professional. Max 3~4 sentences per reply.
HARD LIMITS: Only discuss LIBHIB Clinic procedures. No off-topic answers.
BOOKING: After 3 exchanges, suggest booking a free consultation.`;

  if (procedureId) {
    const p = procedures.find(x => x.id === procedureId);
    if (p) return `${base}\n\nFOCUS PROCEDURE:\n${buildProcedureContext(procedureId)}`;
  }
  return base;
}

app.post("/api/chat", async (req, res) => {
  const { messages, procedureId } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "messages required" });
  sseStream(res);
  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: buildPatientSystemPrompt(procedureId),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const e of stream) {
      if (e.type === "content_block_delta" && e.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: e.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/procedures
app.get("/api/procedures", (req, res) => res.json(procedures));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LIBHIB Clinic running at http://localhost:${PORT}`));
