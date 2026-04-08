import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env"), override: true });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import express from "express";
import cors from "cors";
import { procedures, clinicInfo } from "./data/procedures.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

const LANG_NAME = {
  ko: "Korean", en: "English", ja: "Japanese",
  zh: "Chinese (Simplified)", ar: "Arabic",
};

// ── 정적 시스템 프롬프트 (프롬프트 캐싱 대상) ────────────────────────────────
const CLINIC_SYSTEM_BASE = `You are an expert medical aesthetics consultant AI for LIBHIB Clinic, Gangnam, Seoul.
You assist Korean clinic staff by drafting professional Korean reply messages to patient inquiries.

CLINIC INFO:
- Name: LIBHIB Clinic (리브히브 클리닉)
- Location: Gangnam, Seoul, Korea
- Specialty: Medical aesthetics, skin treatments, anti-aging procedures

CORE PROCEDURES:
${procedures.map(p =>
  `[${p.id}] ${p.name.ko} (${p.name.en})
  Effects: ${p.effects.join(", ")}
  Downtime: ${p.downtime} | Duration: ${p.duration}
  Price: ${p.price_range}
  Cautions: ${p.cautions.join("; ")}`
).join("\n\n")}

MEDICAL LAW GUIDELINES (준수 필수):
1. 의료광고법: 과장된 효과 표현 금지, "최고", "완벽", "100% 효과" 등 절대 사용 금지
2. 의료법 제27조: 비의료인에 의한 의료행위 권유 금지
3. 개인정보보호법: 환자 개인 의료정보 언급 금지
4. 모든 의료 결정은 반드시 "전문의와 상담 후" 문구 포함
5. 부작용/합병증 가능성 은폐 금지 — 주요 주의사항 포함 필수

REPLY GUIDELINES:
- Write in Korean ONLY (staff reviews before sending)
- Warm, professional tone (존댓말 사용)
- 3-5 sentences max — concise and actionable
- Always end with: free consultation invitation or booking CTA
- Do NOT claim you are AI, do NOT say "저는 AI입니다"
- Include realistic price range when relevant
- Reference specific procedure effects from clinic data`;

// ── SSE 헬퍼 ─────────────────────────────────────────────────────────────────
function sseStream(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ── RAG: procedures_knowledge 키워드 검색 ──────────────────────────────────
async function ragSearch(query, matchCount = 5) {
  try {
    const { data, error } = await supabase.rpc("search_procedures_keyword", {
      query_text: query,
      match_count: matchCount,
    });
    if (error) throw error;
    if (!data?.length) return null;
    return data.map(row =>
      `[${row.procedure_name}]\n${row.content}`
    ).join("\n\n---\n\n");
  } catch (err) {
    console.warn("[RAG] search_procedures_keyword 실패, 로컬 데이터 사용:", err.message);
    return null;
  }
}

// ── Audit log (fire-and-forget) ────────────────────────────────────────────
async function auditLog(event) {
  try {
    await supabase.from("audit_logs").insert({
      event_type: event.type,
      patient_lang: event.patientLang || null,
      query_type: event.queryType || null,
      model_used: event.model || null,
      rag_chunks_used: event.ragChunks || 0,
      created_at: new Date().toISOString(),
    });
  } catch {
    // 감사 로그 실패는 무시 (비차단)
  }
}

// ── Haiku 라우터: 쿼리 분류 ────────────────────────────────────────────────
async function classifyQuery(patientMessage) {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system: `You are a medical query classifier. Respond ONLY with valid JSON, no other text.
Classify the patient message as:
- "simple": greetings, booking requests, price inquiries, operating hours, general questions
- "complex": specific medical questions about procedure effects, contraindications, recovery timeline, interaction risks, post-procedure complications, medical history concerns

JSON format: {"type":"simple"} or {"type":"complex","query":"reformulated search query in Korean focusing on the medical topic"}`,
      messages: [{ role: "user", content: `Patient message: "${patientMessage}"` }],
    });
    const text = response.content.find(b => b.type === "text")?.text || '{"type":"simple"}';
    return JSON.parse(text.match(/\{.*\}/s)?.[0] || '{"type":"simple"}');
  } catch {
    return { type: "simple" };
  }
}

// ── Sonnet 스트리밍 (프롬프트 캐싱 포함) ──────────────────────────────────
async function streamSonnetWithCache(res, dynamicContext, userMessage, maxTokens = 600) {
  const systemBlocks = [
    {
      type: "text",
      text: CLINIC_SYSTEM_BASE,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (dynamicContext) {
    systemBlocks.push({
      type: "text",
      text: `RELEVANT PROCEDURE KNOWLEDGE (RAG retrieved):\n\n${dynamicContext}`,
    });
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: "user", content: userMessage }],
  });

  let inputCached = false;
  for await (const e of stream) {
    if (e.type === "message_start" && e.message?.usage?.cache_read_input_tokens > 0) {
      inputCached = true;
    }
    if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
      sseWrite(res, { delta: { text: e.delta.text } });
    }
  }
  return inputCached;
}

