import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, ArrowRight, Check,
  Sparkles, MessageCircle, Brain, BookOpen,
  ChevronRight, LayoutGrid,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

const C = {
  mocha:      '#0145F2',
  mochaDk:    '#10367D',
  mochaLight: '#BBE1FA',
  mochaPale:  '#E6F0FF',
  bg:         '#EDF1F5',
  bgSub:      '#EBEBEB',
  surface:    '#FFFFFF',   // Cards
  text:       '#1B262C',
  textSub:    '#40515D',
  textMt:     '#6B7C88',
  border:     '#D6E1EA',
  white:      '#FFFFFF',
};

// ── Keyframes & global CSS ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: ${SANS}; background: ${C.bg}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  a { text-decoration: none; color: inherit; }
  ::selection { background: ${C.mocha}28; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.9); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 860px) {
    .hero-grid    { grid-template-columns: 1fr !important; }
    .modules-grid { grid-template-columns: 1fr !important; }
    .pricing-grid { grid-template-columns: 1fr !important; }
    .session-grid { grid-template-columns: 1fr !important; }
    .footer-row   { flex-direction: column !important; align-items: flex-start !important; gap: 28px !important; }
    .hide-mobile  { display: none !important; }
    .hero-card    { max-width: 420px !important; margin: 0 auto !important; }
  }
