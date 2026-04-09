import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env"), override: true });

// ── 전역 방어막 ───────────────────────────────────────────────────────────────
// uncaughtException은 프로세스 상태를 신뢰할 수 없으므로 exit(1) → Railway 즉시 재시작
process.on("uncaughtException", (err) => {
  console.error("[FATAL uncaughtException]", err.message, "\n", err.stack);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL unhandledRejection]", reason);
  process.exit(1);
});

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import express from "express";
import cors from "cors";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { procedures, clinicInfo } from "./data/procedures.js";
import { PROCEDURE_TEMPLATES } from "./data/procedure-templates.js";

// ── Phase 3: 새 모듈 import ───────────────────────────────────────────────────
import metaWebhookRouter            from "./src/api/webhook/meta.js";
import { startMessageWorker }       from "./src/workers/messageWorker.js";
import { startAftercareScheduler }  from "./src/scheduler/aftercare.js";

// ── 모델 상수 (env로 override 가능) ───────────────────────────────────────────
const MODEL_HAIKU  = process.env.MODEL_HAIKU  || "claude-haiku-4-5-20251001";
const MODEL_SONNET = process.env.MODEL_SONNET || "claude-sonnet-4-6-20260217";

const app = express();
app.use(cors());

// ⚠️  Meta Webhook은 raw body가 필요 (HMAC 검증) — express.json() 보다 먼저 등록
app.use("/webhook/meta", express.raw({ type: "application/json" }), metaWebhookRouter);

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL    || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// 서비스 롤 클라이언트 — RLS bypass, 서버 사이드 CRUD 전용
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL          || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

// ── 클리닉 정보 캐시 (TTL 5분) ────────────────────────────────────────────────
const _clinicCache = new Map(); // clinicId → { data, exp }

async function getClinicInfo(clinicId) {
  if (!clinicId) return null;
  const hit = _clinicCache.get(clinicId);
  if (hit && Date.now() < hit.exp) return hit.data;
  try {
    const { data } = await supabaseAdmin
      .from("clinics")
      .select("clinic_id, clinic_name, clinic_short_name, location, specialties")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (data) {
      _clinicCache.set(clinicId, { data, exp: Date.now() + 5 * 60_000 });
      return data;
    }
  } catch (e) {
    console.warn("[getClinicInfo]", e.message);
  }
  return null;
}

async function getClinicProcedures(clinicId) {
  if (!clinicId) return null;
  try {
    const { data } = await supabaseAdmin
      .from("procedures")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return data?.length ? data : null;
  } catch (e) {
    console.warn("[getClinicProcedures]", e.message);
    return null;
  }
}

const LANG_NAME = {
  ko: "Korean", en: "English", ja: "Japanese",
  zh: "Chinese (Simplified)", ar: "Arabic",
};

// ── 동적 시스템 프롬프트 빌더 ─────────────────────────────────────────────────
// clinicName, location은 DB에서 가져오거나 env 기본값 사용
// procList는 DB 클리닉 시술 or 로컬 fallback
function buildSystemBase(clinicName, location, procList) {
  const name     = clinicName || process.env.CLINIC_NAME || "클리닉";
  const loc      = location   || process.env.CLINIC_LOCATION || "서울";
  const procs    = procList   || procedures; // data/procedures.js fallback

  const procText = procs.map(p => {
    // DB/로컬 스키마 모두 대응 (name_ko, price_range 통일)
    const nameKo    = p.name_ko    || p.name?.ko    || p.name || "";
    const nameEn    = p.name_en    || p.name?.en    || "";
    const price     = p.price_range || p.price_display || "";
    const downtime  = p.downtime   || "";
    const duration  = p.duration   || "";
    const effects   = Array.isArray(p.effects_ko)  ? p.effects_ko.join(", ")
                    : Array.isArray(p.effects)      ? p.effects.join(", ")
                    : "";
    const cautions  = Array.isArray(p.cautions_ko) ? p.cautions_ko.join("; ")
                    : Array.isArray(p.cautions)     ? p.cautions.join("; ")
                    : "";
    return `[${p.template_id || p.id}] ${nameKo}(${nameEn})\n  가격: ${price} | 다운타임: ${downtime} | 지속: ${duration}\n  효과: ${effects}\n  주의: ${cautions}`;
  }).join("\n\n");

  return `너는 현재 ${name}의 수석 AI 상담 실장이다.
클리닉 직원이 환자 문의에 답하는 한국어 초안 메시지를 작성하는 역할을 한다.
환자에게 답변할 때 반드시 "${name}"를 자연스럽게 언급하며 친절하고 전문적으로 응대한다.

━━━ 절대 금지 (의료법 위반 방지) ━━━
• "최고", "최저가", "100% 효과", "부작용 없음", "확실히 낫는다" 등 과장·보장 표현 금지
• 의료적 진단·처방·치료 결정 권유 금지 (의료법 제27조)
• 환자 개인 의료정보 언급·추측 금지 (개인정보보호법)
• "AI입니다", "챗봇입니다" 자기 노출 금지
• RAG CONTEXT에 없는 정보를 사실인 것처럼 서술 금지

━━━ 필수 포함 ━━━
• 모든 시술 결정 → "전문의와 1:1 상담 후 결정해드리겠습니다" 문구 포함
• 정보 부족 시 → "정확한 정보는 1:1 상담에서 알려드리겠습니다" 로 대체
• 답변 근거는 RAG CONTEXT 내용만 사용 (없으면 상담 안내로 대체)
• 무료 상담 예약 CTA 마무리 (예: "편하신 시간에 무료 상담을 예약해드릴게요 😊")

━━━ 답변 형식 ━━━
• 한국어만 사용 (직원이 검토 후 발송)
• 존댓말, 따뜻하고 전문적인 어조
• 3~5문장 이내로 간결하게

━━━ 클리닉 정보 ━━━
• 이름: ${name}
• 위치: ${loc}
• 전문: 의료 미용, 피부 시술, 항노화

━━━ 시술 정보 ━━━
${procText}`;
}

