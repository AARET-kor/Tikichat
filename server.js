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

// 시술 DB를 시스템 프롬프트용 텍스트로 변환
function buildProcedureContext() {
  const lines = procedures.map((p) => {
    const name = p.name.en || p.name.ko;
    return [
      `[${name} / ${p.name.ko}]`,
      `Category: ${p.category}`,
      `Description: ${p.description.en}`,
      `Effects: ${p.effects.join(", ")}`,
      `Downtime: ${p.downtime}`,
      `Duration: ${p.duration}`,
      `Price range: ${p.price_range}`,
      `Cautions: ${p.cautions.join("; ")}`,
    ].join("\n");
  });
  return lines.join("\n\n");
}

const SYSTEM_PROMPT = `You are a professional medical aesthetics consultation AI for LIBHIB Clinic, located in ${clinicInfo.location}.

CLINIC SPECIALTIES: ${clinicInfo.specialties.join(", ")}

YOUR ROLE:
- Answer questions about aesthetic procedures (pre/post consultation)
- Provide personalized recommendations based on patient concerns
- Explain procedures, expected results, downtime, and pricing
- Handle aftercare questions
- Always recommend an in-person consultation for final decisions

LANGUAGE RULE:
Detect the language of the user's message and ALWAYS respond in that SAME language.
If Arabic → respond in Arabic. If Chinese → respond in Chinese. If English → respond in English. If Korean → respond in Korean. If Japanese → respond in Japanese.

TONE: Warm, professional, knowledgeable. Never make definitive medical diagnoses. Always note that results vary by individual.

AVAILABLE PROCEDURES DATABASE:
${buildProcedureContext()}

IMPORTANT BOUNDARIES:
- Do not prescribe medication
- Do not diagnose medical conditions
- For emergencies or adverse reactions, advise to contact a doctor immediately
- Always recommend consultation before any procedure`;

// POST /api/chat — 채팅 메시지 처리 (스트리밍)
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  // SSE 헤더 설정
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
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

// GET /api/procedures — 시술 목록 반환
app.get("/api/procedures", (req, res) => {
  res.json(procedures);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Clinic chatbot running at http://localhost:${PORT}`);
});
