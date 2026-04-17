import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Languages, Sparkles, MessageSquare,
  BarChart3, ArrowRight, Check, Globe, Database,
  Shield, TrendingUp, FileText, Stethoscope
} from 'lucide-react';

const F = { sans: "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif" };

const M = {
  mocha:     '#A47764',
  mochaDk:   '#7A5545',
  mochaLt:   '#C4A090',
  mochaPale: '#F5EDE8',
  bg:        '#FAF6F3',
  bgSub:     '#EFE5DE',
  bgDark:    '#0E0704',
  text:      '#1C0F0A',
  textSub:   '#6B4A3A',
  textMt:    '#B09080',
  sage:      '#5A8F80',
  sageLt:    '#9FC5BD',
  sagePale:  '#E4F2EF',
  gold:      '#D09262',
  border:    '#E5CFC5',
  borderMd:  '#CCADA0',
  white:     '#FFFFFF',
};

// ── Scroll Reveal Hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const GLOBAL_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(36px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-14px); }
  }
  @keyframes rotateCylinder {
    from { transform: rotateY(0deg); }
    to   { transform: rotateY(-360deg); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%       { opacity: 0.9; transform: scale(1.14); }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: ${F.sans}; background: ${M.bg}; color: ${M.text}; }
  a { text-decoration: none; color: inherit; }
  ::selection { background: ${M.mocha}30; }
`;

// ── Cylinder cards ────────────────────────────────────────────────────────────
const CYLINDER_CARDS = [
  { lang: 'KO', flag: '🇰🇷', text: '리프팅 시술 후\n부작용은 없나요?',    reply: '24시간 이내 자연스럽게 가라앉습니다.' },
  { lang: 'CN', flag: '🇨🇳', text: '这个手术\n恢复期多久？',               reply: '术后约3-5天即可恢复正常活动。' },
  { lang: 'EN', flag: '🇺🇸', text: 'Is the filler\nprocedure painful?', reply: 'Topical anesthesia is applied for comfort.' },
  { lang: 'JP', flag: '🇯🇵', text: 'ボトックスの\n効果はいつから？',        reply: '施術後3〜7日で効果が現れます。' },
  { lang: 'TH', flag: '🇹🇭', text: 'ราคาครีมกันแดด\nเท่าไหร่คะ?',        reply: 'ราคาเริ่มต้น 45,000 วอน ค่ะ' },
  { lang: 'VN', flag: '🇻🇳', text: 'Giá tiêm filler\nbao nhiêu?',        reply: 'Giá từ 200.000 won tùy vùng tiêm.' },
  { lang: 'RU', flag: '🇷🇺', text: 'Как долго держится\nэффект ботокса?', reply: 'Эффект сохраняется 4–6 месяцев.' },
  { lang: 'AR', flag: '🇸🇦', text: 'هل عملية\nالليزر مؤلمة؟',             reply: 'نستخدم تخديراً موضعياً لراحتك.' },
];

function Cylinder3D() {
  const total = CYLINDER_CARDS.length;
  const radius = 230;
  const angleStep = 360 / total;
  return (
    <div style={{ perspective: '1100px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        position: 'absolute', width: 340, height: 340, borderRadius: '50%',
        background: `radial-gradient(circle, ${M.mocha}45 0%, ${M.mocha}15 50%, transparent 70%)`,
        animation: 'pulseGlow 3.5s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'relative', width: 600, height: 440,
        transformStyle: 'preserve-3d',
        animation: 'rotateCylinder 28s linear infinite',
      }}>
        {CYLINDER_CARDS.map((card, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 200, marginLeft: -100, marginTop: -80,
            transform: `rotateY(${angleStep * i}deg) translateZ(${radius}px)`,
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '16px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{card.flag}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{card.lang}</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, whiteSpace: 'pre-line', marginBottom: 10 }}>{card.text}</p>
            <div style={{ padding: '8px 10px', background: `${M.mocha}28`, borderRadius: 8, borderLeft: `2px solid ${M.mocha}80` }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{card.reply}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? `${M.bg}ee` : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${M.border}` : '1px solid transparent',
        transition: 'all 0.25s ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: M.mocha,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px ${M.mocha}55`,
            }}>
              <MessageSquare size={16} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em', color: M.text }}>TikiDoc</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {['기능', '사용 방법', '요금제'].map(item => (
              <a key={item} href={`#${item}`}
                style={{ fontSize: 15, fontWeight: 500, color: M.textSub, transition: 'color 0.15s', letterSpacing: '-0.01em' }}
                onMouseEnter={e => e.target.style.color = M.mocha}
                onMouseLeave={e => e.target.style.color = M.textSub}
              >{item}</a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: M.textSub, padding: '9px 18px', letterSpacing: '-0.01em' }}>로그인</Link>
            <Link to="/signup" style={{
              fontSize: 14, fontWeight: 700, color: M.white,
              background: M.mocha, padding: '10px 22px', borderRadius: 10,
              letterSpacing: '-0.01em',
              boxShadow: `0 4px 16px ${M.mocha}45`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${M.mocha}55`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${M.mocha}45`; }}
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
    <section style={{ paddingTop: 168, paddingBottom: 128, background: M.bg, position: 'relative', overflow: 'hidden' }}>
      {/* Warm gradient blobs */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 65% 55% at 70% 20%, ${M.mochaPale} 0%, transparent 65%),
          radial-gradient(ellipse 45% 50% at 15% 80%, ${M.sagePale} 0%, transparent 55%)`,
      }} />
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle, ${M.border} 1.5px, transparent 1.5px)`,
        backgroundSize: '34px 34px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 35%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 35%, transparent 100%)',
        opacity: 0.5,
      }} />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36, animation: 'fadeUp 0.5s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 20px', background: M.white,
            border: `1px solid ${M.border}`, borderRadius: 999,
            fontSize: 13, fontWeight: 600, color: M.textSub,
            boxShadow: `0 2px 16px ${M.mocha}18`,
            letterSpacing: '-0.01em',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: M.mocha, display: 'inline-block', boxShadow: `0 0 10px ${M.mocha}` }} />
            AI 다국어 상담 솔루션 — 8개 언어 지원
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          textAlign: 'center',
          fontSize: 'clamp(54px, 8.5vw, 104px)',
          fontWeight: 900,
          letterSpacing: '-0.055em',
          lineHeight: 1.0,
          color: M.text,
          marginBottom: 30,
          animation: 'fadeUp 0.6s 0.1s ease both',
          fontFamily: F.sans,
          wordBreak: 'keep-all',
        }}>
          외국인 환자 상담,<br />
          <span style={{
            background: `linear-gradient(135deg, ${M.mocha} 0%, ${M.gold} 55%, ${M.mochaLt} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>AI가 즉시 답변합니다</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          textAlign: 'center',
          fontSize: 'clamp(17px, 2.2vw, 22px)',
          color: M.textSub,
          lineHeight: 1.7,
          maxWidth: 620,
          margin: '0 auto 52px',
          animation: 'fadeUp 0.6s 0.2s ease both',
          letterSpacing: '-0.015em',
          wordBreak: 'keep-all',
        }}>
          환자 메시지를 붙여넣으면 한·중·영·일 완벽한 상담 답변 3종을 자동 생성합니다.
          병원 시술 DB를 학습한 AI가 정확한 정보만 제공합니다.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.6s 0.3s ease both', marginBottom: 80 }}>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: M.mocha, color: M.white,
            padding: '17px 34px', borderRadius: 13,
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em',
            boxShadow: `0 6px 28px ${M.mocha}50`,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 40px ${M.mocha}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 28px ${M.mocha}50`; }}
          >
            무료로 시작하기 <ArrowRight size={19} />
          </Link>
          <a href="#기능" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: M.white, color: M.text,
            padding: '17px 34px', borderRadius: 13,
            fontSize: 17, fontWeight: 600, letterSpacing: '-0.025em',
            border: `1.5px solid ${M.borderMd}`,
            transition: 'background 0.15s, border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = M.mochaPale; e.currentTarget.style.borderColor = M.mochaLt; }}
            onMouseLeave={e => { e.currentTarget.style.background = M.white; e.currentTarget.style.borderColor = M.borderMd; }}
          >
            기능 살펴보기
          </a>
        </div>

        {/* Mockup */}
        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto', animation: 'fadeUp 0.7s 0.4s ease both' }}>
          <div style={{
            background: M.white, border: `1.5px solid ${M.border}`, borderRadius: 22,
            boxShadow: `0 40px 100px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.04)`,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', gap: 8, background: M.bgSub }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{ height: 7, width: 170, borderRadius: 4, background: M.border }} />
              </div>
            </div>
            <div style={{ padding: '30px 36px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1', background: M.mochaPale, border: `1px solid ${M.border}`, borderRadius: 13, padding: '18px 22px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: M.mocha, marginBottom: 8, letterSpacing: '0.09em', textTransform: 'uppercase' }}>환자 메시지</p>
                <p style={{ fontSize: 15, color: M.text, lineHeight: 1.65, letterSpacing: '-0.01em' }}>这个手术恢复期多久？有没有副作用？价格大概是多少？</p>
              </div>
              {[
                { label: '공감형', color: M.mocha,  text: '소중한 문의 감사드립니다. 해당 시술은 일반적으로 3~5일 내 회복되며 부작용은 경미합니다...' },
                { label: '정보형', color: M.sage,   text: '시술 회복기간: 3~5일. 주요 부작용: 붓기, 멍 (7일 내 소실). 비용: 상담 후 개인별 맞춤 안내...' },
              ].map(r => (
                <div key={r.label} style={{ background: M.white, border: `1.5px solid ${M.border}`, borderRadius: 13, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: r.color, letterSpacing: '0.04em' }}>{r.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: M.textSub, lineHeight: 1.7, letterSpacing: '-0.01em' }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badges */}
          <div style={{
            position: 'absolute', top: -22, right: -30,
            background: M.white, border: `1.5px solid ${M.border}`,
            borderRadius: 16, padding: '14px 22px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.09)',
            animation: 'floatY 4s ease-in-out infinite',
          }}>
            <p style={{ fontSize: 11, color: M.textMt, marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>평균 응답 시간</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: M.text, letterSpacing: '-0.06em', lineHeight: 1 }}>1.8<span style={{ fontSize: 15, fontWeight: 500, color: M.textSub }}> 초</span></p>
          </div>
          <div style={{
            position: 'absolute', bottom: -22, left: -30,
            background: M.bgDark, border: '1px solid #2A1A12',
            borderRadius: 16, padding: '14px 22px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.30)',
            animation: 'floatY 5s 1.5s ease-in-out infinite',
          }}>
            <p style={{ fontSize: 11, color: '#6A4A3A', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>지원 언어</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: M.white, letterSpacing: '-0.06em', lineHeight: 1 }}>8<span style={{ fontSize: 15, fontWeight: 500, color: '#6A4A3A' }}> 개국</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Social Proof ──────────────────────────────────────────────────────────────
function SocialProof() {
  const logos = ['강남 오라클피부과', 'VIP클리닉', '청담이노의원', '루시아의원', '도시미의원', '압구정 리봄피부과'];
  return (
    <div style={{ borderTop: `1px solid ${M.border}`, borderBottom: `1px solid ${M.border}`, padding: '22px 0', background: M.bgSub }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: M.mocha, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>신뢰하는 클리닉</span>
          {logos.map(name => (
            <span key={name} style={{ fontSize: 14, fontWeight: 600, color: M.textSub, whiteSpace: 'nowrap', opacity: 0.6, letterSpacing: '-0.01em' }}>{name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Languages,   badge: 'Core',       badgeColor: M.text,    label: '8개국어 즉시 번역',       desc: '한·중·일·영·태·베·러·아랍어 실시간 번역 및 문화권별 톤 자동 최적화.' },
  { icon: Sparkles,    badge: 'AI',         badgeColor: M.mocha,   label: 'AI 답변 3종 자동 생성',   desc: '공감형·정보형·세일즈형 답변을 동시에 생성. 상황에 맞게 즉시 선택 가능.' },
  { icon: Database,    badge: 'RAG',        badgeColor: M.sage,    label: '병원 시술 DB 학습',        desc: 'Retrieval-Augmented Generation으로 병원 고유 시술 정보 기반 정확한 답변.' },
  { icon: Stethoscope, badge: 'Core',       badgeColor: M.text,    label: '시술별 FAQ 자동 학습',     desc: '시술 정보·가격·다운타임·부작용을 벡터DB에 저장해 실시간 참조.' },
  { icon: Globe,       badge: 'Pro',        badgeColor: M.gold,    label: '크롬 익스텐션 원클릭',     desc: 'SNS·카카오·위챗·라인 메신저 위에서 바로 동작. 앱 전환 없이 즉시 사용.' },
  { icon: BarChart3,   badge: 'Pro',        badgeColor: M.gold,    label: '상담 통계 대시보드',       desc: '언어별 유입 현황, 시술 관심도, 전환율 분석을 한눈에 파악.' },
  { icon: Shield,      badge: 'Enterprise', badgeColor: '#8B7BAF', label: '의료 데이터 보안',          desc: 'HIPAA 준수 암호화 저장, 직원 역할별 접근 제어, 감사 로그 자동 기록.' },
  { icon: TrendingUp,  badge: 'Enterprise', badgeColor: '#8B7BAF', label: '다원화 병원 관리',          desc: '여러 지점을 하나의 플랫폼에서 관리. 지점별 시술 DB·직원 설정 독립 운영.' },
];

function FeatureCard({ f, delay }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <div ref={ref} style={{
      background: M.white, border: `1.5px solid ${M.border}`, borderRadius: 20,
      padding: '30px 28px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(44px)',
      transition: `opacity 0.75s ${delay}s cubic-bezier(0.22,1,0.36,1), transform 0.75s ${delay}s cubic-bezier(0.22,1,0.36,1), border-color 0.2s, box-shadow 0.2s`,
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${M.mocha}55`;
        e.currentTarget.style.boxShadow = `0 16px 48px ${M.mocha}18`;
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = M.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: M.mochaPale, border: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <f.icon size={22} color={M.mocha} strokeWidth={1.7} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, color: f.badgeColor,
          background: f.badgeColor + '18', border: `1px solid ${f.badgeColor}25`,
          padding: '4px 10px', borderRadius: 999, letterSpacing: '0.07em',
        }}>
          {f.badge}
        </span>
      </div>
      <p style={{ fontSize: 17, fontWeight: 800, color: M.text, marginBottom: 10, lineHeight: 1.25, letterSpacing: '-0.03em' }}>{f.label}</p>
      <p style={{ fontSize: 14, color: M.textSub, lineHeight: 1.75, letterSpacing: '-0.01em' }}>{f.desc}</p>
    </div>
  );
}

function Features() {
  const [headerRef, headerVisible] = useReveal(0.2);
  return (
    <section id="기능" style={{ padding: '130px 0', background: M.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <div ref={headerRef} style={{
          textAlign: 'center', marginBottom: 80,
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(36px)',
          transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: M.mocha, textTransform: 'uppercase', marginBottom: 18 }}>FEATURES</p>
          <h2 style={{ fontSize: 'clamp(38px, 5.5vw, 66px)', fontWeight: 900, letterSpacing: '-0.05em', color: M.text, lineHeight: 1.05, wordBreak: 'keep-all' }}>
            병원 상담의 모든 것을<br />하나의 AI로
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => <FeatureCard key={i} f={f} delay={i * 0.07} />)}
        </div>
      </div>
    </section>
  );
}

// ── Rotor Section ─────────────────────────────────────────────────────────────
function RotorSection() {
  const [leftRef, leftVisible] = useReveal(0.15);
  return (
    <section style={{ background: M.bgDark, padding: '130px 0', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 60% 70% at 80% 50%, ${M.mocha}18 0%, transparent 60%),
          radial-gradient(ellipse 40% 50% at 5% 30%, ${M.sage}12 0%, transparent 50%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '38px 38px',
      }} />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 90, alignItems: 'center' }}>
          <div ref={leftRef} style={{
            opacity: leftVisible ? 1 : 0,
            transform: leftVisible ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: M.mocha, textTransform: 'uppercase', marginBottom: 22 }}>MULTILINGUAL AI</p>
            <h2 style={{ fontSize: 'clamp(34px, 4.5vw, 58px)', fontWeight: 900, letterSpacing: '-0.05em', color: M.white, lineHeight: 1.05, marginBottom: 28, wordBreak: 'keep-all' }}>
              8개 언어,<br />하나의 AI<br />상담 실장
            </h2>
            <p style={{ fontSize: 16, color: '#8A7068', lineHeight: 1.8, marginBottom: 52, letterSpacing: '-0.01em' }}>
              중국어 환자, 영어 환자, 일본어 환자 — 누가 와도 막히지 않습니다.
              TikiDoc AI가 문화권에 맞는 어조와 표현으로 즉시 답변합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { num: '94%',  label: '고객 만족도' },
                { num: '1.8초', label: '평균 답변 생성 시간' },
                { num: '8개',  label: '지원 언어' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: M.white, letterSpacing: '-0.06em', lineHeight: 1 }}>{s.num}</span>
                  <span style={{ fontSize: 15, color: '#665050', letterSpacing: '-0.01em' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cylinder3D />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function StepCard({ step, delay }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(44px)',
      transition: `opacity 0.75s ${delay}s cubic-bezier(0.22,1,0.36,1), transform 0.75s ${delay}s cubic-bezier(0.22,1,0.36,1)`,
      position: 'relative',
    }}>
      <div style={{ background: M.white, border: `1.5px solid ${M.border}`, borderRadius: 22, padding: '34px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: M.mocha, letterSpacing: '0.04em', fontFamily: F.sans }}>{step.num}</span>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: M.mocha, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${M.mocha}50` }}>
            <step.icon size={20} color="#fff" strokeWidth={2} />
          </div>
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, color: M.text, marginBottom: 14, letterSpacing: '-0.035em', lineHeight: 1.2 }}>{step.label}</p>
        <p style={{ fontSize: 15, color: M.textSub, lineHeight: 1.75, letterSpacing: '-0.01em' }}>{step.desc}</p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const [headerRef, headerVisible] = useReveal(0.2);
  const steps = [
    { num: '01', icon: FileText,      label: '메시지 붙여넣기', desc: '환자가 보낸 외국어 메시지를 TikiDoc에 붙여넣습니다. SNS, 카카오, 위챗 어디서든 OK.' },
    { num: '02', icon: Sparkles,      label: 'AI가 즉시 분석',  desc: '병원 시술 DB + RAG 지식으로 정확한 맥락을 파악해 최적 답변 3종을 1.8초 만에 생성합니다.' },
    { num: '03', icon: MessageSquare, label: '원하는 답변 전송', desc: '공감형·정보형·세일즈형 중 상황에 맞는 답변을 클릭 한 번으로 환자에게 전송합니다.' },
  ];
  return (
    <section id="사용 방법" style={{ padding: '130px 0', background: M.bgSub }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <div ref={headerRef} style={{
          textAlign: 'center', marginBottom: 80,
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(36px)',
          transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: M.mocha, textTransform: 'uppercase', marginBottom: 18 }}>HOW IT WORKS</p>
          <h2 style={{ fontSize: 'clamp(38px, 5.5vw, 66px)', fontWeight: 900, letterSpacing: '-0.05em', color: M.text, lineHeight: 1.05, wordBreak: 'keep-all' }}>
            3단계로 끝나는<br />AI 상담
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {steps.map((step, i) => <StepCard key={i} step={step} delay={i * 0.15} />)}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    tier: 'Starter', tagline: '외국인 상담을 처음 시작하는 클리닉',
    price: '790,000', highlight: false, cta: '1개월 무료로 시작', accentColor: M.text,
    groups: [
      { label: 'AI 상담', items: ['월 300회 AI 답변 생성', '3개국어 지원 (한·중·영)', '크롬 익스텐션 포함', '답변 3종 자동 생성 (공감·정보·세일즈)'] },
      { label: '병원 설정', items: ['시술 정보 20개 등록', '직원 계정 3명', '기본 월간 리포트'] },
      { label: '지원', items: ['이메일 지원 (72시간 내)', '온보딩 가이드 제공'] },
    ],
  },
  {
    tier: 'Pro', tagline: '외국인 환자 비중이 높은 성장 클리닉',
    price: '1,290,000', highlight: true, badge: '가장 인기', cta: '1개월 무료로 시작', accentColor: M.mocha,
    groups: [
      { label: 'AI 상담', items: ['무제한 AI 답변 생성', '8개국어 완전 지원 (한·중·일·영·태·베·러·아랍)', '크롬 익스텐션 포함', '답변 3종 + 문화권별 톤 최적화', 'RAG 지식베이스 — 병원 맞춤 학습', 'Visual Sales Mapping (시술 추천·견적)'] },
      { label: '병원 설정', items: ['시술 정보 무제한 등록', '시술별 FAQ·부작용·가격 AI 자동 학습', '직원 계정 10명', '역할별 접근 제어 (원장·관리자·직원)'] },
      { label: '분석 & 인사이트', items: ['실시간 통계 대시보드', '언어별 유입·전환율 분석', '시술 관심도 트렌드 리포트'] },
      { label: '지원', items: ['카카오톡 전담 지원 (24시간 내)', '맞춤 온보딩 세션 1회'] },
    ],
  },
  {
    tier: 'Clinic+', tagline: '다지점·체인 클리닉을 위한 엔터프라이즈',
    price: '1,990,000', highlight: false, cta: '1개월 무료로 시작', accentColor: '#8B7BAF',
    groups: [
      { label: 'Pro 전체 포함', items: ['Pro 플랜 모든 기능 포함', '지점 수 무제한 통합 관리', '지점별 독립 시술 DB·직원 설정'] },
      { label: '전용 AI', items: ['클리닉 전용 AI 파인튜닝', '병원 브랜드 보이스 학습', '경쟁사 비교 차단 로직 탑재'] },
      { label: '연동 & 보안', items: ['REST API 제공 (CRM·EMR 연동)', 'HIPAA 준수 암호화 저장', '감사 로그 자동 기록', '전용 서버 격리 옵션'] },
      { label: '지원', items: ['전담 CSM (Customer Success Manager)', '맞춤 온보딩 4회 + 직원 교육', '99.9% SLA 보장', '분기별 성과 리뷰 세션'] },
    ],
  },
];

function PlanCard({ plan }) {
  const dark = plan.highlight;
  const bg       = dark ? M.bgDark    : M.white;
  const textMain = dark ? M.white     : M.text;
  const textSub2 = dark ? '#8A7068'   : M.textSub;
  const textItem = dark ? '#C4A090'   : M.textSub;
  const divClr   = dark ? 'rgba(255,255,255,0.07)' : M.border;
  return (
    <div style={{
      background: bg, border: `1.5px solid ${dark ? '#2A1A12' : M.border}`,
      borderRadius: 22, padding: '36px 30px', position: 'relative',
      boxShadow: dark ? `0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px ${M.mocha}30` : '0 2px 16px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: M.mocha, color: M.white,
          fontSize: 11, fontWeight: 800, padding: '5px 18px', borderRadius: 999,
          whiteSpace: 'nowrap', letterSpacing: '0.06em',
          boxShadow: `0 4px 16px ${M.mocha}55`,
        }}>
          {plan.badge}
        </div>
      )}
      <div style={{ height: 3, borderRadius: 2, background: plan.accentColor, marginBottom: 28, width: 44 }} />
      <p style={{ fontSize: 11, fontWeight: 800, color: plan.accentColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{plan.tier}</p>
      <p style={{ fontSize: 14, color: textSub2, lineHeight: 1.55, marginBottom: 24, letterSpacing: '-0.01em' }}>{plan.tagline}</p>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 14, color: textSub2, marginRight: 2 }}>₩</span>
          <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.05em', color: textMain, lineHeight: 1 }}>{plan.price}</span>
          <span style={{ fontSize: 14, color: textSub2 }}>/월</span>
        </div>
        <p style={{ fontSize: 12, color: plan.accentColor, fontWeight: 700, marginTop: 8, letterSpacing: '-0.01em' }}>✦ 첫 1개월 무료 체험</p>
      </div>
      <Link to="/signup" style={{
        display: 'block', textAlign: 'center',
        padding: '14px 0', borderRadius: 12, marginBottom: 30, marginTop: 10,
        fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
        background: dark ? M.mocha : M.text,
        color: M.white,
        boxShadow: dark ? `0 6px 20px ${M.mocha}45` : '0 4px 16px rgba(0,0,0,0.18)',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {plan.cta}
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
        {plan.groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div style={{ height: 1, background: divClr, marginBottom: 18 }} />}
            <p style={{ fontSize: 10, fontWeight: 800, color: plan.accentColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{group.label}</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {group.items.map((item, ii) => (
                <li key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: textItem, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                  <Check size={14} color={plan.accentColor} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
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
  const [headerRef, headerVisible] = useReveal(0.15);
  return (
    <section id="요금제" style={{ padding: '130px 0', background: M.bgSub }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px' }}>
        <div ref={headerRef} style={{
          textAlign: 'center', marginBottom: 22,
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translateY(0)' : 'translateY(36px)',
          transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', color: M.mocha, textTransform: 'uppercase', marginBottom: 18 }}>PRICING</p>
          <h2 style={{ fontSize: 'clamp(38px, 5.5vw, 66px)', fontWeight: 900, letterSpacing: '-0.05em', color: M.text, lineHeight: 1.05, marginBottom: 18, wordBreak: 'keep-all' }}>
            명확한 요금,<br />숨겨진 비용 없음
          </h2>
          <p style={{ fontSize: 17, color: M.textSub, maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7, letterSpacing: '-0.01em' }}>
            모든 플랜은 <strong style={{ color: M.text }}>첫 1개월 무료</strong>로 시작합니다. 신용카드 불필요.
          </p>
        </div>

        <div style={{ maxWidth: 580, margin: '0 auto 60px', background: M.sagePale, border: `1px solid ${M.sageLt}`, borderRadius: 14, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: M.sage + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={16} color={M.sage} strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 14, color: M.mochaDk, lineHeight: 1.6, letterSpacing: '-0.01em' }}>
            <strong>카드 없이, 약정 없이</strong> — 1개월 동안 해당 플랜의 모든 기능을 완전히 무료로 사용할 수 있습니다. 만족하지 않으면 언제든 해지하세요.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
          {PLANS.map(plan => <PlanCard key={plan.tier} plan={plan} />)}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: M.textMt, marginTop: 40, letterSpacing: '-0.01em' }}>
          부가세(VAT) 별도 · 연간 결제 시 2개월 추가 무료 · 플랜 업그레이드 언제든 가능
        </p>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  const [ref, visible] = useReveal(0.2);
  return (
    <section style={{ padding: '90px 32px', background: M.bg, borderTop: `1px solid ${M.border}` }}>
      <div ref={ref} style={{
        maxWidth: 720, margin: '0 auto', textAlign: 'center',
        background: M.bgDark, borderRadius: 28,
        padding: '72px 48px',
        boxShadow: '0 32px 96px rgba(0,0,0,0.22)',
        position: 'relative', overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: 480, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${M.mocha}28 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30%', right: '-10%', width: 320, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${M.sage}18 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 900, letterSpacing: '-0.05em', color: M.white, marginBottom: 16, position: 'relative', lineHeight: 1.1, wordBreak: 'keep-all' }}>
          외국인 상담,<br />더 이상 두렵지 않게
        </h2>
        <p style={{ fontSize: 17, color: '#7A6060', lineHeight: 1.7, marginBottom: 40, position: 'relative', letterSpacing: '-0.01em' }}>
          지금 바로 무료로 시작하세요. 신용카드 없이 5분 만에 셋업 완료.
        </p>
        <Link to="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: M.mocha, color: M.white,
          padding: '17px 36px', borderRadius: 13,
          fontSize: 17, fontWeight: 800, letterSpacing: '-0.025em',
          boxShadow: `0 6px 28px ${M.mocha}60`,
          position: 'relative',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 44px ${M.mocha}65`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 28px ${M.mocha}60`; }}
        >
          무료로 시작하기 <ArrowRight size={19} />
        </Link>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${M.border}`, padding: '44px 32px', background: M.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: M.mocha, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={13} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: M.text, letterSpacing: '-0.04em' }}>TikiDoc</span>
          <span style={{ fontSize: 13, color: M.textMt, letterSpacing: '-0.01em' }}>— AI 다국어 상담 솔루션</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['개인정보처리방침', '이용약관', '문의하기'].map(item => (
            <a key={item} href="#"
              style={{ fontSize: 13, color: M.textMt, letterSpacing: '-0.01em', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = M.mocha}
              onMouseLeave={e => e.target.style.color = M.textMt}
            >{item}</a>
          ))}
        </div>
        <p style={{ fontSize: 13, color: M.textMt, letterSpacing: '-0.01em' }}>© 2025 TikiDoc. All rights reserved.</p>
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
