// ESM hoisting 근본 해결: 모든 import 중 가장 먼저 실행되어 env를 로드
import 'dotenv/config';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash, randomBytes } from "crypto";
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
// pdf-parse v2.x — named ESM export (Node 20 LTS에서 정상 동작)
// Node 22에서는 nixpacks.toml로 Node 20 고정하여 호환성 보장
import { PDFParse } from "pdf-parse";

// v2.x wrapper: pdfParse(buffer) → { text }
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
import { getAftercareSchedulerHealth, startAftercareScheduler }  from "./src/scheduler/aftercare.js";

// ── Phase 4: My Tiki 인증 미들웨어 ────────────────────────────────────────────
import {
  requireStaffAuth,
  requirePatientToken,
  requireRole,
  generatePatientToken,
} from "./src/middleware/auth.js";
import {
  buildEscalationAck,
  generateAskAssistantPayload,
  getPatientAskBootstrap,
} from "./src/lib/patient-ask-service.js";
import {
  buildRoomOccupancy,
  getRoomReadyQueue,
  isVisitRoomReady,
} from "./src/lib/room-traffic.js";
import {
  analyzeRoomLiveInput,
  buildRoomPrepPayload,
  pickNextRoomCandidate,
} from "./src/lib/tiki-room.js";
import {
  evaluateAftercareResponse,
  getAftercarePatientAcknowledgement,
} from "./src/lib/aftercare-engine.js";
import {
  resolveProcedureFromText,
} from "./src/lib/procedure-resolution.js";
import {
  fetchPatientAftercareState,
} from "./src/lib/aftercare-service.js";
import {
  applyClinicRulePatchToSettings,
  extractClinicRuleOverrides,
  loadClinicRuleConfig,
  resolveClinicRuleConfig,
} from "./src/lib/clinic-rule-config.js";
import { validateClinicRulePatch } from "./src/lib/clinic-rule-config-validate.js";
import {
  buildEscalationUpdateForAction,
  createEscalationInsert,
  summarizeEscalationCounts,
} from "./src/lib/escalation-service.js";
import { buildJourneyEventInsert, buildOperationalAuditPayload, writeJourneyEvents } from "./src/lib/ops-audit.js";
import { writeAuditLog } from "./src/lib/supabase-server.js";

// ── 모델 상수 (env로 override 가능) ───────────────────────────────────────────
const MODEL_HAIKU  = process.env.MODEL_HAIKU  || "claude-haiku-4-5-20251001";
const MODEL_SONNET = process.env.MODEL_SONNET || "claude-sonnet-4-6-20260217";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.tikidoc.xyz").replace(/\/+$/, "");

const app = express();

// ── CORS 설정 ─────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS 미설정 → 모든 origin 허용 (개발/데모)
// ALLOWED_ORIGINS 설정  → 화이트리스트 (프로덕션)
//   예: ALLOWED_ORIGINS=https://app.tikidoc.xyz,https://tikidoc.xyz
// chrome-extension://* 는 항상 허용 (브라우저 확장 호환)
const _allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : null;

