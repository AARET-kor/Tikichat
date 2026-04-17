// ESM hoisting 근본 해결: 모든 import 중 가장 먼저 실행되어 env를 로드
import 'dotenv/config';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
// 사용자 지정 경로로 한 번 더 로드 — 개발/배포 경로 차이 대응 (이미 로드된 키는 override: false 기본값으로 덮어쓰지 않음)
dotenv.config({ path: join(__dirname, ".env") });

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
import mammoth from "mammoth";
import * as XLSX from "xlsx";
// pdf-parse v2.x — ESM named export (PDFParse 클래스)
import { PDFParse } from "pdf-parse";

// v1.x 호환 래퍼: pdfParse(buffer) → { text }
async function pdfParse(buffer) {
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  const text = await parser.getText();
  await parser.destroy();
  return { text };
}
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

// ── CORS 설정 ─────────────────────────────────────────────────────────────────
// 개발 중: origin: true (요청 origin 그대로 반영), credentials: true로 최대 개방
// 프로덕션 전환 시: origin 화이트리스트로 교체 필요
const corsOptions = {
  origin: true,          // 모든 origin 허용 — chrome-extension://* 포함
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,     // 쿠키/인증 헤더 허용
};

app.use(cors(corsOptions));
// Preflight(OPTIONS) 요청을 모든 경로에서 즉시 응답
app.options("*", cors(corsOptions));

// ⚠️  Meta Webhook은 raw body가 필요 (HMAC 검증) — express.json() 보다 먼저 등록
app.use("/webhook/meta", express.raw({ type: "application/json" }), metaWebhookRouter);

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Supabase 클라이언트 — lazy initialization ─────────────────────────────────
// createClient를 import 시점이 아닌 첫 사용 시점에 호출
let _supabase, _supabaseAdmin;

function getSbClient() {
  if (_supabase !== undefined) return _supabase;
  const url  = process.env.SUPABASE_URL       || "";
  const anon = process.env.SUPABASE_ANON_KEY   || "";
  if (!url) {
    console.warn("[Supabase] SUPABASE_URL 미설정 — Supabase 없이 실행 중 (DB 기능 비활성화)");
    return (_supabase = null);
  }
  return (_supabase = createClient(url, anon));
}

function getSbAdmin() {
  if (_supabaseAdmin !== undefined) return _supabaseAdmin;
  const url    = process.env.SUPABASE_URL       || "";
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url) return (_supabaseAdmin = null);
  // 서비스 롤 클라이언트 — RLS bypass, 서버 사이드 CRUD 전용
  return (_supabaseAdmin = createClient(url, svcKey));
}

// ── supabaseAdmin 프록시 ───────────────────────────────────────────────────────
// getSbAdmin()의 lazy alias — `supabaseAdmin.from(...)` 패턴을 전역에서 사용 가능
// Supabase 미설정 시 접근하면 Error를 throw (try/catch 있는 핸들러에서 500으로 처리됨)
const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    const c = getSbAdmin();
    if (!c) throw new Error("Supabase not configured (SUPABASE_URL missing)");
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

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
  process.env.CLINIC_NAME     || "TikiDoc 클리닉",
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
      const { data, error } = await getSbClient().rpc("match_procedures", {
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
    const { data, error } = await getSbClient().rpc("search_procedures_keyword", {
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
const ALLOWED_EXTS = /\.(pdf|docx|doc|txt|csv|xlsx|xls)$/i;
const knowledgeUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ok = ALLOWED_EXTS.test(file.originalname);
    cb(ok ? null : new Error("PDF·DOCX·DOC·TXT·CSV·XLSX·XLS만 업로드 가능합니다"), ok);
  },
});

// 파일 버퍼 → 텍스트 추출 (PDF/DOCX/DOC/XLSX/XLS/TXT/CSV 지원)
async function extractText(buffer, originalname) {
  const ext = originalname.toLowerCase().split(".").pop();
  try {
    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    }
    if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const texts = workbook.SheetNames.map(name => {
        const ws = workbook.Sheets[name];
        // header: 1 → 배열 모드로 읽어 CSV 형태 문자열로 변환
        const rows = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
        return `[시트: ${name}]\n${rows}`;
      });
      return texts.join("\n\n");
    }
    // txt / csv
    return buffer.toString("utf-8");
  } catch (err) {
    console.warn("[extractText]", err.message);
    return buffer.toString("utf-8");
  }
}