// ── 기존 streamClaude (번역/애프터케어용) ──────────────────────────────────
async function streamClaude(res, systemPrompt, userMessage, model = "claude-haiku-4-5", maxTokens = 512) {
  try {
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    for await (const e of stream) {
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ delta: { text: e.delta.text } })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("Anthropic stream error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. 환자 메시지 → 한국어 번역 (직원용)
// POST /api/translate  { text, sourceLang }
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sseStream(res);
  const lang = LANG_NAME[sourceLang] || sourceLang || "unknown";
  await streamClaude(res,
    `You are a professional medical translator. Translate the following ${lang} patient message to Korean accurately and naturally. Output ONLY the Korean translation, no explanations.`,
    text, "claude-haiku-4-5", 300
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. AI 추천 답변 생성 — Dual Routing RAG Pipeline
// POST /api/suggest  { patientMessage, patientLang, procedureHint }
//
// Flow:
//   Haiku 4.5 (classifier) → RAG search → Sonnet 4.6 (expert, cached) → audit log
// ──────────────────────────────────────────────────────────────────────────────
function buildFallbackContext(procedureId) {
  const p = procedures.find(x => x.id === procedureId);
  if (!p) return null;
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

  const safeEnd = (errMsg) => {
    if (errMsg) {
      try { sseWrite(res, { error: errMsg }); } catch {}
    }
    try { res.write(`data: [DONE]\n\n`); res.end(); } catch {}
  };

  try {
    // Phase 1: Haiku 라우팅 분류
    sseWrite(res, { phase: "routing" });
    const classification = await classifyQuery(patientMessage);

    // Phase 2: RAG 검색 (complex 쿼리인 경우)
    sseWrite(res, { phase: "generating" });
    let ragContext = null;
    let ragChunks = 0;

    if (classification.type === "complex" && classification.query) {
      ragContext = await ragSearch(classification.query);
      if (ragContext) {
        ragChunks = ragContext.split("---").length;
        console.log(`[RAG] ${ragChunks}개 청크 검색됨: "${classification.query}"`);
      } else {
        // procedures_knowledge 비어있거나 테이블 없음 → 로컬 fallback
        console.log("[RAG] 학습된 매뉴얼 없음 — 로컬 시술 데이터로 대체");
        ragContext = buildFallbackContext(procedureHint);
      }
    } else {
      ragContext = buildFallbackContext(procedureHint);
    }

    // Phase 3: Sonnet 4.6 스트리밍 (프롬프트 캐싱)
    const lang = LANG_NAME[patientLang] || patientLang || "unknown";
    const userMessage = `환자 메시지 (${lang}): "${patientMessage}"
환자 언어: ${lang}
${procedureHint ? `관심 시술 힌트: ${procedureHint}` : ""}

위 환자에게 보낼 한국어 답변을 작성해주세요. 의료광고법을 준수하고, 전문의 상담을 권유하며 마무리해주세요.`;

    const cached = await streamSonnetWithCache(res, ragContext, userMessage, 600);

    // Phase 4: Audit log (비동기, 비차단)
    auditLog({
      type: "suggest",
      patientLang,
      queryType: classification.type,
      model: "claude-sonnet-4-6",
      ragChunks,
      cached,
    });

    safeEnd();
  } catch (err) {
    console.error("[/api/suggest] 오류:", err.message);
    // 클라이언트에 에러 이벤트 전달 후 스트림 종료
    const userMsg = err.message?.includes("API key")
      ? "API 키가 유효하지 않습니다. 관리자에게 문의하세요."
      : err.message?.includes("rate_limit") || err.message?.includes("429")
      ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      : `AI 답변 생성 중 오류가 발생했습니다: ${err.message}`;
    safeEnd(userMsg);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. 한국어 답변 → 환자 언어 번역 (발송 직전)
// POST /api/translate-reply  { text, targetLang }
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/translate-reply", async (req, res) => {
  const text = req.body.text || req.body.replyText;
  const { targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: "text and targetLang required" });
  const lang = LANG_NAME[targetLang] || targetLang;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
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

// ──────────────────────────────────────────────────────────────────────────────
// 4. 애프터케어 메시지 생성 (D+1 / D+3 / D+7)
// POST /api/aftercare-msg  { procedureId, day, targetLang, patientName }
// ──────────────────────────────────────────────────────────────────────────────
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
    "claude-sonnet-4-6", 400
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. 환자 챗봇 (웹사이트 위젯용)
// POST /api/chat
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, procedureId } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "messages required" });
  sseStream(res);

  const procContext = buildFallbackContext(procedureId);
  const systemText = `You are a structured medical aesthetics consultation AI for LIBHIB Clinic, ${clinicInfo.location}.
LANGUAGE RULE: Always respond in the SAME language as the user's message.
TONE: Warm, concise, professional. Max 3~4 sentences per reply.
HARD LIMITS: Only discuss LIBHIB Clinic procedures. No off-topic answers.
BOOKING: After 3 exchanges, suggest booking a free consultation.
${procContext ? `\nFOCUS PROCEDURE:\n${procContext}` : ""}`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemText,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const e of stream) {
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
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

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LIBHIB Clinic Staff Dashboard running at http://localhost:${PORT}`));
