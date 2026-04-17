import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Design tokens — Mocha Mousse ──────────────────────────────────────────────
const M = {
  bg:        '#FAF6F3',
  bgSub:     '#F0E8E3',
  white:     '#FFFFFF',
  text:      '#1C0F0A',
  textSub:   '#6B4A3A',
  textMt:    '#B09080',
  border:    '#E5CFC5',
  borderMd:  '#CCADA0',
  mocha:     '#A47764',
  mochaDk:   '#7A5545',
  mochaLt:   '#C4A090',
  mochaPale: '#F5EDE8',
  sage:      '#5A8F80',
  sagePale:  '#E4F2EF',
  gold:      '#D09262',
  goldPale:  '#FBF0E6',
  red:       '#b85c44',
  redBg:     '#fdf2ee',
};
const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

const GLOBAL_CSS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp    { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes float     { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
  @keyframes auroraGlow {
    0%   { background-position: 0%   50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0%   50%; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
`;

export default function Login() {
  const { login, loginError, isLoggingIn } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/app?tab=tiki_paste';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [focused,  setFocused]  = useState(null); // 'email' | 'pw' | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate(from, { replace: true });
  };

  const canSubmit = !isLoggingIn && !!email && !!password;

  const inputBase = (name) => ({
    width: '100%', padding: '11px 14px',
    fontSize: 13, color: M.text, fontFamily: SANS,
    border: `1.5px solid ${focused === name ? M.mocha : M.border}`,
    borderRadius: 10, background: M.white, outline: 'none',
    boxShadow: focused === name ? `0 0 0 3px ${M.mocha}18` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  });

  return (
    <div style={{ minHeight: '100vh', background: M.bg, display: 'flex', flexDirection: 'column', fontFamily: SANS }}>
      <style>{GLOBAL_CSS}</style>

      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${M.mocha}, ${M.gold}, ${M.mochaLt}, ${M.sage}, ${M.mocha})`,
        backgroundSize: '300% 100%',
        animation: 'auroraGlow 4s ease infinite',
      }} />

      {/* Header */}
      <header style={{
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: M.white, borderBottom: `1px solid ${M.border}`,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: M.mocha,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 10px ${M.mocha}50`,
          }}>
            <MessageSquare size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: M.text, letterSpacing: '-0.03em' }}>TikiDoc</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: M.mochaPale, color: M.mocha, border: `1px solid ${M.mocha}30`,
            letterSpacing: '0.04em',
          }}>AI</span>
        </Link>
        <Link to="/" style={{ fontSize: 12, color: M.textMt, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = M.mocha}
          onMouseLeave={e => e.currentTarget.style.color = M.textMt}
        >
          ← 홈으로
        </Link>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.4s ease-out' }}>

          {/* Logo accent */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px',
              background: `linear-gradient(135deg, ${M.mocha} 0%, ${M.gold} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 28px ${M.mocha}45`,
              animation: 'float 4s ease-in-out infinite',
            }}>
              <MessageSquare size={24} color="#fff" fill="rgba(255,255,255,0.7)" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: M.text, letterSpacing: '-0.04em', marginBottom: 6, lineHeight: 1.1 }}>
              다시 오셨군요 👋
            </h1>
            <p style={{ fontSize: 12, color: M.textMt }}>TikiDoc 클리닉 계정으로 로그인하세요</p>
          </div>

          {/* Card */}
          <div style={{
            background: M.white, borderRadius: 20,
            boxShadow: `0 4px 40px ${M.mocha}15, 0 1px 4px rgba(0,0,0,0.06)`,
            border: `1px solid ${M.border}`, padding: '28px 28px',
          }}>

            {/* Demo tip */}
            <div style={{
              marginBottom: 22, padding: '12px 14px', borderRadius: 12,
              background: M.mochaPale, border: `1px solid ${M.mocha}25`,
            }}>
              <p style={{ fontSize: 10, color: M.mocha, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <Sparkles size={10} /> 데모 계정으로 바로 체험
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: M.textSub, fontFamily: 'monospace', marginBottom: 2 }}>admin@tikidoc.ai</p>
                  <p style={{ fontSize: 11, color: M.textMt,  fontFamily: 'monospace' }}>admin123</p>
                </div>
                <button
                  onClick={() => { setEmail('admin@tikidoc.ai'); setPassword('admin123'); }}
                  style={{
                    fontSize: 11, fontWeight: 700, color: M.mocha,
                    background: M.white, border: `1.5px solid ${M.mocha}40`,
                    padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: SANS, flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = M.mocha; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = M.white; e.currentTarget.style.color = M.mocha; }}
                >
                  자동 입력
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="clinic@tikidoc.ai"
                  autoComplete="email"
                  required
                  style={inputBase('email')}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>비밀번호</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{ ...inputBase('pw'), paddingRight: 42 }}
                    onFocus={() => setFocused('pw')}
                    onBlur={() => setFocused(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: M.textMt, padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: M.redBg, border: `1px solid ${M.red}30`, borderRadius: 10 }}>
                  <AlertCircle size={13} color={M.red} style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: M.red, margin: 0 }}>{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: 11, border: 'none',
                  background: canSubmit
                    ? `linear-gradient(135deg, ${M.mocha} 0%, ${M.mochaDk} 100%)`
                    : M.border,
                  color: canSubmit ? '#fff' : M.textMt,
                  fontSize: 13, fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: canSubmit ? `0 4px 20px ${M.mocha}50` : 'none',
                  transition: 'all 0.18s', fontFamily: SANS, letterSpacing: '-0.01em',
                  backgroundSize: '200% 200%',
                }}
                onMouseEnter={e => { if (canSubmit) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { if (canSubmit) e.currentTarget.style.opacity = '1'; }}
              >
                {isLoggingIn
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 로그인 중...</>
                  : '로그인'
                }
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: M.border }} />
              <span style={{ fontSize: 10, color: M.textMt, letterSpacing: '0.04em' }}>다른 클리닉 체험</span>
              <div style={{ flex: 1, height: 1, background: M.border }} />
            </div>

            {/* Demo clinic accounts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { email: 'demo@libhib.com',  name: 'Libhib 클리닉',       pw: 'demo123'  },
                { email: 'demo@apricot.com', name: '에이프리콧 피부과',   pw: 'demo123'  },
              ].map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pw); }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${M.border}`, background: M.white,
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: SANS,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = M.mochaPale; e.currentTarget.style.borderColor = M.mocha + '40'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = M.white;     e.currentTarget.style.borderColor = M.border; }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: M.text }}>{acc.name}</p>
                  <p style={{ fontSize: 10, color: M.textMt, fontFamily: 'monospace' }}>{acc.email}</p>
                </button>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: M.textMt, marginTop: 20 }}>
            계정이 없으신가요?{' '}
            <Link to="/signup" style={{ color: M.mocha, fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = M.mochaDk}
              onMouseLeave={e => e.currentTarget.style.color = M.mocha}
            >
              무료로 시작하기
            </Link>
          </p>
        </div>
      </main>

      <footer style={{ padding: '16px', textAlign: 'center', borderTop: `1px solid ${M.border}` }}>
        <p style={{ fontSize: 10, color: M.textMt, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          TikiDoc · 해외 환자 상담의 새로운 표준
        </p>
      </footer>
    </div>
  );
}
