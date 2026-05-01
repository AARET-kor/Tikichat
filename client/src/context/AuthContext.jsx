import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — 역할 상수 & 퍼미션 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
};

/**
 * feature별 접근 가능 역할 맵
 * null = 모든 역할 허용
 * ─────────────────────────────────────────────────────────────
 * 제품 구조:
 *   All roles  : tiki_paste, tiki_talk, tiki_room
 *   owner/admin: tiki_memory, procedures, protocol, analytics, settings
 */
const FEATURE_ROLES = {
  // ── 전체 허용 (모든 직원) ────────────────────────────────────
  tiki_paste:   null,
  tiki_talk:    null,
  tiki_room:    null,

  // ── owner / admin 전용 ───────────────────────────────────────
  tiki_memory:  ['owner', 'admin'],
  procedures:   ['owner', 'admin'],
  protocol:     ['owner', 'admin'],
  analytics:    ['owner', 'admin'],
  settings:     ['owner', 'admin'],
  my_tiki:      ['owner', 'admin'],

  // ── 레거시 ID 별칭 (하위 호환) ───────────────────────────────
  stats:        ['owner', 'admin'],   // analytics의 구 ID
  insights:     ['owner', 'admin'],   // tiki_memory의 구 ID
};

/**
 * canAccess(role, feature)
 * role이 null이면 모든 기능 허용 (로딩 중 또는 데모 미설정 시 안전 처리)
 */
