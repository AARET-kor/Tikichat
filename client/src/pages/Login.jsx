import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginError, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app?tab=tiki_paste';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate(from, { replace: true });
  };

  const fillDemo = (e) => {
    e.preventDefault();
    setEmail('demo@libhib.com');
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-zinc-800/60">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.4)]">
            <MessageSquare size={13} className="text-white" fill="white" />
          </div>
          <span className="text-base font-bold text-zinc-100 tracking-tight">TikiChat</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">티키챗</span>
        </Link>
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← 홈으로
        </Link>
      </header>

      {/* Login card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mb-2">
                환영합니다 👋
              </h1>
              <p className="text-sm text-zinc-500">이메일과 비밀번호로 로그인하세요.</p>
            </div>

            {/* Demo account tip */}
            <div className="mb-5 px-3.5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <p className="text-xs text-purple-400 font-medium mb-1.5">✨ 데모 계정으로 바로 체험하기</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-purple-300 font-mono">demo@libhib.com</p>
                  <p className="text-[11px] text-purple-300 font-mono">demo123</p>
                </div>
                <button
                  onClick={fillDemo}
                  className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 px-2.5 py-1 rounded-lg transition-colors border border-purple-500/30"
                >
                  자동 입력
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="clinic@tikichat.ai"
                  autoComplete="email"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/60 transition bg-zinc-800 text-zinc-100 placeholder-zinc-600"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/60 transition bg-zinc-800 text-zinc-100 placeholder-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoggingIn || !email || !password}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-[0_0_16px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <><Loader2 size={15} className="animate-spin" /> 로그인 중...</>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[11px] text-zinc-600">또는</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Other demo accounts */}
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-600 font-medium text-center">다른 클리닉 체험</p>
              {[
                { email: 'demo@apricot.com', name: '에이프리콧 피부과', pw: 'demo123' },
                { email: 'admin@tikichat.ai', name: 'TikiChat 데모 (Admin)', pw: 'admin123' },
              ].map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pw); }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 hover:border-purple-500/30 transition-all"
                >
                  <p className="text-xs font-medium text-zinc-300">{acc.name}</p>
                  <p className="text-[11px] text-zinc-600 font-mono">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-5">
            계정이 없으신가요?{' '}
            <Link to="/#pricing" className="text-purple-400 hover:underline font-medium">
              도입 문의하기
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
