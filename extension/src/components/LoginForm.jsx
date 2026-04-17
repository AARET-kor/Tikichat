import { useState } from 'react';
import { Eye, EyeOff, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Design tokens — Mocha Mousse signature palette ───────────────────────────
const T = {
  bg:      '#FAF6F3',
  white:   '#FFFFFF',
  text:    '#1C0F0A',
  textSub: '#6B4A3A',
  textMt:  '#B09080',
  border:  '#E5CFC5',
  mocha:   '#A47764',
  mochaDk: '#7A5545',
  mochaBg: '#F5EDE8',
  red:     '#b85c44',
  redBg:   '#fdf2ee',
};
const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

export default function LoginForm() {
  const { login, loginError, isLoggingIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div style={{
      background: T.bg,
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: SANS,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input { outline: none; }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.mocha, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${T.mocha}50` }}>
            <MessageSquare size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.03em' }}>TikiDoc</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: T.mocha, color: '#fff', borderRadius: 5, padding: '2px 6px', letterSpacing: '0.04em' }}>AI</span>
        </div>
        {/* Coral accent line */}
        <div style={{ width: 36, height: 3, borderRadius: 2, background: T.mocha, margin: '0 auto 8px' }} />
        <p style={{ fontSize: 11, color: T.textMt, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Shadow AI · 다국어 상담 솔루션
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 300,
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: '28px 24px',
        boxShadow: `0 4px 24px ${T.mocha}18`,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>클리닉 로그인</p>
        <p style={{ fontSize: 11, color: T.textSub, marginBottom: 24 }}>병원 계정으로 로그인하세요</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.textSub, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="clinic@example.com"
              required
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontSize: 13, color: T.text, background: T.bg,
                transition: 'border-color 0.15s', fontFamily: SANS,
              }}
              onFocus={e => e.target.style.borderColor = T.mocha}
              onBlur={e  => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.textSub, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '9px 36px 9px 12px',
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.text, background: T.bg,
                  transition: 'border-color 0.15s', fontFamily: SANS,
                }}
                onFocus={e => e.target.style.borderColor = T.coral}
                onBlur={e  => e.target.style.borderColor = T.border}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textMt, padding: 0 }}
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {loginError && (
            <div style={{ fontSize: 11, color: T.red, background: T.redBg, padding: '8px 12px', borderRadius: 8, borderLeft: `3px solid ${T.red}` }}>
              {loginError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              background: isLoggingIn ? T.textMt : T.mocha,
              color: '#fff', border: 'none',
              padding: '11px', borderRadius: 9,
              fontSize: 13, fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s', fontFamily: SANS,
              boxShadow: isLoggingIn ? 'none' : `0 3px 12px ${T.mocha}50`,
            }}
            onMouseEnter={e => { if (!isLoggingIn) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { if (!isLoggingIn) e.currentTarget.style.opacity = '1'; }}
          >
            {isLoggingIn && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {isLoggingIn ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Demo account */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 10, color: T.textMt, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>데모 계정</p>
          <p style={{ fontSize: 11, color: T.textSub, fontFamily: 'monospace' }}>admin@tikidoc.ai / admin123</p>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 10, color: T.textMt, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        TikiDoc · 해외 환자 상담의 새로운 표준
      </p>
    </div>
  );
}
