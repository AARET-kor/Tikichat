import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Languages, CalendarCheck, Sparkles, MessageSquare,
  BarChart3, ArrowRight, Check, Star, Globe, Database, Menu, X,
  Zap, Shield, Clock, TrendingUp, Users, FileText, Stethoscope, ChevronRight
} from 'lucide-react';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const F = {
  sans: "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif",
};

const C = {
  bg:       '#ffffff',
  bgSub:    '#fafafa',
  bgDark:   '#09090b',
  text:     '#09090b',
  textSub:  '#71717a',
  textMt:   '#a1a1aa',
  border:   '#e4e4e7',
  borderMd: '#d4d4d8',
  black:    '#18181b',
  white:    '#ffffff',
  accent:   '#6366f1',   // indigo accent for highlights
  accentBg: '#eef2ff',
};

// ── Global CSS (keyframes) ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-10px); }
  }
  @keyframes rotateCylinder {
    from { transform: rotateY(0deg); }
    to   { transform: rotateY(-360deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: ${F.sans}; background: ${C.bg}; color: ${C.text}; }
  a { text-decoration: none; color: inherit; }
  ::selection { background: #18181b20; }
`;

// ── Cylinder cards data ───────────────────────────────────────────────────────
const CYLINDER_CARDS = [
  { lang: 'KO', flag: '🇰🇷', text: '리프팅 시술 후 부작용은\n없나요?',       reply: '24시간 이내 자연스럽게 가라앉습니다.' },
  { lang: 'CN', flag: '🇨🇳', text: '这个手术恢复期多久？',                     reply: '术后约3-5天即可恢复正常活动。' },
  { lang: 'EN', flag: '🇺🇸', text: 'Is the filler\nprocedure painful?',       reply: 'Topical anesthesia is applied for comfort.' },
  { lang: 'JP', flag: '🇯🇵', text: 'ボトックスの\n効果はいつから？',            reply: '施術後3〜7日で効果が現れます。' },
  { lang: 'TH', flag: '🇹🇭', text: 'ราคาครีมกันแดด\nเท่าไหร่คะ?',             reply: 'ราคาเริ่มต้น 45,000 วอน ค่ะ' },
  { lang: 'VN', flag: '🇻🇳', text: 'Giá tiêm filler\nbao nhiêu?',              reply: 'Giá từ 200.000 won tùy vùng tiêm.' },
  { lang: 'RU', flag: '🇷🇺', text: 'Как долго держится\nэффект ботокса?',      reply: 'Эффект сохраняется от 4 до 6 месяцев.' },
  { lang: 'AR', flag: '🇸🇦', text: 'هل عملية الليزر\nمؤلمة؟',                  reply: 'نستخدم تخدير موضعي لراحتك الكاملة.' },
];

// ── 3D Cylinder Component ─────────────────────────────────────────────────────
function Cylinder3D() {
  const total = CYLINDER_CARDS.length;
  const radius = 230;
  const angleStep = 360 / total;

  return (
    <div style={{ perspective: '1100px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Aurora core glow */}
      <div style={{
        position: 'absolute',
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)',
        animation: 'pulseGlow 3s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        width: 600,
        height: 440,
        transformStyle: 'preserve-3d',
        animation: 'rotateCylinder 28s linear infinite',
      }}>
        {CYLINDER_CARDS.map((card, i) => {
          const angle = angleStep * i;
          return (
            <div
              key={i}
              style={{
                position:  'absolute',
                top:       '50%',
                left:      '50%',
                width:     200,
                marginLeft: -100,
                marginTop:  -80,
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '16px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{card.flag}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{card.lang}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, whiteSpace: 'pre-line', marginBottom: 10 }}>
                {card.text}
              </p>
              <div style={{
                padding: '8px 10px',
                background: 'rgba(99,102,241,0.18)',
                borderRadius: 8,
                borderLeft: '2px solid rgba(99,102,241,0.6)',
              }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{card.reply}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0)',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'all 0.2s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: C.black,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={14} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>TikiDoc</span>
          </div>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['기능', '사용 방법', '요금제'].map(item => (
              <a key={item} href={`#${item}`} style={{ fontSize: 14, fontWeight: 500, color: C.textSub, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = C.text}
                onMouseLeave={e => e.target.style.color = C.textSub}
              >{item}</a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/login" style={{ fontSize: 13, fontWeight: 500, color: C.textSub, padding: '7px 14px' }}>로그인</Link>
            <Link to="/signup" style={{
              fontSize: 13, fontWeight: 600, color: C.white,
              background: C.black, padding: '8px 18px', borderRadius: 8,
              transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >무료로 시작하기 →</Link>
          </div>
        </div>
      </header>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      paddingTop: 140,
      paddingBottom: 100,
      background: C.bg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot grid bg */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
        opacity: 0.55,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px',
            background: C.bgSub,
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            fontSize: 12, fontWeight: 500, color: C.textSub,
            animation: 'fadeUp 0.5s ease both',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            AI 다국어 상담 솔루션 — 8개 언어 지원
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          textAlign: 'center',
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.08,
          color: C.text,
          marginBottom: 24,
          animation: 'fadeUp 0.6s 0.1s ease both',
          fontFamily: F.sans,
        }}>
          외국인 환자 상담,<br />
          <span style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>AI가 즉시 답변합니다</span>
        </h1>

        {/* Sub */}
        <p style={{
          textAlign: 'center',
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: C.textSub,
          lineHeight: 1.65,
          maxWidth: 580,
          margin: '0 auto 40px',
          animation: 'fadeUp 0.6s 0.2s ease both',
          fontFamily: F.sans,
        }}>
          환자 메시지를 붙여넣으면 한·중·영·일 완벽한 상담 답변 3종을 자동 생성합니다.
          병원 시술 DB를 학습한 AI가 정확한 정보만 제공합니다.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.6s 0.3s ease both', marginBottom: 64 }}>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.black, color: C.white,
            padding: '14px 28px', borderRadius: 10,
            fontSize: 15, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)'; }}
          >
            무료로 시작하기 <ArrowRight size={16} />
          </Link>
          <a href="#기능" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.bg, color: C.text,
            padding: '14px 28px', borderRadius: 10,
            fontSize: 15, fontWeight: 600,
            border: `1px solid ${C.borderMd}`,
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.bgSub}
            onMouseLeave={e => e.currentTarget.style.background = C.bg}
          >
            데모 보기
          </a>
        </div>

        {/* Floating UI mockup */}
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', animation: 'fadeUp 0.7s 0.4s ease both' }}>
          {/* Main card */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            boxShadow: '0 24px 80px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{ height: 6, width: 180, borderRadius: 4, background: C.border }} />
              </div>
            </div>
            {/* Card body */}
            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Input */}
              <div style={{ gridColumn: '1/-1', background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textMt, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>환자 메시지</p>
                <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>这个手术恢复期多久？有没有副作用？价格大概是多少？</p>
              </div>
              {/* Reply cards */}
              {[
                { label: '공감형', color: '#6366f1', text: '소중한 문의 감사드립니다. 해당 시술은 일반적으로 3~5일 내 회복되며 부작용은 경미합니다...' },
                { label: '정보형', color: '#0ea5e9', text: '시술 회복기간: 3~5일. 주요 부작용: 붓기, 멍 (7일 내 소실). 비용: 상담 후 개인별 맞춤 안내...' },
              ].map(r => (
                <div key={r.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating stat badges */}
          <div style={{ position: 'absolute', top: -16, right: -24, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', animation: 'floatY 4s ease-in-out infinite' }}>
            <p style={{ fontSize: 11, color: C.textMt, marginBottom: 2 }}>평균 응답 시간</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>1.8<span style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>초</span></p>
          </div>
          <div style={{ position: 'absolute', bottom: -16, left: -24, background: C.black, border: `1px solid #27272a`, borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.24)', animation: 'floatY 5s 1.5s ease-in-out infinite' }}>
            <p style={{ fontSize: 11, color: '#71717a', marginBottom: 2 }}>지원 언어</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>8<span style={{ fontSize: 13, fontWeight: 500, color: '#71717a' }}>개국</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Social Proof Bar ──────────────────────────────────────────────────────────
function SocialProof() {
  const logos = ['강남 오라클피부과', 'VIP클리닉', '청담이노의원', '루시아의원', '도시미의원', '압구정 리봄피부과'];
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '18px 0', background: C.bgSub }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: C.textMt, whiteSpace: 'nowrap', flexShrink: 0 }}>신뢰하는 클리닉</span>
          {logos.map(name => (
            <span key={name} style={{ fontSize: 13, fontWeight: 600, color: C.textSub, whiteSpace: 'nowrap', opacity: 0.7 }}>{name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Languages,     badge: 'Core',       badgeColor: '#18181b', label: '8개국어 즉시 번역',        desc: '한·중·일·영·태·베·러·아랍어 실시간 번역 및 문화권별 톤 자동 최적화.' },
  { icon: Sparkles,      badge: 'AI',         badgeColor: '#6366f1', label: 'AI 답변 3종 자동 생성',    desc: '공감형·정보형·세일즈형 답변을 동시에 생성. 상황에 맞게 즉시 선택 가능.' },
  { icon: Database,      badge: 'RAG',        badgeColor: '#0ea5e9', label: '병원 시술 DB 학습',         desc: 'Retrieval-Augmented Generation으로 병원 고유 시술 정보 기반 정확한 답변.' },
  { icon: Stethoscope,   badge: 'Core',       badgeColor: '#18181b', label: '시술별 FAQ 자동 학습',      desc: '시술 정보·가격·다운타임·부작용을 벡터DB에 저장해 실시간 참조.' },
  { icon: Globe,         badge: 'Pro',        badgeColor: '#f59e0b', label: '크롬 익스텐션 원클릭',      desc: 'SNS·카카오·위챗·라인 메신저 위에서 바로 동작. 앱 전환 없이 즉시 사용.' },
  { icon: BarChart3,     badge: 'Pro',        badgeColor: '#f59e0b', label: '상담 통계 대시보드',        desc: '언어별 유입 현황, 시술 관심도, 전환율 분석을 한눈에 파악.' },
  { icon: Shield,        badge: 'Enterprise', badgeColor: '#8b5cf6', label: '의료 데이터 보안',           desc: 'HIPAA 준수 암호화 저장, 직원 역할별 접근 제어, 감사 로그 자동 기록.' },
  { icon: TrendingUp,    badge: 'Enterprise', badgeColor: '#8b5cf6', label: '다원화 병원 관리',           desc: '여러 지점을 하나의 플랫폼에서 관리. 지점별 시술 DB·직원 설정 독립 운영.' },
];

function Features() {
  return (
    <section id="기능" style={{ padding: '100px 0', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.textMt, textTransform: 'uppercase', marginBottom: 12 }}>FEATURES</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.035em', color: C.text, lineHeight: 1.15, fontFamily: F.sans }}>
            병원 상담의 모든 것을<br />하나의 AI로
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '24px 22px',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.borderMd;
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.07)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.bgSub, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon size={17} color={C.text} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: f.badgeColor, background: f.badgeColor === '#18181b' ? '#f4f4f5' : `${f.badgeColor}14`, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>
                  {f.badge}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{f.label}</p>
              <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 3D Rotor Section ──────────────────────────────────────────────────────────
function RotorSection() {
  return (
    <section style={{
      background: C.bgDark,
      padding: '110px 0',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

          {/* Left copy */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 16 }}>MULTILINGUAL AI</p>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.035em', color: '#fff', lineHeight: 1.15, marginBottom: 20, fontFamily: F.sans }}>
              8개 언어,<br />하나의 AI 상담 실장
            </h2>
            <p style={{ fontSize: 15, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 36 }}>
              중국어 환자, 영어 환자, 일본어 환자 — 누가 와도 막히지 않습니다.
              TikiDoc AI가 문화권에 맞는 어조와 표현으로 즉시 답변합니다.
            </p>
            {[
              { num: '94%', label: '고객 만족도' },
              { num: '1.8초', label: '평균 답변 생성 시간' },
              { num: '8개', label: '지원 언어' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>{s.num}</span>
                <span style={{ fontSize: 14, color: '#71717a' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Right: 3D cylinder */}
          <div style={{ position: 'relative', height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cylinder3D />
          </div>

        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: FileText, label: '메시지 붙여넣기', desc: '환자가 보낸 외국어 메시지를 TikiDoc에 붙여넣습니다. SNS, 카카오, 위챗 어디서든 OK.' },
    { num: '02', icon: Sparkles, label: 'AI가 즉시 분석', desc: '병원 시술 DB + RAG 지식으로 정확한 맥락을 파악해 최적 답변 3종을 1.8초 만에 생성합니다.' },
    { num: '03', icon: MessageSquare, label: '원하는 답변 전송', desc: '공감형·정보형·세일즈형 중 상황에 맞는 답변을 클릭 한 번으로 환자에게 전송합니다.' },
  ];
  return (
    <section id="사용 방법" style={{ padding: '100px 0', background: C.bgSub }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.textMt, textTransform: 'uppercase', marginBottom: 12 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.035em', color: C.text, lineHeight: 1.15, fontFamily: F.sans }}>
            3단계로 끝나는 AI 상담
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 28, left: '75%', width: '50%', height: 1, background: `linear-gradient(to right, ${C.borderMd}, transparent)`, zIndex: 0 }} />
              )}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '28px 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.textMt, letterSpacing: '0.06em' }}>{step.num}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <step.icon size={16} color="#fff" strokeWidth={2} />
                  </div>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10, letterSpacing: '-0.02em' }}>{step.label}</p>
                <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    tier:      'Starter',
    tagline:   '외국인 상담을 처음 시작하는 클리닉',
    price:     '790,000',
    highlight: false,
    cta:       '1개월 무료로 시작',
    accentColor: '#18181b',
    groups: [
      {
        label: 'AI 상담',
        items: [
          '월 300회 AI 답변 생성',
          '3개국어 지원 (한·중·영)',
          '크롬 익스텐션 포함',
          '답변 3종 자동 생성 (공감·정보·세일즈)',
        ],
      },
      {
        label: '병원 설정',
        items: [
          '시술 정보 20개 등록',
          '직원 계정 3명',
          '기본 월간 리포트',
        ],
      },
      {
        label: '지원',
        items: [
          '이메일 지원 (72시간 내)',
          '온보딩 가이드 제공',
        ],
      },
    ],
  },
  {
    tier:      'Pro',
    tagline:   '외국인 환자 비중이 높은 성장 클리닉',
    price:     '1,290,000',
    highlight: true,
    badge:     '가장 인기',
    cta:       '1개월 무료로 시작',
    accentColor: '#6366f1',
    groups: [
      {
        label: 'AI 상담',
        items: [
          '무제한 AI 답변 생성',
          '8개국어 완전 지원 (한·중·일·영·태·베·러·아랍)',
          '크롬 익스텐션 포함',
          '답변 3종 + 문화권별 톤 최적화',
          'RAG 지식베이스 — 병원 맞춤 학습',
          'Visual Sales Mapping (시술 추천·견적)',
        ],
      },
      {
        label: '병원 설정',
        items: [
          '시술 정보 무제한 등록',
          '시술별 FAQ·부작용·가격 AI 자동 학습',
          '직원 계정 10명',
          '역할별 접근 제어 (원장·관리자·직원)',
        ],
      },
      {
        label: '분석 & 인사이트',
        items: [
          '실시간 통계 대시보드',
          '언어별 유입·전환율 분석',
          '시술 관심도 트렌드 리포트',
        ],
      },
      {
        label: '지원',
        items: [
          '카카오톡 전담 지원 (24시간 내)',
          '맞춤 온보딩 세션 1회',
        ],
      },
    ],
  },
  {
    tier:      'Clinic+',
    tagline:   '다지점·체인 클리닉을 위한 엔터프라이즈',
    price:     '1,990,000',
    highlight: false,
    cta:       '1개월 무료로 시작',
    accentColor: '#8b5cf6',
    groups: [
      {
        label: 'Pro 전체 포함',
        items: [
          'Pro 플랜 모든 기능 포함',
          '지점 수 무제한 통합 관리',
          '지점별 독립 시술 DB·직원 설정',
        ],
      },
      {
        label: '전용 AI',
        items: [
          '클리닉 전용 AI 파인튜닝',
          '병원 브랜드 보이스 학습',
          '경쟁사 비교 차단 로직 탑재',
        ],
      },
      {
        label: '연동 & 보안',
        items: [
          'REST API 제공 (CRM·EMR 연동)',
          'HIPAA 준수 암호화 저장',
          '감사 로그 자동 기록',
          '전용 서버 격리 옵션',
        ],
      },
      {
        label: '지원',
        items: [
          '전담 CSM (Customer Success Manager)',
          '맞춤 온보딩 4회 + 직원 교육',
          '99.9% SLA 보장',
          '분기별 성과 리뷰 세션',
        ],
      },
    ],
  },
];

function PlanCard({ plan }) {
  const dark = plan.highlight;
  const bg        = dark ? C.black       : C.bg;
  const border    = dark ? C.black       : C.border;
  const textMain  = dark ? '#ffffff'     : C.text;
  const textSub2  = dark ? '#a1a1aa'     : C.textSub;
  const textItem  = dark ? '#d4d4d8'     : C.textSub;
  const divColor  = dark ? 'rgba(255,255,255,0.07)' : C.border;
  const checkClr  = plan.accentColor;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 20,
      padding: '32px 28px',
      position: 'relative',
      boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.28)' : '0 2px 12px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Popular badge */}
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: plan.accentColor, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 999,
          whiteSpace: 'nowrap', letterSpacing: '0.04em',
          boxShadow: `0 4px 12px ${plan.accentColor}55`,
        }}>
          {plan.badge}
        </div>
      )}

      {/* Accent line */}
      <div style={{ height: 3, borderRadius: 2, background: plan.accentColor, marginBottom: 24, width: 40 }} />

      {/* Header */}
      <p style={{ fontSize: 11, fontWeight: 700, color: plan.accentColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        {plan.tier}
      </p>
      <p style={{ fontSize: 13, color: textSub2, lineHeight: 1.5, marginBottom: 20 }}>{plan.tagline}</p>

      {/* Price */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 13, color: textSub2, marginRight: 2 }}>₩</span>
          <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', color: textMain, lineHeight: 1 }}>{plan.price}</span>
          <span style={{ fontSize: 13, color: textSub2 }}>/월</span>
        </div>
        <p style={{ fontSize: 11, color: plan.accentColor, fontWeight: 600, marginTop: 6 }}>
          ✦ 첫 1개월 무료 체험
        </p>
      </div>

      {/* CTA */}
      <Link to="/signup" style={{
        display: 'block', textAlign: 'center',
        padding: '12px 0', borderRadius: 10, marginBottom: 28, marginTop: 8,
        fontSize: 14, fontWeight: 700,
        background: dark ? '#ffffff' : C.black,
        color: dark ? C.black : '#ffffff',
        border: 'none',
        boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.14)',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {plan.cta}
      </Link>

      {/* Feature groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        {plan.groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: 1, background: divColor, marginBottom: 16 }} />}
            <p style={{ fontSize: 10, fontWeight: 700, color: plan.accentColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              {group.label}
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map((item, ii) => (
                <li key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: textItem, lineHeight: 1.5 }}>
                  <Check size={13} color={checkClr} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <section id="요금제" style={{ padding: '100px 0', background: C.bgSub }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 28px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.textMt, textTransform: 'uppercase', marginBottom: 12 }}>PRICING</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.035em', color: C.text, lineHeight: 1.15, fontFamily: F.sans, marginBottom: 16 }}>
            명확한 요금, 숨겨진 비용 없음
          </h2>
          <p style={{ fontSize: 15, color: C.textSub, maxWidth: 480, margin: '0 auto 20px' }}>
            모든 플랜은 <strong style={{ color: C.text }}>첫 1개월 무료</strong>로 시작합니다. 신용카드 불필요.
          </p>
        </div>

        {/* Free trial banner */}
        <div style={{
          maxWidth: 560, margin: '0 auto 52px',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={15} color="#16a34a" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 13, color: '#15803d', lineHeight: 1.55 }}>
            <strong>카드 없이, 약정 없이</strong> — 1개월 동안 해당 플랜의 모든 기능을 완전히 무료로 사용할 수 있습니다. 만족하지 않으면 언제든 해지하세요.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, alignItems: 'start' }}>
          {PLANS.map(plan => <PlanCard key={plan.tier} plan={plan} />)}
        </div>

        {/* Bottom note */}
        <p style={{ textAlign: 'center', fontSize: 12, color: C.textMt, marginTop: 36 }}>
          부가세(VAT) 별도 · 연간 결제 시 2개월 추가 무료 · 플랜 업그레이드 언제든 가능
        </p>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding: '80px 28px', background: C.bgSub, borderTop: `1px solid ${C.border}` }}>
      <div style={{
        maxWidth: 680, margin: '0 auto', textAlign: 'center',
        background: C.black, borderRadius: 24,
        padding: '60px 40px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.16)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* glow */}
        <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: 12, fontFamily: F.sans, position: 'relative' }}>
          외국인 상담, 더 이상 두렵지 않게
        </h2>
        <p style={{ fontSize: 15, color: '#71717a', lineHeight: 1.65, marginBottom: 32, position: 'relative' }}>
          지금 바로 무료로 시작하세요. 신용카드 없이 5분 만에 셋업 완료.
        </p>
        <Link to="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#fff', color: C.black,
          padding: '14px 28px', borderRadius: 10,
          fontSize: 15, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          position: 'relative',
          transition: 'transform 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          무료로 시작하기 <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 28px', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={11} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>TikiDoc</span>
          <span style={{ fontSize: 12, color: C.textMt }}>— AI 다국어 상담 솔루션</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['개인정보처리방침', '이용약관', '문의하기'].map(item => (
            <a key={item} href="#" style={{ fontSize: 12, color: C.textMt, transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.textMt}
            >{item}</a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.textMt }}>© 2025 TikiDoc. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <>
      <Nav />
      <Hero />
      <SocialProof />
      <Features />
      <RotorSection />
      <HowItWorks />
      <Pricing />
      <CTABanner />
      <Footer />
    </>
  );
}
