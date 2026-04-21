/**
 * src/middleware/auth.js
 * ─────────────────────────────────────────────────────────────
 * TikiDoc 인증 미들웨어 2종
 *
 * 1. requireStaffAuth  — 스태프 JWT 검증 (신규 My Tiki 관리 라우트용)
 *    - Supabase JWT → app_metadata.clinic_id + role 추출
 *    - Supabase 미설정 시 body/query clinicId로 fallback (개발 모드)
 *    - req.clinic_id / req.staff_role / req.staff_user_id 세팅
 *
 * 2. requirePatientToken — My Tiki 매직 링크 토큰 검증 (환자 facing 라우트)
 *    - 헤더 X-Patient-Token 또는 쿼리 ?token= 에서 raw token 읽음
 *    - sha256(token) → patient_links 테이블 조회
 *    - 만료/폐기 상태 확인
 *    - access_count 증가 + last_accessed_at 갱신
 *    - req.clinic_id / req.patient_id / req.visit_id / req.patient_link 세팅
 *
 * ⚠️  중요 — 환자 facing 라우트는 반드시 requirePatientToken을 통해야 함.
 *    clinic_id를 절대로 request body에서 가져오지 않는다.
 */

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── Supabase admin 클라이언트 (lazy, server.js와 별도 인스턴스) ─────────────
let _sbAdmin = null;

function getSbAdmin() {
  if (_sbAdmin !== undefined && _sbAdmin !== null) return _sbAdmin;
  const url    = process.env.SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url) {
    console.warn("[auth] SUPABASE_URL 미설정 — 미들웨어 검증 불가");
    return (_sbAdmin = null);
  }
  return (_sbAdmin = createClient(url, svcKey));
}

// ── Supabase anon client (JWT 검증용) ─────────────────────────────────────────
let _sbAnon = null;

function getSbAnon() {
  if (_sbAnon) return _sbAnon;
  const url  = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return (_sbAnon = createClient(url, anon));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. requireStaffAuth
//    Express 미들웨어: Authorization: Bearer <supabase_jwt> 검증
// ─────────────────────────────────────────────────────────────────────────────
export async function requireStaffAuth(req, res, next) {
  // ── Supabase 미설정 → 개발 모드 fallback ─────────────────────────────────
  if (!process.env.SUPABASE_URL) {
    // dev fallback: clinicId from body/query, or CLINIC_UUID set at startup
    // Import CLINIC_UUID isn't possible from middleware (circular), so use env hint
    req.clinic_id     = req.body?.clinicId ?? req.query?.clinicId ?? process.env.CLINIC_UUID_DEV ?? null;
    req.staff_role    = "owner";       // dev: 모든 권한 허용
    req.staff_user_id = "dev";
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required (Bearer <token>)" });
  }

  const token = authHeader.slice(7);
  const sb    = getSbAnon();
  if (!sb) return res.status(503).json({ error: "Auth service unavailable" });

  try {
    // Supabase가 JWT를 검증하고 user 반환
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired staff token" });
    }

    const clinic_id = user.app_metadata?.clinic_id
      || user.user_metadata?.clinic_id;
    const role = user.app_metadata?.role
      || user.user_metadata?.role
      || "staff";

    if (!clinic_id) {
      return res.status(403).json({ error: "No clinic associated with this account" });
    }

    req.clinic_id     = clinic_id;
    req.staff_role    = role;
    req.staff_user_id = user.id;
    next();

  } catch (err) {
    console.error("[requireStaffAuth]", err.message);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. requirePatientToken
//    Express 미들웨어: X-Patient-Token 헤더 또는 ?token= 쿼리로 매직 링크 검증
// ─────────────────────────────────────────────────────────────────────────────
export async function requirePatientToken(req, res, next) {
  const raw = req.headers["x-patient-token"]
    || req.query.token
    || req.body?._token;   // POST body에서도 수락 (폼 제출 편의)

  if (!raw) {
    return res.status(401).json({ error: "Patient access token required" });
  }

  const sb = getSbAdmin();
  if (!sb) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  // raw token → SHA-256 해시
  const tokenHash = createHash("sha256").update(raw).digest("hex");

  try {
    const { data: link, error } = await sb
      .from("patient_links")
      .select(`
        id, clinic_id, patient_id, visit_id,
        status, expires_at, first_opened_at, access_count,
        patient_lang
      `)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;

    if (!link) {
      return res.status(401).json({ error: "Invalid patient link" });
    }
    if (link.status === "revoked") {
      return res.status(403).json({ error: "This link has been revoked" });
    }
    if (link.status === "expired" || new Date(link.expires_at) < new Date()) {
      // 상태가 active여도 expires_at이 지났으면 거부
      if (link.status === "active") {
        // 지연된 만료 — status 갱신 (fire-and-forget)
        sb.from("patient_links")
          .update({ status: "expired" })
          .eq("id", link.id)
          .then(() => {})
          .catch(() => {});
      }
      return res.status(403).json({ error: "This link has expired" });
    }

    // ── 접근 기록 갱신 (fire-and-forget) ──────────────────────────────────
    const now = new Date().toISOString();
    sb.from("patient_links")
      .update({
        last_accessed_at: now,
        access_count:     (link.access_count || 0) + 1,
        ...(link.first_opened_at ? {} : { first_opened_at: now }),
      })
      .eq("id", link.id)
      .then(() => {})
      .catch(() => {});

    // ── req 세팅 ───────────────────────────────────────────────────────────
    req.patient_link  = link;
    req.clinic_id     = link.clinic_id;
    req.patient_id    = link.patient_id;
    req.visit_id      = link.visit_id;
    req.patient_lang  = link.patient_lang || "ko";

    next();

  } catch (err) {
    console.error("[requirePatientToken]", err.message);
    return res.status(500).json({ error: "Token verification failed" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. requireRole — 역할 게이트 (requireStaffAuth 이후에 사용)
//    예: router.post('/links', requireStaffAuth, requireRole('owner','admin'), handler)
// ─────────────────────────────────────────────────────────────────────────────
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.staff_role) {
      return res.status(403).json({ error: "Role information missing" });
    }
    if (!allowedRoles.includes(req.staff_role)) {
      return res.status(403).json({
        error: `This action requires role: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. generatePatientToken — 매직 링크 토큰 생성 헬퍼 (server.js에서 사용)
//    반환: { token, tokenHash }
//    token    → 링크에 포함 (클라이언트에게 1회 전달 후 버려도 됨)
//    tokenHash → DB에 저장
// ─────────────────────────────────────────────────────────────────────────────
import { randomBytes } from "crypto";

export function generatePatientToken() {
  const token     = randomBytes(32).toString("base64url");  // 43자
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}
