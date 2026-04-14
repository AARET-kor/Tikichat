import { useState } from 'react';
import { Stethoscope, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#003b63',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,59,99,0.25)',
        }}>
          <Stethoscope size={22} color="#f2a14b" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#003b63', letterSpacing: '-0.3px' }}>TikiChat</div>
          <div style={{ fontSize: 11, color: '#5a8aaa', marginTop: 1 }}>Shadow AI</div>
        </div>
      </div>

      {/* 카드 */}
      <div style={{
        width: '100%', maxWidth: 320,
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,59,99,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '24px',
        border: '1px solid #e8f0f6',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#003b63', marginBottom: 4 }}>병원 로그인</h2>
        <p style={{ fontSize: 12, color: '#7a9ab5', marginBottom: 20 }}>클리닉 계정으로 로그인하세요</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 이메일 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#003b63', display: 'block', marginBottom: 5 }}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="clinic@example.com"
              required
              style={{
                width: '100%', padding: '9px 12px',
                border: '1.5px solid #d0dfe8',
                borderRadius: 8, fontSize: 13, color: '#1a2d3d',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#003b63'}
              onBlur={e => e.target.style.borderColor = '#d0dfe8'}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#003b63', display: 'block', marginBottom: 5 }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '9px 36px 9px 12px',
                  border: '1.5px solid #d0dfe8',
                  borderRadius: 8, fontSize: 13, color: '#1a2d3d',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#003b63'}
                onBlur={e => e.target.style.borderColor = '#d0dfe8'}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#7a9ab5' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* 오류 메시지 */}
          {loginError && (
            <div style={{ fontSize: 11, color: '#e53e3e', background: '#fff5f5', padding: '7px 10px', borderRadius: 6, border: '1px solid #fed7d7' }}>
              {loginError}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              background: isLoggingIn ? '#7a9ab5' : '#003b63',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 0.15s',
              marginTop: 4,
              boxShadow: '0 3px 10px rgba(0,59,99,0.25)',
            }}
          >
            {isLoggingIn && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {isLoggingIn ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 데모 힌트 */}
        <div style={{ marginTop: 14, padding: '8px 10px', background: '#f0f6fb', borderRadius: 6, border: '1px solid #d0e4f0' }}>
          <div style={{ fontSize: 10, color: '#5a8aaa', fontWeight: 600, marginBottom: 3 }}>데모 계정</div>
          <div style={{ fontSize: 10, color: '#7a9ab5' }}>admin@tikichat.ai / admin123</div>
        </div>
      </div>
    </div>
  );
}