export function canAccess(role, feature) {
  if (!role) return true;
  const allowed = FEATURE_ROLES[feature];
  if (!allowed) return true; // 명시되지 않은 feature는 전체 허용
  return allowed.includes(role);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Tenants — Supabase 미연결 시 데모 로그인 폴백
// 각 계정에 role을 명시해 RBAC 체험 가능
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_TENANTS = {
  'demo@libhib.com': {
    password: 'demo123',
    role: 'admin',
    clinic: {
      id: 'libhib',
      name: 'LIBHIB Clinic',
      nameEn: 'LIBHIB Clinic',
      location: '강남구 논현동',
      plan: 'Pro',
      planColor: 'bg-violet-100 text-violet-700',
    },
    staff: { name: '김지연', role: 'admin', initials: '김', avatarColor: 'from-sky-400 to-blue-600' },
  },
  'demo@apricot.com': {
    password: 'demo123',
    role: 'staff',                             // ← staff 체험 계정
    clinic: {
      id: 'apricot',
      name: '에이프리콧 피부과',
      nameEn: 'Apricot Dermatology',
      location: '서초구 반포동',
      plan: 'Standard',
      planColor: 'bg-sky-100 text-sky-700',
    },
    staff: { name: '이수진', role: 'staff', initials: '이', avatarColor: 'from-rose-400 to-pink-600' },
  },
  'admin@tikidoc.ai': {
    password: 'admin123',
    role: 'owner',
    clinic: {
      id: 'demo',
      name: 'TikiDoc 데모 클리닉',
      nameEn: 'TikiDoc Demo',
      location: '강남구 청담동',
      plan: 'Enterprise',
      planColor: 'bg-amber-100 text-amber-700',
    },
    staff: { name: '관리자', role: 'owner', initials: 'A', avatarColor: 'from-purple-500 to-fuchsia-600' },
  },
};

function hasSupabaseConfig() {
  return !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY;
}

function allowsMockAuth() {
  return import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
}

function normalizeLoginError(error) {
  const message = error?.message || String(error || "");
  if (/failed to fetch|fetch failed|network/i.test(message)) {
    return "Supabase Auth 연결에 실패했습니다. 배포 환경의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 설정과 Supabase Auth 도메인을 확인해 주세요.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (/email not confirmed/i.test(message)) {
    return "이메일 확인이 아직 완료되지 않았습니다. Supabase Auth 설정 또는 확인 메일을 확인해 주세요.";
  }
  return message || "로그인에 실패했습니다.";
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT 디코더 — jwt-decode 패키지 없이 순수 base64 디코딩
// ─────────────────────────────────────────────────────────────────────────────
function decodeJwtPayload(token) {
  try {
    const base64url = token.split('.')[1];
    if (!base64url) return {};
    // base64url → base64 변환
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase 세션에서 role / clinicId 추출
// JWT Hook이 주입하는 위치 우선순위:
//   1. app_metadata  (Supabase JWT Hook 기본 위치)
//   2. JWT payload 직접 디코딩
//   3. user_metadata (fallback)
// ─────────────────────────────────────────────────────────────────────────────
function extractClaimsFromSupabase(sbSession) {
  const appMeta    = sbSession.user?.app_metadata   || {};
  const userMeta   = sbSession.user?.user_metadata  || {};

  // 1. app_metadata 우선 (JWT Hook 주입 위치)
  let role     = appMeta.role      || appMeta.user_role  || null;
  let clinicId = appMeta.clinic_id || null;

  // 2. JWT payload 직접 파싱 (Hook이 top-level에 넣는 경우)
  if (!role || !clinicId) {
    const payload = decodeJwtPayload(sbSession.access_token);
    role     = role     || payload.role      || payload.user_role  || null;
    clinicId = clinicId || payload.clinic_id || null;
  }

  // 3. user_metadata 최후 폴백
  role     = role     || userMeta.role     || null;
  clinicId = clinicId || userMeta.clinic_id || null;

  return { role, clinicId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null);
  const [role,       setRole]       = useState(null);
  const [clinicId,   setClinicId]   = useState(null);
  const [authReady,  setAuthReady]  = useState(false); // 초기 세션 복원 완료 여부
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn,setIsLoggingIn]= useState(false);

  // ── Supabase 세션 → 전역 state 동기화 ─────────────────────────────────────
  const hydrateFromSupabase = useCallback((sbSession) => {
    const { role: r, clinicId: cid } = extractClaimsFromSupabase(sbSession);

    // ▶ 테스트용 콘솔 로그
    console.log(`[Auth] Current Role: ${r ?? '(없음)'}, Clinic ID: ${cid ?? '(없음)'}`);
    console.log('[Auth] app_metadata:', sbSession.user?.app_metadata);

    // 아바타 이니셜 / 색상 (user_metadata에 있으면 사용)
    const email    = sbSession.user.email || '';
    const fullName = sbSession.user.user_metadata?.full_name || email.split('@')[0];
    const initials = fullName.slice(0, 1).toUpperCase();

    const AVATAR_COLORS = ['from-sky-400 to-blue-600','from-rose-400 to-pink-600',
      'from-purple-500 to-fuchsia-600','from-emerald-400 to-teal-600'];
    const avatarIdx = email.charCodeAt(0) % AVATAR_COLORS.length;

    const newSession = {
      email,
      role:     r,
      clinic:   {
        id:        cid || '',
        name:      sbSession.user.user_metadata?.clinic_name || email,
        nameEn:    sbSession.user.user_metadata?.clinic_name || email,
        location:  sbSession.user.user_metadata?.clinic_location || '',
        plan:      sbSession.user.user_metadata?.plan || 'Standard',
        planColor: 'bg-violet-100 text-violet-700',
      },
      staff: {
        name:        fullName,
        role:        r || 'staff',
        initials,
        avatarColor: AVATAR_COLORS[avatarIdx],
      },
      loginAt:  new Date().toISOString(),
      _source:  'supabase',
    };

    setSession(newSession);
    setRole(r);
    setClinicId(cid);
  }, []);

  // ── 앱 시작 시: 기존 세션 복원 ────────────────────────────────────────────
  useEffect(() => {
    const supabaseConfigured = hasSupabaseConfig();

    if (supabaseConfigured) {
      // Supabase 세션 복원 시도
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        if (sbSession) {
          hydrateFromSupabase(sbSession);
        } else if (allowsMockAuth()) {
          // 로컬/명시적 데모 모드에서만 mock 세션 복원
          restoreMockSession();
        } else {
          sessionStorage.removeItem('tikidoc_session');
          setSession(null);
          setRole(null);
          setClinicId(null);
        }
        setAuthReady(true);
      });

      // 토큰 갱신 / 로그아웃 이벤트 감지
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, sbSession) => {
          if (sbSession) {
            hydrateFromSupabase(sbSession);
          } else {
            if (!allowsMockAuth()) sessionStorage.removeItem('tikidoc_session');
            setSession(null);
            setRole(null);
            setClinicId(null);
          }
        }
      );
      return () => subscription.unsubscribe();
    } else {
      // Supabase 미설정 → mock만 사용
      restoreMockSession();
      setAuthReady(true);
    }
  }, [hydrateFromSupabase]);

  function restoreMockSession() {
    try {
      const saved = sessionStorage.getItem('tikidoc_session');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setSession(parsed);
      setRole(parsed.role || null);
      setClinicId(parsed.clinic?.id || null);
      console.log(`[Auth] Restored mock session — Role: ${parsed.role}, Clinic ID: ${parsed.clinic?.id}`);
    } catch { /* ignore */ }
  }

  // ── 로그인 ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setIsLoggingIn(true);
    setLoginError('');

    const supabaseConfigured = hasSupabaseConfig();
    const mockAuthAllowed = allowsMockAuth();

    // 1️⃣  Supabase 실 인증 시도
    if (supabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (data?.session) {
          // onAuthStateChange가 hydrateFromSupabase 호출 → 별도 처리 불필요
          setIsLoggingIn(false);
          return true;
        }
        // 운영 환경에서는 mock 폴백을 허용하지 않는다.
        if (error && (!mockAuthAllowed || !MOCK_TENANTS[email.toLowerCase()])) {
          setLoginError(normalizeLoginError(error));
          setIsLoggingIn(false);
          return false;
        }
        // Supabase 실패 + mock 계정 존재 → mock으로 폴백
        if (error) {
          console.warn('[Auth] Supabase login failed, falling back to mock:', error.message);
        }
      } catch (err) {
        console.warn('[Auth] Supabase unavailable, falling back to mock:', err.message);
        if (!mockAuthAllowed) {
          setLoginError(normalizeLoginError(err));
          setIsLoggingIn(false);
          return false;
        }
      }
    }

    // 2️⃣  Mock 폴백 (데모 계정 / 오프라인)
    if (!mockAuthAllowed) {
      setLoginError('실제 직원 계정으로 다시 로그인해 주세요.');
      setIsLoggingIn(false);
      return false;
    }

    await new Promise(r => setTimeout(r, 600));
    const tenant = MOCK_TENANTS[email.toLowerCase()];
    if (!tenant || tenant.password !== password) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setIsLoggingIn(false);
      return false;
    }

    const mockRole = tenant.role || 'staff';
    const newSession = {
      email,
      role:     mockRole,
      clinic:   tenant.clinic,
      staff:    tenant.staff,
      loginAt:  new Date().toISOString(),
      _source:  'mock',
    };

    // ▶ 테스트용 콘솔 로그
    console.log(`[Auth] Current Role: ${mockRole}, Clinic ID: ${tenant.clinic.id}`);

    sessionStorage.setItem('tikidoc_session', JSON.stringify(newSession));
    setSession(newSession);
    setRole(mockRole);
    setClinicId(tenant.clinic.id);
    setIsLoggingIn(false);
    return true;
  }, []);

  // ── 로그아웃 ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    sessionStorage.removeItem('tikidoc_session');
    if (session?._source === 'supabase') {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    setSession(null);
    setRole(null);
    setClinicId(null);
  }, [session]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    session,
    role,
    clinicId,
    authReady,
    login,
    logout,
    loginError,
    isLoggingIn,
    isAuthenticated: !!session,
    /** canAccess('stats') — 현재 유저가 해당 feature에 접근 가능한지 */
    canAccess: (feature) => canAccess(role, feature),
    /** 역할 라벨 (UI 표시용) */
    roleLabel: role === 'owner' ? '원장' : role === 'admin' ? '관리자' : role === 'staff' ? '직원' : '',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
