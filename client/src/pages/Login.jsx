import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginError, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/chat';

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal header */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">BEAUCHAT</span>
        </Link>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← 홈으로
        </Link>
      </header>

      {/* Login card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                환영합니다 👋
              </h1>
              <p className="text-sm text-slate-500">이메일과 비밀번호로 로그인하세요.</p>
            </div>

            {/* Demo account tip */}
            <div className="mb-5 px-3.5 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-xs text-indigo-700 font-medium mb-1.5">데모 계정으로 바로 체험하기</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-indigo-600 font-mono">demo@libhib.com</p>
                  <p className="text-[11px] text-indigo-600 font-mono">demo123</p>
                </div>
                <button
                  onClick={fillDemo}
                  className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  자동 입력
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="clinic@beauchat.ai"
                  autoComplete="email"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition placeholder-slate-400 bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition placeholder-slate-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoggingIn || !email || !password}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
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
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-400">또는</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Other demo accounts */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-medium text-center">다른 테넌트 체험</p>
              {[
                { email: 'demo@apricot.com', name: '에이프리콧 피부과' },
                { email: 'admin@beauchat.ai', name: 'BEAUCHAT 데모 (Admin)' },
              ].map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword('demo123'); }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all"
                >
                  <p className="text-xs font-medium text-slate-700">{acc.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            계정이 없으신가요?{' '}
            <Link to="/#pricing" className="text-indigo-600 hover:underline font-medium">
              도입 문의하기
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
