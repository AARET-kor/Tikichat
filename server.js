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

// 특정 시술 정보 텍스트 빌드
function buildSingleProcedure(id) {
  const p = procedures.find((x) => x.id === id);
  if (!p) return "";
  return [
    `[${p.name.en} / ${p.name.ko}]`,
    `Category: ${p.category}`,
    `Description: ${p.description.en}`,
    `Effects: ${p.effects.join(", ")}`,
    `Downtime: ${p.downtime}`,
    `Duration: ${p.duration}`,
    `Price range: ${p.price_range}`,
    `Cautions: ${p.cautions.join("; ")}`,
  ].join("\n");
}

// 전체 시술 목록 텍스트 빌드
function buildAllProcedures() {
  return procedures.map((p) => buildSingleProcedure(p.id)).join("\n\n");
}

// 시스템 프롬프트 생성 — procedure 선택 여부에 따라 범위 제한
function buildSystemPrompt(procedureId) {
  const base = `You are a structured medical aesthetics consultation AI for LIBHIB Clinic, ${clinicInfo.location}.

LANGUAGE RULE: Always respond in the SAME language as the user's message (Korean/English/Japanese/Chinese/Arabic).

TONE: Warm, concise, professional. Max 3~4 sentences per reply unless the user asks for more detail.

HARD BOUNDARIES:
- Only discuss aesthetic procedures offered at LIBHIB Clinic
- Do NOT answer unrelated questions (food, travel, general health, etc.)
- Do NOT diagnose conditions or prescribe medication
- If asked something outside scope, politely redirect: "저는 LIBHIB 클리닉 시술 상담만 도와드릴 수 있어요 😊"

BOOKING CTA: When the user seems ready or asks about next steps, always end with:
"👉 지금 바로 상담 예약하시겠어요? [예약하기] 버튼을 눌러주세요!"
(translate to user's language)`;

  if (procedureId) {
    const info = buildSingleProcedure(procedureId);
    return `${base}

CURRENT CONTEXT — User selected this procedure:
${info}

FOCUS: Answer questions ONLY about this procedure. Guide the user through:
1. Their specific concern / target area
2. Expected results & downtime
3. Pricing & sessions needed
4. → Recommend booking a free consultation`;
  }

  return `${base}

AVAILABLE PROCEDURES:
${buildAllProcedures()}

FOCUS: Help the user identify which procedure fits their concern, then guide them to select it.`;
}

// POST /api/chat
app.post("/api/chat", async (req, res) => {
  const { messages, procedureId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: buildSystemPrompt(procedureId || null),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Claude API error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/procedures
app.get("/api/procedures", (req, res) => {
  res.json(procedures);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LIBHIB Clinic chatbot running at http://localhost:${PORT}`);
});