`;

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal(threshold = 0.10) {
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

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ style }) {
  return (
    <div style={{
      width: '100%', height: 1,
      background: `rgba(16,54,125,0.10)`,
      ...style,
    }} />
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? `rgba(237,241,245,0.92)` : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        borderBottom: scrolled ? `1px solid rgba(16,54,125,0.12)` : '1px solid transparent',
        transition: 'background 0.35s, border-color 0.35s',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '0 40px',
          height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: C.mocha,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={14} color="#fff" fill="#fff" strokeWidth={0} />
            </div>
            <span style={{
              fontSize: 16, fontWeight: 800,
              letterSpacing: '-0.04em', color: C.text,
            }}>TikiDoc</span>
          </div>

          {/* Nav links */}
          <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {[['제품', '#modules'], ['워크플로우', '#session'], ['요금제', '#pricing']].map(([label, href]) => (
              <a key={label} href={href} style={{
                fontSize: 14, fontWeight: 500,
                color: C.textSub, letterSpacing: '-0.01em',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = C.mocha}
                onMouseLeave={e => e.currentTarget.style.color = C.textSub}
              >{label}</a>
            ))}
          </nav>

          {/* Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" style={{
              fontSize: 13, fontWeight: 600, color: C.textSub,
              padding: '8px 14px', letterSpacing: '-0.01em',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textSub}
            >로그인</Link>
            <Link to="/signup" style={{
              fontSize: 13, fontWeight: 700, color: C.white,
              background: C.mocha, padding: '9px 20px', borderRadius: 9,
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.86'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >데모 신청</Link>
          </div>
        </div>
      </header>
    </>
  );
}

// ── Hero product card (no chrome) ─────────────────────────────────────────────
function HeroCard() {
  const [activeReply, setActiveReply] = useState(0);

  const replies = [
    {
      label: '정중한 답장',
      color: C.mocha,
      text: '소중한 문의 감사드립니다. 히알루론산 시술은 시술 직후부터 볼륨감을 느끼실 수 있으며, 완전한 효과는 2~3일 후에 안정됩니다.',
    },
    {
      label: '빠른 답장',
      color: '#3B6500',
      text: '효과 발현: 직후~3일. 지속: 6~12개월. 붓기는 3~5일 내 소실. 자세한 상담은 방문 예약 부탁드립니다.',
    },
    {
      label: '상담 유도',
      color: '#B5701A',
      text: '정확한 답변을 드리려면 직접 상담이 필요합니다. 온라인 예약을 통해 전문의와 1:1 상담을 받아보세요.',
    },
  ];

  return (
    <div
      className="hero-card"
      style={{
        background: C.surface,
        borderRadius: 22,
        padding: '26px 26px 22px',
        boxShadow: '0 32px 80px rgba(1,69,242,0.13), 0 4px 16px rgba(1,69,242,0.07)',
        animation: 'floatSlow 7s ease-in-out infinite',
        maxWidth: 460,
      }}
    >
      {/* Product header — no browser chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: C.mocha,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={10} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.text, letterSpacing: '0.02em' }}>
          Tiki Paste
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4CAF50',
            animation: 'pulseDot 2.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#4CAF50', letterSpacing: '0.06em' }}>
            분석 완료
          </span>
        </div>
      </div>

      {/* Patient message */}
      <div style={{
        background: C.mochaPale,
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>🇯🇵</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: C.textMt, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            환자 메시지
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 9, fontWeight: 700, color: C.mocha,
            background: `${C.mocha}14`, padding: '2px 7px', borderRadius: 5,
          }}>
            일본어
          </span>
        </div>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontWeight: 500, marginBottom: 10 }}>
          ヒアルロン酸の施術後、どのくらいで効果が出ますか？
        </p>
        <div style={{
          paddingTop: 10,
          borderTop: `1px solid rgba(16,54,125,0.12)`,
        }}>
          <p style={{ fontSize: 11, color: C.textSub, lineHeight: 1.6 }}>
            히알루론산 시술 후 효과가 얼마나 걸리나요? 부작용은 있나요? 가격도 알려주세요.
          </p>
        </div>
      </div>

      {/* Intent tags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['시술 효과 문의', '부작용 우려', '가격 문의'].map((tag, i) => (
          <span key={i} style={{
            fontSize: 9, fontWeight: 700, color: C.textSub,
            background: C.bgSub,
            padding: '3px 9px', borderRadius: 999,
            letterSpacing: '-0.01em',
          }}>{tag}</span>
        ))}
      </div>

      {/* Reply cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {replies.map((r, i) => (
          <div
            key={i}
            onClick={() => setActiveReply(i)}
            style={{
              background: activeReply === i ? C.surface : `${C.bgSub}70`,
              border: `1.5px solid ${activeReply === i ? `${r.color}40` : 'transparent'}`,
              borderRadius: 11, padding: '11px 14px',
              cursor: 'pointer',
              boxShadow: activeReply === i ? `0 2px 12px ${r.color}12` : 'none',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: r.color, letterSpacing: '0.04em' }}>
                {r.label}
              </span>
              {activeReply === i && (
                <span style={{
                  marginLeft: 'auto', fontSize: 8, fontWeight: 700,
                  color: r.color, background: `${r.color}12`,
                  padding: '1px 6px', borderRadius: 3,
                }}>선택됨</span>
              )}
            </div>
            <p style={{
              fontSize: 10.5, color: C.textSub,
              lineHeight: 1.65, letterSpacing: '-0.01em',
              display: activeReply === i ? 'block' : '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: activeReply === i ? 'visible' : 'hidden',
            }}>
              {r.text}
            </p>
          </div>
        ))}
      </div>

      {/* Send bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: C.mochaPale, borderRadius: 10,
      }}>
        <span style={{ fontSize: 10.5, color: C.textMt, flex: 1, letterSpacing: '-0.01em' }}>
          일본어로 번역하여 전송 준비 완료
        </span>
        <div style={{
          background: C.mocha, color: C.white,
          fontSize: 10.5, fontWeight: 700,
          padding: '6px 14px', borderRadius: 7,
          letterSpacing: '-0.01em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          전송 <ArrowRight size={11} />
        </div>
      </div>

      {/* Safety footer — inline, not floating badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 14, paddingTop: 14,
        borderTop: `1px solid rgba(16,54,125,0.09)`,
      }}>
        <Check size={10} color='#3B6500' strokeWidth={2.5} />
        <span style={{ fontSize: 9, color: C.textMt, letterSpacing: '0.02em' }}>
          의료 안전 필터 적용 · 금지 표현 자동 차단
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {['🇯🇵', '🇨🇳', '🇺🇸', '🇹🇭', '🇻🇳'].map(f => (
            <span key={f} style={{ fontSize: 11 }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      paddingTop: 140, paddingBottom: 120,
      background: C.bg,
      position: 'relative',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div
          className="hero-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}
        >
          {/* Copy */}
          <div>
            <div style={{ marginBottom: 30, animation: 'fadeUp 0.5s 0.05s ease both' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 14px',
                background: C.mochaPale,
                borderRadius: 999,
                fontSize: 10, fontWeight: 800, color: C.mocha,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.mocha }} />
                외국인 환자 응대의 새로운 기준
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(48px, 6.5vw, 84px)',
              fontWeight: 800,
              letterSpacing: '-0.055em',
              lineHeight: 1.0,
              color: C.text,
              marginBottom: 28,
              animation: 'fadeUp 0.55s 0.12s ease both',
              wordBreak: 'keep-all',
            }}>
              말이 통해야<br />
              치료가<br />
              시작됩니다.
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 1.8vw, 18px)',
              color: C.textSub,
              lineHeight: 1.85,
              marginBottom: 44,
              animation: 'fadeUp 0.55s 0.20s ease both',
              letterSpacing: '-0.01em',
              wordBreak: 'keep-all',
              maxWidth: 440,
              fontWeight: 400,
            }}>
              상담 채팅부터 진료실 통역, 회복 케어까지 —<br />
              환자의 언어를, 끊기지 않게.
            </p>

            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
              animation: 'fadeUp 0.55s 0.28s ease both',
              marginBottom: 52,
            }}>
              <Link to="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: C.mocha, color: C.white,
                padding: '14px 28px', borderRadius: 11,
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.86'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                데모 신청하기 <ArrowRight size={15} />
              </Link>
              <a href="#modules" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'transparent', color: C.textSub,
                padding: '14px 22px', borderRadius: 11,
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em',
                border: `1.5px solid ${C.border}`,
                transition: 'border-color 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.mochaLight; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}
              >
                제품 살펴보기
              </a>
            </div>

            {/* Trust signals — minimal, typographic */}
            <div style={{
              display: 'flex', gap: 28, flexWrap: 'wrap',
              animation: 'fadeUp 0.55s 0.36s ease both',
            }}>
              {[
                ['8개 언어', '실시간 지원'],
                ['의료 안전', '필터 탑재'],
                ['진료 기억', '자동 누적'],
              ].map(([strong, sub], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{strong}</span>
                  <span style={{ fontSize: 12, color: C.textMt }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product card */}
          <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeUp 0.6s 0.18s ease both' }}>
            <HeroCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Signal bar ────────────────────────────────────────────────────────────────
function SignalBar() {
  const [ref, visible] = useReveal();
  const signals = [
    { n: '3초', desc: '내 AI 답변 3종 생성' },
    { n: '실시간', desc: '진료실 양방향 통역' },
    { n: '자동', desc: '환자 컨텍스트 누적' },
  ];
  return (
    <div ref={ref} style={{
      background: C.mochaPale,
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(12px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        {signals.map((s, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '20px 24px',
            borderRight: i < 2 ? `1px solid rgba(16,54,125,0.15)` : 'none',
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.mocha, letterSpacing: '-0.04em' }}>{s.n}</span>
            <span style={{ fontSize: 13, color: C.textSub, fontWeight: 400 }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modules ───────────────────────────────────────────────────────────────────
const MODULE_DATA = [
  {
    id: 'paste',
    icon: Sparkles,
    name: 'Tiki Paste',
    tag: '채팅 상담',
    headline: '붙여넣으면 답변 3종이 준비됩니다.',
    desc: '외국어 메시지를 붙여넣으면 AI가 언어를 감지하고, 정중형 · 빠른형 · 상담 유도형 3가지 한국어 답변을 즉시 생성합니다. 선택한 답변은 원어로 번역하여 그대로 전송합니다.',
    accent: C.mocha,
    mini: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          background: `${C.mocha}10`, borderRadius: 8, padding: '10px 12px',
          fontSize: 11, color: C.textSub, lineHeight: 1.5,
        }}>
          🇯🇵 ヒアルロン酸の施術後、どのくらいで効果が出ますか？
        </div>
        {['정중한 답장', '빠른 답장', '상담 유도'].map((t, i) => (
          <div key={i} style={{
            background: i === 0 ? C.surface : C.bgSub,
            border: `1px solid ${i === 0 ? `${C.mocha}30` : 'transparent'}`,
            borderRadius: 7, padding: '7px 10px',
            fontSize: 10, color: i === 0 ? C.mocha : C.textMt, fontWeight: i === 0 ? 700 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? C.mocha : C.border }} />
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'talk',
    icon: MessageCircle,
    name: 'Tiki Talk',
    tag: '진료실 통역',
    headline: '의사와 환자가 각자의 언어로 대화합니다.',
    desc: '진료실 내 실시간 음성 인식과 양방향 번역. 의사는 한국어로, 환자는 모국어로 말합니다. AI는 대화를 실시간으로 해석하고 의심 표현에는 즉각 의료진에게 알립니다.',
    accent: '#3B6500',
    mini: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{
          background: `${C.mocha}10`, borderRadius: 8, padding: '10px 12px',
          fontSize: 10, color: C.textSub, alignSelf: 'flex-start', maxWidth: '80%',
        }}>
          🇯🇵 施術後、少し頭がふわふわします…
          <div style={{ fontSize: 9, color: C.textMt, marginTop: 4 }}>→ 시술 후 약간 어지럽습니다</div>
        </div>
        <div style={{
          background: `rgba(196,69,58,0.08)`,
          border: `1px solid rgba(196,69,58,0.20)`,
          borderRadius: 7, padding: '7px 10px',
          fontSize: 9, color: '#C04A3F', fontWeight: 700,
        }}>⚠ 위험 감지 — 의료진 확인 권고</div>
        <div style={{
          background: `rgba(90,143,128,0.08)`, borderRadius: 8, padding: '10px 12px',
          fontSize: 10, color: C.textSub, alignSelf: 'flex-end', maxWidth: '80%',
        }}>
          걱정하지 마세요. 천천히 호흡해 보세요.
          <div style={{ fontSize: 9, color: '#3B6500', marginTop: 4 }}>→ 心配しないでください。ゆっくり呼吸してください。</div>
        </div>
      </div>
    ),
  },
  {
    id: 'room',
    icon: LayoutGrid,
    name: 'Tiki Room',
    tag: '태블릿 진료실',
    headline: '진료실 태블릿이 통역 도우미가 됩니다.',
    desc: '진료실과 회복실에 설치하는 태블릿 어시스턴트. 세션이 시작되면 환자의 발화를 인식하고 의사 발화는 즉시 환자 언어로 화면에 표시합니다. 위험 표현 감지 시 의료진에게 즉각 알림.',
    accent: C.mocha,
    mini: (
      <div style={{
        background: C.bgSub, borderRadius: 10, padding: '12px',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#4CAF50' }}>진료실 B · LIVE</span>
          <span style={{ fontSize: 9, color: C.textMt, marginLeft: 'auto' }}>00:14:32</span>
        </div>
        <div style={{
          background: `${C.mocha}10`, borderRadius: 8, padding: '9px 11px',
          fontSize: 10, color: C.textSub,
        }}>
          🇯🇵 目の下が気になって…
          <div style={{ fontSize: 9, color: C.textMt, marginTop: 3 }}>눈 밑이 신경 쓰여서요…</div>
        </div>
        <div style={{
          background: `rgba(90,143,128,0.08)`, borderRadius: 8, padding: '9px 11px',
          fontSize: 10, color: C.textSub, textAlign: 'right',
        }}>
          히알루론산 필러로 교정 가능합니다.
          <div style={{ fontSize: 9, color: '#3B6500', marginTop: 3 }}>ヒアルロン酸フィラーで整えられます。</div>
        </div>
      </div>
    ),
  },
  {
    id: 'memory',
    icon: Brain,
    name: 'Tiki Memory',
    tag: '환자 기억 엔진',
    headline: '대화에서 환자를 기억합니다.',
    desc: '모든 세션이 끝나면 AI가 통증 민감도, 다운타임 우려, 체류 일정, 컴플레인 위험도 등 7가지 컨텍스트를 자동 추출합니다. 다음 방문 때도 이미 이 환자를 알고 있습니다.',
    accent: '#7058A8',
    mini: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { label: '시술 관심사', val: '히알루론산 · 눈 밑 교정', color: C.mocha },
          { label: '통증 민감도', val: '높음 — 마취 크림 선호', color: '#C04A3F' },
          { label: '체류 일정', val: '5박 6일 · 4/23 출국', color: '#B5701A' },
          { label: '컴플레인 위험', val: '낮음 — 협조적', color: '#3B6500' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: C.bgSub, borderRadius: 7, padding: '7px 9px',
          }}>
            <span style={{
              fontSize: 8, fontWeight: 800, color: item.color,
              background: `${item.color}12`,
              padding: '2px 5px', borderRadius: 4, flexShrink: 0,
            }}>{item.label}</span>
            <span style={{ fontSize: 9.5, color: C.textSub }}>{item.val}</span>
          </div>
        ))}
      </div>
    ),
  },
];

function ModuleCard({ mod, delay }) {
  const [ref, visible] = useReveal();
  const Icon = mod.icon;

  return (
    <div ref={ref} style={{
      background: C.surface,
      borderRadius: 20,
      padding: '32px 32px 28px',
      boxShadow: '0 2px 8px rgba(1,69,242,0.06)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(20px)',
      transition: `opacity 0.55s ${delay}ms ease, transform 0.55s ${delay}ms ease`,
      borderTop: `3px solid ${mod.accent}`,
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${mod.accent}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} color={mod.accent} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
              {mod.name}
            </span>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 800, color: mod.accent,
            background: `${mod.accent}12`,
            padding: '2px 8px', borderRadius: 4,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {mod.tag}
          </span>
        </div>
      </div>

      {/* Mini visual */}
      <div style={{
        background: C.bg, borderRadius: 12, padding: '14px',
        marginBottom: 20, minHeight: 130,
      }}>
        {mod.mini}
      </div>

      {/* Copy */}
      <h3 style={{
        fontSize: 16, fontWeight: 700, color: C.text,
        letterSpacing: '-0.025em', lineHeight: 1.45,
        marginBottom: 10, wordBreak: 'keep-all',
      }}>
        {mod.headline}
      </h3>
      <p style={{
        fontSize: 13, color: C.textSub, lineHeight: 1.8,
        letterSpacing: '-0.01em', wordBreak: 'keep-all',
        fontWeight: 400,
      }}>
        {mod.desc}
      </p>
    </div>
  );
}

function Modules() {
  const [ref, visible] = useReveal();
  return (
    <section id="modules" style={{ padding: '120px 0', background: C.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div ref={ref} style={{
          marginBottom: 64,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: C.mocha,
            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            제품 구성
          </p>
          <h2 style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2,
            color: C.text, maxWidth: 500, wordBreak: 'keep-all',
          }}>
            상담부터 회복까지,<br />
            끊김 없는 언어 흐름.
          </h2>
        </div>
        <div
          className="modules-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
        >
          {MODULE_DATA.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Session flow ──────────────────────────────────────────────────────────────
const SESSION_STEPS = [
  {
    n: '01', title: '환자 도착 — 언어 자동 감지',
    desc: '채팅 문의 또는 진료실 입장과 동시에 환자 언어를 자동 감지합니다. 일본어, 중국어, 영어, 태국어, 베트남어 등 8개 언어 지원.',
    detail: '언어 선택 없이 시작',
  },
  {
    n: '02', title: '상담 — 실시간 번역',
    desc: 'Tiki Paste 또는 Tiki Talk를 통해 의료진과 환자 간 언어 장벽을 제거합니다. 의사는 한국어로, 환자는 모국어로.',
    detail: '지연 없는 양방향 번역',
  },
  {
    n: '03', title: '진료실 — 태블릿 통역',
    desc: 'Tiki Room 태블릿이 진료실 내 통역을 지원합니다. 위험 표현 감지 시 의료진에게 즉각 알림.',
    detail: '음성 → 텍스트 → 번역',
  },
  {
    n: '04', title: '세션 종료 — 자동 기억',
    desc: '세션이 저장되면 AI가 7가지 환자 컨텍스트를 자동 추출해 Tiki Memory에 누적합니다. 다음 방문을 위한 준비.',
    detail: '영구 안전 보관',
  },
];

function SessionFlow() {
  const [ref, visible] = useReveal();
  return (
    <section id="session" style={{ padding: '120px 0', background: C.bgSub }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div ref={ref} style={{
          marginBottom: 64,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: C.mocha,
            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            진료 흐름
          </p>
          <h2 style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2,
            color: C.text, maxWidth: 420, wordBreak: 'keep-all',
          }}>
            한 명의 환자,<br />
            네 번의 언어 접점.
          </h2>
        </div>

        <div className="session-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {SESSION_STEPS.map((step, i) => {
            const [stepRef, stepVisible] = useReveal();
            return (
              <div key={i} ref={stepRef} style={{
                background: C.surface,
                borderRadius: i === 0 ? '16px 4px 4px 4px' : i === 1 ? '4px 16px 4px 4px' : i === 2 ? '4px 4px 4px 16px' : '4px 4px 16px 4px',
                padding: '32px 36px',
                opacity: stepVisible ? 1 : 0,
                transform: stepVisible ? 'none' : 'translateY(16px)',
                transition: `opacity 0.5s ${i * 90}ms ease, transform 0.5s ${i * 90}ms ease`,
                position: 'relative',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: C.mocha,
                  letterSpacing: '0.08em', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: C.mochaPale,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color: C.mocha,
                  }}>
                    {step.n}
                  </div>
                  <span style={{ color: C.textMt, fontWeight: 600, letterSpacing: '0.05em' }}>
                    {step.detail}
                  </span>
                </div>
                <h3 style={{
                  fontSize: 17, fontWeight: 700, color: C.text,
                  letterSpacing: '-0.03em', marginBottom: 12,
                  lineHeight: 1.4, wordBreak: 'keep-all',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 13, color: C.textSub, lineHeight: 1.8,
                  letterSpacing: '-0.01em', wordBreak: 'keep-all',
                  fontWeight: 400,
                }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────────────
function Trust() {
  const [ref, visible] = useReveal();
  const items = [
    { icon: '🔒', title: '개인정보 안전 보관', desc: '원문 텍스트는 72시간 후 자동 삭제. 요약본과 컨텍스트만 영구 보관.' },
    { icon: '⚖️', title: '의료 안전 필터', desc: '진단, 예후, 약물 정보 등 AI가 절대 말해서는 안 되는 표현을 전부 차단.' },
    { icon: '📋', title: '의료법 준수 설계', desc: '한국 개인정보보호법(PIPA) 기준으로 데이터 보관 및 파기 정책 설계.' },
  ];

  return (
    <section style={{ padding: '100px 0', background: C.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div ref={ref} style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: C.mocha,
            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            신뢰와 안전
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.25,
            color: C.text, marginBottom: 52, maxWidth: 380, wordBreak: 'keep-all',
          }}>
            AI가 말할 수 없는 것을<br />
            명확히 정의합니다.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
            className="modules-grid">
            {items.map((item, i) => (
              <div key={i} style={{
                padding: '28px 28px',
                background: C.surface,
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(1,69,242,0.05)',
              }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{
                  fontSize: 15, fontWeight: 700, color: C.text,
                  letterSpacing: '-0.025em', marginBottom: 10, lineHeight: 1.4,
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: 13, color: C.textSub, lineHeight: 1.75,
                  letterSpacing: '-0.01em', fontWeight: 400, wordBreak: 'keep-all',
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: '스타터',
    sub: '단일 진료과 클리닉',
    price: '₩89,000',
    period: '/월',
    features: ['Tiki Paste 무제한', '3개 언어 지원', '기본 Tiki Memory', '이메일 지원'],
    cta: '무료 체험 시작',
    ctaHref: '/signup',
    highlight: false,
  },
  {
    name: '클리닉',
    sub: '다진료과 / 중형 클리닉',
    price: '₩249,000',
    period: '/월',
    features: ['Tiki Talk + Tiki Room', '8개 언어 전체 지원', 'Tiki Memory 전체 기능', '프로토콜 라이브러리', '전담 온보딩'],
    cta: '데모 신청하기',
    ctaHref: '/signup',
    highlight: true,
  },
  {
    name: '엔터프라이즈',
    sub: '대형 병원 / 그룹사',
    price: '문의',
    period: '',
    features: ['전 기능 무제한', '전용 서버 구축 옵션', 'EMR 연동 지원', '맞춤 SLA 계약', '전담 CS 매니저'],
    cta: '도입 상담',
    ctaHref: '/signup',
    highlight: false,
  },
];

function Pricing() {
  const [ref, visible] = useReveal();
  return (
    <section id="pricing" style={{ padding: '120px 0', background: C.bgSub }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div ref={ref} style={{
          marginBottom: 60,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 800, color: C.mocha,
            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            요금제
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.25,
            color: C.text, maxWidth: 360, wordBreak: 'keep-all',
          }}>
            병원 규모에 맞게,<br />
            처음부터 유연하게.
          </h2>
        </div>

        <div
          className="pricing-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}
        >
          {PLANS.map((plan, i) => {
            const [cardRef, cardVisible] = useReveal();
            return (
              <div key={i} ref={cardRef} style={{
                background: plan.highlight ? C.mocha : C.surface,
                borderRadius: 18,
                padding: '32px 30px',
                boxShadow: plan.highlight
                  ? `0 16px 48px ${C.mocha}35, 0 4px 16px ${C.mocha}20`
                  : '0 2px 8px rgba(1,69,242,0.06)',
                opacity: cardVisible ? 1 : 0,
                transform: cardVisible ? (plan.highlight ? 'scale(1.03)' : 'none') : 'translateY(20px)',
                transition: `opacity 0.5s ${i * 80}ms ease, transform 0.5s ${i * 80}ms ease`,
              }}>
                <div style={{ marginBottom: 24 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700,
                    color: plan.highlight ? 'rgba(255,255,255,0.6)' : C.textMt,
                    letterSpacing: '0.04em', marginBottom: 4,
                  }}>
                    {plan.sub}
                  </p>
                  <h3 style={{
                    fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em',
                    color: plan.highlight ? C.white : C.text,
                    marginBottom: 2,
                  }}>
                    {plan.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 16 }}>
                    <span style={{
                      fontSize: plan.price === '문의' ? 24 : 30,
                      fontWeight: 800, letterSpacing: '-0.04em',
                      color: plan.highlight ? C.white : C.text,
                    }}>
                      {plan.price}
                    </span>
                    <span style={{
                      fontSize: 13,
                      color: plan.highlight ? 'rgba(255,255,255,0.55)' : C.textMt,
                    }}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div style={{
                  height: 1,
                  background: plan.highlight ? 'rgba(255,255,255,0.15)' : `rgba(16,54,125,0.10)`,
                  marginBottom: 24,
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Check
                        size={13}
                        color={plan.highlight ? 'rgba(255,255,255,0.7)' : C.mocha}
                        strokeWidth={2.5}
                      />
                      <span style={{
                        fontSize: 13, fontWeight: 400,
                        color: plan.highlight ? 'rgba(255,255,255,0.85)' : C.textSub,
                        letterSpacing: '-0.01em',
                      }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link to={plan.ctaHref} style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px',
                  background: plan.highlight ? C.white : C.mochaPale,
                  color: plan.highlight ? C.mocha : C.text,
                  borderRadius: 10,
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  const [ref, visible] = useReveal();
  return (
    <section style={{ padding: '120px 0', background: C.bg }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px' }}>
        <div ref={ref} style={{
          background: C.mocha,
          borderRadius: 24,
          padding: '72px 80px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 40, flexWrap: 'wrap',
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <div style={{ maxWidth: 500 }}>
            <p style={{
              fontSize: 10, fontWeight: 800,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              지금 시작하기
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2,
              color: C.white, wordBreak: 'keep-all',
            }}>
              언어 때문에 놓친 환자는<br />
              없어야 합니다.
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
            <Link to="/signup" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: C.white, color: C.mocha,
              padding: '14px 28px', borderRadius: 11,
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
              transition: 'opacity 0.15s',
              textAlign: 'center',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              데모 신청하기 <ArrowRight size={15} />
            </Link>
            <Link to="/login" style={{
              display: 'block', textAlign: 'center',
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)',
              letterSpacing: '-0.01em',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.95)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            >
              이미 계정이 있으신가요? 로그인 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      background: C.text, // Near-black warm — grounding
      padding: '64px 40px 48px',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        {/* Top: logo + tagline */}
        <div style={{ marginBottom: 48, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.mocha,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={12} color="#fff" fill="#fff" strokeWidth={0} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em', color: C.white }}>
              TikiDoc
            </span>
          </div>
          <p style={{
            fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.45)',
            letterSpacing: '-0.02em', lineHeight: 1.6,
            maxWidth: 340, wordBreak: 'keep-all',
          }}>
            말이 통해야 치료가 시작됩니다.
          </p>
        </div>

        {/* Links + meta */}
        <div className="footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {[
              ['제품', '#modules'],
              ['워크플로우', '#session'],
              ['요금제', '#pricing'],
              ['개인정보처리방침', '/privacy'],
              ['이용약관', '/terms'],
            ].map(([label, href]) => (
              <a key={label} href={href} style={{
                fontSize: 12, color: 'rgba(255,255,255,0.35)',
                letterSpacing: '-0.01em', fontWeight: 500,
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >{label}</a>
            ))}
          </div>
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.22)',
            letterSpacing: '0.01em', fontWeight: 400,
            whiteSpace: 'nowrap',
          }}>
            © 2026 TikiDoc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Divider />
        <SignalBar />
        <Divider />
        <Modules />
        <SessionFlow />
        <Trust />
        <Divider />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