const corsOptions = {
  origin: _allowedOrigins
    ? (origin, cb) => {
        // No origin (server-to-server, curl) or chrome-extension always pass
        if (!origin || origin.startsWith("chrome-extension://")) return cb(null, true);
        if (_allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: ${origin} is not allowed`));
      }
    : true,               // 미설정 시 전체 허용 (개발/데모)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
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

// ── v2: CLINIC_SLUG → UUID 스타트업 해결 ─────────────────────────────────────
// CLINIC_SLUG env var (e.g. "tiki-demo") → clinics.id UUID
// 스타트업 시 1회 해결 후 캐시. 이후 모든 쿼리는 CLINIC_UUID 사용.
let CLINIC_UUID    = null;   // UUID string, set on listen()
let _clinicInfo    = null;   // { id, clinic_name, clinic_short_name, location, settings }

async function resolveClinicSlug(slug) {
  if (!slug) return null;
  const sb = getSbAdmin();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("clinics")
      .select("id, clinic_name, clinic_short_name, location, settings")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.error("[resolveClinicSlug]", e.message);
    return null;
  }
}

// 하위 호환: clinicId 파라미터가 있으면 그 clinicId로, 없으면 CLINIC_UUID 사용
// v2 완전 이전 후 인자 없이 호출하도록 수정 가능
async function getClinicInfo(clinicId) {
  // v2 fully-migrated path: return cached startup info
  if (!clinicId || clinicId === CLINIC_UUID) {
    return _clinicInfo;
  }
  // legacy path: per-request lookup (for multi-clinic admin routes)
  try {
    const sb = getSbAdmin();
    if (!sb) return null;
    const { data } = await sb
      .from("clinics")
      .select("id, clinic_name, clinic_short_name, location, settings")
      .eq("id", clinicId)
      .maybeSingle();
    return data ?? null;
  } catch (e) {
    console.warn("[getClinicInfo]", e.message);
    return null;
  }
}

async function getClinicProcedures(clinicId) {
  const id = clinicId ?? CLINIC_UUID;
  if (!id) return null;
  try {
    const { data } = await supabaseAdmin
      .from("procedures")
      .select("*")
      .eq("clinic_id", id)
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
// v2: 파라미터명 변경 (clinic_id_filter TEXT → p_clinic_id UUID)
// clinicId 인자 없으면 CLINIC_UUID 사용
async function ragSearch(query, matchCount = 5, clinicId = null) {
  const filter = clinicId ?? CLINIC_UUID ?? null;

  // 1) 벡터 검색 (OpenAI 키 있을 때)
  const embedding = await embedQuery(query);
  if (embedding) {
    try {
      const { data, error } = await getSbAdmin().rpc("match_procedures", {
        p_clinic_id:       filter,           // UUID (v2)
        p_query_embedding: embedding,
        p_match_threshold: 0.75,
        p_match_count:     matchCount,
      });
      if (!error && data?.length) {
        return {
          context: data.map(r => r.content).join("\n\n---\n\n"),
          chunks:  data.length,
          method:  "vector",
        };
      }
    } catch (err) {
      console.warn("[RAG] match_procedures 실패:", err.message);
    }
  }

  // 2) 키워드 전용 fallback
  try {
    const { data, error } = await getSbAdmin().rpc("search_procedures_keyword", {
      p_clinic_id:   filter,               // UUID (v2)
      p_query:       query,
      p_match_count: matchCount,
    });
    if (!error && data?.length) {
      return {
        context: data.map(r => r.content).join("\n\n---\n\n"),
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

    const _sb = getSbAdmin();   // v2: use admin client (service_role bypasses RLS)
    if (!_sb) return;
    // audit_logs.clinic_id is TEXT in v2 — CLINIC_UUID auto-casts from UUID to text
    await _sb.from("audit_logs").insert({
      clinic_id:       CLINIC_UUID || process.env.CLINIC_SLUG || null,
      endpoint:        event.endpoint      || null,
      action:          event.type          || "suggest",
      model_used:      event.model         || null,
      tokens_in:       event.tokensIn      || 0,
      tokens_out:      event.tokensOut     || 0,
      duration_ms:     event.durationMs    || 0,
      patient_id:      event.patientId     || null,
      session_type:    event.sessionType   || event.type || null,
      lang:            event.patientLang   || null,
      rag_chunks_used: event.ragChunks     || 0,
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
    const resolvedClinicId = clinicId ?? CLINIC_UUID;
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

  // v2: resolve to UUID — body clinicId overrides only if it's a valid UUID
  const resolvedClinicId = clinicId ?? CLINIC_UUID;

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
  "ko_summary": "<환자 메시지 한국어 요약 1~2문장 — 직원 참고용. 진단·처방 표현 금지>",
  "risk_level": "<none | low | medium | high — 의료 위험도: high=부작용·알레르기 우려, medium=민감 질문, low=일반 문의>",
  "procedure_interests": ["<언급된 시술명만, 예: 보톡스, 필러, 리프팅. 없으면 []>"],
  "concerns": ["<환자가 표현한 우려·걱정 키워드, 예: 붓기, 통증, 자연스러움. 없으면 []>"],
  "options": {
    "kind":    { "reply": "<환자 언어로 — 공감·상세·CTA 포함>", "ko_translation": "<자연스러운 한국어 번역>" },
    "firm":    { "reply": "<환자 언어로 — 규정 기반·단호하지만 친절>", "ko_translation": "<자연스러운 한국어 번역>" },
    "booking": { "reply": "<환자 언어로 — 가치 강조 + 예약 링크>",   "ko_translation": "<자연스러운 한국어 번역>" }
  }
}

각 reply: 2~4문장. "${resolvedClinicName}" 자연스럽게 1회 이상 포함. booking reply는 반드시 [예약: ${APP_BASE_URL}/book] 링크로 마무리.`;

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
    parsed.options   = parsed.options   ?? {};
    parsed.ko_summary         = parsed.ko_summary  || "";
    parsed.risk_level         = ["none","low","medium","high"].includes(parsed.risk_level)
      ? parsed.risk_level : "low";
    parsed.procedure_interests = Array.isArray(parsed.procedure_interests) ? parsed.procedure_interests.filter(Boolean) : [];
    parsed.concerns            = Array.isArray(parsed.concerns)            ? parsed.concerns.filter(Boolean)            : [];
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
  try {
    const translated = await translateReplyText(text, targetLang);
    res.json({ translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function translateReplyText(text, targetLang) {
  if (!text || !targetLang || targetLang === "ko") return text;
  const lang = LANG_NAME[targetLang] || targetLang;
  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 600,
    system: `You are a professional medical translator. Translate the following Korean medical aesthetics clinic reply to ${lang}. Output ONLY the translation, no explanations, no notes.`,
    messages: [{ role: "user", content: text }],
  });
  return response.content.find((block) => block.type === "text")?.text ?? text;
}

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
    const clinic_id = req.body.clinic_id || CLINIC_UUID;
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
  const clinic_id = req.query.clinic_id || CLINIC_UUID;
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
  const clinic_id = req.body.clinic_id || req.query.clinic_id || CLINIC_UUID;
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
  const clinicId = req.query.clinic_id || CLINIC_UUID;
  if (!clinicId) return res.status(400).json({ error: "clinic_id required" });
  try {
    const { data, error } = await supabaseAdmin
      .from("procedures")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
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
  const clinicId = req.query.clinicId || CLINIC_UUID;
  if (!clinicId) return res.status(400).json({ error: "clinicId required" });
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("patients")
      .select("id, name, birth_year, gender, nationality, channel_refs, tags, flag, lang, notes, created_at, updated_at")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });
    if (error) {
      if (error.code === "42P01") return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (err) {
    console.error("[Patients/Get]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients  { clinicId?, patient: { name, birth_year?, gender?, nationality?, lang?, tags?, flag?, notes?, channel_refs? } }
app.post("/api/patients", async (req, res) => {
  const { clinicId, patient } = req.body;
  const clinic_id = clinicId || CLINIC_UUID;
  if (!clinic_id || !patient?.name?.trim()) return res.status(400).json({ error: "name required" });
  try {
    const sb = getSbAdmin();
    const { data, error } = await sb
      .from("patients")
      .insert({
        clinic_id,
        name:         patient.name.trim(),
        birth_year:   patient.birth_year   || null,
        gender:       patient.gender       || null,
        nationality:  patient.nationality  || null,
        lang:         patient.lang         || null,
        tags:         patient.tags         || [],
        flag:         patient.flag         || null,
        notes:        patient.notes        || null,
        channel_refs: patient.channel_refs || {},
      })
      .select("id, name, lang, flag, tags")
      .single();
    if (error) throw error;
    res.json(data);
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

// ── GET /api/patients/search?q=검색어&clinicId=X  (clinicId optional, falls back to CLINIC_UUID)
// name 부분 매칭 (ILIKE), 최대 15건
app.get("/api/patients/search", async (req, res) => {
  const clinic_id = req.query.clinicId || CLINIC_UUID;
  const q = req.query.q;
  if (!q?.trim()) return res.status(400).json({ error: "q required" });
  if (!clinic_id) return res.status(400).json({ error: "clinicId required" });
  try {
    const sb = getSbAdmin();
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    const { data, error } = await sb
      .from("patients")
      .select("id, name, lang, flag, tags, birth_year, nationality")
      .eq("clinic_id", clinic_id)
      .ilike("name", `%${safe}%`)
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
// AFTERCARE legacy v1 endpoints
// Phase 10 uses:
//   - /api/patient/aftercare
//   - /api/patient/aftercare/respond
//   - /api/staff/aftercare
//   - /api/staff/aftercare/:eventId/review
// Keep these legacy routes explicit so old clients fail clearly instead of silently drifting.
// ════════════════════════════════════════════════════════════════════════════

// GET /api/aftercare?clinicId=X
app.get("/api/aftercare", async (req, res) => {
  return res.status(410).json({ error: "Deprecated endpoint. Use /api/patient/aftercare or /api/staff/aftercare." });
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
  return res.status(410).json({ error: "Deprecated endpoint. Use /api/patient/aftercare/respond." });
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
  return res.status(410).json({ error: "Deprecated endpoint. Use /api/staff/aftercare/:eventId/review." });
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
  // quotations table deferred from v2 core schema — add when billing module is ready
  return res.status(501).json({ error: "quotations not yet migrated to v2 schema", deferred: true });
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

    const url = `${APP_BASE_URL}/quote/${data.id}`;
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
  return res.status(501).json({ error: "quotations not yet migrated to v2 schema", deferred: true });
  const { id } = req.params;
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

// ════════════════════════════════════════════════════════════════════════════
// MY TIKI — 스태프용 관리 API  (requireStaffAuth 필수)
// ════════════════════════════════════════════════════════════════════════════

app.get("/api/staff/clinic-rule-config", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { data, error } = await sb
      .from("clinics")
      .select("settings")
      .eq("id", clinic_id)
      .maybeSingle();

    if (error) throw error;

    const settings = data?.settings || {};
    return res.json({
      ok: true,
      clinic_id,
      overrides: extractClinicRuleOverrides(settings),
      resolved: resolveClinicRuleConfig(settings),
      writable_keys: [
        "ask.quick_prompts",
        "ask.fallback_copy",
        "ask.escalation_labels",
        "rooms.room_ready.require_checked_in",
        "rooms.room_ready.require_intake_done",
        "rooms.room_ready.require_consent_done",
        "rooms.room_ready.allowed_stages",
      ],
    });
  } catch (err) {
    console.error("[clinic-rule-config:get]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/staff/clinic-rule-config", requireStaffAuth, requireRole("owner", "admin"), async (req, res) => {
  const clinic_id = req.clinic_id;
  const actor_user_id = req.staff_user_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { patch, changedPaths } = validateClinicRulePatch(req.body || {});

    const { data: clinic, error: fetchErr } = await sb
      .from("clinics")
      .select("settings")
      .eq("id", clinic_id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!clinic) return res.status(404).json({ error: "Clinic not found" });

    const currentSettings = clinic.settings || {};
    const nextSettings = applyClinicRulePatchToSettings(currentSettings, patch);

    const { data: updated, error: updateErr } = await sb
      .from("clinics")
      .update({ settings: nextSettings })
      .eq("id", clinic_id)
      .select("settings")
      .single();
    if (updateErr) throw updateErr;

    await writeAuditLog({
      eventType: "clinic_rule_config_updated",
      clinicId: clinic_id,
      channel: "dashboard",
      direction: "internal",
      status: "success",
      intent: "clinic_rule_config",
      errorMessage: JSON.stringify({
        actor_user_id,
        changed_paths: changedPaths,
        patch,
      }),
    });

    return res.json({
      ok: true,
      clinic_id,
      changed_paths: changedPaths,
      overrides: extractClinicRuleOverrides(updated?.settings || nextSettings),
      resolved: resolveClinicRuleConfig(updated?.settings || nextSettings),
    });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) {
      console.error("[clinic-rule-config:patch]", err.message);
    }
    return res.status(status).json({ error: err.message });
  }
});

// ── POST /api/my-tiki/links
// 새 My Tiki 매직 링크 발급 (예약 확정 후 스태프가 호출)
// body: { visitId, patientLang?, sentVia?, customMessage? }
app.post("/api/my-tiki/links", requireStaffAuth, async (req, res) => {
  const { visitId, patientLang = "ko", sentVia, customMessage } = req.body;
  const clinic_id = req.clinic_id;

  if (!visitId) return res.status(400).json({ error: "visitId required" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    // visit 존재 + clinic 소속 확인
    const { data: visit, error: vErr } = await sb
      .from("visits")
      .select("id, patient_id, stage")
      .eq("id", visitId)
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (vErr) throw vErr;
    if (!visit) return res.status(404).json({ error: "Visit not found" });

    // 기존 active 링크 폐기 (방문당 링크 1개 유지)
    await sb.from("patient_links")
      .update({ status: "revoked", revoked_by: req.staff_user_id, revoked_at: new Date().toISOString() })
      .eq("visit_id", visitId)
      .eq("status", "active");

    // 새 토큰 생성
    const { token, tokenHash } = generatePatientToken();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: link, error: lErr } = await sb
      .from("patient_links")
      .insert({
        clinic_id,
        patient_id:     visit.patient_id,
        visit_id:       visitId,
        token_hash:     tokenHash,
        link_type:      "portal",        // v2: link_type (not status)
        status:         "active",        // v2 added status column (patched in 009)
        expires_at:     expiresAt,
        patient_lang:   patientLang,
        sent_via:       sentVia || null,
        custom_message: customMessage || null,
        generated_by:   req.staff_user_id,  // v2: generated_by (was created_by)
      })
      .select("id, expires_at, status")
      .single();

    if (lErr) throw lErr;

    console.log(`[MyTiki] 링크 발급: visit=${visitId} clinic=${clinic_id}`);

    res.json({
      ok:         true,
      link_id:    link.id,
      url:        `${APP_BASE_URL}/t/${token}`,   // raw token은 여기서만 반환 (DB에 미저장)
      expires_at: link.expires_at,
      token,                                  // 프론트에서 링크 복사/발송용
    });

  } catch (err) {
    console.error("[MyTiki/links]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/my-tiki/links?visitId=X  또는  ?clinicId=X (목록)
app.get("/api/my-tiki/links", requireStaffAuth, async (req, res) => {
  const { visitId, limit = 50 } = req.query;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    let q = sb
      .from("patient_links")
      .select(`
        id, visit_id, patient_id, status, expires_at,
        first_opened_at, last_accessed_at, access_count,
        patient_lang, sent_via, created_at, generated_by
      `)
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (visitId) q = q.eq("visit_id", visitId);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ links: data || [] });
  } catch (err) {
    console.error("[MyTiki/links/GET]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/my-tiki/links/:id/revoke
app.post("/api/my-tiki/links/:id/revoke", requireStaffAuth, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { error } = await sb
      .from("patient_links")
      .update({
        status:     "revoked",
        revoked_by: req.staff_user_id,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("clinic_id", clinic_id);   // clinic 소속 확인

    if (error) throw error;
    console.log(`[MyTiki] 링크 폐기: id=${id} clinic=${clinic_id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("[MyTiki/revoke]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/my-tiki/visits  — clinic 방문 목록 (ops board — link_status, forms, check-in 포함)
// Query params:
//   dateRange = today (default) | tomorrow | week | all
//   stage     = booked | pre_visit | treatment | ... | all (default: all)
//   limit     = integer (default 200)
app.get("/api/my-tiki/visits", requireStaffAuth, async (req, res) => {
  const { dateRange = "today", stage, limit = 200 } = req.query;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const visits = await fetchOpsBoardVisits({ sb, clinic_id, dateRange, stage, limit });
    res.json({
      visits,
      summary: buildVisitSummary(visits),
    });

  } catch (err) {
    console.error("[MyTiki/visits]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/my-tiki/visits  — 방문 생성
app.post("/api/my-tiki/visits", requireStaffAuth, async (req, res) => {
  const {
    patientId, procedureId,
    visitDate, notes,
  } = req.body;
  const clinic_id = req.clinic_id;
  if (!patientId) return res.status(400).json({ error: "patientId required" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    if (procedureId) {
      const { data: procedure, error: procedureError } = await sb
        .from("procedures")
        .select("id")
        .eq("id", procedureId)
        .eq("clinic_id", clinic_id)
        .eq("is_active", true)
        .maybeSingle();
      if (procedureError) throw procedureError;
      if (!procedure) return res.status(400).json({ error: "Invalid procedureId for clinic" });
    }

    const { data, error } = await sb
      .from("visits")
      .insert({
        clinic_id,
        patient_id:     patientId,
        procedure_id:   procedureId || null,
        visit_date:     visitDate || null,
        notes:          notes || null,
        stage:          "booked",
        coordinator_id: req.staff_user_id || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[MyTiki/visits/POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/my-tiki/visits/:id/stage
app.patch("/api/my-tiki/visits/:id/stage", requireStaffAuth, async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;
  const valid = ["booked","pre_visit","treatment","post_care","followup","closed"];
  if (!valid.includes(stage)) return res.status(400).json({ error: "Invalid stage" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { data: existing, error: existingError } = await sb
      .from("visits")
      .select("id, patient_id, stage")
      .eq("id", id)
      .eq("clinic_id", req.clinic_id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Visit not found" });

    const { data, error } = await sb
      .from("visits")
      .update({ stage })
      .eq("id", id)
      .eq("clinic_id", req.clinic_id)
      .select("id, stage")
      .single();
    if (error) throw error;

    await sb.from("patient_journey_events").insert(
      buildJourneyEventInsert({
        clinic_id: req.clinic_id,
        patient_id: existing.patient_id || null,
        visit_id: id,
        event_type: "stage_changed",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: {
          from: existing.stage,
          to: stage,
        },
      }),
    );

    res.json(data);
  } catch (err) {
    console.error("[MyTiki/visits/stage]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/my-tiki/visits/:id/check-in  — 환자 체크인 처리
// Sets checked_in_at = now(). Idempotent: 409 if already checked in.
app.post("/api/my-tiki/visits/:id/check-in", requireStaffAuth, async (req, res) => {
  const { id } = req.params;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);
    const now = new Date().toISOString();
    const { data: existing, error: existingErr } = await sb
      .from("visits")
      .select("id, patient_id, checked_in_at, patient_arrived_at, intake_done, consent_done, room, room_id, stage")
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (!existing) return res.status(404).json({ error: "Visit not found" });

    if (existing.checked_in_at) {
      return res.status(409).json({
        error: "Already checked in",
        checked_in_at: existing.checked_in_at,
        patient_arrived_at: existing.patient_arrived_at,
        room: existing.room,
        room_ready: isVisitRoomReady(existing, clinicRuleConfig),
      });
    }

    // Only update if checked_in_at is still null (prevents double check-in)
    const { data, error } = await sb
      .from("visits")
      .update({ checked_in_at: now })
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .is("checked_in_at", null)
      .select("id, patient_id, checked_in_at, patient_arrived_at, intake_done, consent_done, room, room_id, stage")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(409).json({ error: "Already checked in" });
    }

    console.log(`[MyTiki/check-in] visit=${id} at=${now}`);
    await sb.from("patient_journey_events").insert(
      buildJourneyEventInsert({
        clinic_id,
        patient_id: existing.patient_id || null,
        visit_id: id,
        event_type: "check_in_completed",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: {
          checked_in_at: now,
          patient_arrived_at: data.patient_arrived_at || null,
        },
      }),
    );
    res.json({
      ok: true,
      checked_in_at: data.checked_in_at,
      patient_arrived_at: data.patient_arrived_at,
      room: data.room,
      room_ready: isVisitRoomReady(data, clinicRuleConfig),
    });
  } catch (err) {
    console.error("[MyTiki/check-in]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/my-tiki/visits/:id/room  — 방 배정 / 변경 / 해제
// body: { room: "1호실" | null }
app.patch("/api/my-tiki/visits/:id/room", requireStaffAuth, async (req, res) => {
  const { id } = req.params;
  const { room } = req.body;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { data, error } = await sb
      .from("visits")
      .update({ room: room || null })
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .select("id, room")
      .single();

    if (error) throw error;
    res.json({ ok: true, room: data.room });
  } catch (err) {
    console.error("[MyTiki/room]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/staff/rooms — active room presets with occupancy
app.get("/api/staff/rooms", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);
    const [rooms, visits] = await Promise.all([
      loadClinicRooms(sb, clinic_id, { includeInactive: req.query.includeInactive === "true" }),
      sb
        .from("visits")
        .select(`
          id, patient_id, stage, visit_date, checked_in_at, room_id, room_assigned_at, room_cleared_at,
          patients ( id, name, flag, lang ),
          procedures ( id, name_ko, name_en )
        `)
        .eq("clinic_id", clinic_id)
        .not("room_id", "is", null)
        .order("room_assigned_at", { ascending: false }),
    ]);

    if (visits.error) throw visits.error;

    res.json({
      rooms: buildRoomOccupancy({
        rooms,
        visits: (visits.data || []).map(normalizeRoomVisit),
        clinicRuleConfig,
      }),
    });
  } catch (err) {
    console.error("[Staff/rooms]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/staff/rooms — create preset room
app.post("/api/staff/rooms", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { name, room_type = "consultation", sort_order } = req.body || {};
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!name?.trim()) return res.status(400).json({ error: "name required" });

  try {
    const { data, error } = await sb
      .from("rooms")
      .insert({
        clinic_id,
        name: name.trim(),
        room_type,
        sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 100,
      })
      .select("id, clinic_id, name, room_type, sort_order, is_active, created_at, updated_at")
      .single();
    if (error) throw error;
    res.json({ room: data });
  } catch (err) {
    console.error("[Staff/rooms/POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/staff/rooms/:id — edit preset room
app.patch("/api/staff/rooms/:id", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { id } = req.params;
  const { name, room_type, sort_order, is_active } = req.body || {};
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const update = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) update.name = String(name).trim();
    if (room_type !== undefined) update.room_type = room_type;
    if (sort_order !== undefined) update.sort_order = Number(sort_order);
    if (is_active !== undefined) update.is_active = Boolean(is_active);

    const { data, error } = await sb
      .from("rooms")
      .update(update)
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .select("id, clinic_id, name, room_type, sort_order, is_active, created_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Room not found" });

    if (update.is_active === false) {
      await sb
        .from("visits")
        .update({
          room_id: null,
          room: null,
          room_cleared_at: new Date().toISOString(),
        })
        .eq("clinic_id", clinic_id)
        .eq("room_id", id)
        .is("room_cleared_at", null);
    }

    res.json({ room: data });
  } catch (err) {
    console.error("[Staff/rooms/PATCH]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/staff/visits/:id/assign-room — one-tap room handoff
app.post("/api/staff/visits/:id/assign-room", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { id } = req.params;
  const { room_id } = req.body || {};
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!room_id) return res.status(400).json({ error: "room_id required" });

  try {
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);
	    const [{ data: room, error: roomError }, { data: visit, error: visitError }] = await Promise.all([
      sb
        .from("rooms")
        .select("id, clinic_id, name, room_type, sort_order, is_active")
        .eq("id", room_id)
        .eq("clinic_id", clinic_id)
        .eq("is_active", true)
        .maybeSingle(),
	      sb
	        .from("visits")
	        .select("id, clinic_id, patient_id, room_id, room, stage, checked_in_at, intake_done, consent_done")
	        .eq("id", id)
	        .eq("clinic_id", clinic_id)
	        .maybeSingle(),
    ]);
    if (roomError) throw roomError;
    if (visitError) throw visitError;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!visit) return res.status(404).json({ error: "Visit not found" });

    const { data: blockingVisit, error: occupancyError } = await sb
      .from("visits")
      .select("id, patient_id, stage, patients ( name, flag )")
      .eq("clinic_id", clinic_id)
      .eq("room_id", room.id)
      .is("room_cleared_at", null)
      .neq("id", id)
      .neq("stage", "closed")
      .maybeSingle();
    if (occupancyError) throw occupancyError;
    if (blockingVisit) {
      return res.status(409).json({
        error: "Room is currently occupied",
        occupied_by: blockingVisit,
      });
    }

    const now = new Date().toISOString();
    const { data, error } = await sb
      .from("visits")
      .update({
        room_id: room.id,
        room: room.name,
        room_assigned_at: now,
        room_cleared_at: null,
      })
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .select(`
        id, patient_id, procedure_id, stage, visit_date, checked_in_at, room, room_id, room_assigned_at, room_cleared_at,
        patient_arrived_at, intake_done, consent_done, followup_done, created_at, updated_at,
        patients ( id, name, flag, lang ),
        procedures ( id, name_ko, name_en ),
        rooms ( id, name, room_type, sort_order, is_active )
      `)
      .single();
	    if (error) throw error;

    await sb.from("patient_journey_events").insert(
      buildJourneyEventInsert({
        clinic_id,
        patient_id: visit.patient_id || null,
        visit_id: id,
        event_type: "room_assigned",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: {
          previous_room_id: visit.room_id || null,
          previous_room_name: visit.room || null,
          room_id: room.id,
          room_name: room.name,
          room_assigned_at: now,
        },
      }),
    );

	    res.json({
      ok: true,
      visit: normalizeRoomVisit(data),
      room_ready: isVisitRoomReady(data, clinicRuleConfig),
    });
  } catch (err) {
    console.error("[Staff/visits/assign-room]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/staff/visits/:id/clear-room — release room assignment
app.post("/api/staff/visits/:id/clear-room", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { id } = req.params;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { data: existing, error: existingError } = await sb
      .from("visits")
      .select("id, patient_id, room_id, room, room_assigned_at, room_cleared_at")
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Visit not found" });

    const now = new Date().toISOString();
    const { data, error } = await sb
      .from("visits")
      .update({
        room_id: null,
        room: null,
        room_cleared_at: now,
      })
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .select("id, room_id, room, room_cleared_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Visit not found" });

    await sb.from("patient_journey_events").insert(
      buildJourneyEventInsert({
        clinic_id,
        patient_id: existing.patient_id || null,
        visit_id: id,
        event_type: "room_cleared",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: {
          previous_room_id: existing.room_id || null,
          previous_room_name: existing.room || null,
          room_cleared_at: now,
        },
      }),
    );

    res.json({ ok: true, visit: data });
  } catch (err) {
    console.error("[Staff/visits/clear-room]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/staff/ops-board — visits + room traffic layer
app.get("/api/staff/ops-board", requireStaffAuth, async (req, res) => {
  const { dateRange = "today", stage, limit = 300 } = req.query;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);
    const [visits, roomVisits, rooms] = await Promise.all([
      fetchOpsBoardVisits({ sb, clinic_id, clinicRuleConfig, dateRange, stage, limit }),
      fetchOpsBoardVisits({ sb, clinic_id, clinicRuleConfig, dateRange, stage: "all", limit }),
      loadClinicRooms(sb, clinic_id),
    ]);
    const roomData = buildRoomSummary(rooms, roomVisits, clinicRuleConfig);

    res.json({
      visits,
      summary: buildVisitSummary(visits),
      ...roomData,
    });
  } catch (err) {
    console.error("[Staff/ops-board]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/my-tiki/import  — CSV bulk import: create patients + visits + links
//
// Client parses CSV, normalises dates to YYYY-MM-DD, sends:
//   { rows: [{ name, visit_date, lang?, procedure?, phone?, email?, nationality?, note? }, ...] }
// Max 500 rows per request.
//
// Batch strategy (minimises round-trips):
//   1. Validate rows client-side before sending; server re-validates as defence
//   2. One bulk patient lookup by name → batch insert new patients
//   3. One bulk visit dedup query  → batch insert new visits
//   4. Generate tokens in memory   → batch insert patient_links
//
// Dedup rule:
//   exact name match (case-sensitive, trimmed) + same calendar date (UTC)
//   → mark as "duplicate", skip creation, no link generated
//
// Returns results[] in the same order as the input rows[] so the client
// can zip them with the original CSV for the download.

app.post("/api/my-tiki/import", requireStaffAuth, async (req, res) => {
  const { rows: inputRows } = req.body;
  const clinic_id = req.clinic_id;

  if (!Array.isArray(inputRows) || inputRows.length === 0)
    return res.status(400).json({ error: "rows array required" });
  if (inputRows.length > 500)
    return res.status(400).json({ error: "Maximum 500 rows per import" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  // ── Helper: derive flag emoji from lang/nationality ───────────────────────
  function deriveFlag(lang, nationality) {
    const n = String(nationality || '').toLowerCase();
    if (n.includes('중국') || n.includes('china')) return '🇨🇳';
    if (n.includes('일본') || n.includes('japan')) return '🇯🇵';
    if (n.includes('베트남') || n.includes('vietnam')) return '🇻🇳';
    if (n.includes('태국') || n.includes('thai')) return '🇹🇭';
    if (n.includes('러시아') || n.includes('russia')) return '🇷🇺';
    if (n.includes('아랍') || n.includes('saudi') || n.includes('arab')) return '🇸🇦';
    if (n.includes('한국') || n.includes('korea')) return '🇰🇷';
    if (n.includes('미국') || n.includes('america') || n.includes('usa')) return '🇺🇸';
    const map = { zh:'🇨🇳', ja:'🇯🇵', ko:'🇰🇷', en:'🇺🇸', vi:'🇻🇳', th:'🇹🇭', ar:'🇸🇦', ru:'🇷🇺' };
    return map[lang] || null;
  }

  // ── Helper: add N calendar days to a YYYY-MM-DD string (UTC) ─────────────
  function addDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // ── Phase 1: Validate all rows ────────────────────────────────────────────
  // Keep results as a sparse array indexed by input position.
  const results = new Array(inputRows.length).fill(null);
  const validByIdx = []; // { _i, name, visit_date, lang, procedure, phone, email, nationality, note }

  for (let i = 0; i < inputRows.length; i++) {
    const raw = inputRows[i];
    const name      = String(raw.name      || '').trim();
    const visitDate = String(raw.visit_date || '').trim();

    if (!name) {
      results[i] = { patient_id:'', visit_id:'', portal_url:'', status:'failed', error_message:'이름 누락' };
      continue;
    }
    if (!visitDate || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
      results[i] = { patient_id:'', visit_id:'', portal_url:'', status:'failed', error_message:'방문일 형식 오류 (YYYY-MM-DD 필요)' };
      continue;
    }
    validByIdx.push({
      _i:          i,
      name,
      visit_date:  visitDate,
      lang:        String(raw.lang        || '').trim() || null,
      procedure:   String(raw.procedure   || '').trim() || null,
      phone:       String(raw.phone       || '').trim() || null,
      email:       String(raw.email       || '').trim() || null,
      nationality: String(raw.nationality || '').trim() || null,
      note:        String(raw.note        || '').trim() || null,
    });
  }

  if (validByIdx.length === 0) {
    const summary = { total: inputRows.length, created: 0, visit_created: 0, duplicates: 0,
                      failed: inputRows.length };
    return res.json({ results, summary });
  }

  try {
    const clinicProcedures = await loadClinicProcedures(sb, clinic_id);

    // ── Phase 2: Bulk patient lookup (exact name, case-sensitive) ─────────────
    const uniqueNames = [...new Set(validByIdx.map(r => r.name))];

    const { data: existingPatients } = await sb
      .from("patients")
      .select("id, name")
      .eq("clinic_id", clinic_id)
      .in("name", uniqueNames);

    const patientByName = {}; // name → { id, isNew }
    for (const p of (existingPatients || [])) {
      patientByName[p.name] = { id: p.id, isNew: false };
    }

    // ── Phase 3: Bulk insert new patients ─────────────────────────────────────
    // Use first occurrence of each name to source the metadata.
    const firstRowByName = {};
    for (const row of validByIdx) {
      if (!firstRowByName[row.name]) firstRowByName[row.name] = row;
    }

    const namesToCreate = uniqueNames.filter(n => !patientByName[n]);
    if (namesToCreate.length > 0) {
      const patientPayload = namesToCreate.map(name => {
        const row = firstRowByName[name];
        const channelRefs = {};
        if (row.phone) channelRefs.phone = row.phone;
        if (row.email) channelRefs.email = row.email;
        return {
          clinic_id,
          name,
          lang:         row.lang        || null,
          nationality:  row.nationality || null,
          channel_refs: channelRefs,
          notes:        row.note        || null,
          tags:         [],
          flag:         deriveFlag(row.lang, row.nationality),
        };
      });

      const { data: newPatients, error: pErr } = await sb
        .from("patients")
        .insert(patientPayload)
        .select("id, name");

      if (pErr) {
        // Bulk insert failed — mark all rows that needed a new patient as failed.
        console.error("[Import/patients]", pErr.message);
        for (const name of namesToCreate) {
          patientByName[name] = null; // null = failed
        }
      } else {
        for (const p of (newPatients || [])) {
          patientByName[p.name] = { id: p.id, isNew: true };
        }
      }
    }

    // Assign resolved patients; mark rows whose patient failed.
    for (const row of validByIdx) {
      row._patient = patientByName[row.name] || null;
      row._procedureMatch = row.procedure
        ? resolveProcedureFromText(row.procedure, clinicProcedures)
        : null;
      if (!row._patient) {
        results[row._i] = {
          patient_id:'', visit_id:'', portal_url:'', status:'failed', error_message:'환자 생성 실패',
          ...buildProcedureResolutionMeta(row._procedureMatch),
        };
      }
    }

    const rowsWithPatient = validByIdx.filter(r => r._patient?.id);
    if (rowsWithPatient.length === 0) throw new Error("No valid patients"); // will be caught below

    // ── Phase 4: Bulk visit dedup check ───────────────────────────────────────
    const allPatientIds = [...new Set(rowsWithPatient.map(r => r._patient.id))];
    const allDates      = rowsWithPatient.map(r => r.visit_date).sort();
    const minDate = allDates[0] + 'T00:00:00.000Z';
    const maxDate = allDates[allDates.length - 1] + 'T23:59:59.999Z';

    const { data: existingVisits } = await sb
      .from("visits")
      .select("id, patient_id, visit_date")
      .eq("clinic_id", clinic_id)
      .in("patient_id", allPatientIds)
      .gte("visit_date", minDate)
      .lte("visit_date", maxDate);

    const existVisitMap = {}; // `${patient_id}_${YYYY-MM-DD}` → visit_id
    for (const v of (existingVisits || [])) {
      const dk = new Date(v.visit_date).toISOString().slice(0, 10);
      existVisitMap[`${v.patient_id}_${dk}`] = v.id;
    }

    const dupeRows = rowsWithPatient.filter(r => existVisitMap[`${r._patient.id}_${r.visit_date}`]);
    const newRows  = rowsWithPatient.filter(r => !existVisitMap[`${r._patient.id}_${r.visit_date}`]);

    for (const row of dupeRows) {
      results[row._i] = {
        patient_id:    row._patient.id,
        visit_id:      existVisitMap[`${row._patient.id}_${row.visit_date}`],
        portal_url:    '',    // existing link not re-exposed
        status:        'duplicate',
        error_message: '',
        ...buildProcedureResolutionMeta(row._procedureMatch),
      };
    }

    // ── Phase 5: Bulk insert new visits ───────────────────────────────────────
    if (newRows.length > 0) {
      const visitPayload = newRows.map(row => ({
        clinic_id,
        patient_id:    row._patient.id,
        procedure_id:  row._procedureMatch?.procedure?.id || null,
        visit_date:    row.visit_date + 'T00:00:00.000Z',
        notes:         row.note || null,
        stage:         'booked',
        internal_tags: row.procedure ? [`시술: ${row.procedure}`] : [],
        coordinator_id: req.staff_user_id || null,
      }));

      const { data: newVisits, error: vErr } = await sb
        .from("visits")
        .insert(visitPayload)
        .select("id, patient_id, visit_date");

      if (vErr) {
        console.error("[Import/visits]", vErr.message);
        for (const row of newRows) {
          results[row._i] = {
            patient_id: row._patient.id, visit_id:'', portal_url:'', status:'failed', error_message:'방문 생성 실패',
            ...buildProcedureResolutionMeta(row._procedureMatch),
          };
        }
      } else {
        // Map returned visits back to rows via (patient_id, date) key
        const newVisitMap = {};
        for (const v of (newVisits || [])) {
          const dk = new Date(v.visit_date).toISOString().slice(0, 10);
          newVisitMap[`${v.patient_id}_${dk}`] = v.id;
        }

        // ── Phase 6: Generate tokens in-memory, bulk insert links ───────────
        const tokenByVisitId = {};
        const linkPayload = [];

        for (const row of newRows) {
          const visitId = newVisitMap[`${row._patient.id}_${row.visit_date}`];
          if (!visitId) continue;
          const { token, tokenHash } = generatePatientToken();
          tokenByVisitId[visitId] = token;
          linkPayload.push({
            clinic_id,
            patient_id:   row._patient.id,
            visit_id:     visitId,
            token_hash:   tokenHash,
            link_type:    'portal',
            status:       'active',
            expires_at:   new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            patient_lang: row.lang || 'ko',
            generated_by: req.staff_user_id || null,
          });
        }

        if (linkPayload.length > 0) {
          const { error: lErr } = await sb.from("patient_links").insert(linkPayload);
          if (lErr) console.error("[Import/links]", lErr.message);
        }

        // Build results for new visits
        for (const row of newRows) {
          const visitId = newVisitMap[`${row._patient.id}_${row.visit_date}`];
          if (!visitId) {
            results[row._i] = {
              patient_id: row._patient.id, visit_id:'', portal_url:'', status:'failed', error_message:'방문 ID 없음',
              ...buildProcedureResolutionMeta(row._procedureMatch),
            };
            continue;
          }
          const token = tokenByVisitId[visitId];
          results[row._i] = {
            patient_id:    row._patient.id,
            visit_id:      visitId,
            portal_url:    token ? `${APP_BASE_URL}/t/${token}` : '',
            status:        row._patient.isNew ? 'created' : 'visit_created',
            error_message: '',
            ...buildProcedureResolutionMeta(row._procedureMatch),
          };
        }
      }
    }

  } catch (err) {
    console.error("[Import]", err.message);
    // Fill any still-null results as failed
    results.forEach((r, i) => {
      if (r === null) {
        results[i] = { patient_id:'', visit_id:'', portal_url:'', status:'failed', error_message: err.message };
      }
    });
  }

  // Fill remaining nulls (shouldn't happen but defensive)
  results.forEach((r, i) => {
    if (r === null) results[i] = { patient_id:'', visit_id:'', portal_url:'', status:'failed', error_message:'처리 누락' };
  });

  const summary = {
    total:         inputRows.length,
    created:       results.filter(r => r.status === 'created').length,
    visit_created: results.filter(r => r.status === 'visit_created').length,
    duplicates:    results.filter(r => r.status === 'duplicate').length,
    failed:        results.filter(r => r.status === 'failed').length,
  };

  console.log(`[Import] clinic=${clinic_id} total=${inputRows.length} created=${summary.created} visit_created=${summary.visit_created} dupes=${summary.duplicates} failed=${summary.failed}`);
  res.json({ results, summary });
});

// ── POST /api/memory  — Tiki Paste 결과 → patient_interactions UPSERT
// v2 schema: one row per (clinic_id, patient_id). UPSERT merges arrays, takes max risk.
//
// body: {
//   patientId:          UUID string (required — skip gracefully if missing)
//   clinicId?:          UUID string (falls back to CLINIC_UUID)
//   koSummary?:         string — Korean summary of this session
//   riskLevel?:         "none" | "low" | "medium" | "high"
//   procedureInterests?: string[] — procedure names/slugs of interest
//   concerns?:          string[] — patient-reported concerns (Korean)
//   riskFlags?:         { type, detail, severity }[] — structured risk info
// }
app.post("/api/memory", requireStaffAuth, async (req, res) => {
  const {
    patientId,
    koSummary,
    riskLevel       = "none",
    procedureInterests = [],
    concerns        = [],
    riskFlags       = [],
  } = req.body;

  const clinic_id = req.clinic_id || CLINIC_UUID;
  if (!clinic_id) return res.status(403).json({ error: "No clinic associated with this staff session" });

  // No patient identified → skip DB write, client handles the UX
  if (!patientId) {
    return res.json({ ok: true, skipped: true, reason: "no_patient_id" });
  }

  const sb = getSbAdmin();
  if (!sb) return res.json({ ok: true, skipped: true, reason: "db_unavailable" });

  const RISK_ORDER = ["none", "low", "medium", "high"];
  const safeRisk = RISK_ORDER.includes(riskLevel) ? riskLevel : "none";

  try {
    // ── 1. Load existing record (null = first session for this patient) ──────
    const { data: existing } = await sb
      .from("patient_interactions")
      .select("procedure_interests, concerns, risk_flags, risk_level, session_count, ai_summary")
      .eq("clinic_id", clinic_id)
      .eq("patient_id", patientId)
      .maybeSingle();

    // ── 2. Merge arrays (union, deduplicated) ─────────────────────────────────
    const mergedInterests = [
      ...new Set([...(existing?.procedure_interests || []), ...procedureInterests]),
    ];
    const mergedConcerns = [
      ...new Set([...(existing?.concerns || []), ...concerns]),
    ];
    // Risk flags: append new ones (no dedup — each flag is a distinct event)
    const mergedRiskFlags = [...(existing?.risk_flags || []), ...riskFlags];

    // ── 3. Max risk level ────────────────────────────���─────────────────────��──
    const existingIdx = RISK_ORDER.indexOf(existing?.risk_level ?? "none");
    const newIdx      = RISK_ORDER.indexOf(safeRisk);
    const finalRisk   = RISK_ORDER[Math.max(existingIdx, newIdx)];

    // ── 4. UPSERT ──────────────────────────────────────────────────────────���──
    const { data, error } = await sb
      .from("patient_interactions")
      .upsert({
        clinic_id,
        patient_id:          patientId,
        procedure_interests: mergedInterests,
        concerns:            mergedConcerns,
        risk_flags:          mergedRiskFlags,
        risk_level:          finalRisk,
        ai_summary:          koSummary || existing?.ai_summary || null,
        session_count:       (existing?.session_count ?? 0) + 1,
        last_session_at:     new Date().toISOString(),
      }, { onConflict: "clinic_id,patient_id" })
      .select("id, session_count, risk_level")
      .single();

    if (error) throw error;

    console.log(`[Memory] patient=${patientId} sessions=${data.session_count} risk=${data.risk_level}`);

    res.json({
      ok:            true,
      id:            data.id,
      session_count: data.session_count,
      risk_level:    data.risk_level,
      is_new:        !existing,
    });
  } catch (err) {
    console.error("[Memory/POST]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TIKI BRIEF — 예약 메모 / DM 텍스트 → 구조화된 환자+방문 초안 파싱
// POST /api/intake/parse  (requireStaffAuth)
// body: { text: string }
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/intake/parse", requireStaffAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim())       return res.status(400).json({ error: "text required" });
  if (text.length > 4000)  return res.status(400).json({ error: "text too long (max 4000 chars)" });

  const today = new Date().toISOString().slice(0, 10);
  const year  = new Date().getFullYear();

  const SYSTEM = `You are a clinical intake data extractor for a Korean aesthetic medicine clinic.
Extract structured patient and visit data from raw booking notes, DM snippets, or coordinator messages.

TODAY: ${today}  CURRENT_YEAR: ${year}

RULES:
1. Extract only what is clearly stated. NEVER guess or infer uncertain values.
2. Use null for any field not mentioned or ambiguous.
3. Confidence: "high"=explicitly stated, "medium"=clearly implied (e.g. 중국인→zh), "low"=weakly inferred.
4. Only include a field in "confidence" if that field is non-null.
5. birth_year: compute from age if given ("35세"→${year}-35=${year-35}). null if age not stated.
6. visit_date: interpret Korean/Chinese/Japanese date formats and relative dates against TODAY. Output YYYY-MM-DD.
7. lang: infer from nationality only when unambiguous (중국인→zh, 일본인→ja, 베트남인→vi, 태국인→th). Otherwise null.
8. procedure_interests: Korean medical terms (보톡스, 필러, 리프팅, 실리프팅, 지방분해, 레이저, 피부관리 등).
9. concerns: patient-stated worries (붓기, 통증, 회복기간, 자연스러움, 비용, 부작용 등).
10. channel_refs: detect WeChat ID, LINE ID/@handle, Instagram @handle, KakaoTalk ID, phone (+82 or local), email.
11. internal_notes: coordinator/agent commentary verbatim — NOT patient-stated concerns.
12. Return ONLY valid JSON. No markdown. No explanation outside JSON.

Output exactly:
{
  "patient": {
    "name": string|null,
    "birth_year": number|null,
    "gender": "M"|"F"|null,
    "nationality": string|null,
    "lang": "zh"|"ja"|"en"|"ko"|"vi"|"ar"|"th"|"ru"|null,
    "channel_refs": { "wechat":string|null, "kakao":string|null, "line":string|null, "instagram":string|null, "phone":string|null, "email":string|null }
  },
  "visit": {
    "visit_date": "YYYY-MM-DD"|null,
    "procedure_interests": string[],
    "concerns": string[],
    "internal_notes": string|null
  },
  "confidence": { "fieldName": "high"|"medium"|"low" },
  "raw_evidence": { "fieldName": "exact text fragment that produced this value" },
  "warnings": string[]
}`;

  try {
    const resp = await anthropic.messages.create({
      model:      MODEL_HAIKU,
      max_tokens: 900,
      system:     SYSTEM,
      messages:   [{ role: "user", content: `Raw intake text:\n"""\n${text.trim()}\n"""` }],
    });

    const raw     = resp.content.find(b => b.type === "text")?.text ?? "{}";
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";

    let parsed;
    try { parsed = JSON.parse(jsonStr); }
    catch { return res.status(422).json({ error: "Model did not return valid JSON" }); }

    // Normalize — guard against hallucinated structure
    const result = {
      patient: {
        name:         parsed.patient?.name         ?? null,
        birth_year:   parsed.patient?.birth_year   ?? null,
        gender:       ["M","F"].includes(parsed.patient?.gender) ? parsed.patient.gender : null,
        nationality:  parsed.patient?.nationality   ?? null,
        lang:         parsed.patient?.lang          ?? null,
        channel_refs: Object.fromEntries(
          Object.entries(parsed.patient?.channel_refs ?? {}).filter(([, v]) => v != null && v !== "")
        ),
      },
      visit: {
        visit_date:          parsed.visit?.visit_date          ?? null,
        procedure_interests: Array.isArray(parsed.visit?.procedure_interests) ? parsed.visit.procedure_interests.filter(Boolean) : [],
        concerns:            Array.isArray(parsed.visit?.concerns)            ? parsed.visit.concerns.filter(Boolean)            : [],
        internal_notes:      parsed.visit?.internal_notes      ?? null,
      },
      confidence:   parsed.confidence   ?? {},
      raw_evidence: parsed.raw_evidence ?? {},
      warnings:     Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };

    console.log(`[intake/parse] name=${result.patient.name} lang=${result.patient.lang} date=${result.visit.visit_date}`);
    res.json(result);

  } catch (err) {
    console.error("[intake/parse]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MY TIKI — 환자용 API  (requirePatientToken 필수)
// ════════════════════════════════════════════════════════════════════════════

async function getOrCreateAskConversation(sb, {
  clinic_id,
  patient_id,
  visit_id,
  stage,
}) {
  const { data: existing, error: existingErr } = await sb
    .from("conversations")
    .select("id, clinic_id, patient_id, visit_id, channel, kind, status, metadata, created_at, updated_at")
    .eq("clinic_id", clinic_id)
    .eq("patient_id", patient_id)
    .eq("visit_id", visit_id)
    .eq("channel", "web")
    .eq("kind", "ask")
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) return existing;

  const { data: created, error: createErr } = await sb
    .from("conversations")
    .insert({
      clinic_id,
      patient_id,
      visit_id,
      channel: "web",
      kind: "ask",
      status: "active",
      metadata: {
        surface: "my_tiki_ask",
        stage_at_open: stage,
      },
    })
    .select("id, clinic_id, patient_id, visit_id, channel, kind, status, metadata, created_at, updated_at")
    .single();

  if (createErr) throw createErr;
  return created;
}

async function loadAskContext(sb, { clinic_id, patient_id, visit_id, patient_lang }) {
  const [visitRes, procedureRes, knowledgeRes, escalationRes] = await Promise.all([
    visit_id
      ? sb.from("visits")
           .select("id, procedure_id, stage, visit_date, intake_done, consent_done, followup_done, patient_arrived_at")
           .eq("id", visit_id)
           .maybeSingle()
      : Promise.resolve({ data: null }),
    (async () => {
      if (!visit_id) return { data: null };
      const { data: visit } = await sb
        .from("visits")
        .select("procedure_id")
        .eq("id", visit_id)
        .maybeSingle();
      if (!visit?.procedure_id) return { data: null };
      return sb
        .from("procedures")
        .select("id, name_ko, name_en, name_ja, name_zh, description, cautions_ko, faq_ko, faq_en, faq_ja, faq_zh")
        .eq("id", visit.procedure_id)
        .maybeSingle();
    })(),
    (async () => {
      if (!visit_id) return { data: [] };
      const { data: visit } = await sb.from("visits").select("procedure_id").eq("id", visit_id).maybeSingle();
      if (!visit?.procedure_id) return { data: [] };
      return sb
        .from("procedures_knowledge")
        .select("id, procedure_id, content, source_type")
        .eq("clinic_id", clinic_id)
        .eq("procedure_id", visit.procedure_id)
        .limit(6);
    })(),
    sb
      .from("escalation_requests")
      .select("id, escalation_type, priority, assigned_role, assigned_user_id, status, patient_visible_status_text, opened_at, acknowledged_at, responded_at, resolved_at, created_at")
      .eq("clinic_id", clinic_id)
      .eq("patient_id", patient_id)
      .eq("visit_id", visit_id)
      .in("status", ["requested", "assigned", "acknowledged", "responded"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    visit: visitRes.data || null,
    procedure: procedureRes.data || null,
    knowledgeRows: knowledgeRes.data || [],
    openEscalation: escalationRes.data || null,
    patient_lang,
  };
}

async function loadAskMessages(sb, conversationId) {
  if (!conversationId) return [];
  const { data, error } = await sb
    .from("messages")
    .select("id, role, content, created_at, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);
  if (error) throw error;
  return data || [];
}

async function loadClinicStaffRoster(sb, clinic_id) {
  const { data, error } = await sb
    .from("clinic_users")
    .select("user_id, email, role, is_active")
    .eq("clinic_id", clinic_id)
    .eq("is_active", true)
    .order("role")
    .order("email");
  if (error) throw error;
  return (data || []).map((row) => ({
    user_id: row.user_id,
    email: row.email,
    role: row.role,
  }));
}

async function fetchEscalationById(sb, clinic_id, id) {
  const { data, error } = await sb
    .from("escalation_requests")
    .select(`
      id, clinic_id, patient_id, visit_id, conversation_id, message_id, source_message_id,
      request_type, reason_category, escalation_type, priority,
      assigned_role, assigned_user_id, status,
      patient_visible_status_text,
      opened_at, acknowledged_at, acknowledged_by, responded_at, responded_by, resolved_at, resolved_by, closed_at, closed_by,
      created_at, updated_at,
      patients ( id, name, flag, lang ),
      visits ( id, stage, visit_date, room, procedures ( id, name_ko, name_en ) )
    `)
    .eq("clinic_id", clinic_id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function normalizeRoomVisit(visit = {}) {
  return {
    ...visit,
    room: visit.rooms?.name || visit.room || null,
    room_type: visit.rooms?.room_type || null,
  };
}

function buildVisitSummary(visits = []) {
  return {
    total: visits.length,
    formsPending: visits.filter((visit) => !visit.intake_done || !visit.consent_done).length,
    checkedIn: visits.filter((visit) => visit.checked_in_at).length,
    activeLinks: visits.filter((visit) => visit.link_status === "active" || visit.link_status === "opened").length,
    arrived: visits.filter((visit) => visit.patient_arrived_at).length,
    roomReady: visits.filter((visit) => visit.room_ready).length,
  };
}

async function fetchOpsBoardVisits({
  sb,
  clinic_id,
  clinicRuleConfig = null,
  dateRange = "today",
  stage,
  limit = 200,
}) {
  function addUTCDays(d, n) {
    const nd = new Date(d);
    nd.setUTCDate(nd.getUTCDate() + n);
    return nd;
  }

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  let q = sb
    .from("visits")
    .select(`
      id, patient_id, procedure_id, stage,
      visit_date, checked_in_at, room, room_id, room_assigned_at, room_cleared_at,
      patient_arrived_at,
      intake_done, consent_done, followup_done,
      coordinator_id, internal_tags, notes,
      created_at, updated_at,
      patients ( id, name, lang, flag, channel_refs ),
      procedures ( id, name_ko, name_en ),
      rooms ( id, name, room_type, sort_order, is_active )
    `)
    .eq("clinic_id", clinic_id)
    .order("visit_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (stage && stage !== "all") q = q.eq("stage", stage);

  if (dateRange === "today") {
    q = q
      .gte("visit_date", todayUTC.toISOString())
      .lt("visit_date", addUTCDays(todayUTC, 1).toISOString());
  } else if (dateRange === "tomorrow") {
    const tom = addUTCDays(todayUTC, 1);
    q = q
      .gte("visit_date", tom.toISOString())
      .lt("visit_date", addUTCDays(todayUTC, 2).toISOString());
  } else if (dateRange === "week") {
    q = q
      .gte("visit_date", todayUTC.toISOString())
      .lt("visit_date", addUTCDays(todayUTC, 7).toISOString());
  }

  const { data: visits, error } = await q;
  if (error) throw error;
  if (!visits || visits.length === 0) return [];

  const visitIds = visits.map((visit) => visit.id);

  const [{ data: links }, { data: unreviewedRows }] = await Promise.all([
    sb
      .from("patient_links")
      .select("visit_id, id, status, expires_at, first_opened_at, last_accessed_at, created_at")
      .in("visit_id", visitIds)
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: false }),
    sb
      .from("form_submissions")
      .select("visit_id")
      .in("visit_id", visitIds)
      .eq("status", "submitted")
      .is("reviewed_at", null),
  ]);

  const linksMap = {};
  for (const link of links || []) {
    if (!linksMap[link.visit_id]) linksMap[link.visit_id] = link;
  }

  const unreviewedMap = {};
  for (const row of unreviewedRows || []) {
    unreviewedMap[row.visit_id] = (unreviewedMap[row.visit_id] || 0) + 1;
  }

  function linkStatus(link) {
    if (!link) return "none";
    if (link.status === "revoked") return "revoked";
    if (link.status === "expired" || new Date(link.expires_at) < new Date()) return "expired";
    if (link.first_opened_at) return "opened";
    return "active";
  }

  return visits.map((visit) => normalizeRoomVisit({
    ...visit,
    room_ready: isVisitRoomReady(visit, clinicRuleConfig),
    link: linksMap[visit.id] || null,
    link_status: linkStatus(linksMap[visit.id]),
    unreviewed_forms: unreviewedMap[visit.id] || 0,
  }));
}

async function loadClinicRooms(sb, clinic_id, { includeInactive = false } = {}) {
  let q = sb
    .from("rooms")
    .select("id, clinic_id, name, room_type, sort_order, is_active, created_at, updated_at")
    .eq("clinic_id", clinic_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeInactive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function loadClinicProcedures(sb, clinic_id) {
  const { data, error } = await sb
    .from("procedures")
    .select("id, clinic_id, name_ko, name_en, name_ja, name_zh, is_active, sort_order")
    .eq("clinic_id", clinic_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name_ko", { ascending: true });
  if (error) throw error;
  return data || [];
}

function buildRoomSummary(rooms = [], visits = [], clinicRuleConfig = null) {
  const occupancy = buildRoomOccupancy({ rooms, visits, clinicRuleConfig });
  const queue = getRoomReadyQueue(visits, clinicRuleConfig);
  return {
    rooms: occupancy,
    room_ready_queue: queue,
    room_summary: {
      total: occupancy.length,
      free: occupancy.filter((room) => room.occupancy_state === "free").length,
      occupied: occupancy.filter((room) => room.occupancy_state === "occupied").length,
      readyQueue: queue.length,
    },
  };
}

function buildProcedureResolutionMeta(match) {
  if (!match) {
    return {
      procedure_id: "",
      procedure_match_status: "",
      procedure_match_name: "",
      procedure_match_error: "",
    };
  }

  if (match?.status === "matched" && match.procedure?.id) {
    return {
      procedure_id: match.procedure.id,
      procedure_match_status: "matched",
      procedure_match_name: match.procedure.name_ko || match.procedure.name_en || "",
      procedure_match_error: "",
    };
  }

  if (match?.status === "ambiguous") {
    return {
      procedure_id: "",
      procedure_match_status: "ambiguous",
      procedure_match_name: "",
      procedure_match_error: "시술명이 여러 후보로 해석되어 자동 지정하지 않았습니다.",
    };
  }

  return {
    procedure_id: "",
    procedure_match_status: match?.status || "unmatched",
    procedure_match_name: "",
    procedure_match_error: match?.status === "partial"
      ? "일부 시술 표현만 매칭되어 자동 지정하지 않았습니다."
      : "일치하는 활성 시술을 찾지 못해 자동 지정하지 않았습니다.",
  };
}

async function fetchRoomById(sb, roomId) {
  const { data, error } = await sb
    .from("rooms")
    .select("id, clinic_id, name, room_type, sort_order, is_active")
    .eq("id", roomId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchActiveRoomSession(sb, roomId) {
  const { data, error } = await sb
    .from("room_sessions")
    .select("id, clinic_id, room_id, visit_id, patient_id, status, started_at, ended_at, created_at, updated_at")
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchRoomVisitContext(sb, clinic_id, roomId) {
  const { data, error } = await sb
    .from("visits")
    .select(`
      id, clinic_id, patient_id, procedure_id, stage, visit_date,
      intake_done, consent_done, followup_done, internal_tags, notes,
      checked_in_at, patient_arrived_at, room_id, room_assigned_at, room_cleared_at,
      patients ( id, name, lang, flag, notes ),
      procedures ( id, name_ko, name_en, cautions_ko )
    `)
    .eq("clinic_id", clinic_id)
    .eq("room_id", roomId)
    .is("room_cleared_at", null)
    .neq("stage", "closed")
    .order("room_assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchOpenVisitEscalation(sb, clinic_id, visitId) {
  if (!visitId) return null;
  const { data, error } = await sb
    .from("escalation_requests")
    .select("id, escalation_type, priority, assigned_role, status, patient_visible_status_text, opened_at")
    .eq("clinic_id", clinic_id)
    .eq("visit_id", visitId)
    .in("status", ["requested", "assigned", "acknowledged", "responded"])
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchLatestRoomEvents(sb, roomSessionId) {
  if (!roomSessionId) return { latest_input: null, latest_response: null };
  const { data, error } = await sb
    .from("room_interaction_events")
    .select("id, event_type, payload, created_at")
    .eq("room_session_id", roomSessionId)
    .in("event_type", ["live_input", "response_selected"])
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  const latestInput = (data || []).find((item) => item.event_type === "live_input") || null;
  const latestResponse = (data || []).find((item) => item.event_type === "response_selected") || null;
  return {
    latest_input: latestInput?.payload || null,
    latest_response: latestResponse?.payload || null,
  };
}

async function ensureRoomSession(sb, { clinic_id, room_id, visit_id, patient_id }) {
  const existing = await fetchActiveRoomSession(sb, room_id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("room_sessions")
    .insert({
      clinic_id,
      room_id,
      visit_id: visit_id || null,
      patient_id: patient_id || null,
      status: "active",
      started_at: now,
    })
    .select("id, clinic_id, room_id, visit_id, patient_id, status, started_at, ended_at, created_at, updated_at")
    .single();
  if (error) throw error;

  await sb.from("room_interaction_events").insert({
    clinic_id,
    room_id,
    room_session_id: data.id,
    visit_id: visit_id || null,
    patient_id: patient_id || null,
    event_type: "session_started",
    payload: { source: "auto_open" },
  });

  return data;
}

async function closeRoomSession(sb, roomId, status) {
  const existing = await fetchActiveRoomSession(sb, roomId);
  if (!existing) return null;
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("room_sessions")
    .update({
      status,
      ended_at: now,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("id, clinic_id, room_id, visit_id, patient_id, status, started_at, ended_at, created_at, updated_at")
    .single();
  if (error) throw error;
  await sb.from("room_interaction_events").insert({
    clinic_id: data.clinic_id,
    room_id: data.room_id,
    room_session_id: data.id,
    visit_id: data.visit_id,
    patient_id: data.patient_id,
    event_type: status === "cleared" ? "room_cleared" : "session_ended",
    payload: { status },
  });
  return data;
}

async function buildRoomCurrentPayload(sb, roomId, expectedClinicId = null) {
  const room = await fetchRoomById(sb, roomId);
  if (!room) return null;
  if (expectedClinicId && room.clinic_id !== expectedClinicId) return null;
  const clinicRuleConfig = await loadClinicRuleConfig(sb, room.clinic_id);

  const [session, currentVisit, clinicRooms, allVisits] = await Promise.all([
    fetchActiveRoomSession(sb, roomId),
    fetchRoomVisitContext(sb, room.clinic_id, roomId),
    loadClinicRooms(sb, room.clinic_id),
    fetchOpsBoardVisits({ sb, clinic_id: room.clinic_id, clinicRuleConfig, dateRange: "today", stage: "all", limit: 300 }),
  ]);

  const effectiveSession = currentVisit
    ? await ensureRoomSession(sb, {
        clinic_id: room.clinic_id,
        room_id: room.id,
        visit_id: currentVisit.id,
        patient_id: currentVisit.patient_id,
      })
    : session;

  const [latestEvents, openEscalation] = await Promise.all([
    fetchLatestRoomEvents(sb, effectiveSession?.id || null),
    fetchOpenVisitEscalation(sb, room.clinic_id, currentVisit?.id || null),
  ]);

  const prep = currentVisit
    ? buildRoomPrepPayload({
        patient: currentVisit.patients || {},
        visit: currentVisit,
        procedure: currentVisit.procedures || {},
        latestEscalation: openEscalation,
      })
    : null;

  const nextCandidate = pickNextRoomCandidate({
    roomId: room.id,
    visits: allVisits,
    clinicRuleConfig,
  });

  return {
    room,
    available_rooms: clinicRooms,
    session: effectiveSession || null,
    current_patient: currentVisit ? normalizeRoomVisit(currentVisit) : null,
    prep,
    communication_state: latestEvents,
    next_patient: nextCandidate ? normalizeRoomVisit(nextCandidate) : null,
    idle: !currentVisit,
  };
}

// ── GET /api/patient/me  — 토큰으로 환자+방문 컨텍스트 조회
// My Tiki 앱이 처음 로드할 때 호출
app.get("/api/patient/me", requirePatientToken, async (req, res) => {
  const { clinic_id, patient_id, visit_id } = req;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const [patientRes, visitRes, clinicRes] = await Promise.all([
      patient_id
        ? sb.from("patients")
             .select("id, name, flag, lang, nationality, birth_year")
             .eq("id", patient_id)
             .maybeSingle()
        : Promise.resolve({ data: null }),
      visit_id
        ? sb.from("visits")
             .select("id, procedure_id, stage, visit_date, intake_done, consent_done, followup_done, patient_arrived_at, procedures ( name_ko, name_en )")
             .eq("id", visit_id)
             .maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from("clinics")
        .select("id, clinic_name, clinic_short_name, location")
        .eq("id", clinic_id)
        .maybeSingle(),
    ]);

    res.json({
      patient:      patientRes.data,
      visit:        visitRes.data,
      clinic:       clinicRes.data,
      patient_lang: req.patient_lang,
    });
  } catch (err) {
    console.error("[Patient/me]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/forms  — 해당 방문의 폼 템플릿 목록
app.get("/api/patient/forms", requirePatientToken, async (req, res) => {
  const { clinic_id, visit_id } = req;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    // 1. 이미 제출된 폼 확인 (visit_id가 없으면 제출 기록 없음으로 처리)
    const { data: subs } = visit_id
      ? await sb
          .from("form_submissions")
          .select("form_type, submitted_at")
          .eq("clinic_id", clinic_id)
          .eq("visit_id", visit_id)
          .eq("status", "submitted")
      : { data: [] };

    const submittedMap = new Map((subs || []).map(s => [s.form_type, s.submitted_at]));

    // 2. 클리닉 활성 폼 템플릿 조회 (v2 컬럼명: form_type, title_ko, title_en)
    const { data: templates, error } = await sb
      .from("form_templates")
      .select("id, form_type, title_ko, title_en, fields, version")
      .eq("clinic_id", clinic_id)
      .eq("is_active", true)
      .in("form_type", ["intake", "consent"]);

    if (error) throw error;

    const forms = (templates || []).map(t => ({
      id:           t.id,
      form_type:    t.form_type,
      title_ko:     t.title_ko,
      title_en:     t.title_en || t.title_ko,
      fields:       t.fields || [],
      version:      t.version,
      submitted:    submittedMap.has(t.form_type),
      submitted_at: submittedMap.get(t.form_type) || null,
    }));

    res.json({ forms });
  } catch (err) {
    console.error("[Patient/forms]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/form-submit  — 폼 제출
// body: { templateId, formType, data: { field_id: answer, ... } }
app.post("/api/patient/form-submit", requirePatientToken, async (req, res) => {
  const { templateId, formType, data: formData } = req.body;
  const { clinic_id, patient_id, visit_id, patient_lang } = req;

  if (!formType || !formData) return res.status(400).json({ error: "formType and data required" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    // 중복 제출 방지
    const { data: existing } = await sb
      .from("form_submissions")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("visit_id", visit_id)
      .eq("form_type", formType)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Form already submitted" });
    }

    // 제출 기록
    const { data: sub, error: sErr } = await sb
      .from("form_submissions")
      .insert({
        clinic_id,
        patient_id:      patient_id || null,
        visit_id:        visit_id || null,
        submitted_via:   req.patient_link.id,  // v2: submitted_via (was link_id)
        template_id:     templateId || null,
        form_type:       formType,              // v2: patched into 011
        data:            formData,
        patient_lang,
        submitted_at:    new Date().toISOString(),
        status:          "submitted",
      })
      .select("id, submitted_at")
      .single();

    if (sErr) throw sErr;

    // v2: visit 완료 플래그 갱신 (intake_done / consent_done / followup_done)
    const doneField = formType === "intake"   ? "intake_done"
                    : formType === "consent"  ? "consent_done"
                    : formType === "followup" ? "followup_done"
                    : null;

    if (doneField && visit_id) {
      await sb.from("visits")
        .update({ [doneField]: true })
        .eq("id", visit_id);
    }

    console.log(`[Patient/form-submit] type=${formType} visit=${visit_id} clinic=${clinic_id}`);
    res.json({ ok: true, id: sub.id, submitted_at: sub.submitted_at });
  } catch (err) {
    console.error("[Patient/form-submit]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/aftercare — active aftercare state for this visit
app.get("/api/patient/aftercare", requirePatientToken, async (req, res) => {
  const { clinic_id, patient_id, visit_id } = req;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const state = await fetchPatientAftercareState(sb, clinic_id, patient_id, visit_id);
    if (!state) return res.status(404).json({ error: "Visit not found" });
    res.json(state);
  } catch (err) {
    console.error("[Patient/aftercare]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/aftercare/respond — structured aftercare response
app.post("/api/patient/aftercare/respond", requirePatientToken, async (req, res) => {
  const { clinic_id, patient_id, visit_id, patient_lang } = req;
  const { eventId, payload } = req.body || {};
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!eventId || !payload) return res.status(400).json({ error: "eventId and payload required" });

  try {
    const { data: event, error: eventError } = await sb
      .from("patient_aftercare_events")
      .select(`
        id, run_id, step_id, response_status, risk_level, escalation_request_id,
        patient_aftercare_runs!inner ( id, clinic_id, patient_id, visit_id, status )
      `)
      .eq("id", eventId)
      .eq("patient_aftercare_runs.clinic_id", clinic_id)
      .eq("patient_aftercare_runs.patient_id", patient_id)
      .eq("patient_aftercare_runs.visit_id", visit_id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: "Aftercare event not found" });

    const { data: visit, error: visitError } = await sb
      .from("visits")
      .select("id, stage")
      .eq("id", visit_id)
      .eq("clinic_id", clinic_id)
      .maybeSingle();
    if (visitError) throw visitError;

    const evaluation = evaluateAftercareResponse(payload);
    const now = new Date().toISOString();

    let escalationRequest = null;
    if (evaluation.should_create_escalation) {
      const draft = createEscalationInsert({
        clinic_id,
        patient_id,
        visit_id,
        conversation_id: null,
        source_message_id: null,
        text: payload.free_text || JSON.stringify(payload),
        visitStage: visit?.stage || "post_care",
        patientLang: patient_lang || "en",
        requestType: evaluation.risk_level === "urgent" ? "nurse" : "nurse",
        questionType: evaluation.escalation_type === "urgent_risk" ? "urgent_risk" : "aftercare_concern",
      });

      const escalationInsert = {
        ...draft,
        request_type: evaluation.risk_level === "urgent" ? "nurse" : "nurse",
        reason_category: evaluation.escalation_type === "urgent_risk" ? "urgent_risk" : "aftercare_concern",
        escalation_type: evaluation.escalation_type === "urgent_risk" ? "urgent_risk" : "aftercare_concern",
        priority: evaluation.risk_level === "urgent" ? "urgent" : "high",
        assigned_role: "nurse",
        patient_visible_status_text: getAftercarePatientAcknowledgement(evaluation.risk_level),
      };

      const { data: escalation, error: escalationError } = await sb
        .from("escalation_requests")
        .insert(escalationInsert)
        .select("id, escalation_type, priority, assigned_role, status, patient_visible_status_text, opened_at, created_at")
        .single();
      if (escalationError) throw escalationError;
      escalationRequest = escalation;
    }

    const { data: responseRow, error: responseError } = await sb
      .from("patient_aftercare_responses")
      .upsert({
        event_id: eventId,
        patient_id,
        visit_id,
        payload_json: payload,
        derived_signals_json: evaluation.derived_signals,
        updated_at: now,
      }, { onConflict: "event_id" })
      .select("id, event_id, payload_json, derived_signals_json, created_at, updated_at")
      .single();
    if (responseError) throw responseError;

    const { data: updatedEvent, error: updateError } = await sb
      .from("patient_aftercare_events")
      .update({
        responded_at: now,
        response_status: "responded",
        risk_level: evaluation.risk_level,
        escalation_request_id: escalationRequest?.id || null,
        urgent_flag: evaluation.urgent_flag,
        next_action_status: evaluation.next_action_type,
        safe_for_return: evaluation.safe_for_return,
      })
      .eq("id", eventId)
      .select(`
        id, run_id, step_id, scheduled_for, sent_at, responded_at, response_status, risk_level,
        escalation_request_id, urgent_flag, next_action_status, safe_for_return, created_at, updated_at,
        aftercare_steps ( id, step_key, trigger_offset_hours, message_template_key, next_action_type, content_template )
      `)
      .single();
    if (updateError) throw updateError;

    const state = await fetchPatientAftercareState(sb, clinic_id, patient_id, visit_id);

    await writeJourneyEvents(sb, [
      buildJourneyEventInsert({
        clinic_id,
        patient_id: patient_id || null,
        visit_id: visit_id || null,
        event_type: "aftercare_response_recorded",
        actor_type: "patient",
        actor_id: patient_id ? String(patient_id) : null,
        payload: buildOperationalAuditPayload({
          current_status: "responded",
          payload: {
            event_id: eventId,
            run_id: event.run_id,
            risk_level: evaluation.risk_level,
            urgent_flag: evaluation.urgent_flag,
            escalation_request_id: escalationRequest?.id || null,
            next_action_type: evaluation.next_action_type,
            safe_for_return: evaluation.safe_for_return,
          },
        }),
      }),
    ]);

    res.json({
      ok: true,
      event: updatedEvent,
      response: responseRow,
      evaluation,
      acknowledgement: getAftercarePatientAcknowledgement(evaluation.risk_level),
      escalation: escalationRequest,
      next_action: evaluation.next_action_type,
      safe_for_return: evaluation.safe_for_return,
      state,
    });
  } catch (err) {
    console.error("[Patient/aftercare/respond]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/arrive  — 환자 자가 도착 신호
// 환자가 My Tiki 포털에서 "I'm here" 버튼을 탭했을 때 호출됨.
// visits.patient_arrived_at = NOW() 기록 + patient_journey_events 이벤트 삽입.
// 멱등: 이미 도착 신호를 보냈으면 409 반환.
app.post("/api/patient/arrive", requirePatientToken, async (req, res) => {
  const { clinic_id, patient_id, visit_id } = req;
  if (!visit_id) return res.status(400).json({ error: "No visit associated with this link" });

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    // 이미 도착 신호를 보냈는지 확인
    const { data: existing } = await sb
      .from("visits")
      .select("patient_arrived_at")
      .eq("id", visit_id)
      .maybeSingle();

    if (existing?.patient_arrived_at) {
      return res.status(409).json({
        error: "Already arrived",
        patient_arrived_at: existing.patient_arrived_at,
      });
    }

    const arrivedAt = new Date().toISOString();

    // visits.patient_arrived_at 업데이트 (멱등: 이미 설정된 경우 조건으로 방지)
    const { error: updateErr } = await sb
      .from("visits")
      .update({ patient_arrived_at: arrivedAt })
      .eq("id", visit_id)
      .is("patient_arrived_at", null);

    if (updateErr) throw updateErr;

    // patient_journey_events 기록 (append-only)
    await sb.from("patient_journey_events").insert({
      clinic_id,
      patient_id:  patient_id || null,
      visit_id,
      event_type:  "patient_arrived",
      actor_type:  "patient",
      actor_id:    patient_id ? String(patient_id) : null,
      payload:     { source: "self_checkin", portal: "my_tiki" },
    });

    console.log(`[Patient/arrive] visit=${visit_id} clinic=${clinic_id} at=${arrivedAt}`);
    res.json({ ok: true, patient_arrived_at: arrivedAt });
  } catch (err) {
    console.error("[Patient/arrive]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/patient/ask — Ask bootstrap state
app.get("/api/patient/ask", requirePatientToken, async (req, res) => {
  const { clinic_id, patient_id, visit_id, patient_lang } = req;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const context = await loadAskContext(sb, {
      clinic_id,
      patient_id,
      visit_id,
      patient_lang,
    });
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);

    const conversation = await getOrCreateAskConversation(sb, {
      clinic_id,
      patient_id,
      visit_id,
      stage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
    });

    const messages = await loadAskMessages(sb, conversation.id);
    const bootstrap = getPatientAskBootstrap({
      visit: context.visit,
      messages,
      escalationRequest: context.openEscalation,
      clinicRuleConfig,
    });

    res.json({
      conversation,
      ...bootstrap,
    });
  } catch (err) {
    console.error("[Patient/ask]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/ask/messages — Ask patient message
app.post("/api/patient/ask/messages", requirePatientToken, async (req, res) => {
  const { text, messageType = "free_text" } = req.body || {};
  const { clinic_id, patient_id, visit_id, patient_lang } = req;

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "text required" });
  }

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const context = await loadAskContext(sb, {
      clinic_id,
      patient_id,
      visit_id,
      patient_lang,
    });
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);

    const conversation = await getOrCreateAskConversation(sb, {
      clinic_id,
      patient_id,
      visit_id,
      stage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
    });

    const { data: patientMessage, error: pErr } = await sb
      .from("messages")
      .insert({
        clinic_id,
        conversation_id: conversation.id,
        role: "user",
        channel: "web",
        content: String(text).trim(),
        metadata: {
          sender_type: "patient",
          message_type: messageType,
          stage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
          surface: "my_tiki_ask",
        },
      })
      .select("id, role, content, created_at, metadata")
      .single();

    if (pErr) throw pErr;

    const assistant = await generateAskAssistantPayload({
      text: String(text).trim(),
      lang: patient_lang || "en",
      visit: context.visit,
      procedure: context.procedure,
      knowledgeRows: context.knowledgeRows,
      clinicRuleConfig,
    });

    const { data: assistantMessage, error: aErr } = await sb
      .from("messages")
      .insert({
        clinic_id,
        conversation_id: conversation.id,
        role: "assistant",
        channel: "web",
        content: assistant.assistantText,
        model_used: assistant.policyResult === "answer" ? (process.env.MODEL_HAIKU || MODEL_HAIKU) : null,
        metadata: {
          sender_type: "assistant",
          message_type: assistant.policyResult === "answer" ? "answer" : "safe_fallback",
          policy_result: assistant.policyResult,
          question_type: assistant.questionType,
          source_refs: assistant.sourceRefs,
          stage: assistant.stage,
          suggested_escalation: assistant.suggestedEscalation,
          safe: true,
          surface: "my_tiki_ask",
        },
      })
      .select("id, role, content, created_at, metadata")
      .single();

    if (aErr) throw aErr;

    await sb
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...(conversation.metadata || {}),
          last_policy_result: assistant.policyResult,
          last_question_type: assistant.questionType,
        },
      })
      .eq("id", conversation.id);

    res.json({
      conversation_id: conversation.id,
      patient_message: patientMessage,
      assistant_message: assistantMessage,
      policy_result: assistant.policyResult,
      question_type: assistant.questionType,
      suggested_escalation: assistant.suggestedEscalation,
    });
  } catch (err) {
    console.error("[Patient/ask/messages]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/patient/ask/escalations — minimal escalation request creation
app.post("/api/patient/ask/escalations", requirePatientToken, async (req, res) => {
  const { requestType = null, messageId = null, note = "", reasonCategory = null, text = "" } = req.body || {};
  const { clinic_id, patient_id, visit_id, patient_lang } = req;

  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const context = await loadAskContext(sb, {
      clinic_id,
      patient_id,
      visit_id,
      patient_lang,
    });
    const clinicRuleConfig = await loadClinicRuleConfig(sb, clinic_id);

    const conversation = await getOrCreateAskConversation(sb, {
      clinic_id,
      patient_id,
      visit_id,
      stage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
    });

    const sourceText = text
      || note
      || (messageId
        ? (await sb.from("messages").select("content, metadata").eq("id", messageId).maybeSingle()).data?.content
        : "");

    const insertRow = createEscalationInsert({
      clinic_id,
      patient_id,
      visit_id,
      conversation_id: conversation.id,
      source_message_id: messageId,
      text: sourceText,
      visitStage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
      patientLang: patient_lang || "en",
      requestType,
      questionType: reasonCategory,
    });

    const { data: requestRow, error: reqErr } = await sb
      .from("escalation_requests")
      .insert(insertRow)
      .select(`
        id, request_type, reason_category, escalation_type, priority,
        assigned_role, assigned_user_id, status, patient_visible_status_text,
        opened_at, acknowledged_at, responded_at, resolved_at, created_at
      `)
      .single();

    if (reqErr) throw reqErr;

    const { data: ackMessage, error: ackErr } = await sb
      .from("messages")
      .insert({
        clinic_id,
        conversation_id: conversation.id,
        role: "assistant",
        channel: "web",
        content: buildEscalationAck({
          lang: patient_lang || "en",
          requestType,
          clinicRuleConfig,
        }),
        metadata: {
          sender_type: "assistant",
          message_type: "escalation_ack",
          policy_result: "escalate",
          question_type: requestRow.escalation_type,
          source_refs: [],
          stage: context.visit?.patient_arrived_at ? "arrived" : (context.visit?.stage || "booked"),
          escalation_request_id: requestRow.id,
          escalation_priority: requestRow.priority,
          assigned_role: requestRow.assigned_role,
          safe: true,
          surface: "my_tiki_ask",
        },
      })
      .select("id, role, content, created_at, metadata")
      .single();

    if (ackErr) throw ackErr;

    res.json({
      request: requestRow,
      acknowledgement: ackMessage,
    });
  } catch (err) {
    console.error("[Patient/ask/escalations]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/staff/escalations — triage task list for Ops Board
app.get("/api/staff/escalations", requireStaffAuth, async (req, res) => {
  const {
    status,
    priority,
    assigned_role,
    assigned_user_id,
    escalation_type,
  } = req.query;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    let q = sb
      .from("escalation_requests")
      .select(`
        id, clinic_id, patient_id, visit_id, conversation_id, source_message_id,
        escalation_type, priority, assigned_role, assigned_user_id, status,
        patient_visible_status_text, opened_at, acknowledged_at, responded_at,
        acknowledged_by, responded_by, resolved_by, closed_by,
        resolved_at, closed_at, created_at, updated_at,
        patients ( id, name, flag, lang ),
        visits ( id, stage, visit_date, room, procedures ( id, name_ko, name_en ) )
      `)
      .eq("clinic_id", clinic_id)
      .order("opened_at", { ascending: false })
      .limit(200);

    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);
    if (assigned_role) q = q.eq("assigned_role", assigned_role);
    if (assigned_user_id) q = q.eq("assigned_user_id", assigned_user_id);
    if (escalation_type) q = q.eq("escalation_type", escalation_type);

    const [{ data: rows, error }, staffUsers] = await Promise.all([
      q,
      loadClinicStaffRoster(sb, clinic_id),
    ]);
    if (error) throw error;

    res.json({
      items: rows || [],
      summary: summarizeEscalationCounts(rows || []),
      staff_users: staffUsers,
    });
  } catch (err) {
    console.error("[Staff/escalations]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/staff/aftercare — aftercare status / concern / urgent / safe return list
app.get("/api/staff/aftercare", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { filter = "all" } = req.query;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    let q = sb
      .from("patient_aftercare_events")
      .select(`
        id, run_id, step_id, scheduled_for, sent_at, responded_at, response_status, risk_level,
        escalation_request_id, urgent_flag, next_action_status, safe_for_return,
        staff_reviewed_at, staff_reviewed_by, created_at, updated_at,
        patient_aftercare_runs!inner (
          id, clinic_id, patient_id, visit_id, status, started_at,
          patients ( id, name, flag, lang ),
          visits ( id, stage, visit_date, procedures ( id, name_ko, name_en ) )
        ),
        aftercare_steps ( id, step_key, trigger_offset_hours, message_template_key, next_action_type, content_template )
      `)
      .eq("patient_aftercare_runs.clinic_id", clinic_id)
      .order("scheduled_for", { ascending: true })
      .limit(200);

    const now = new Date().toISOString();
    if (filter === "due") q = q.eq("response_status", "due").lte("scheduled_for", now);
    if (filter === "responded") q = q.eq("response_status", "responded");
    if (filter === "concern") q = q.in("risk_level", ["concern"]);
    if (filter === "urgent") q = q.eq("urgent_flag", true);
    if (filter === "safe_for_return") q = q.eq("safe_for_return", true);

    const { data, error } = await q;
    if (error) throw error;

    const items = data || [];
    const summary = {
      due: items.filter((item) => item.response_status === "due").length,
      responded: items.filter((item) => item.responded_at).length,
      concern: items.filter((item) => item.risk_level === "concern").length,
      urgent: items.filter((item) => item.urgent_flag).length,
      safe_for_return: items.filter((item) => item.safe_for_return).length,
    };

    res.json({ items, summary, scheduler: getAftercareSchedulerHealth() });
  } catch (err) {
    console.error("[Staff/aftercare]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff/aftercare/:eventId/review", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { eventId } = req.params;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const { data: existing, error: existingError } = await sb
      .from("patient_aftercare_events")
      .eq("id", eventId)
      .select(`
        id, run_id, step_id, scheduled_for, sent_at, responded_at, response_status, risk_level,
        escalation_request_id, urgent_flag, next_action_status, safe_for_return,
        staff_reviewed_at, staff_reviewed_by, created_at, updated_at
      `)
      .single();
    if (existingError) throw existingError;

    const { data: run, error: runError } = await sb
      .from("patient_aftercare_runs")
      .select("id, clinic_id")
      .eq("id", existing.run_id)
      .maybeSingle();
    if (runError) throw runError;
    if (!run || run.clinic_id !== clinic_id) return res.status(404).json({ error: "Aftercare event not found" });

    const { data, error } = await sb
      .from("patient_aftercare_events")
      .update({
        staff_reviewed_at: new Date().toISOString(),
        staff_reviewed_by: req.staff_user_id || null,
        response_status: "reviewed",
      })
      .eq("id", eventId)
      .select(`
        id, run_id, step_id, scheduled_for, sent_at, responded_at, response_status, risk_level,
        escalation_request_id, urgent_flag, next_action_status, safe_for_return,
        staff_reviewed_at, staff_reviewed_by, created_at, updated_at
      `)
      .single();
    if (error) throw error;

    await writeJourneyEvents(sb, [
      buildJourneyEventInsert({
        clinic_id,
        patient_id: run.patient_id || null,
        visit_id: run.visit_id || null,
        event_type: "aftercare_reviewed",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: buildOperationalAuditPayload({
          current_status: data.response_status,
          payload: {
            event_id: data.id,
            run_id: data.run_id,
            risk_level: data.risk_level,
            urgent_flag: data.urgent_flag,
          },
        }),
      }),
    ]);

    res.json({ item: data });
  } catch (err) {
    console.error("[Staff/aftercare/review]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/staff/escalations/:id — single escalation detail
app.get("/api/staff/escalations/:id", requireStaffAuth, async (req, res) => {
  const clinic_id = req.clinic_id;
  const { id } = req.params;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const [item, staffUsers] = await Promise.all([
      fetchEscalationById(sb, clinic_id, id),
      loadClinicStaffRoster(sb, clinic_id),
    ]);

    if (!item) return res.status(404).json({ error: "Escalation not found" });
    const msgId = item.source_message_id || item.message_id;
    const source = msgId
      ? (await sb.from("messages").select("id, content, role, created_at, metadata").eq("id", msgId).maybeSingle()).data
      : null;

    res.json({
      item,
      staff_users: staffUsers,
      source_message: source || null,
    });
  } catch (err) {
    console.error("[Staff/escalations/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});

async function applyEscalationAction(req, res, action) {
  const clinic_id = req.clinic_id;
  const { id } = req.params;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });

  try {
    const existing = await fetchEscalationById(sb, clinic_id, id);
    if (!existing) return res.status(404).json({ error: "Escalation not found" });

    const update = buildEscalationUpdateForAction({
      currentStatus: existing.status,
      action,
      escalation_type: req.body?.escalation_type || existing.escalation_type,
      patientLang: existing.patients?.lang || "en",
      assigned_role: req.body?.assigned_role ?? existing.assigned_role,
      assigned_user_id: req.body?.assigned_user_id ?? existing.assigned_user_id,
      patient_visible_status_text: req.body?.patient_visible_status_text,
      staff_user_id: req.staff_user_id || null,
    });

    if (!update) {
      return res.status(400).json({ error: `Invalid transition: ${existing.status} -> ${action}` });
    }

    if (action === "assign") {
      if (req.body?.escalation_type) update.escalation_type = req.body.escalation_type;
      if (req.body?.priority) update.priority = req.body.priority;
      if (req.body?.assigned_role === undefined && existing.assigned_role) update.assigned_role = existing.assigned_role;
      if (req.body?.assigned_user_id === undefined && existing.assigned_user_id) update.assigned_user_id = existing.assigned_user_id;
    }

    const { data, error } = await sb
      .from("escalation_requests")
      .update(update)
      .eq("id", id)
      .eq("clinic_id", clinic_id)
      .select(`
        id, escalation_type, priority, assigned_role, assigned_user_id, status,
        patient_visible_status_text, opened_at, acknowledged_at, acknowledged_by, responded_at, responded_by,
        resolved_at, resolved_by, closed_at, closed_by, created_at, updated_at
      `)
      .single();
    if (error) throw error;

    const eventTypeMap = {
      acknowledge: "escalation_acknowledged",
      assign: "escalation_assigned",
      respond: "escalation_responded",
      resolve: "escalation_resolved",
      close: "escalation_closed",
    };

    await writeJourneyEvents(sb, [
      buildJourneyEventInsert({
        clinic_id,
        patient_id: existing.patient_id || null,
        visit_id: existing.visit_id || null,
        event_type: eventTypeMap[action],
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: buildOperationalAuditPayload({
          current_status: data.status,
          current_owner_role: data.assigned_role || null,
          current_owner_user_id: data.assigned_user_id || null,
          payload: {
            escalation_id: existing.id,
            escalation_type: data.escalation_type,
            from_status: existing.status,
            to_status: data.status,
            priority: data.priority,
          },
        }),
      }),
    ]);

    res.json({ item: data });
  } catch (err) {
    console.error(`[Staff/escalations/${action}]`, err.message);
    res.status(500).json({ error: err.message });
  }
}

app.post("/api/staff/escalations/:id/acknowledge", requireStaffAuth, async (req, res) => applyEscalationAction(req, res, "acknowledge"));
app.post("/api/staff/escalations/:id/assign", requireStaffAuth, async (req, res) => applyEscalationAction(req, res, "assign"));
app.post("/api/staff/escalations/:id/responded", requireStaffAuth, async (req, res) => applyEscalationAction(req, res, "respond"));
app.post("/api/staff/escalations/:id/resolve", requireStaffAuth, async (req, res) => applyEscalationAction(req, res, "resolve"));
app.post("/api/staff/escalations/:id/close", requireStaffAuth, async (req, res) => applyEscalationAction(req, res, "close"));

// ── GET /api/room/current — room-fixed tablet bootstrap
app.get("/api/room/current", requireStaffAuth, async (req, res) => {
  const roomId = req.query.roomId || req.query.room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomId) {
    const { data: rooms, error } = await sb
      .from("rooms")
      .select("id, clinic_id, name, room_type, sort_order, is_active")
      .eq("clinic_id", clinic_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({
      room: null,
      available_rooms: rooms || [],
      session: null,
      current_patient: null,
      prep: null,
      communication_state: { latest_input: null, latest_response: null },
      next_patient: null,
      idle: true,
    });
  }

  try {
    const payload = await buildRoomCurrentPayload(sb, roomId, clinic_id);
    if (!payload) return res.status(404).json({ error: "Room not found" });
    res.json(payload);
  } catch (err) {
    console.error("[Room/current]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/room/live-input — patient utterance -> intent summary + recommended doctor options
app.post("/api/room/live-input", requireStaffAuth, async (req, res) => {
  const { roomId, room_id, text } = req.body || {};
  const roomKey = roomId || room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomKey || !text?.trim()) return res.status(400).json({ error: "roomId and text required" });

  try {
    const current = await buildRoomCurrentPayload(sb, roomKey, clinic_id);
    if (!current?.room) return res.status(404).json({ error: "Room not found" });
    if (!current.current_patient || !current.session) {
      return res.status(409).json({ error: "No active patient in this room" });
    }

    const analysis = analyzeRoomLiveInput({
      text,
      patientLang: current.prep?.patient_language || current.current_patient?.patients?.lang || "en",
      visitStage: current.prep?.visit_stage || current.current_patient?.stage || "treatment",
      procedureName: current.prep?.procedure_name || current.current_patient?.procedure_name || "",
    });

    await sb.from("room_interaction_events").insert({
      clinic_id: current.room.clinic_id,
      room_id: current.room.id,
      room_session_id: current.session.id,
      visit_id: current.current_patient.id,
      patient_id: current.current_patient.patient_id,
      event_type: "live_input",
      payload: analysis,
    });

    res.json({
      session_id: current.session.id,
      ...analysis,
    });
  } catch (err) {
    console.error("[Room/live-input]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/room/respond — doctor-selected response -> patient-facing text/playback payload
app.post("/api/room/respond", requireStaffAuth, async (req, res) => {
  const { roomId, room_id, response } = req.body || {};
  const roomKey = roomId || room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomKey || !response?.text) return res.status(400).json({ error: "roomId and response.text required" });

  try {
    const current = await buildRoomCurrentPayload(sb, roomKey, clinic_id);
    if (!current?.room) return res.status(404).json({ error: "Room not found" });
    if (!current.current_patient || !current.session) {
      return res.status(409).json({ error: "No active patient in this room" });
    }

    const patientLang = current.prep?.patient_language || "en";
    const translated = await translateReplyText(response.text, patientLang).catch(() => response.text);
    const payload = {
      label: response.label || "Selected response",
      response_type: response.response_type || "primary_response",
      staff_text: response.text,
      patient_text: translated,
      patient_language: patientLang,
      playback: {
        text: translated,
        lang: patientLang,
      },
      selected_at: new Date().toISOString(),
    };

    await sb.from("room_interaction_events").insert({
      clinic_id: current.room.clinic_id,
      room_id: current.room.id,
      room_session_id: current.session.id,
      visit_id: current.current_patient.id,
      patient_id: current.current_patient.patient_id,
      event_type: "response_selected",
      payload,
    });

    res.json(payload);
  } catch (err) {
    console.error("[Room/respond]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/room/end-session", requireStaffAuth, async (req, res) => {
  const { roomId, room_id } = req.body || {};
  const roomKey = roomId || room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomKey) return res.status(400).json({ error: "roomId required" });
  try {
    const room = await fetchRoomById(sb, roomKey);
    if (!room || room.clinic_id !== clinic_id) {
      return res.status(404).json({ error: "Room not found" });
    }
    const closed = await closeRoomSession(sb, roomKey, "ended");
    if (closed) {
      await writeJourneyEvents(sb, [
        buildJourneyEventInsert({
          clinic_id,
          patient_id: closed.patient_id || null,
          visit_id: closed.visit_id || null,
          event_type: "room_session_ended",
          actor_type: "staff",
          actor_id: req.staff_user_id || null,
          payload: buildOperationalAuditPayload({
            current_status: closed.status,
            payload: {
              room_id: closed.room_id,
              room_session_id: closed.id,
            },
          }),
        }),
      ]);
    }
    res.json({ ok: true, session: closed });
  } catch (err) {
    console.error("[Room/end-session]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/room/load-next", requireStaffAuth, async (req, res) => {
  const { roomId, room_id } = req.body || {};
  const roomKey = roomId || room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomKey) return res.status(400).json({ error: "roomId required" });

  try {
    const room = await fetchRoomById(sb, roomKey);
    if (!room || room.clinic_id !== clinic_id) return res.status(404).json({ error: "Room not found" });
    await closeRoomSession(sb, room.id, "ended");
    const clinicRuleConfig = await loadClinicRuleConfig(sb, room.clinic_id);
    const visits = await fetchOpsBoardVisits({ sb, clinic_id: room.clinic_id, clinicRuleConfig, dateRange: "today", stage: "all", limit: 300 });
    const nextVisit = pickNextRoomCandidate({ roomId: room.id, visits, clinicRuleConfig });
    if (!nextVisit) {
      return res.json({
        ok: true,
        room,
        session: null,
        current_patient: null,
        prep: null,
        communication_state: { latest_input: null, latest_response: null },
        next_patient: null,
        idle: true,
      });
    }

    if (nextVisit.room_id !== room.id) {
      const now = new Date().toISOString();
      await sb
        .from("visits")
        .update({
          room_id: room.id,
          room: room.name,
          room_assigned_at: now,
          room_cleared_at: null,
        })
        .eq("id", nextVisit.id)
        .eq("clinic_id", room.clinic_id);
    }

    await writeJourneyEvents(sb, [
      buildJourneyEventInsert({
        clinic_id,
        patient_id: nextVisit.patient_id || null,
        visit_id: nextVisit.id,
        event_type: "room_next_loaded",
        actor_type: "staff",
        actor_id: req.staff_user_id || null,
        payload: buildOperationalAuditPayload({
          current_status: "active",
          payload: {
            room_id: room.id,
            room_name: room.name,
            previous_room_id: nextVisit.room_id || null,
            source: "room_load_next",
          },
        }),
      }),
    ]);

    const payload = await buildRoomCurrentPayload(sb, room.id, clinic_id);
    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error("[Room/load-next]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/room/clear", requireStaffAuth, async (req, res) => {
  const { roomId, room_id } = req.body || {};
  const roomKey = roomId || room_id;
  const clinic_id = req.clinic_id;
  const sb = getSbAdmin();
  if (!sb) return res.status(503).json({ error: "Database unavailable" });
  if (!roomKey) return res.status(400).json({ error: "roomId required" });

  try {
    const current = await buildRoomCurrentPayload(sb, roomKey, clinic_id);
    if (!current?.room) return res.status(404).json({ error: "Room not found" });
    await closeRoomSession(sb, current.room.id, "cleared");
    if (current.current_patient?.id) {
      await sb
        .from("visits")
        .update({
          room_id: null,
          room: null,
          room_cleared_at: new Date().toISOString(),
        })
        .eq("id", current.current_patient.id)
        .eq("clinic_id", current.room.clinic_id);

      await writeJourneyEvents(sb, [
        buildJourneyEventInsert({
          clinic_id,
          patient_id: current.current_patient.patient_id || null,
          visit_id: current.current_patient.id,
          event_type: "room_cleared",
          actor_type: "staff",
          actor_id: req.staff_user_id || null,
          payload: buildOperationalAuditPayload({
            current_status: "cleared",
            payload: {
              room_id: current.room.id,
              room_name: current.room.name,
              source: "room_clear",
            },
          }),
        }),
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[Room/clear]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health check (Railway / uptime monitors) ──────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    ts:     new Date().toISOString(),
    model:  { haiku: MODEL_HAIKU.split("-").slice(-1)[0], sonnet: MODEL_SONNET.split("-").slice(-1)[0] },
    supabase: !!getSbClient(),
  });
});

// ── SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// ── 0.0.0.0 바인딩 필수 (Railway 외부 라우터 연결) ───────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", async () => {
  // ── v2: CLINIC_SLUG → UUID 해결 ────────────────────────────────────────
  const slug = process.env.CLINIC_SLUG;
  if (slug) {
    const resolved = await resolveClinicSlug(slug);
    if (resolved) {
      CLINIC_UUID  = resolved.id;
      _clinicInfo  = resolved;
      console.log(`✅ Clinic resolved: "${resolved.clinic_name}" | id=${CLINIC_UUID}`);
    } else {
      console.error(`[FATAL] CLINIC_SLUG="${slug}" not found in clinics table — DB queries will fail`);
      // Don't exit: let health check endpoint still respond so Railway shows a clear error
    }
  } else {
    console.warn("[Startup] CLINIC_SLUG not set — clinic-scoped queries will fail");
  }

  console.log(`✅ Server on 0.0.0.0:${PORT} | Haiku=${MODEL_HAIKU.split("-").slice(-1)[0]} Sonnet=${MODEL_SONNET.split("-").slice(-1)[0]}`);

  // ── Phase 3: 백그라운드 서비스 시작 ─────────────────────────────────────
  try { startMessageWorker(); }      catch (e) { console.error("[Startup] messageWorker 실패:", e.message); }
  try { startAftercareScheduler(); } catch (e) { console.error("[Startup] aftercareScheduler 실패:", e.message); }
});