// ── 문서 자동 분류 (키워드 기반, 빠름) ────────────────────────────────────────
// 반환값: 'procedure' | 'pricing' | 'aftercare' | 'general'
function classifyDocumentContent(text) {
  const t = text.toLowerCase();

  const procedureScore = (
    (t.includes("시술") ? 2 : 0) +
    (t.includes("치료") ? 1 : 0) +
    (t.includes("효과") ? 1 : 0) +
    (t.includes("다운타임") ? 2 : 0) +
    (t.includes("울쎄라") || t.includes("인모드") || t.includes("보톡스") ||
     t.includes("필러") || t.includes("리프팅") || t.includes("레이저") ? 3 : 0) +
    (t.includes("procedure") || t.includes("treatment") ? 1 : 0)
  );

  const pricingScore = (
    (t.includes("가격") || t.includes("price") ? 2 : 0) +
    (t.includes("만원") || t.includes("원") ? 1 : 0) +
    (t.includes("이벤트") ? 1 : 0) +
    (t.includes("할인") || t.includes("프로모션") ? 2 : 0) +
    (t.includes("비용") ? 1 : 0)
  );

  const aftercareScore = (
    (t.includes("애프터케어") || t.includes("aftercare") ? 3 : 0) +
    (t.includes("회복") || t.includes("주의사항") ? 2 : 0) +
    (t.includes("시술 후") || t.includes("수술 후") ? 2 : 0) +
    (t.includes("금기") || t.includes("부작용") ? 1 : 0)
  );

  const max = Math.max(procedureScore, pricingScore, aftercareScore);
  if (max === 0) return "general";
  if (max === procedureScore && procedureScore >= 3) return "procedure";
  if (max === aftercareScore && aftercareScore >= 3) return "aftercare";
  if (max === pricingScore  && pricingScore  >= 2) return "pricing";
  return "general";
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

    const _sb = getSbClient();
    if (!_sb) return;
    await _sb.from("audit_logs").insert({
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

// ════════════════════════════════════════════════════════════════════════════
// POST /api/tiki-paste  { message, clinicId?, clinicName? }
// 15년 경력 수석 실장 페르소나 — 실제 시술 DB 100% 기반 답변
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/tiki-paste", async (req, res) => {
  const { message, clinicId, clinicName: bodyClinicName } = req.body;
  if (!message?.trim())
    return res.status(400).json({ error: "message required" });

  const resolvedClinicId = clinicId || null;

  // ── 병원 정보 + 실제 시술 DB 병렬 조회 ──────────────────────────────────
  const [clinicInfoData, clinicProcs] = await Promise.all([
    getClinicInfo(resolvedClinicId).catch(() => null),
    getClinicProcedures(resolvedClinicId).catch(() => null),
  ]);

  const resolvedClinicName = bodyClinicName
    || clinicInfoData?.clinic_name
    || process.env.CLINIC_NAME
    || "클리닉";

  // ── RAG 지식 베이스 검색 (procedures_knowledge) ──────────────────────────
  let ragContext = "";
  try {
    const ragResult = await ragSearch(message.trim(), 5, resolvedClinicId);
    if (ragResult?.context) {
      ragContext = ragResult.context;
      console.log(`[TikiPaste] RAG method=${ragResult.method} chunks=${ragResult.chunks}`);
    }
  } catch (e) {
    console.warn("[TikiPaste] RAG search failed:", e.message);
  }

  // ── 실제 시술 목록 텍스트 빌드 ─────────────────────────────────────────
  const procSource = clinicProcs || procedures; // 등록 시술 없으면 로컬 fallback
  const procText = procSource.map(p => {
    const nameKo   = p.name_ko    || p.name?.ko    || p.name || "";
    const nameEn   = p.name_en    || p.name?.en    || "";
    const price    = p.price_range || p.price_display || "상담 후 결정";
    const downtime = p.downtime   || "";
    const effects  = Array.isArray(p.effects_ko) ? p.effects_ko.join(", ")
                   : Array.isArray(p.effects)    ? p.effects.join(", ") : "";
    const faq      = Array.isArray(p.faq_ko)     ? p.faq_ko.map(f => `Q: ${f.q} A: ${f.a}`).join(" / ")
                   : "";
    return `• ${nameKo}${nameEn ? ` (${nameEn})` : ""} — 가격: ${price}${downtime ? ` / 다운타임: ${downtime}` : ""}${effects ? ` / 효과: ${effects}` : ""}${faq ? `\n  FAQ: ${faq}` : ""}`;
  }).join("\n");

  console.log(`[TikiPaste] clinic="${resolvedClinicName}" id="${resolvedClinicId}" procs=${procSource.length} ragCtx=${ragContext.length > 0}`);

  const SYSTEM_PROMPT = `너는 ${resolvedClinicName}의 15년 경력 수석 상담 실장이다.
수천 명의 외국인 환자를 상담한 풍부한 경험을 가지고 있으며, 우리 병원 시술에 대해 누구보다 정확히 알고 있다.

━━━ 핵심 규칙 (절대 위반 금지) ━━━
1. 아래 [우리 병원 시술 정보]와 [참고 지식]을 100% 기반으로만 답변한다.
2. 목록에 없는 시술, 확인되지 않은 가격, 보장성 표현은 절대 사용하지 않는다.
3. "최고", "100% 효과", "부작용 없음", "확실히 낫는다" 등 과장 표현 금지 (의료법)
4. "AI입니다", "챗봇입니다" 자기 노출 금지
5. 모든 시술 결정은 반드시 "전문의 1:1 상담 후 결정" 문구로 마무리

━━━ 언어 규칙 (절대 위반 금지) ━━━
- 환자 메시지 언어를 정확히 감지한다.
- "reply" 필드는 반드시 환자 메시지와 동일한 언어로 작성한다.
  • 중국어 메시지 → reply는 중국어(中文)
  • 일본어 메시지 → reply는 일본어(日本語)
  • 영어 메시지   → reply는 영어(English)
  • 아랍어 메시지 → reply는 아랍어(العربية)
  • 태국어 메시지 → reply는 태국어(ภาษาไทย)
- "ko_translation" 필드만 한국어 (직원 검토용)
- reply 필드에 절대 한국어 사용 금지

━━━ 우리 병원 시술 정보 (이 정보를 기반으로 답변하라) ━━━
${procText || "등록된 시술 정보가 없습니다. 일반적인 미용의료 안내만 제공하세요."}

${ragContext ? `━━━ 참고 지식 베이스 ━━━\n${ragContext}\n` : ""}
━━━ 출력 형식 (반드시 순수 JSON만 출력, 마크다운 금지) ━━━
{
  "detected_language": "<언어명 in Korean — 예: 중국어, 일본어, 영어>",
  "intent": "<환자 의도 in Korean — 예: 보톡스 가격 문의>",
  "options": {
    "kind":    { "reply": "<환자 언어로 — 공감·상세·CTA 포함>", "ko_translation": "<자연스러운 한국어 번역>" },
    "firm":    { "reply": "<환자 언어로 — 규정 기반·단호하지만 친절>", "ko_translation": "<자연스러운 한국어 번역>" },
    "booking": { "reply": "<환자 언어로 — 가치 강조 + 예약 링크>",   "ko_translation": "<자연스러운 한국어 번역>" }
  }
}

각 reply: 2~4문장. "${resolvedClinicName}" 자연스럽게 1회 이상 포함. booking reply는 반드시 [예약: app.tikidoc.xyz/book] 링크로 마무리.`;

  try {
    const resp = await anthropic.messages.create({
      model:      MODEL_HAIKU,
      max_tokens: 1800,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: `Patient message:\n"${message.trim()}"` }],
    });

    const raw = resp.content.find(b => b.type === "text")?.text ?? "";

    // JSON 파싱 — 모델이 코드 블록을 감쌀 경우 대비
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        detected_language: "알 수 없음",
        intent: "분석 실패",
        options: {
          kind:    { reply: raw, ko_translation: "" },
          firm:    { reply: raw, ko_translation: "" },
          booking: { reply: raw, ko_translation: "" },
        },
      };
    }

    // 필수 필드 보정 — 구버전 string 응답도 호환
    parsed.options = parsed.options ?? {};
    const normalize = (opt, fallback = "") => {
      if (!opt) return { reply: fallback, ko_translation: "" };
      if (typeof opt === "string") return { reply: opt, ko_translation: "" };
      return { reply: opt.reply || fallback, ko_translation: opt.ko_translation || "" };
    };
    parsed.options.kind    = normalize(parsed.options.kind);
    parsed.options.firm    = normalize(parsed.options.firm);
    parsed.options.booking = normalize(parsed.options.booking);

    console.log(`[TikiPaste] clinic="${resolvedClinicName}" lang="${parsed.detected_language}" intent="${parsed.intent}"`);
    res.json(parsed);

  } catch (err) {
    console.error("[TikiPaste]", err.message);
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
      // 1. 텍스트 추출 (PDF/DOCX/DOC/XLSX/XLS/CSV/TXT 자동 처리)
      const rawText = await extractText(buffer, originalname);
      if (!rawText?.trim()) throw new Error("텍스트를 추출할 수 없습니다");

      // 2. 문서 자동 분류 (procedure/pricing/aftercare/general)
      const docCategory = classifyDocumentContent(rawText);

      // 3. 청킹
      const chunks = chunkText(rawText);
      if (!chunks.length) throw new Error("청킹 결과가 없습니다");

      // 4. 기존 동일 파일 청크 삭제 (재업로드 지원)
      await supabaseAdmin
        .from("procedures_knowledge")
        .delete()
        .eq("clinic_id", clinic_id)
        .eq("file_name",  originalname);

      // 5. 임베딩 생성 + 행 구성
      const procName = originalname.replace(/\.[^.]+$/, ""); // 확장자 제거
      const rows = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedQuery(chunks[i]); // null if no OpenAI key
        rows.push({
          clinic_id,
          file_name:      originalname,
          file_type:      ext,
          file_size:      size,
          procedure_name: `[${docCategory}] ${procName}`,  // 분류 태그를 procedure_name에 prefix
          chunk_index:    i,
          content:        chunks[i],
          embedding:      embedding ?? undefined,
        });
      }

      // 6. Supabase upsert (배치 100개씩)
      const BATCH = 100;
      for (let b = 0; b < rows.length; b += BATCH) {
        const { error } = await supabaseAdmin
          .from("procedures_knowledge")
          .insert(rows.slice(b, b + BATCH));
        if (error) throw error;
      }

      console.log(`[Knowledge] 업로드 완료: ${originalname} → ${chunks.length}청크 | 분류=${docCategory} | clinic=${clinic_id}`);
      res.json({
        ok:           true,
        file_name:    originalname,
        chunks:       chunks.length,
        embedded:     rows.some(r => r.embedding != null),
        doc_category: docCategory,   // 클라이언트에 분류 결과 반환
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
    // 파일별 집계: 청크 수, 업로드 시각
    // embedding 컬럼(vector 타입)은 SELECT에서 완전히 제외 — pgvector 미설치 환경 대응
    const { data, error } = await supabaseAdmin
      .from("procedures_knowledge")
      .select("file_name, file_type, file_size, chunk_index, created_at")
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
      fileMap.get(row.file_name).chunks++;
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

// ════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register  { clinic_name, email, password }
// 새 병원 계정 생성 — clinic 레코드 + Supabase user 를 서버에서 원자적으로 생성
// app_metadata.clinic_id / role 은 DB 트리거가 자동 주입
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/auth/register", async (req, res) => {
  const { clinic_name, email, password } = req.body;

  if (!clinic_name?.trim() || !email?.trim() || !password?.trim())
    return res.status(400).json({ error: "clinic_name, email, password 모두 필요합니다." });

  if (password.length < 8)
    return res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." });

  try {
    // 1. Supabase Admin API로 유저 생성
    //    user_metadata.clinic_name → DB 트리거가 읽어 clinic 레코드 + app_metadata 자동 세팅
    const _sbAdmin = getSbAdmin();
    if (!_sbAdmin) return res.status(503).json({ error: "Supabase가 설정되지 않았습니다." });
    const { data: userData, error: userErr } = await _sbAdmin.auth.admin.createUser({
      email:          email.trim(),
      password:       password,
      email_confirm:  true,           // 이메일 인증 없이 즉시 활성화
      user_metadata:  {
        clinic_name:  clinic_name.trim(),
        full_name:    clinic_name.trim(),
        role:         "owner",
      },
    });

    if (userErr) {
      // 이미 가입된 이메일
      if (userErr.message?.includes("already")) {
        return res.status(409).json({ error: "이미 가입된 이메일 주소입니다." });
      }
      throw userErr;
    }

    const userId = userData.user.id;

    // 2. DB 트리거가 clinic 생성 + app_metadata 주입까지 처리함
    //    트리거가 완료될 때까지 짧게 대기 후 최종 user 조회
    await new Promise(r => setTimeout(r, 300));
    const { data: finalUser } = await _sbAdmin.auth.admin.getUserById(userId);
    const clinicId = finalUser?.user?.app_metadata?.clinic_id;

    console.log(`[Register] 신규 병원 생성: "${clinic_name}" → clinic_id=${clinicId} user=${userId}`);
    res.status(201).json({
      success:   true,
      clinic_id: clinicId,
      user_id:   userId,
      message:   `${clinic_name} 계정이 생성되었습니다.`,
    });

  } catch (err) {
    console.error("[Register]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS + MESSAGES  (Option A — Mock → Supabase)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/conversations?clinicId=X
app.get("/api/conversations", async (req, res) => {
  const { clinicId } = req.query;
  if (!clinicId) return res.status(400).json({ error: "clinicId required" });
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });
    if (error) {
      if (error.code === "42P01") return res.json([]); // table not yet created
      throw error;
    }
    // Normalize: map DB rows → frontend shape
    const convs = (data || []).map(row => ({
      id:            row.id,
      patient:       row.patient || {},
      channel:       row.channel,
      procedure:     row.procedure,
      procedureName: row.procedure_name,
      status:        row.status,
      unreadCount:   row.unread_count,
      preview:       row.preview,
      timeline:      row.timeline || [],
      gallery:       row.gallery  || [],
      notes:         row.notes,
      aftercareSummary: row.aftercare_summary,
      messages:      [],   // loaded separately
      time:          row.updated_at,
    }));
    res.json(convs);
  } catch (err) {
    console.error("[Conversations/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations  { clinicId, conversation }
app.post("/api/conversations", async (req, res) => {
  const { clinicId, conversation } = req.body;
  if (!clinicId || !conversation) return res.status(400).json({ error: "clinicId + conversation required" });
  try {
    const sb = getSbAdmin();
    const row = {
      id:               conversation.id,
      clinic_id:        clinicId,
      patient:          conversation.patient || {},
      channel:          conversation.channel,
      procedure:        conversation.procedure,
      procedure_name:   conversation.procedureName,
      status:           conversation.status || "unread",
      unread_count:     conversation.unreadCount || 0,
      preview:          conversation.preview,
      timeline:         conversation.timeline || [],
      gallery:          conversation.gallery  || [],
      notes:            conversation.notes,
      aftercare_summary: conversation.aftercareSummary,
    };
    const { data, error } = await sb.from("conversations").upsert(row).select().single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) {
    console.error("[Conversations/Post]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/conversations/:id  { updates }
app.patch("/api/conversations/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const sb = getSbAdmin();
    // Map frontend keys → DB column names
    const dbUpdates = {};
    if (updates.status       !== undefined) dbUpdates.status        = updates.status;
    if (updates.unreadCount  !== undefined) dbUpdates.unread_count  = updates.unreadCount;
    if (updates.preview      !== undefined) dbUpdates.preview       = updates.preview;
    if (updates.notes        !== undefined) dbUpdates.notes         = updates.notes;
    if (updates.timeline     !== undefined) dbUpdates.timeline      = updates.timeline;
    if (updates.gallery      !== undefined) dbUpdates.gallery       = updates.gallery;
    if (updates.aftercareSummary !== undefined) dbUpdates.aftercare_summary = updates.aftercareSummary;
    const { error } = await sb.from("conversations").update(dbUpdates).eq("id", id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[Conversations/Patch]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/conversations/:id/messages
app.get("/api/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      if (error.code === "42P01") return res.json([]);
      throw error;
    }
    const msgs = (data || []).map(m => ({
      id:            m.id,
      from:          m.from_role,
      originalText:  m.original_text,
      translatedText: m.translated_text,
      time:          m.time || new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    }));
    res.json(msgs);
  } catch (err) {
    console.error("[Messages/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:id/messages  { clinicId, message }
app.post("/api/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { clinicId, message } = req.body;
  if (!clinicId || !message) return res.status(400).json({ error: "clinicId + message required" });
  try {
    const sb = getSbAdmin();
    const row = {
      id:              message.id || crypto.randomUUID(),
      conversation_id: id,
      clinic_id:       clinicId,
      from_role:       message.from,
      original_text:   message.originalText,
      translated_text: message.translatedText,
      time:            message.time,
    };
    const { error: msgErr } = await sb.from("messages").insert(row);
    if (msgErr && msgErr.code !== "42P01") throw msgErr;

    // Update conversation preview + updated_at
    const { error: convErr } = await sb
      .from("conversations")
      .update({ preview: message.originalText?.slice(0, 80), status: "active" })
      .eq("id", id);
    if (convErr && convErr.code !== "42P01") console.warn("[Messages/Post] conv update:", convErr.message);

    res.json({ id: row.id });
  } catch (err) {
    console.error("[Messages/Post]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/patients?clinicId=X
app.get("/api/patients", async (req, res) => {
  const { clinicId } = req.query;
  if (!clinicId) return res.status(400).json({ error: "clinicId required" });
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });
    if (error) {
      if (error.code === "42P01") return res.json([]);
      throw error;
    }
    const patients = (data || []).map(r => ({
      id:          r.id,
      name:        r.name,
      nameEn:      r.name_en,
      flag:        r.flag,
      country:     r.country,
      lang:        r.lang,
      gender:      r.gender,
      age:         r.age,
      channel:     r.channel,
      procedure:   r.procedure,
      lastVisit:   r.last_visit,
      nextBooking: r.next_booking,
      status:      r.status,
      totalSpent:  r.total_spent,
      phone:       r.phone,
      email:       r.email,
      note:        r.note,
      tags:        r.tags || [],
      timeline:    r.timeline || [],
    }));
    res.json(patients);
  } catch (err) {
    console.error("[Patients/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients  { clinicId, patient }
app.post("/api/patients", async (req, res) => {
  const { clinicId, patient } = req.body;
  if (!clinicId || !patient) return res.status(400).json({ error: "clinicId + patient required" });
  try {
    const sb = getSbAdmin();
    const row = {
      id:          patient.id || crypto.randomUUID(),
      clinic_id:   clinicId,
      name:        patient.name,
      name_en:     patient.nameEn,
      flag:        patient.flag,
      country:     patient.country,
      lang:        patient.lang,
      gender:      patient.gender,
      age:         patient.age,
      channel:     patient.channel,
      procedure:   patient.procedure,
      last_visit:  patient.lastVisit,
      next_booking: patient.nextBooking,
      status:      patient.status || "consulting",
      total_spent: patient.totalSpent || 0,
      phone:       patient.phone,
      email:       patient.email,
      note:        patient.note,
      tags:        patient.tags || [],
      timeline:    patient.timeline || [],
    };
    const { data, error } = await sb.from("patients").upsert(row).select().single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) {
    console.error("[Patients/Post]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/patients/:id  { updates }
app.patch("/api/patients/:id", async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const sb = getSbAdmin();
    const dbU = {};
    if (u.name        !== undefined) dbU.name        = u.name;
    if (u.nameEn      !== undefined) dbU.name_en     = u.nameEn;
    if (u.status      !== undefined) dbU.status      = u.status;
    if (u.nextBooking !== undefined) dbU.next_booking = u.nextBooking;
    if (u.totalSpent  !== undefined) dbU.total_spent  = u.totalSpent;
    if (u.note        !== undefined) dbU.note        = u.note;
    if (u.tags        !== undefined) dbU.tags        = u.tags;
    if (u.timeline    !== undefined) dbU.timeline    = u.timeline;
    if (u.phone       !== undefined) dbU.phone       = u.phone;
    if (u.email       !== undefined) dbU.email       = u.email;
    const { error } = await sb.from("patients").update(dbU).eq("id", id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[Patients/Patch]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patients/search?clinicId=X&q=검색어
// name / phone / channel 부분 매칭 (ILIKE), 최대 15건
app.get("/api/patients/search", async (req, res) => {
  const { clinicId, q } = req.query;
  if (!clinicId || !q?.trim()) return res.status(400).json({ error: "clinicId + q required" });
  try {
    const sb = getSbAdmin();
    const safe = q.trim().replace(/[%_]/g, "\\$&");   // SQL injection guard
    const { data, error } = await sb
      .from("patients")
      .select("id, name, name_en, flag, lang, phone, channel, last_visit, tags, status")
      .eq("clinic_id", clinicId)
      .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,channel.ilike.%${safe}%`)
      .order("updated_at", { ascending: false })
      .limit(15);
    if (error) {
      if (error.code === "42P01") return res.json({ patients: [] });
      throw error;
    }
    res.json({ patients: data || [] });
  } catch (err) {
    console.error("[Patients/Search]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patients/parse  { text, clinicId }
// Magic Paste: AI가 텍스트에서 환자 정보 자동 추출
app.post("/api/patients/parse", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "text required" });
  try {
    const prompt = `다음 텍스트에서 환자 정보를 추출하여 JSON으로 반환해 주세요.
텍스트: """${text.slice(0, 1000)}"""

반환 형식 (값이 없으면 null):
{
  "name": "이름(원어)",
  "name_en": "영문 이름 또는 로마자",
  "phone": "전화번호 (+국가코드 포함)",
  "lang": "언어코드 (ja/zh/en/ko/vi/th/ar 중 하나)",
  "flag": "국기 이모지",
  "channel": "채널명 (Line/WhatsApp/KakaoTalk/WeChat/Instagram 등)",
  "channel_user_id": "채널 ID 또는 계정명"
}

JSON만 반환하세요. 설명 없이.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message.content);
    res.json({ parsed });
  } catch (err) {
    console.error("[Patients/Parse]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/save-context  { patientId, clinicId, context }
// AI 대화에서 추출된 Context를 환자 tags/timeline에 누적 저장
app.post("/api/save-context", async (req, res) => {
  const { patientId, clinicId, context } = req.body;
  if (!patientId || !clinicId || !context)
    return res.status(400).json({ error: "patientId + clinicId + context required" });
  try {
    const sb = getSbAdmin();
    const { data: patient, error: getErr } = await sb
      .from("patients")
      .select("tags, timeline")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();
    if (getErr) throw getErr;

    const existingTags = Array.isArray(patient.tags) ? patient.tags : [];
    const existingTimeline = Array.isArray(patient.timeline) ? patient.timeline : [];
    const newTags = [...new Set([...existingTags, ...(context.tags || [])])];
    const newTimeline = [
      ...existingTimeline,
      { ts: new Date().toISOString(), type: "context", data: context },
    ].slice(-100);

    const { error: updErr } = await sb
      .from("patients")
      .update({ tags: newTags, timeline: newTimeline })
      .eq("id", patientId)
      .eq("clinic_id", clinicId);
    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (err) {
    console.error("[SaveContext]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AFTERCARE
// ════════════════════════════════════════════════════════════════════════════

// GET /api/aftercare?clinicId=X
app.get("/api/aftercare", async (req, res) => {
  const { clinicId } = req.query;
  if (!clinicId) return res.status(400).json({ error: "clinicId required" });
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("aftercare_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });
    if (error) {
      if (error.code === "42P01") return res.json([]);
      throw error;
    }
    const records = (data || []).map(r => ({
      id:            r.id,
      kanbanStage:   r.kanban_stage,
      patient:       r.patient || {},
      procedure:     r.procedure,
      treatmentDate: r.treatment_date,
      channel:       r.channel,
      d1:            r.d1 || { status: "pending" },
      d3:            r.d3 || { status: "pending" },
      d7:            r.d7 || { status: "pending" },
    }));
    res.json(records);
  } catch (err) {
    console.error("[Aftercare/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aftercare  { clinicId, record }
app.post("/api/aftercare", async (req, res) => {
  const { clinicId, record } = req.body;
  if (!clinicId || !record) return res.status(400).json({ error: "clinicId + record required" });
  try {
    const sb = getSbAdmin();
    const row = {
      id:             record.id || crypto.randomUUID(),
      clinic_id:      clinicId,
      kanban_stage:   record.kanbanStage || "consulting",
      patient:        record.patient || {},
      procedure:      record.procedure,
      treatment_date: record.treatmentDate,
      channel:        record.channel,
      d1:             record.d1 || { status: "pending" },
      d3:             record.d3 || { status: "pending" },
      d7:             record.d7 || { status: "pending" },
    };
    const { data, error } = await sb.from("aftercare_records").upsert(row).select().single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) {
    console.error("[Aftercare/Post]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/aftercare/:id  { updates }
app.patch("/api/aftercare/:id", async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    const sb = getSbAdmin();
    const dbU = {};
    if (u.kanbanStage   !== undefined) dbU.kanban_stage   = u.kanbanStage;
    if (u.treatmentDate !== undefined) dbU.treatment_date = u.treatmentDate;
    if (u.d1            !== undefined) dbU.d1             = u.d1;
    if (u.d3            !== undefined) dbU.d3             = u.d3;
    if (u.d7            !== undefined) dbU.d7             = u.d7;
    const { error } = await sb.from("aftercare_records").update(dbU).eq("id", id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("[Aftercare/Patch]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/procedures/suggest  { message, clinicId }
// RAG + AI 매칭 → 환자 메시지에 적합한 시술 2~3개 추천
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/procedures/suggest", async (req, res) => {
  const { message, clinicId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  // 1. 클리닉 시술 목록 조회 (procedures → master_procedures fallback)
  const _sbAdmin = getSbAdmin();
  let clinicProcs = [];
  if (_sbAdmin && clinicId) {
    const { data: cp } = await _sbAdmin
      .from("procedures")
      .select("id, name_ko, name_en, category, price_range, description_ko")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("sort_order");
    clinicProcs = cp || [];
  }

  // 클리닉 시술 없으면 master_procedures fallback
  if (!clinicProcs.length && _sbAdmin) {
    const { data: mp } = await _sbAdmin
      .from("master_procedures")
      .select("template_id as id, name_ko, name_en, category, price_range, description_ko")
      .eq("is_active", true)
      .order("sort_order")
      .limit(20);
    clinicProcs = mp || [];
  }

  // 2. RAG 검색 (procedures_knowledge)
  const ragResult = await ragSearch(message.trim(), 5, clinicId || null);
  const ragContext = ragResult?.context || "";

  // 3. Claude Haiku: 환자 의도 → 시술 2~3개 매칭
  const procList = clinicProcs.length
    ? clinicProcs
        .map((p, i) => `${i + 1}. [ID:${p.id}] ${p.name_ko}${p.name_en ? ` / ${p.name_en}` : ""} (${p.category || "기타"}) | 가격: ${p.price_range || "문의"} | ${p.description_ko || ""}`)
        .join("\n")
    : "(등록된 시술 없음)";

  const systemPrompt = `당신은 강남 프리미엄 의원의 시술 추천 전문가입니다.
환자 메시지를 분석하고 아래 시술 목록에서 2~3개를 추천하세요.
반드시 순수 JSON 배열만 출력하세요. 마크다운 없이.`;

  const userPrompt = `환자 메시지: "${message.trim()}"

이 클리닉 시술 목록:
${procList}

${ragContext ? `지식베이스 참고:\n${ragContext.slice(0, 1000)}` : ""}

위에서 환자 메시지에 가장 적합한 시술 2~3개를 선택하고 아래 형식으로 반환하세요:
[
  {
    "id": "<시술 ID 또는 null>",
    "name_ko": "<시술명 한국어>",
    "name_en": "<시술명 영어>",
    "category": "<카테고리>",
    "price_range": "<가격범위>",
    "description_ko": "<간략한 설명 1~2문장>",
    "reason": "<이 환자에게 추천하는 이유 한국어 1문장>"
  }
]`;

  try {
    const resp = await anthropic.messages.create({
      model:      MODEL_HAIKU,
      max_tokens: 900,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const raw = resp.content.find(b => b.type === "text")?.text ?? "[]";
    const jsonStr = raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    let suggestions = [];
    try { suggestions = JSON.parse(jsonStr); } catch { suggestions = []; }

    console.log(`[ProcSuggest] clinic=${clinicId} procs=${clinicProcs.length} RAG=${ragResult?.method || "none"} → ${suggestions.length} suggestions`);
    res.json({ suggestions: suggestions.slice(0, 3) });

  } catch (err) {
    console.error("[ProcSuggest]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/quotes  { clinicId, clinicName, patientMessage, patientLanguage,
//                     procedures, notes }
// 견적서 생성 → Supabase quotations 테이블 저장 → URL 반환
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/quotes", async (req, res) => {
  const { clinicId, clinicName, patientMessage, patientLanguage, procedures, notes } = req.body;
  if (!clinicId || !procedures?.length)
    return res.status(400).json({ error: "clinicId and procedures are required" });

  const _sbAdmin = getSbAdmin();
  if (!_sbAdmin)
    return res.status(503).json({ error: "Supabase가 설정되지 않았습니다." });

  try {
    const { data, error } = await _sbAdmin
      .from("quotations")
      .insert({
        clinic_id:           clinicId,
        clinic_name:         clinicName || "",
        patient_language:    patientLanguage || "",
        patient_message:     patientMessage || "",
        selected_procedures: procedures,
        notes:               notes || "",
      })
      .select("id")
      .single();

    if (error) {
      // quotations 테이블이 아직 생성되지 않은 경우 명확한 안내
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return res.status(503).json({
          error: "quotations 테이블이 없습니다. supabase/migrations/007_quotations.sql 을 실행하세요.",
        });
      }
      throw error;
    }

    const url = `https://app.tikidoc.xyz/quote/${data.id}`;
    console.log(`[Quotes] 견적서 생성: id=${data.id} clinic=${clinicId} procs=${procedures.length}`);
    res.json({ id: data.id, url });

  } catch (err) {
    console.error("[Quotes]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/quotes/:id
// 공개 견적서 조회 (견적서 공유 링크용)
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/quotes/:id", async (req, res) => {
  const { id } = req.params;
  // UUID 형식 간단 검증
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return res.status(400).json({ error: "유효하지 않은 견적서 ID입니다." });

  const _sbAdmin = getSbAdmin();
  if (!_sbAdmin)
    return res.status(503).json({ error: "Supabase 미설정" });

  try {
    const { data, error } = await _sbAdmin
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "견적서를 찾을 수 없습니다." });

    res.json(data);
  } catch (err) {
    console.error("[Quotes/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
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