// 기본값 (clinicId 없을 때 fallback — 하위 호환)
const CLINIC_SYSTEM_BASE = buildSystemBase(
  process.env.CLINIC_NAME     || "LIBHIB 클리닉",
  process.env.CLINIC_LOCATION || "서울 강남구 논현동",
  procedures
);

// ── SSE 헬퍼 ─────────────────────────────────────────────────────────────────
function sseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

function sseWrite(res, payload) {
  if (!res.writableEnded) {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
  }
}

function sseDone(res) {
  if (!res.writableEnded) {
    try { res.write(`data: [DONE]\n\n`); res.end(); } catch {}
  }
}

// ── OpenAI 임베딩 (선택적 — OPENAI_API_KEY 있을 때만 작동) ──────────────────
async function embedQuery(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!resp.ok) throw new Error(`OpenAI HTTP ${resp.status}`);
    const data = await resp.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.warn("[Embed] OpenAI embedding 실패 (키워드 검색으로 대체):", err.message);
    return null;
  }
}

// ── RAG: Hybrid Search (벡터+키워드 → 키워드 전용 → null) ──────────────────
// ragSearch: clinicId 파라미터 추가 → 멀티테넌트 격리
async function ragSearch(query, matchCount = 5, clinicId = null) {
  const filter = clinicId || null;

  // 1) 벡터 + 키워드 하이브리드 (OpenAI 키 있을 때)
  const embedding = await embedQuery(query);
  if (embedding) {
    try {
      const { data, error } = await supabase.rpc("match_procedures", {
        query_embedding:  embedding,
        query_text:       query,
        match_count:      matchCount,
        clinic_id_filter: filter,          // ← 병원 격리
      });
      if (!error && data?.length) {
        return {
          context: data.map(r => `[${r.procedure_name}]\n${r.content}`).join("\n\n---\n\n"),
          chunks:  data.length,
          method:  "hybrid_rrf",
        };
      }
    } catch (err) {
      console.warn("[RAG] match_procedures 실패:", err.message);
    }
  }

  // 2) 키워드 전용 fallback
  try {
    const { data, error } = await supabase.rpc("search_procedures_keyword", {
      query_text:       query,
      match_count:      matchCount,
      clinic_id_filter: filter,            // ← 병원 격리
    });
    if (!error && data?.length) {
      return {
        context: data.map(r => `[${r.procedure_name}]\n${r.content}`).join("\n\n---\n\n"),
        chunks:  data.length,
        method:  "keyword",
      };
    }
  } catch (err) {
    console.warn("[RAG] search_procedures_keyword 실패:", err.message);
  }

  return null; // RAG 없음 → 로컬 fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// 지식 베이스 업로드 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

// multer: 메모리 스토리지 (디스크 미사용)
const knowledgeUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|docx|txt|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error("PDF/DOCX/TXT/CSV만 업로드 가능합니다"), ok);
  },
});

// 파일 버퍼 → 텍스트 추출
async function extractText(buffer, originalname) {
  const ext = originalname.toLowerCase().split(".").pop();
  try {
    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    }
    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    // txt / csv
    return buffer.toString("utf-8");
  } catch (err) {
    console.warn("[extractText]", err.message);
    return buffer.toString("utf-8");
  }
}

// 텍스트 → 청크 배열 (500자, 50자 오버랩)
function chunkText(text, size = 500, overlap = 50) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk); // 너무 짧은 청크 제외
    start += size - overlap;
  }
  return chunks;
}

