import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Languages, CalendarCheck, Sparkles, MessageSquare,
  BarChart3, ArrowRight, Check, Star, Globe, Database, Menu, X
} from 'lucide-react';

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-[0_0_14px_rgba(168,85,247,0.5)]">
            <MessageSquare size={15} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-bold text-zinc-100 tracking-tight">TikiChat</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hidden sm:inline">
            티키챗
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">기능</a>
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">요금제</a>
          <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-all">
            로그인
          </Link>
          <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white transition-all shadow-[0_0_16px_rgba(168,85,247,0.4)]">
            무료 시작
          </Link>
        </nav>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/login" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]">
            무료 시작
          </Link>
          <button onClick={() => setMobileOpen(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col gap-3">
          <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors py-2 border-b border-zinc-800">기능</a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors py-2 border-b border-zinc-800">요금제</a>
          <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-300 py-2">로그인</Link>
        </div>
      )}
    </header>
  );
}

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-4xl mx-auto mt-14">
      {/* Neon glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.28)_0%,rgba(217,70,239,0.1)_40%,transparent_70%)] -z-10 scale-110" />

      {/* Main window */}
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700/50 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.2),0_25px_60px_rgba(0,0,0,0.6)]">
        {/* Window bar */}
        <div className="h-8 bg-zinc-800 border-b border-zinc-700 flex items-center px-3 gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <div className="flex-1 mx-6">
            <div className="h-3.5 bg-zinc-700 rounded-full max-w-52 mx-auto" />
          </div>
        </div>

        {/* App layout — light mode inside dark frame */}
        <div className="flex h-72 text-[0px] bg-slate-50">
          {/* Sidebar */}
          <div className="w-12 bg-white border-r border-slate-100 flex flex-col items-center pt-3 gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-sm" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-purple-50 border border-purple-100' : ''}`}>
                <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? 'bg-purple-400' : 'bg-slate-300'}`} />
              </div>
            ))}
          </div>

          {/* Chat list */}
          <div className="w-44 border-r border-slate-100 bg-white pt-2 px-2 space-y-1">
            {[
              { active: true, badge: 2 },
              { active: false, badge: 1 },
              { active: false, badge: 0 },
              { active: false, badge: 3 },
            ].map((c, i) => (
              <div key={i} className={`px-2 py-1.5 rounded-lg border ${c.active ? 'bg-purple-50 border-purple-100' : 'border-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-700 rounded-full" style={{ width: `${42 + i * 6}px` }} />
                  {c.badge > 0 && <div className="w-3 h-3 rounded-full bg-fuchsia-500" />}
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-1 w-3/4" />
              </div>
            ))}
          </div>

          {/* Chat window */}
          <div className="flex-1 bg-slate-50 flex flex-col">
            <div className="h-9 bg-white border-b border-slate-100 flex items-center px-3 gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-200" />
              <div className="h-2 bg-slate-300 rounded-full w-20" />
              <div className="ml-2 h-1.5 bg-purple-200 rounded-full w-10" />
            </div>
            <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
              <div className="flex gap-2 items-end">
                <div className="w-5 h-5 rounded-full bg-rose-200 shrink-0" />
                <div className="space-y-1">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm border border-slate-100">
                    <div className="h-1.5 bg-slate-200 rounded w-40 mb-1" />
                    <div className="h-1.5 bg-slate-200 rounded w-28" />
                  </div>
                  <div className="bg-purple-50 rounded-xl px-2.5 py-1.5 flex gap-1.5 border border-purple-100">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="h-1 bg-purple-300 rounded w-8 mb-0.5" />
                      <div className="h-1.5 bg-purple-200 rounded w-32" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-end justify-end">
                <div className="bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                  <div className="h-1.5 bg-white/50 rounded w-44 mb-1" />
                  <div className="h-1.5 bg-white/50 rounded w-32" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 shrink-0" />
              </div>
            </div>
            <div className="mx-3 mb-2 rounded-xl border border-purple-200 bg-white p-2 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" />
                <div className="h-1.5 bg-purple-300 rounded w-16" />
              </div>
              <div className="h-1.5 bg-slate-200 rounded w-full mb-1" />
              <div className="h-1.5 bg-slate-200 rounded w-3/4" />
              <div className="flex gap-1.5 mt-2">
                <div className="h-4 w-16 bg-slate-100 rounded-md" />
                <div className="h-4 w-24 bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-md" />
              </div>
            </div>
          </div>

          {/* Context panel */}
          <div className="w-44 border-l border-slate-100 bg-white p-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-rose-100" />
              <div>
                <div className="h-1.5 bg-slate-300 rounded w-16 mb-1" />
                <div className="h-1 bg-slate-200 rounded w-10" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-3 w-8 bg-amber-100 rounded-full" />
              <div className="h-3 w-12 bg-purple-100 rounded-full" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-100 shrink-0" />
                <div>
                  <div className="h-1 bg-slate-200 rounded w-12 mb-0.5" />
                  <div className="h-1.5 bg-slate-100 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Marquee ───────────────────────────────────────────────────────────────────
