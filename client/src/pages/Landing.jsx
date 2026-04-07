import { Link } from 'react-router-dom';
import {
  Languages, CalendarCheck, Sparkles, MessageSquare,
  BarChart3, ArrowRight, Check, Zap, Star, Globe
} from 'lucide-react';

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">BEAUCHAT</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#features" className="text-sm text-slate-500 hover:text-slate-800 transition-colors hidden md:block">기능</a>
          <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-800 transition-colors hidden md:block">요금제</a>
          <Link
            to="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            로그인
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
          >
            무료 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-4xl mx-auto mt-14">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/50 via-purple-50/30 to-transparent rounded-3xl blur-3xl -z-10 scale-95" />

      {/* Main window */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Window bar */}
        <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div className="flex-1 mx-6">
            <div className="h-3.5 bg-slate-200 rounded-full max-w-52 mx-auto" />
          </div>
        </div>

        {/* App layout preview */}
        <div className="flex h-72 text-[0px]">
          {/* Sidebar */}
          <div className="w-12 bg-slate-900 flex flex-col items-center pt-3 gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/80" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-slate-700' : ''}`}>
                <div className="w-3 h-3 rounded-sm bg-slate-600" />
              </div>
            ))}
          </div>

          {/* Chat list */}
          <div className="w-44 border-r border-slate-100 bg-white pt-2 px-2 space-y-1">
            {[
              { name: 'Yuki Tanaka 🇯🇵', sub: 'ボトックスの料金...', badge: 2, active: true },
              { name: 'Ahmed Al-Rashidi 🇸🇦', sub: 'أريد معرفة...', badge: 1, active: false },
              { name: 'Sarah Johnson 🇺🇸', sub: 'I saw your results...', badge: 0, active: false },
              { name: '李美玲 🇨🇳', sub: '请问激光美白...', badge: 3, active: false },
            ].map((c, i) => (
              <div key={i} className={`px-2 py-1.5 rounded-lg ${c.active ? 'bg-indigo-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-700 rounded-full" style={{ width: `${40 + i * 5}px` }} />
                  {c.badge > 0 && <div className="w-3 h-3 rounded-full bg-red-500" />}
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-1 w-3/4" />
              </div>
            ))}
          </div>

          {/* Chat window */}
          <div className="flex-1 bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="h-9 bg-white border-b border-slate-100 flex items-center px-3 gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-200" />
              <div className="h-2 bg-slate-300 rounded-full w-20" />
              <div className="ml-2 h-1.5 bg-indigo-200 rounded-full w-10" />
            </div>
            {/* Messages */}
            <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
              {/* Patient bubble */}
              <div className="flex gap-2 items-end">
                <div className="w-5 h-5 rounded-full bg-rose-200 shrink-0" />
                <div className="space-y-1">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm border border-slate-100">
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-200 rounded w-40" />
                      <div className="h-1.5 bg-slate-200 rounded w-28" />
                    </div>
                  </div>
                  {/* AI translation */}
                  <div className="bg-indigo-50 rounded-xl px-2.5 py-1.5 flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="h-1 bg-indigo-300 rounded w-8" />
                      <div className="h-1.5 bg-indigo-200 rounded w-32" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Staff reply */}
              <div className="flex gap-2 items-end justify-end">
                <div className="bg-indigo-600 rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                  <div className="space-y-1">
                    <div className="h-1.5 bg-indigo-400 rounded w-44" />
                    <div className="h-1.5 bg-indigo-400 rounded w-32" />
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shrink-0" />
              </div>
            </div>
            {/* AI suggestion card */}
            <div className="mx-3 mb-2 rounded-xl border border-indigo-200 bg-white p-2 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <div className="h-1.5 bg-indigo-400 rounded w-16" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-slate-200 rounded w-full" />
                <div className="h-1.5 bg-slate-200 rounded w-3/4" />
              </div>
              <div className="flex gap-1.5 mt-2">
                <div className="h-4 w-16 bg-slate-100 rounded-md" />
                <div className="h-4 w-24 bg-indigo-600 rounded-md" />
              </div>
            </div>
          </div>

          {/* Context panel */}
          <div className="w-44 border-l border-slate-100 bg-white p-2 space-y-2">
            {/* Profile */}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-rose-100" />
              <div>
                <div className="h-1.5 bg-slate-300 rounded w-16 mb-1" />
                <div className="h-1 bg-slate-200 rounded w-10" />
              </div>
            </div>
            {/* Tags */}
            <div className="flex gap-1">
              <div className="h-3 w-8 bg-amber-100 rounded-full" />
              <div className="h-3 w-12 bg-violet-100 rounded-full" />
            </div>
            {/* Timeline */}
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
    <div className="overflow-hidden py-10 border-y border-slate-100 bg-slate-50/50">
      <p className="text-center text-xs font-medium text-slate-400 tracking-widest uppercase mb-6">
        이미 트렌드를 아는 강남의 프리미엄 의원들이 BEAUCHAT과 함께합니다
      </p>
      <div className="flex gap-0 whitespace-nowrap animate-[marquee_20s_linear_infinite]">
        {[...CLINIC_LOGOS, ...CLINIC_LOGOS].map((name, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-8 text-slate-400 font-semibold text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bento Features ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Languages,
    title: '언어 장벽 제로',
    desc: '일본어, 중국어, 아랍어, 영어. 어떤 언어로 메시지가 와도 한국어로 즉시 번역하고, AI가 완성된 답변을 직원 언어로 다시 보내줍니다.',
    badge: '실시간 번역',
    badgeColor: 'bg-sky-100 text-sky-700',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    wide: true,
  },
  {
    icon: Sparkles,
    title: 'AI 챗-투-차트',
    desc: '대화에서 환자 차트가 자동 완성됩니다.',
    badge: 'AI 자동화',
    badgeColor: 'bg-violet-100 text-violet-700',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    wide: false,
  },
  {
    icon: CalendarCheck,
    title: '매출 부스팅 애프터케어',
    desc: 'D+1, D+3, D+7. 시술 후 딱 맞는 타이밍에 환자 언어로 케어 메시지가 자동 발송됩니다. 재방문율을 최대 40% 높입니다.',
    badge: '자동 발송',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    wide: false,
  },
  {
    icon: BarChart3,
    title: '통합 성과 대시보드',
    desc: '채널별 전환율, 언어별 문의량, 월간 응대 시간 절감 비용을 한눈에 확인합니다.',
    badge: '실시간 통계',
    badgeColor: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    wide: false,
  },
  {
    icon: MessageSquare,
    title: '카톡 · 인스타 · WhatsApp 통합',
    desc: '모든 채널의 외국인 문의가 단 하나의 대시보드에 모입니다.',
    badge: '멀티채널',
    badgeColor: 'bg-pink-100 text-pink-700',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    wide: false,
  },
];

function BentoFeatures() {
  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-24">
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold mb-4">
          <Sparkles size={12} fill="currentColor" /> 핵심 기능
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          코디네이터 없이 가능한 일들
        </h2>
        <p className="text-slate-500 mt-3 text-base">월 350만원의 다국어 코디네이터를 AI로 대체하세요.</p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-3 auto-rows-auto gap-4">
        {/* Card 1 — wide (spans 2 cols) */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-7 hover:-translate-y-1 transition-transform duration-200 shadow-sm hover:shadow-md group">
          <div className={`w-11 h-11 ${FEATURES[0].iconBg} rounded-xl flex items-center justify-center mb-4`}>
            <Languages size={22} className={FEATURES[0].iconColor} />
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${FEATURES[0].badgeColor}`}>
            {FEATURES[0].badge}
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-2 mb-2">{FEATURES[0].title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{FEATURES[0].desc}</p>

          {/* Language pill demo */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {['🇯🇵 日本語', '🇨🇳 中文', '🇸🇦 عربي', '🇺🇸 English', '🇰🇷 한국어'].map(l => (
              <span key={l} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">{l}</span>
            ))}
          </div>
        </div>

        {/* Card 2 — tall */}
        <div className="row-span-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl border border-violet-500 p-7 text-white hover:-translate-y-1 transition-transform duration-200 shadow-sm hover:shadow-lg">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Sparkles size={22} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
            {FEATURES[1].badge}
          </span>
          <h3 className="text-lg font-bold mt-2 mb-2">{FEATURES[1].title}</h3>
          <p className="text-sm text-white/80 leading-relaxed">{FEATURES[1].desc}</p>

          {/* Demo chart */}
          <div className="mt-6 space-y-2">
            {['환자명', '시술', '방문 횟수', '마지막 문의'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-white/60 w-16">{label}</span>
                <div className="h-2 rounded-full bg-white/30 flex-1" style={{ width: `${60 + i * 10}%` }} />
              </div>
            ))}
          </div>

          <div className="mt-5 text-xs text-white/70 leading-relaxed">
            대화가 끝나면 환자 카드에 자동으로 기록됩니다.
          </div>
        </div>

        {/* Cards 3-5 — each 1 col */}
        {FEATURES.slice(2).map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 hover:-translate-y-1 transition-transform duration-200 shadow-sm hover:shadow-md">
              <div className={`w-10 h-10 ${f.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={f.iconColor} />
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${f.badgeColor}`}>{f.badge}</span>
              <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Standard',
    price: '49만',
    unit: '/월',
    desc: '소규모 의원 최적화',
    features: ['대화 500건/월', '2개 채널 연동', '3개 언어 지원', 'D+7 애프터케어'],
    cta: '시작하기',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '99만',
    unit: '/월',
    desc: '강남 프리미엄 의원',
    features: ['무제한 대화', '전 채널 연동', '6개 언어 지원', '칸반 환자 관리', '통계 대시보드', '우선 지원'],
    cta: '무료 2주 체험',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '문의',
    unit: '',
    desc: '멀티 지점 의원 그룹',
    features: ['Pro 전체 포함', '지점별 테넌트 분리', '전담 매니저', 'API 연동 지원'],
    cta: '도입 문의',
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold mb-4">
            <Star size={12} fill="currentColor" /> 요금제
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            코디네이터 1명 인건비보다 저렴합니다
          </h2>
          <p className="text-slate-500 mt-3">월 350만원짜리 다국어 코디네이터, 이제 필요 없습니다.</p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 ${plan.highlight
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-xl scale-105'
                : 'bg-white border border-slate-200 shadow-sm'}`}
            >
              <div className="mb-6">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.highlight ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {plan.name}
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{plan.unit}</span>
                </div>
                <p className={`text-xs mt-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.desc}</p>
              </div>
              <ul className="space-y-2.5 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className={plan.highlight ? 'text-indigo-300' : 'text-emerald-500'} strokeWidth={3} />
                    <span className={plan.highlight ? 'text-indigo-100' : 'text-slate-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${plan.highlight
                  ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-md'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
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
    <section className="py-28 bg-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-7">
          <Globe size={14} />
          강남에서 세계로 — 언어 장벽 없는 의원을 만드세요
        </div>
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
          월 350만 원의 다국어<br />코디네이터 인건비,<br />
          <span className="text-indigo-600">BEAUCHAT으로 세이브하세요.</span>
        </h2>
        <p className="text-slate-500 text-base mb-10 leading-relaxed">
          지금 당장 도입 문의를 남기시면 2주 무료 체험과 함께<br />
          전담 온보딩 매니저가 세팅을 도와드립니다.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all"
          >
            지금 도입 문의하기 <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-all"
          >
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
            <Zap size={10} className="text-white" fill="white" />
          </div>
          <span className="text-sm font-bold text-slate-700">BEAUCHAT</span>
          <span className="text-slate-300 mx-2">|</span>
          <span className="text-xs text-slate-400">사업자등록번호: 000-00-00000 | 서울특별시 강남구 테헤란로 123</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-400">
          <a href="#" className="hover:text-slate-600 transition-colors">이용약관</a>
          <a href="#" className="hover:text-slate-600 transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-slate-600 transition-colors">문의하기</a>
          <span>© 2026 BEAUCHAT. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

// ── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            ✨ BEAUCHAT 1.0 — 이제 외국인 환자 응대가 달라집니다
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            외국인 환자 응대,<br />
            <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              이제 AI에게 맡기세요.
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            카톡부터 WhatsApp까지. 다국어 상담, 예약, 사후관리를<br />
            하나의 대시보드에서 완벽하게 자동화하는 미용 의원 전용 AI CRM.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg hover:shadow-indigo-200 hover:shadow-xl transition-all"
            >
              무료 데모 시작하기 <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              로그인
            </Link>
          </div>
          <p className="text-xs text-slate-400">신용카드 불필요 · 2주 무료 체험 · 언제든 해지 가능</p>
        </div>

        {/* Dashboard mockup */}
        <DashboardMockup />
      </section>

      {/* Marquee */}
      <Marquee />

      {/* Bento features */}
      <BentoFeatures />

      {/* Pricing */}
      <Pricing />

      {/* CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