// ── 의도 분류 (Haiku 4.5, 4-category + confidence) ───────────────────────────
async function classifyIntent(message) {
  try {
    const resp = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 150,
      system: `You are a medical clinic message intent classifier. Return ONLY valid JSON, no other text.

Classify into one intent:
- "greeting": hello, thanks, goodbye, compliments
- "booking": appointment, schedule, cancellation, operating hours, location
- "consultation": procedure effects, pricing, recovery, contraindications, side effects, comparison
- "other": complaints, unclear, off-topic

Return {"intent":"consultation","confidence":0.92,"query":"보톡스 효과 지속 기간"}
or    {"intent":"greeting","confidence":0.98}`,
      messages: [{ role: "user", content: `Message: "${message}"` }],
    });
    const text = resp.content.find(b => b.type === "text")?.text ?? "{}";
    const parsed = JSON.parse(text.match(/\{[^{}]*\}/s)?.[0] ?? "{}");
    return {
      intent:     parsed.intent     ?? "other",
      confidence: parsed.confidence ?? 0.5,
      query:      parsed.query      ?? message,
    };
  } catch {
    return { intent: "other", confidence: 0.5, query: message };
  }
}

// ── 로컬 fallback context ──────────────────────────────────────────────────────
function buildLocalContext(procedureId) {
  const p = procedures.find(x => x.id === procedureId);
  if (!p) return null;
  return [
    `시술명: ${p.name.ko} (${p.name.en})`,
    `효과: ${p.effects.join(", ")}`,
    `다운타임: ${p.downtime} | 지속: ${p.duration}`,
    `가격: ${p.price_range}`,
    `주의: ${p.cautions.join("; ")}`,
  ].join("\n");
}

// ── 전문 답변 스트리밍 (Sonnet → Haiku fallback, 프롬프트 캐싱) ───────────────
async function streamExpertReply(req, res, ragContext, userMessage, systemBase) {
  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.once("close", onClose);

  const base = systemBase || CLINIC_SYSTEM_BASE;
  const systemBlocks = [
    { type: "text", text: base, cache_control: { type: "ephemeral" } },
  ];
  if (ragContext) {
    systemBlocks.push({
      type: "text",
      text: `━━━ RAG CONTEXT (이 내용만 기반으로 답변) ━━━\n\n${ragContext}`,
    });
  }

  const startMs = Date.now();
  let tokensIn = 0, tokensOut = 0, cacheHit = false, usedModel = MODEL_SONNET;

  try {
    const stream = anthropic.messages.stream(
      {
        model: MODEL_SONNET,
        max_tokens: 600,
        system: systemBlocks,
        messages: [{ role: "user", content: userMessage }],
      },
      {
        signal: ac.signal,
        headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
      }
    );

    for await (const e of stream) {
      if (res.writableEnded) break;
      if (e.type === "message_start") {
        const u = e.message?.usage ?? {};
        tokensIn  = u.input_tokens ?? 0;
        cacheHit  = (u.cache_read_input_tokens ?? 0) > 0;
      }
      if (e.type === "message_delta") {
        tokensOut = e.usage?.output_tokens ?? tokensOut;
      }
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
        sseWrite(res, { delta: { text: e.delta.text } });
      }
    }
  } catch (sonnetErr) {
    if (sonnetErr.name === "AbortError") {
      req.off("close", onClose);
      throw sonnetErr; // 의도적 취소 — 상위로 전파
    }

    // Sonnet 실패 → Haiku로 즉시 fallback (절대 크래시 금지)
    console.warn("[Suggest] Sonnet 실패 → Haiku fallback:", sonnetErr.message);
    usedModel = MODEL_HAIKU;
    sseWrite(res, { phase: "fallback" });

    try {
      const fallback = anthropic.messages.stream(
        {
          model: MODEL_HAIKU,
          max_tokens: 400,
          system: base,
          messages: [{ role: "user", content: userMessage }],
        },
        { signal: ac.signal }
      );
      for await (const e of fallback) {
        if (res.writableEnded) break;
        if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
          sseWrite(res, { delta: { text: e.delta.text } });
        }
      }
    } catch (haikuErr) {
      if (haikuErr.name !== "AbortError") throw haikuErr;
    }
  }

  req.off("close", onClose);
  return {
    model: usedModel,
    tokensIn, tokensOut, cacheHit,
    durationMs: Date.now() - startMs,
  };
}

// ── Audit log (fire-and-forget) ───────────────────────────────────────────────
// supabase-server.js의 writeAuditLog와 동일 스키마 사용
async function auditLog(event) {
  try {
    const msgHash = event.patientMessage
      ? createHash("sha256").update(event.patientMessage).digest("hex").slice(0, 16)
      : null;

    await supabase.from("audit_logs").insert({
      event_type:           event.type        || "suggest",
      clinic_id:            process.env.CLINIC_ID || null,
      patient_lang:         event.patientLang || null,
      channel:              "dashboard",
      direction:            "outbound",
      query_type:           event.intent      || null,
      model_used:           event.model       || null,
      rag_chunks_used:      event.ragChunks   || 0,
      tokens_in:            event.tokensIn    || 0,
      tokens_out:           event.tokensOut   || 0,
      duration_ms:          event.durationMs  || 0,
      cached:               event.cacheHit    || false,
      status:               "success",
      patient_message_hash: msgHash,
      created_at:           new Date().toISOString(),
    });
  } catch {
    // 감사 로그 실패는 무시 (비차단)
  }
}

