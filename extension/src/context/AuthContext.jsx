import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storageGet, storageSet, storageRemove } from '../lib/storage';

const SESSION_KEY = 'tikichat_ext_session';

// ── Mock 계정 (Supabase 미설정 시 데모용) ─────────────────────────────────────
const MOCK_TENANTS = {
  'admin@tikichat.ai': {
    password: 'admin123',
    role: 'owner',
    clinic: { id: 'demo', name: 'TikiChat 데모 클리닉', plan: 'Enterprise' },
    staff:  { name: '관리자', role: 'owner', initials: 'A' },
  },
  'demo@libhib.com': {
    password: 'demo123',
    role: 'admin',
    clinic: { id: 'libhib', name: 'LIBHIB Clinic', plan: 'Pro' },
    staff:  { name: '김지연', role: 'admin', initials: '김' },
  },
};

// ── JWT 디코더 ─────────────────────────────────────────────────────────────────
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(
      c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('')));
  } catch { return {}; }
}

function extractClaims(sbSession) {
  const appMeta  = sbSession.user?.app_metadata  || {};
  const userMeta = sbSession.user?.user_metadata || {};
  let role     = appMeta.role || appMeta.user_role || null;
  let clinicId = appMeta.clinic_id || null;
  if (!role || !clinicId) {
    const payload = decodeJwtPayload(sbSession.access_token || '');
    role     = role     || payload.role      || null;
    clinicId = clinicId || payload.clinic_id || null;
  }
  role     = role     || userMeta.role      || null;
  clinicId = clinicId || userMeta.clinic_id || null;
  return { role, clinicId };
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null);
  const [authReady,  setAuthReady]  = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Supabase 세션 → state 동기화
  const hydrateFromSupabase = useCallback((sbSession) => {
    const { role, clinicId } = extractClaims(sbSession);
    const email    = sbSession.user.email || '';
    const fullName = sbSession.user.user_metadata?.full_name || email.split('@')[0];
    const newSession = {
      email, role,
      clinic: { id: clinicId || '', name: sbSession.user.user_metadata?.clinic_name || email, plan: 'Pro' },
      staff:  { name: fullName, role: role || 'staff', initials: fullName.slice(0, 1).toUpperCase() },
      loginAt: new Date().toISOString(),
      _source: 'supabase',
    };
    setSession(newSession);
    storageSet(SESSION_KEY, newSession);
  }, []);

  // 앱 시작 시 세션 복원
  useEffect(() => {
    const init = async () => {
      if (supabase) {
        const { data: { session: sbSession } } = await supabase.auth.getSession();
        if (sbSession) {
          hydrateFromSupabase(sbSession);
        } else {
          const saved = await storageGet(SESSION_KEY);
          if (saved) setSession(saved);
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
          if (sbSession) hydrateFromSupabase(sbSession);
          else { setSession(null); storageRemove(SESSION_KEY); }
        });
        setAuthReady(true);
        return () => subscription.unsubscribe();
      } else {
        // Supabase 미설정 — 저장된 mock 세션 복원
        const saved = await storageGet(SESSION_KEY);
        if (saved) setSession(saved);
        setAuthReady(true);
      }
    };
    init();
  }, [hydrateFromSupabase]);

  // 로그인
  const login = useCallback(async (email, password) => {
    setIsLoggingIn(true);
    setLoginError('');

    // 1. Supabase 실 인증 시도
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (data?.session) { setIsLoggingIn(false); return true; }
        if (error && !MOCK_TENANTS[email.toLowerCase()]) {
          setLoginError(error.message || '로그인 실패');
          setIsLoggingIn(false);
          return false;
        }
      } catch (err) {
        console.warn('[Auth] Supabase 연결 실패, mock 전환:', err.message);
      }
    }

    // 2. Mock 폴백
    await new Promise(r => setTimeout(r, 400));
    const tenant = MOCK_TENANTS[email.toLowerCase()];
    if (!tenant || tenant.password !== password) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setIsLoggingIn(false);
      return false;
    }
    const mockSession = {
      email, role: tenant.role,
      clinic: tenant.clinic,
      staff:  tenant.staff,
      loginAt: new Date().toISOString(),
      _source: 'mock',
    };
    await storageSet(SESSION_KEY, mockSession);
    setSession(mockSession);
    setIsLoggingIn(false);
    return true;
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    await storageRemove(SESSION_KEY);
    if (session?._source === 'supabase' && supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    setSession(null);
  }, [session]);

  return (
    <AuthContext.Provider value={{
      session,
      authReady,
      loginError,
      isLoggingIn,
      isAuthenticated: !!session,
      login,
      logout,
      role:      session?.role || null,
      clinicId:  session?.clinic?.id || null,
      roleLabel: session?.role === 'owner' ? '원장' : session?.role === 'admin' ? '관리자' : '직원',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
