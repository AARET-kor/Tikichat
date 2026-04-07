import { createContext, useContext, useState, useCallback } from 'react';

// ── Mock tenant database ──────────────────────────────────────────────────────
const MOCK_TENANTS = {
  'demo@libhib.com': {
    password: 'demo123',
    clinic: {
      id: 'libhib',
      name: 'LIBHIB Clinic',
      nameEn: 'LIBHIB Clinic',
      location: '강남구 논현동',
      plan: 'Pro',
      planColor: 'bg-violet-100 text-violet-700',
    },
    staff: { name: '김지연', role: '실장', initials: '김', avatarColor: 'from-sky-400 to-blue-600' },
  },
  'demo@apricot.com': {
    password: 'demo123',
    clinic: {
      id: 'apricot',
      name: '에이프리콧 피부과',
      nameEn: 'Apricot Dermatology',
      location: '서초구 반포동',
      plan: 'Standard',
      planColor: 'bg-sky-100 text-sky-700',
    },
    staff: { name: '이수진', role: '코디네이터', initials: '이', avatarColor: 'from-rose-400 to-pink-600' },
  },
  'admin@beauchat.ai': {
    password: 'admin123',
    clinic: {
      id: 'demo',
      name: 'BEAUCHAT 데모 클리닉',
      nameEn: 'BEAUCHAT Demo',
      location: '강남구 청담동',
      plan: 'Enterprise',
      planColor: 'bg-amber-100 text-amber-700',
    },
    staff: { name: '관리자', role: 'Admin', initials: 'A', avatarColor: 'from-amber-400 to-orange-600' },
  },
};

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('beauchat_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = useCallback(async (email, password) => {
    setIsLoggingIn(true);
    setLoginError('');

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const tenant = MOCK_TENANTS[email.toLowerCase()];
    if (!tenant || tenant.password !== password) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setIsLoggingIn(false);
      return false;
    }

    const newSession = {
      email,
      clinic: tenant.clinic,
      staff: tenant.staff,
      loginAt: new Date().toISOString(),
    };

    sessionStorage.setItem('beauchat_session', JSON.stringify(newSession));
    setSession(newSession);
    setIsLoggingIn(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('beauchat_session');
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, loginError, isLoggingIn, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