// ── 기존 streamClaude (번역·애프터케어용) ─────────────────────────────────────
async function streamClaude(res, systemPrompt, userMessage, model = MODEL_HAIKU, maxTokens = 512) {
  try {
    const stream = anthropic.messages.stream({
      model, max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    for await (const e of stream) {
      if (res.writableEnded) break;
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
        sseWrite(res, { delta: { text: e.delta.text } });
      }
    }
    sseDone(res);
  } catch (err) {
    console.error("[streamClaude]", err.message);
    sseWrite(res, { error: err.message });
    sseDone(res);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── 1. 환자 메시지 → 한국어 번역
// POST /api/translate  { text, sourceLang }
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sseHeaders(res);
  const lang = LANG_NAME[sourceLang] || sourceLang || "unknown";
  await streamClaude(
    res,
    `You are a professional medical translator. Translate the following ${lang} patient message to Korean accurately and naturally. Output ONLY the Korean translation, no explanations.`,
    text, MODEL_HAIKU, 300
  );
});

// ── 2. AI 추천 답변 — Dual Routing RAG Pipeline ──────────────────────────────
// Flow: Haiku(classify) → [RAG search] → Sonnet(generate, cached) → audit
// POST /api/suggest  { patientMessage, patientLang, procedureHint }
app.post("/api/suggest", async (req, res) => {
  const { patientMessage, patientLang, procedureHint, clinicId } = req.body;
  if (!patientMessage) return res.status(400).json({ error: "patientMessage required" });

  const startMs = Date.now();
  sseHeaders(res);

  // 안전한 종료 헬퍼
  const safeEnd = (errMsg) => {
    if (errMsg) sseWrite(res, { error: errMsg, code: "SUGGEST_ERROR" });
    sseDone(res);
  };

  try {
    // ── 클리닉 동적 시스템 프롬프트 빌드 ────────────────────────────────────
    const resolvedClinicId = clinicId || process.env.CLINIC_ID;
    const [clinicInfo_, clinicProcs] = await Promise.all([
      getClinicInfo(resolvedClinicId),
      getClinicProcedures(resolvedClinicId),
    ]);
    const dynamicSystemBase = buildSystemBase(
      clinicInfo_?.clinic_name,
      clinicInfo_?.location,
      clinicProcs
    );
    console.log(`[Suggest] clinic=${resolvedClinicId} name="${clinicInfo_?.clinic_name ?? "default"}"`);

    // ── Phase 1: Intent classification (Haiku 4.5) ──────────────────────────
    sseWrite(res, { phase: "routing" });
    const { intent, confidence, query } = await classifyIntent(patientMessage);
    console.log(`[Suggest] intent=${intent} conf=${confidence.toFixed(2)} lang=${patientLang}`);

    // ── Phase 2: RAG search (consultation + confidence ≥ 0.70) ─────────────
    let ragResult = null;
    if (intent === "consultation" && confidence >= 0.70) {
      sseWrite(res, { phase: "rag" });
      ragResult = await ragSearch(query, 5, resolvedClinicId);  // ← clinic 격리

      if (!ragResult) {
        // procedures_knowledge 비어있거나 없으면 로컬 시술 데이터 사용
        const localCtx = buildLocalContext(procedureHint);
        if (localCtx) {
          ragResult = { context: localCtx, chunks: 1, method: "local_fallback" };
          console.log("[RAG] 로컬 시술 데이터로 대체:", procedureHint);
        } else {
          console.log("[RAG] 학습 데이터 없음 — 가드레일 프롬프트만 사용");
        }
      } else {
        console.log(`[RAG] method=${ragResult.method} chunks=${ragResult.chunks}`);
      }
    } else {
      // 단순 인사/예약 → 빠른 경로, RAG skip
      const localCtx = buildLocalContext(procedureHint);
      if (localCtx) ragResult = { context: localCtx, chunks: 1, method: "local_direct" };
    }

    // ── Phase 3: Expert reply streaming (Sonnet → Haiku fallback) ──────────
    sseWrite(res, { phase: "generating" });
    const lang = LANG_NAME[patientLang] || patientLang || "unknown";
    const userMessage =
      `환자 메시지 (${lang}): "${patientMessage}"\n` +
      `환자 언어: ${lang}\n` +
      `의도 분류: ${intent}\n` +
      (procedureHint ? `관심 시술 힌트: ${procedureHint}\n` : "") +
      `\n위 환자에게 보낼 한국어 답변을 작성해주세요. 의료법 가드레일을 엄수하고, 전문의 1:1 상담 예약 CTA로 마무리해주세요.`;

    const genResult = await streamExpertReply(req, res, ragResult?.context ?? null, userMessage, dynamicSystemBase);

    // ── Phase 4: Audit log (비동기, 비차단) ────────────────────────────────
    auditLog({
      type:          "suggest",
      patientMessage,
      patientLang,
      intent,
      model:         genResult.model,
      ragChunks:     ragResult?.chunks ?? 0,
      tokensIn:      genResult.tokensIn,
      tokensOut:     genResult.tokensOut,
      durationMs:    Date.now() - startMs,
      cacheHit:      genResult.cacheHit,
    });

    safeEnd();

  } catch (err) {
    const isAbort = err.name === "AbortError";
    if (!isAbort) {
      console.error("[Suggest] 오류:", {
        message: err.message,
        stack:   err.stack?.split("\n").slice(0, 4).join(" | "),
        patientLang,
        procedureHint,
      });
    }
    const userMsg = isAbort
      ? null // 사용자가 취소 — 에러 메시지 불필요
      : err.message?.includes("API key") || err.message?.includes("auth")
        ? "API 인증 오류입니다. 관리자에게 문의하세요."
        : err.message?.includes("rate") || err.message?.includes("429")
          ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
          : `AI 답변 생성 실패: ${err.message}`;
    safeEnd(userMsg);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Magic Paste — 붙여넣기 즉시 AI 답변 3종 생성 (Zero-Integration)
// POST /api/magic-paste  { message, clinicId?, clinicName? }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/magic-paste", async (req, res) => {
  const { message, clinicId, clinicName: bodyClinicName } = req.body;
  if (!message?.trim())
    return res.status(400).json({ error: "message required" });

  // 병원명 해결: body > DB > env > 기본값
  let resolvedClinicName = bodyClinicName || process.env.CLINIC_NAME || "클리닉";
  if (clinicId && !bodyClinicName) {
    const info = await getClinicInfo(clinicId).catch(() => null);
    if (info?.clinic_name) resolvedClinicName = info.clinic_name;
  }

  const SYSTEM_PROMPT = `You are a Korean medical aesthetics clinic AI assistant for "${resolvedClinicName}".

Your ONLY task: analyze the patient message and generate THREE short Korean reply options for clinic staff.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown fences, no explanation, no extra text whatsoever.
2. Every reply MUST be in Korean, 2–4 sentences, warm yet professional.
3. Each reply should naturally mention "${resolvedClinicName}" at least once.
4. Follow Korean medical aesthetics etiquette; never guarantee results or diagnose.
5. Include a free-consultation CTA where appropriate.

Output this exact JSON shape:
{
  "detected_language": "<언어명 in Korean, e.g. 일본어 / 중국어 / 영어>",
  "intent": "<핵심 의도 in Korean, e.g. 가격 문의 및 부작용 우려>",
  "options": {
    "kind":    "<친절하고 상세한 답변 — 공감 → 정보 제공 → CTA>",
    "firm":    "<규정·정책 기반의 단호하지만 예의 바른 답변 — 정책 안내 → 상담 유도>",
    "booking": "<예약 유도형 답변 — 가치 강조 → 무료 상담 예약 CTA 포함>"
  }
}`;

  try {
    const resp = await anthropic.messages.create({
      model:      MODEL_HAIKU,
      max_tokens: 1200,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: `환자 메시지:\n"${message.trim()}"` }],
    });

    const raw = resp.content.find(b => b.type === "text")?.text ?? "";

    // JSON 파싱 — 모델이 코드 블록을 감쌀 경우 대비
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // 파싱 실패 시 raw를 kind에 담아 부분 응답
      parsed = {
        detected_language: "알 수 없음",
        intent:            "분석 실패",
        options: { kind: raw, firm: raw, booking: raw },
      };
    }

    // 필수 필드 보정
    parsed.options = parsed.options ?? {};
    parsed.options.kind    = parsed.options.kind    || parsed.options.detailed || "";
    parsed.options.firm    = parsed.options.firm    || parsed.options.policy   || "";
    parsed.options.booking = parsed.options.booking || parsed.options.action   || "";

    console.log(`[MagicPaste] clinic="${resolvedClinicName}" lang="${parsed.detected_language}" intent="${parsed.intent}"`);
    res.json(parsed);

  } catch (err) {
    console.error("[MagicPaste]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 3. 한국어 답변 → 환자 언어 번역 (발송 직전)
// POST /api/translate-reply  { text, targetLang }
app.post("/api/translate-reply", async (req, res) => {
  const text = req.body.text || req.body.replyText;
  const { targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: "text and targetLang required" });
  const lang = LANG_NAME[targetLang] || targetLang;
  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 600,
      system: `You are a professional medical translator. Translate the following Korean medical aesthetics clinic reply to ${lang}. Output ONLY the translation, no explanations, no notes.`,
      messages: [{ role: "user", content: text }],
    });
    const translated = response.content.find(b => b.type === "text")?.text ?? "";
    res.json({ translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. 애프터케어 메시지 생성 (D+1 / D+3 / D+7)
// POST /api/aftercare-msg  { procedureId, day, targetLang, patientName }
const AFTERCARE_GUIDE = {
  botox: {
    1: "시술 부위를 만지거나 마사지하지 마세요. 붉어짐은 정상이며 수 시간 내 사라집니다. 격렬한 운동은 48시간 후부터 가능합니다.",
    3: "보톡스 효과가 나타나기 시작하는 시기입니다. 음주와 사우나는 1주일 후부터 권장합니다.",
    7: "보톡스는 2주 뒤 최종 효과가 완성됩니다. 궁금한 점이나 사진 공유를 원하시면 언제든 연락주세요!",
  },
  filler: {
    1: "시술 부위에 붓기와 멍이 있을 수 있습니다. 아이스팩으로 10~15분씩 냉찜질하고, 술·혈액희석제는 피해주세요.",
    3: "붓기가 빠지고 자연스러운 윤곽이 나타나는 시기입니다. 수분 섭취를 충분히 해주세요.",
    7: "필러가 자리를 잡고 최종 효과가 나타납니다. 경과 사진을 보내주시면 확인해 드리겠습니다.",
  },
  laser_toning: {
    1: "자외선 차단 필수! SPF 50+ 선크림을 매일 발라주세요. 자극적인 스킨케어 제품은 피해주세요.",
    3: "보습에 신경 써주세요. 각질 제거제·레티놀 등 강한 성분은 1주일 후부터 사용 가능합니다.",
    7: "레이저 효과가 안정화되고 있습니다. 꾸준한 자외선 차단으로 효과를 유지하세요. 다음 세션은 4주 후 권장합니다.",
  },
  ulthera: {
    1: "시술 부위에 약간의 붓기·붉어짐은 정상입니다. 충분한 수면과 수분 섭취가 도움이 됩니다.",
    3: "초음파 에너지가 콜라겐 생성을 자극하고 있습니다. 지금은 변화가 미미하지만 1~3개월 후 효과가 본격화됩니다.",
    7: "회복은 잘 되고 계신가요? 최종 효과는 3개월 후 체감하실 수 있습니다. 언제든 연락주세요!",
  },
};

app.post("/api/aftercare-msg", async (req, res) => {
  const { procedureId, day, targetLang, patientName } = req.body;
  if (!day || !targetLang) return res.status(400).json({ error: "day and targetLang required" });
  sseHeaders(res);
  const guide = AFTERCARE_GUIDE[procedureId]?.[day]
    ?? `시술 후 ${day}일이 되었습니다. 경과는 어떠신가요? 궁금한 점이 있으시면 언제든지 연락주세요!`;
  const lang = LANG_NAME[targetLang] || targetLang;
  const proc = procedures.find(p => p.id === procedureId);
  const procName = proc?.name?.[targetLang] || proc?.name?.ko || "시술";
  const nameStr = patientName ? `${patientName}님` : "고객님";
  await streamClaude(
    res,
    `You are a warm and professional medical aesthetics clinic assistant at LIBHIB Clinic, Seoul.
Write a D+${day} aftercare message to a patient in ${lang}.
- Warm, caring tone. Natural ${lang}.
- 3-4 sentences max. Include the aftercare guideline naturally.
- Sign off from "LIBHIB Clinic Team". Output ONLY the message in ${lang}.`,
    `Patient: ${nameStr}\nProcedure: ${procName}\nDay: D+${day}\nGuideline (KO): ${guide}`,
    MODEL_SONNET, 400
  );
});

// ── 5. 환자 챗봇 (웹사이트 위젯용)
// POST /api/chat
app.post("/api/chat", async (req, res) => {
  const { messages, procedureId } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "messages required" });
  sseHeaders(res);

  const safeEnd = (errMsg) => {
    try {
      if (errMsg) res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      else res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch {}
  };

  const procContext = buildLocalContext(procedureId);
  const systemText =
    `You are a structured medical aesthetics consultation AI for LIBHIB Clinic, ${clinicInfo.location}.
LANGUAGE RULE: Always respond in the SAME language as the user's message.
TONE: Warm, concise, professional. Max 3~4 sentences per reply.
HARD LIMITS: Only discuss LIBHIB Clinic procedures. No off-topic answers.
BOOKING: After 3 exchanges, suggest booking a free consultation.` +
    (procContext ? `\n\nFOCUS PROCEDURE:\n${procContext}` : "");

  try {
    const stream = anthropic.messages.stream({
      model: MODEL_SONNET, max_tokens: 512,
      system: systemText,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const e of stream) {
      if (res.writableEnded) break;
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
        sseWrite(res, { text: e.delta.text });
      }
    }
    safeEnd();
  } catch (err) {
    console.error("[/api/chat]", err.message);
    safeEnd(err.message);
  }
});

// ── GET /api/procedures  (기존 — 로컬 fallback 데이터)
app.get("/api/procedures", (req, res) => res.json(procedures));

// ════════════════════════════════════════════════════════════════════════════
// AI 지식 베이스 — 파일 업로드 / 목록 / 삭제
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/knowledge/upload
// multipart/form-data: file + clinic_id
app.post("/api/knowledge/upload",
  knowledgeUpload.single("file"),
  async (req, res) => {
    const clinic_id = req.body.clinic_id || process.env.CLINIC_ID;
    if (!clinic_id)  return res.status(400).json({ error: "clinic_id required" });
    if (!req.file)   return res.status(400).json({ error: "file required" });

    const { originalname, buffer, size } = req.file;
    const ext = originalname.toLowerCase().split(".").pop();

    try {
      // 1. 텍스트 추출
      const rawText = await extractText(buffer, originalname);
      if (!rawText?.trim()) throw new Error("텍스트를 추출할 수 없습니다");

      // 2. 청킹
      const chunks = chunkText(rawText);
      if (!chunks.length) throw new Error("청킹 결과가 없습니다");

      // 3. 기존 동일 파일 청크 삭제 (재업로드 지원)
      await supabaseAdmin
        .from("procedures_knowledge")
        .delete()
        .eq("clinic_id", clinic_id)
        .eq("file_name",  originalname);

      // 4. 임베딩 생성 + 행 구성
      const procName = originalname.replace(/\.[^.]+$/, ""); // 확장자 제거
      const rows = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedQuery(chunks[i]); // null if no OpenAI key
        rows.push({
          clinic_id,
          file_name:      originalname,
          file_type:      ext,
          file_size:      size,
          procedure_name: procName,
          chunk_index:    i,
          content:        chunks[i],
          embedding:      embedding ?? undefined,
        });
      }

      // 5. Supabase upsert (배치 100개씩)
      const BATCH = 100;
      for (let b = 0; b < rows.length; b += BATCH) {
        const { error } = await supabaseAdmin
          .from("procedures_knowledge")
          .insert(rows.slice(b, b + BATCH));
        if (error) throw error;
      }

      console.log(`[Knowledge] 업로드 완료: ${originalname} → ${chunks.length}청크 | clinic=${clinic_id}`);
      res.json({
        ok:        true,
        file_name: originalname,
        chunks:    chunks.length,
        embedded:  rows.some(r => r.embedding != null),
      });

    } catch (err) {
      console.error("[Knowledge/upload]", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/knowledge/files?clinic_id=xxx
// 업로드된 파일 목록 (파일당 1행 — chunk_index=0 기준)
app.get("/api/knowledge/files", async (req, res) => {
  const clinic_id = req.query.clinic_id || process.env.CLINIC_ID;
  if (!clinic_id) return res.status(400).json({ error: "clinic_id required" });

  try {
    // 파일별 집계: 청크 수, 임베딩 여부, 업로드 시각
    const { data, error } = await supabaseAdmin
      .from("procedures_knowledge")
      .select("file_name, file_type, file_size, chunk_index, embedding, created_at")
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 파일명 기준으로 그룹핑
    const fileMap = new Map();
    for (const row of (data || [])) {
      if (!fileMap.has(row.file_name)) {
        fileMap.set(row.file_name, {
          file_name:  row.file_name,
          file_type:  row.file_type,
          file_size:  row.file_size || 0,
          chunks:     0,
          embedded:   false,
          created_at: row.created_at,
        });
      }
      const f = fileMap.get(row.file_name);
      f.chunks++;
      if (row.embedding) f.embedded = true;
    }

    res.json({ files: Array.from(fileMap.values()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/knowledge/files  { clinic_id, file_name }
app.delete("/api/knowledge/files", async (req, res) => {
  const clinic_id = req.body.clinic_id || req.query.clinic_id || process.env.CLINIC_ID;
  const file_name = req.body.file_name || req.query.file_name;
  if (!clinic_id || !file_name)
    return res.status(400).json({ error: "clinic_id and file_name required" });

  try {
    const { error } = await supabaseAdmin
      .from("procedures_knowledge")
      .delete()
      .eq("clinic_id", clinic_id)
      .eq("file_name",  file_name);
    if (error) throw error;
    console.log(`[Knowledge] 삭제: ${file_name} | clinic=${clinic_id}`);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 멀티테넌트 시술 관리 API
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/procedure-templates — 마스터 템플릿 목록 (전체 공통)
app.get("/api/procedure-templates", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("master_procedures")          // ← 마스터 테이블
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_ko");
    if (!error && data?.length) return res.json({ templates: data });
  } catch (e) {
    console.warn("[procedure-templates] Supabase fallback:", e.message);
  }
  // Supabase 미설정 또는 빈 테이블 → 로컬 JS 템플릿 fallback
  res.json({ templates: PROCEDURE_TEMPLATES });
});

// ── GET /api/clinic-procedures — 병원별 시술 목록
app.get("/api/clinic-procedures", async (req, res) => {
  const clinicId = req.query.clinic_id || process.env.CLINIC_ID;
  if (!clinicId) return res.status(400).json({ error: "clinic_id required" });
  try {
    const { data, error } = await supabaseAdmin
      .from("procedures")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("sort_order")
      .order("name_ko");
    if (error) throw error;
    res.json({ procedures: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/clinic-procedures/copy — 마스터 템플릿 → 병원 시술로 복사
app.post("/api/clinic-procedures/copy", async (req, res) => {
  const { clinic_id, template_ids } = req.body;
  if (!clinic_id || !Array.isArray(template_ids) || !template_ids.length)
    return res.status(400).json({ error: "clinic_id and template_ids[] required" });

  try {
    // 이미 존재하는 template_id 조회 (중복 방지)
    const { data: existing } = await supabaseAdmin
      .from("procedures")
      .select("template_id")
      .eq("clinic_id", clinic_id)
      .in("template_id", template_ids);
    const existingIds = new Set((existing || []).map(r => r.template_id));

    // 복사할 템플릿 조회 — Supabase master_procedures 우선, 로컬 fallback
    let templates = [];
    try {
      const { data } = await supabaseAdmin
        .from("master_procedures")         // ← 마스터 테이블
        .select("*")
        .in("template_id", template_ids);
      templates = data || [];
    } catch {}
    // 로컬 fallback (Supabase 미설정 또는 seed 전)
    if (!templates.length) {
      templates = PROCEDURE_TEMPLATES.filter(t => template_ids.includes(t.template_id));
    }

    const newRows = templates
      .filter(t => !existingIds.has(t.template_id))
      .map((t, i) => ({
        clinic_id,
        template_id:     t.template_id,
        name_ko:         t.name_ko,
        name_en:         t.name_en   || "",
        name_ja:         t.name_ja   || "",
        name_zh:         t.name_zh   || "",
        category:        t.category  || "",
        description_ko:  t.description_ko || "",
        description_en:  t.description_en || "",
        price_range:     t.price_range    || "",   // ← price_display 제거, price_range 통일
        downtime:        t.downtime       || "",
        duration:        t.duration       || "",
        effects_ko:      t.effects_ko     || [],
        cautions_ko:     t.cautions_ko    || [],
        faq_ko:          t.faq_ko  || "",
        faq_en:          t.faq_en  || "",
        faq_ja:          t.faq_ja  || "",
        faq_zh:          t.faq_zh  || "",
        is_active:       true,
        sort_order:      i,
      }));

    if (!newRows.length) return res.json({ added: 0, skipped: existingIds.size });

    const { data: inserted, error } = await supabaseAdmin
      .from("procedures")
      .insert(newRows)
      .select();
    if (error) throw error;

    // 클리닉 캐시 무효화
    _clinicCache.delete(clinic_id);

    res.json({ added: inserted.length, skipped: existingIds.size, procedures: inserted });
  } catch (e) {
    console.error("[copy-procedures]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/clinic-procedures/:id — 시술 정보 수정
app.patch("/api/clinic-procedures/:id", async (req, res) => {
  const { id } = req.params;
  const { clinic_id, ...updates } = req.body;
  if (!clinic_id) return res.status(400).json({ error: "clinic_id required" });

  // clinic_id 위조 방지 — 반드시 같은 병원 레코드만 수정
  const allowed = ["name_ko","name_en","name_ja","name_zh","category",
    "description_ko","description_en",
    "price_range","downtime","duration",                // ← price_range 통일
    "effects_ko","cautions_ko",
    "faq_ko","faq_en","faq_ja","faq_zh",
    "custom_note","is_active","sort_order"];
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  safe.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("procedures")
      .update(safe)
      .eq("id", id)
      .eq("clinic_id", clinic_id) // ← 다른 병원 레코드 수정 불가
      .select()
      .single();
    if (error) throw error;
    _clinicCache.delete(clinic_id);
    res.json({ procedure: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/clinic-procedures/:id — 시술 삭제
app.delete("/api/clinic-procedures/:id", async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.query.clinic_id || req.body.clinic_id;
  if (!clinic_id) return res.status(400).json({ error: "clinic_id required" });

  try {
    const { error } = await supabaseAdmin
      .from("procedures")
      .delete()
      .eq("id", id)
      .eq("clinic_id", clinic_id);
    if (error) throw error;
    _clinicCache.delete(clinic_id);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Express 전역 에러 미들웨어
app.use((err, req, res, _next) => {
  console.error("[Express error]", err.message);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

// ── SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// ── 0.0.0.0 바인딩 필수 (Railway 외부 라우터 연결) ───────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ LIBHIB Dashboard on 0.0.0.0:${PORT} | Haiku=${MODEL_HAIKU.split("-").slice(-1)[0]} Sonnet=${MODEL_SONNET.split("-").slice(-1)[0]}`);

  // ── Phase 3: 백그라운드 서비스 시작 ─────────────────────────────────────
  // Redis 없으면 각 모듈이 알아서 graceful degradation 처리
  try { startMessageWorker(); }      catch (e) { console.error("[Startup] messageWorker 실패:", e.message); }
  try { startAftercareScheduler(); } catch (e) { console.error("[Startup] aftercareScheduler 실패:", e.message); }
});