const CLINIC_LOGOS = [
  '아름다운 피부과', 'K-Derma', '청담 뷰티클리닉', 'Gangnam Glow',
  '서초 에스테틱', 'SeoulSkin MD', '압구정 뷰티센터', '강남 뉴페이스',
];

function Marquee() {
  return (
    <div className="overflow-hidden py-10 border-y border-zinc-800/60 bg-zinc-900/40">
      <p className="text-center text-xs font-medium text-zinc-600 tracking-widest uppercase mb-6">
        이미 트렌드를 아는 강남의 프리미엄 의원들이 티키챗과 함께합니다
      </p>
      <div className="flex gap-0 whitespace-nowrap animate-[marquee_25s_linear_infinite]">
        {[...CLINIC_LOGOS, ...CLINIC_LOGOS].map((name, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-8 text-zinc-500 font-semibold text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bento Features ────────────────────────────────────────────────────────────
function BentoFeatures() {
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-24">
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold mb-4 border border-purple-500/30">
          <Sparkles size={12} fill="currentColor" /> 핵심 기능
        </span>
        <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">
          코디네이터 없이 가능한 일들
        </h2>
        <p className="text-zinc-500 mt-3 text-base">월 350만원의 다국어 코디네이터를 AI로 대체하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-auto gap-4">
        {/* Card 1 — wide (2 cols on md+) */}
        <div className="md:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-7 hover:-translate-y-1 transition-all duration-200 hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]">
          <div className="w-11 h-11 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 border border-purple-500/30">
            <Languages size={22} className="text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            실시간 AI 번역
          </span>
          <h3 className="text-lg font-bold text-zinc-100 mt-3 mb-2">어떤 언어든 막힘없이 탁, 탁!</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            왓츠앱, 인스타 DM, 카톡. 어디로 문의가 오든 AI가 병원의 시술 매뉴얼을 기반으로
            완벽한 다국어 답변 초안을 1초 만에 세팅합니다.
          </p>
          <div className="flex gap-2 mt-5 flex-wrap">
            {['🇯🇵 日本語', '🇨🇳 中文', '🇸🇦 عربي', '🇺🇸 English', '🇰🇷 한국어', '🇻🇳 Tiếng Việt'].map(l => (
              <span key={l} className="px-2.5 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full font-medium border border-zinc-700">
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2 — tall (row-span-2 on md+), aurora purple gradient */}
        <div className="md:row-span-2 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-2xl p-7 text-white shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:-translate-y-1 transition-transform duration-200">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Sparkles size={22} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
            Chat-to-Chart
          </span>
          <h3 className="text-lg font-bold mt-3 mb-2">대화가 끝나면 차트가 짠!</h3>
          <p className="text-sm text-white/80 leading-relaxed">
            AI가 대화 문맥을 파악해 환자 DB에 자동으로 입력합니다. 데스크의 타이핑을 없애세요.
          </p>
          <div className="mt-6 space-y-2.5">
            {['환자명', '관심 시술', '방문 횟수', '특이사항'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-white/60 w-14 shrink-0">{label}</span>
                <div className="h-2 rounded-full bg-white/30 flex-1" style={{ maxWidth: `${55 + i * 12}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-5 text-[11px] text-white/60 leading-relaxed">
            대화가 끝나면 환자 카드에<br />자동으로 기록됩니다.
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 hover:-translate-y-1 transition-all duration-200 hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 border border-purple-500/30">
            <CalendarCheck size={20} className="text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            자동 애프터케어
          </span>
          <h3 className="text-sm font-bold text-zinc-100 mt-2.5 mb-1.5">본국으로 돌아가도 알아서 착, 착!</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            시술 항목에 맞춘 사후관리 메시지를 AI가 환자의 언어로 자동 발송해 VIP 팬덤을 구축합니다.
          </p>
          <div className="flex gap-1.5 mt-3">
            {['D+1', 'D+3', 'D+7'].map(d => (
              <span key={d} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-purple-400 rounded-full border border-zinc-700">{d}</span>
            ))}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 hover:-translate-y-1 transition-all duration-200 hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 border border-purple-500/30">
            <Database size={20} className="text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            스마트 DB 통합
          </span>
          <h3 className="text-sm font-bold text-zinc-100 mt-2.5 mb-1.5">기존 환자 DB, 바로 연동</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            엑셀·베가스 데이터를 AI가 컬럼을 분석해 자동 매칭합니다. 귀찮은 이관 없이 바로 시작.
          </p>
        </div>

        {/* Card 5 */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 hover:-translate-y-1 transition-all duration-200 hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 border border-purple-500/30">
            <BarChart3 size={20} className="text-purple-400" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            통합 통계
          </span>
          <h3 className="text-sm font-bold text-zinc-100 mt-2.5 mb-1.5">채널별 전환율 한눈에</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            채널별 전환율, 언어별 문의량, 월간 응대 시간 절감 비용을 실시간으로 확인합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Standard', price: '49만', unit: '/월', desc: '소규모 의원 최적화',
    features: ['대화 500건/월', '2개 채널 연동', '3개 언어 지원', 'D+7 애프터케어'],
    cta: '시작하기', highlight: false,
  },
  {
    name: 'Pro', price: '99만', unit: '/월', desc: '강남 프리미엄 의원',
    features: ['무제한 대화', '전 채널 연동', '6개 언어 지원', '칸반 환자 관리', '통합 환자 DB', '우선 지원'],
    cta: '무료 2주 체험', highlight: true,
  },
  {
    name: 'Enterprise', price: '문의', unit: '', desc: '멀티 지점 의원 그룹',
    features: ['Pro 전체 포함', '지점별 테넌트 분리', '전담 매니저', 'API 연동 지원'],
    cta: '도입 문의', highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-zinc-900/30 border-y border-zinc-800/60">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold mb-4 border border-purple-500/30">
            <Star size={12} fill="currentColor" /> 요금제
          </span>
          <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">
            코디네이터 1명 인건비보다 저렴합니다
          </h2>
          <p className="text-zinc-500 mt-3">월 350만원짜리 다국어 코디네이터, 이제 필요 없습니다.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div key={plan.name}
              className={`rounded-2xl p-7 transition-transform ${plan.highlight
                ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 ring-2 ring-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.3)] lg:scale-105'
                : 'bg-zinc-900 border border-zinc-800 hover:-translate-y-1'}`}
            >
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.highlight ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                {plan.name}
              </span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-zinc-100'}`}>{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? 'text-white/70' : 'text-zinc-500'}`}>{plan.unit}</span>
              </div>
              <p className={`text-xs mt-1 mb-6 ${plan.highlight ? 'text-white/70' : 'text-zinc-500'}`}>{plan.desc}</p>
              <ul className="space-y-2.5 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className={plan.highlight ? 'text-white/80' : 'text-purple-400'} strokeWidth={3} />
                    <span className={plan.highlight ? 'text-white/90' : 'text-zinc-300'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/login"
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${plan.highlight
                  ? 'bg-white text-purple-700 hover:bg-purple-50'
                  : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 shadow-[0_0_16px_rgba(168,85,247,0.3)]'}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-28">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium mb-7 border border-purple-500/30">
          <Globe size={14} />
          강남에서 세계로 — 언어 장벽 없는 의원을 만드세요
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-100 tracking-tight leading-tight mb-5">
          월 350만 원의 다국어<br />코디네이터 인건비,<br />
          <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            티키챗으로 0원에 수렴하세요.
          </span>
        </h2>
        <p className="text-zinc-400 text-base mb-10 leading-relaxed">
          지금 바로 티키챗을 도입하고,<br />글로벌 매출의 한계를 지워버리세요.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-base shadow-[0_0_32px_rgba(168,85,247,0.45)] hover:shadow-[0_0_44px_rgba(168,85,247,0.55)] transition-all"
          >
            지금 바로 시작하기 <ArrowRight size={16} />
          </Link>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-zinc-700 text-zinc-300 font-semibold text-base hover:bg-zinc-800 hover:border-zinc-600 transition-all"
          >
            로그인
          </Link>
        </div>
        <p className="text-xs text-zinc-700 mt-5">신용카드 불필요 · 2주 무료 체험 · 언제든 해지 가능</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-900/40 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center">
            <MessageSquare size={11} className="text-white" fill="white" />
          </div>
          <span className="text-sm font-bold text-zinc-400">TikiChat 티키챗</span>
          <span className="text-zinc-700 mx-2">|</span>
          <span className="text-xs text-zinc-600">사업자등록번호: 000-00-00000 | 서울특별시 강남구 테헤란로 123</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-600">
          <a href="#" className="hover:text-zinc-400 transition-colors">이용약관</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">문의하기</a>
          <span>© 2026 TikiChat. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

// ── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-400 text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            ✨ TikiChat 1.0 — 이제 외국인 환자 응대가 달라집니다
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            <span className="text-zinc-100">외국인 환자와의<br />완벽한 티키타카.</span>
            {' '}
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              티키챗
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
            영어, 일본어, 중국어부터 아랍어까지.<br />
            K-뷰티를 찾는 글로벌 환자들의 문의를 코디네이터 없이<br />
            AI로 막힘없이 받아치는 미용 의원 전용 상담 CRM.
          </p>

          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <Link to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-base shadow-[0_0_28px_rgba(168,85,247,0.45)] hover:shadow-[0_0_36px_rgba(168,85,247,0.55)] transition-all"
            >
              티키챗 무료 도입하기 <ArrowRight size={16} />
            </Link>
            <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-zinc-700 text-zinc-300 font-semibold text-base hover:bg-zinc-800 hover:border-zinc-600 transition-all">
              데모 영상 보기
            </button>
          </div>
          <p className="text-xs text-zinc-600">신용카드 불필요 · 2주 무료 체험 · 언제든 해지 가능</p>
        </div>

        <DashboardMockup />
      </section>

      <Marquee />
      <BentoFeatures />
      <Pricing />
      <CTASection />
      <Footer />
    </div>
  );
}
