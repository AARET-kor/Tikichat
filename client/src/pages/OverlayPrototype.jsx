import { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Check, BookmarkPlus, Sparkles, Monitor, Crosshair, ChevronDown, ChevronUp, Minus, X, AlertTriangle, Loader2, Languages, Brain, Scan } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const M = {
  bg:        '#EDF1F5',
  bgSub:     '#EBEBEB',
  white:     '#FFFFFF',
  text:      '#1B262C',
  textSub:   '#40515D',
  textMt:    '#6B7C88',
  border:    '#D6E1EA',
  borderMd:  '#BBE1FA',
  mocha:     '#0145F2',
  mochaDk:   '#10367D',
  mochaLt:   '#BBE1FA',
  mochaPale: '#E6F0FF',
  sage:      '#3B6500',
  sagePale:  '#ECFFD1',
  gold:      '#0F4C75',
  goldPale:  '#E6F4FF',
  red:       '#C0392B',
  redLt:     '#E74C3C',
  redBg:     '#FDF0EF',
  redBorder: '#FADBD8',
  overlay:   'rgba(28,15,10,0.55)',
};

const SANS = "'Pretendard Variable','Inter',system-ui,-apple-system,sans-serif";

// ── Mock scenarios ────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'idle',
    label: 'Idle',
    shortLabel: '—',
  },
  {
    id: 'zh_normal',
    label: '中文 · Normal',
    shortLabel: '🇨🇳',
    ocrText: '你好，我手术后第三天了，伤口有一点红肿，这是正常的吗？谢谢医生。',
    language: { code: 'zh', label: 'Chinese (Simplified)', flag: '🇨🇳' },
    intent: 'Patient is 3 days post-op and asking whether mild redness and swelling around the incision is a normal part of recovery.',
    highRisk: false,
    replies: [
      {
        lang: 'KO', label: '한국어',
        text: '안녕하세요! 수술 후 3일째 약간의 붓기와 발적은 정상적인 회복 과정입니다. 보통 3~5일이 가장 심하고 이후 점차 나아집니다. 통증이 심해지거나 열이 나면 바로 연락 주세요.',
      },
      {
        lang: 'ZH', label: '中文',
        text: '您好！术后第三天出现轻微红肿是完全正常的。通常在3-5天最为明显，之后会逐渐消退。如果疼痛加剧或出现发热，请立即联系我们。',
      },
      {
        lang: 'EN', label: 'English',
        text: 'Hi! Mild redness and swelling at day 3 is completely normal. It typically peaks around days 3–5 and gradually improves. Contact us right away if pain worsens or fever develops.',
      },
    ],
  },
  {
    id: 'ja_highrisk',
    label: '日本語 · HIGH RISK',
    shortLabel: '🇯🇵 ⚠️',
    ocrText: '手術後に高熱が出て、傷口から黄色い膿が出ています。昨夜から続いています。とても心配です。',
    language: { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    intent: 'Patient reports high fever and yellow purulent discharge from the surgical wound, persisting since last night. Urgent concern expressed.',
    highRisk: true,
    highRiskReason: 'Fever + purulent discharge = signs of surgical site infection (SSI). Immediate clinical assessment required — do not delay.',
    replies: [
      {
        lang: 'KO', label: '한국어 (긴급)',
        text: '걱정이 많으시겠습니다. 고열과 상처 부위 고름은 즉각적인 확인이 필요합니다. 오늘 바로 내원해 주세요. 방문이 어려우시면 지금 바로 전화 주시기 바랍니다.',
      },
      {
        lang: 'JA', label: '日本語 (緊急)',
        text: 'ご心配のことと思います。高熱と傷口からの膿はすぐに確認が必要な症状です。本日中にご来院ください。来院が難しい場合は、今すぐお電話ください。',
      },
      {
        lang: 'EN', label: 'English (Urgent)',
        text: 'We hear your concern. High fever with pus discharge requires immediate medical attention. Please come in today — if you cannot visit, call us right now.',
      },
    ],
  },
  {
    id: 'en_normal',
    label: 'English · Normal',
    shortLabel: '🇬🇧',
    ocrText: "Hi, it's been 5 days since my rhinoplasty. When can I wash my face? Also when can I wear glasses again?",
    language: { code: 'en', label: 'English', flag: '🇬🇧' },
    intent: 'Patient at day 5 post-rhinoplasty asking about face washing timeline and when glasses can be safely worn.',
    highRisk: false,
    replies: [
      {
        lang: 'KO', label: '한국어',
        text: '안녕하세요! 코 수술 후 5일째이시군요. 세안은 수술 부위를 피해 7일 이후부터 가능합니다. 안경은 최소 6주간 착용을 삼가 주세요 — 가벼운 안경도 뼈 고정에 영향을 줄 수 있습니다.',
      },
      {
        lang: 'ZH', label: '中文',
        text: '您好！鼻部手术后第5天。洗脸方面，术后7天起可以轻柔清洗，但要避开手术部位。眼镜至少需要等待6周，直到骨骼完全固定，即使是轻型眼镜也会产生压力。',
      },
      {
        lang: 'EN', label: 'English',
        text: 'Hi! At day 5, you can gently wash your face from day 7 — avoid the surgical area. Glasses should be avoided for at least 6 weeks until the nasal bones fully set. Even light frames can shift the result.',
      },
    ],
  },
];

// ── Mock desktop background chat messages ─────────────────────────────────────
const MOCK_CHAT = {
  zh_normal: [
    { from: 'them', text: '你好医生', time: '14:22' },
    { from: 'them', text: '我手术后第三天了', time: '14:22' },
    { from: 'them', text: '你好，我手术后第三天了，伤口有一点红肿，这是正常的吗？谢谢医生。', time: '14:23' },
    { from: 'me',   text: '안녕하세요! 확인해 드리겠습니다.', time: '14:24' },
  ],
  ja_highrisk: [
    { from: 'them', text: '先生、少し心配なことがあります', time: '02:14' },
    { from: 'them', text: '手術後に高熱が出て、傷口から黄色い膿が出ています。昨夜から続いています。とても心配です。', time: '02:15' },
  ],
  en_normal: [
    { from: 'them', text: 'Hello! Hope you are doing well', time: '10:05' },
    { from: 'them', text: "Hi, it's been 5 days since my rhinoplasty. When can I wash my face? Also when can I wear glasses again?", time: '10:06' },
    { from: 'me',   text: 'Let me check with the doctor!', time: '10:07' },
  ],
  idle: [
    { from: 'them', text: '안녕하세요', time: '09:00' },
    { from: 'me',   text: '안녕하세요! 무엇을 도와드릴까요?', time: '09:01' },
  ],
};

// ── Tiki Flash ────────────────────────────────────────────────────────────────
const SPARKS = [
  { x: -36, y: -36, char: '✦', size: 10, delay: 0    },
  { x:  36, y: -36, char: '✧', size:  8, delay: 40   },
  { x:  36, y:  36, char: '·', size: 12, delay: 80   },
  { x: -36, y:  36, char: '✦', size:  7, delay: 20   },
  { x: -50, y:   0, char: '✧', size:  9, delay: 60   },
  { x:  50, y:   0, char: '·', size: 11, delay: 100  },
  { x:   0, y: -50, char: '✦', size:  8, delay: 30   },
  { x:   0, y:  50, char: '✧', size: 10, delay: 70   },
];

function TikiFlash({ active }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle 120px at center, ${M.mocha}22 0%, transparent 70%)`,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.15s',
      }} />

      {/* Center burst */}
      <div key={active ? 'on' : 'off'} style={{
        fontSize: 32, color: M.gold, lineHeight: 1,
        animation: active ? 'tikiBurst 0.6s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
        position: 'relative',
      }}>✦</div>

      {/* Particles */}
      {SPARKS.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          fontSize: s.size,
          color: i % 2 === 0 ? M.gold : M.mocha,
          left: `calc(50% + ${s.x}px)`,
          top:  `calc(50% + ${s.y}px)`,
          animation: active
            ? `tikiParticle 0.7s ${s.delay}ms cubic-bezier(0.22,1,0.36,1) forwards`
            : 'none',
          opacity: 0,
        }}>{s.char}</div>
      ))}

      {/* Rings */}
      {[80, 130].map((size, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: '50%',
          border: `1.5px solid ${M.mocha}`,
          animation: active
            ? `tikiRing 0.7s ${i * 80}ms cubic-bezier(0.22,1,0.36,1) forwards`
            : 'none',
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes tikiBurst {
    0%   { transform: scale(0.3) rotate(-20deg); opacity: 0; }
    40%  { transform: scale(1.4) rotate(8deg);  opacity: 1; }
    70%  { transform: scale(0.95) rotate(-3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg);    opacity: 0; }
  }
  @keyframes tikiParticle {
    0%   { transform: translate(0,0) scale(0); opacity: 0; }
    30%  { opacity: 1; }
    100% { transform: translate(var(--tx,8px), var(--ty,-8px)) scale(1.2); opacity: 0; }
  }
  @keyframes tikiRing {
    0%   { transform: scale(0.2); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes auroraGlow {
    0%,100% { background-position: 0% 50%; }
    50%     { background-position: 100% 50%; }
  }
  @keyframes scanPulse {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.35; }
  }
  @keyframes scanLine {
    0%   { top: 0; }
    100% { top: 100%; }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulseDot {
    0%,100% { transform: scale(1); opacity: 1; }
    50%     { transform: scale(1.5); opacity: 0.6; }
  }
  @keyframes highRiskPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.25); }
    50%     { box-shadow: 0 0 0 6px rgba(192,57,43,0); }
  }

  .overlay-panel::-webkit-scrollbar { width: 3px; }
  .overlay-panel::-webkit-scrollbar-thumb { background: ${M.border}; border-radius: 4px; }
  .overlay-panel::-webkit-scrollbar-track { background: transparent; }

  .reply-card:hover { background: ${M.mochaPale} !important; border-color: ${M.mocha}40 !important; }
  .copy-btn:hover { background: ${M.mocha} !important; color: #fff !important; }
  .action-btn:hover { opacity: 0.82; transform: translateY(-1px); }
  .scenario-btn:hover { background: ${M.mochaPale} !important; border-color: ${M.mocha}50 !important; }
  .scenario-btn.active { background: ${M.mocha} !important; color: #fff !important; border-color: ${M.mocha} !important; }
`;

// ── Main overlay panel ────────────────────────────────────────────────────────
function OverlayPanel({ scenario, onScan, scanning, result, onGenerate, generating, onTiki }) {
  const [expanded, setExpanded] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(false);
  const [areaSelected, setAreaSelected] = useState(false);

  // Drag logic
  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      px: pos.x, py: pos.y,
    };
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging || !dragStart.current) return;
      setPos({
        x: dragStart.current.px + (e.clientX - dragStart.current.mx),
        y: dragStart.current.py + (e.clientY - dragStart.current.my),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    onTiki();
    setTimeout(() => setCopied(null), 1800);
  };

  const handleSave = () => {
    setSaved(true);
    onTiki();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectArea = () => {
    setAreaSelected(true);
    setTimeout(() => setAreaSelected(false), 1200);
  };

  const hasResult = !!result;
  const W = 300;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        right: 24 + (-pos.x),
        top: 24 + pos.y,
        width: W,
        fontFamily: SANS,
        userSelect: 'none',
        zIndex: 100,
        filter: 'drop-shadow(0 8px 32px rgba(28,15,10,0.28))',
        transform: dragging ? 'scale(1.01)' : 'scale(1)',
        transition: dragging ? 'none' : 'transform 0.15s',
      }}
    >
      {/* Glass panel */}
      <div style={{
        background: 'rgba(250,246,243,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid rgba(229,207,197,0.7)`,
        borderRadius: 16,
        overflow: 'hidden',
      }}>

        {/* ── Header / drag handle ────────────────────────────── */}
        <div
          onMouseDown={onMouseDown}
          style={{
            cursor: dragging ? 'grabbing' : 'grab',
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: `linear-gradient(135deg, ${M.mocha}F0 0%, ${M.mochaDk}F0 100%)`,
            userSelect: 'none',
          }}
        >
          {/* Logo */}
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 900, letterSpacing: '-0.05em' }}>T</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>TikiDoc Overlay</div>
            {!expanded && result && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                {result.language.flag} {result.language.label}
              </div>
            )}
          </div>

          {/* Status dot */}
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: scanning || generating ? M.gold : (hasResult ? '#5cb85c' : 'rgba(255,255,255,0.4)'),
            animation: (scanning || generating) ? 'pulseDot 1s ease infinite' : 'none',
            flexShrink: 0,
          }} />

          {/* Window controls */}
          <div style={{ display: 'flex', gap: 5, marginLeft: 2 }}>
            <button
              onClick={() => setExpanded(p => !p)}
              style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}
            >
              {expanded ? <Minus size={8} /> : <ChevronDown size={8} />}
            </button>
          </div>
        </div>

        {/* Aurora accent line */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, ${M.mocha}, ${M.gold}, ${M.sage}, ${M.mocha})`,
          backgroundSize: '300% 100%',
          animation: 'auroraGlow 4s ease infinite',
        }} />

        {/* ── Expandable body ─────────────────────────────────── */}
        <div style={{
          maxHeight: expanded ? 600 : 0,
          overflow: expanded ? 'auto' : 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }} className="overlay-panel">
          <div style={{ padding: '12px 12px 14px' }}>

            {/* ── Action row ────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                className="action-btn"
                onClick={handleSelectArea}
                style={{
                  flex: 1, padding: '7px 6px',
                  background: areaSelected ? M.sagePale : M.bgSub,
                  border: `1.5px solid ${areaSelected ? M.sage : M.border}`,
                  borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, color: areaSelected ? M.sage : M.textSub,
                  fontFamily: SANS, transition: 'all 0.15s',
                }}
              >
                <Crosshair size={11} />
                {areaSelected ? 'Area Set' : 'Select Area'}
              </button>

              <button
                className="action-btn"
                onClick={onScan}
                disabled={scanning}
                style={{
                  flex: 1, padding: '7px 6px',
                  background: scanning ? M.mochaPale : M.bgSub,
                  border: `1.5px solid ${scanning ? M.mocha + '60' : M.border}`,
                  borderRadius: 8, cursor: scanning ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, color: scanning ? M.mocha : M.textSub,
                  fontFamily: SANS, transition: 'all 0.15s',
                  animation: scanning ? 'scanPulse 1.2s ease infinite' : 'none',
                }}
              >
                {scanning
                  ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Reading…</>
                  : <><Monitor size={11} /> Read Screen</>
                }
              </button>
            </div>

            {/* ── OCR preview ───────────────────────────────── */}
            {result?.ocrText && (
              <div style={{
                marginBottom: 10, padding: '8px 10px',
                background: M.bgSub, border: `1px solid ${M.border}`,
                borderRadius: 8,
                animation: 'fadeSlideIn 0.3s ease',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: M.textMt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  <Scan size={9} style={{ display: 'inline', marginRight: 3 }} />OCR Capture
                </div>
                <p style={{ fontSize: 10.5, color: M.textSub, lineHeight: 1.55, fontFamily: 'monospace' }}>
                  {result.ocrText}
                </p>
              </div>
            )}

            {/* ── Generate button ───────────────────────────── */}
            <button
              className="action-btn"
              onClick={onGenerate}
              disabled={generating || !result?.ocrText}
              style={{
                width: '100%', padding: '9px',
                borderRadius: 9, border: 'none',
                background: (generating || !result?.ocrText)
                  ? M.border
                  : `linear-gradient(135deg, ${M.mocha} 0%, ${M.mochaDk} 100%)`,
                color: (generating || !result?.ocrText) ? M.textMt : '#fff',
                fontSize: 11, fontWeight: 800,
                cursor: (generating || !result?.ocrText) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: SANS, letterSpacing: '-0.01em',
                boxShadow: (!generating && result?.ocrText) ? `0 3px 14px ${M.mocha}45` : 'none',
                transition: 'all 0.18s', marginBottom: 12,
              }}
            >
              {generating
                ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Sparkles size={12} /> Generate Replies</>
              }
            </button>

            {/* ── Results ───────────────────────────────────── */}
            {result?.replies && (
              <div style={{ animation: 'fadeSlideIn 0.35s ease' }}>

                {/* Language + intent */}
                <div style={{ marginBottom: 8, padding: '8px 10px', background: M.bgSub, borderRadius: 8, border: `1px solid ${M.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Languages size={11} color={M.mocha} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: M.textSub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language</span>
                    <div style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700, color: M.mocha,
                      background: M.mochaPale, padding: '2px 7px', borderRadius: 99,
                      border: `1px solid ${M.mocha}25`,
                    }}>
                      <span>{result.language.flag}</span>
                      <span>{result.language.label}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Brain size={10} color={M.textMt} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 10, color: M.textSub, lineHeight: 1.5 }}>{result.intent}</p>
                  </div>
                </div>

                {/* HIGH RISK banner */}
                {result.highRisk && (
                  <div style={{
                    marginBottom: 8, padding: '9px 10px',
                    background: M.redBg, border: `1.5px solid ${M.redBorder}`,
                    borderRadius: 9,
                    animation: 'fadeSlideIn 0.3s ease, highRiskPulse 2s ease infinite',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={12} color={M.red} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.red, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        High-Risk Medical Concern
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: '#922B21', lineHeight: 1.5, paddingLeft: 18 }}>
                      {result.highRiskReason}
                    </p>
                  </div>
                )}

                {/* Reply cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {result.replies.map((r, i) => (
                    <div
                      key={i}
                      className="reply-card"
                      style={{
                        padding: '8px 10px',
                        background: M.white,
                        border: `1.5px solid ${M.border}`,
                        borderRadius: 9,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: M.mocha,
                          background: M.mochaPale, padding: '2px 7px', borderRadius: 99,
                          border: `1px solid ${M.mocha}25`, letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>{r.label}</span>

                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(r.text, i)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 6,
                            background: copied === i ? M.sage : M.bgSub,
                            border: `1px solid ${copied === i ? M.sage : M.border}`,
                            color: copied === i ? '#fff' : M.textSub,
                            fontSize: 9, fontWeight: 700, cursor: 'pointer',
                            fontFamily: SANS, transition: 'all 0.15s',
                          }}
                        >
                          {copied === i ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy Reply</>}
                        </button>
                      </div>
                      <p style={{ fontSize: 10.5, color: M.text, lineHeight: 1.6 }}>{r.text}</p>
                    </div>
                  ))}
                </div>

                {/* Save to Memory */}
                <button
                  onClick={handleSave}
                  style={{
                    width: '100%', padding: '8px',
                    borderRadius: 8, cursor: 'pointer',
                    background: saved ? M.sagePale : M.white,
                    border: `1.5px solid ${saved ? M.sage : M.border}`,
                    color: saved ? M.sage : M.textSub,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    fontFamily: SANS, transition: 'all 0.18s',
                  }}
                >
                  {saved
                    ? <><Check size={11} /> Saved to Memory</>
                    : <><BookmarkPlus size={11} /> Save to Memory</>
                  }
                </button>
              </div>
            )}

            {/* ── Empty state ───────────────────────────────── */}
            {!result && !scanning && !generating && (
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✦</div>
                <p style={{ fontSize: 10, color: M.textMt, lineHeight: 1.6 }}>
                  Select an area, then tap<br /><strong style={{ color: M.textSub }}>Read Screen</strong> to capture patient message
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hotkey hint */}
      {expanded && (
        <div style={{
          marginTop: 5, textAlign: 'center',
          fontSize: 9, color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.04em',
        }}>
          ⌘⇧T to capture · drag to reposition
        </div>
      )}
    </div>
  );
}

// ── Mock desktop background ───────────────────────────────────────────────────
function MockDesktop({ scenario }) {
  const chat = MOCK_CHAT[scenario?.id] || MOCK_CHAT.idle;
  const appName = { zh_normal: 'WeChat', ja_highrisk: 'LINE', en_normal: 'Instagram', idle: 'KakaoTalk' }[scenario?.id] || 'Messenger';
  const appColor = { zh_normal: '#07C160', ja_highrisk: '#06C755', en_normal: '#E1306C', idle: '#FAE100' }[scenario?.id] || M.mocha;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* OS-style window chrome */}
      <div style={{
        width: 480, height: 560,
        background: M.white,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        opacity: 0.9,
      }}>
        {/* Title bar */}
        <div style={{ height: 36, background: '#f0f0f0', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: '#666', fontFamily: SANS }}>{appName}</span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: appColor }} />
        </div>

        {/* Chat sidebar + main */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: 200, background: '#f8f8f8', borderRight: '1px solid #eee', padding: 8 }}>
            {[
              { name: scenario?.id === 'zh_normal' ? 'Liu Jing' : scenario?.id === 'ja_highrisk' ? 'Tanaka Yuki' : scenario?.id === 'en_normal' ? 'Sarah M.' : 'Park Minho', active: true, badge: scenario?.highRisk ? '!' : '1', color: appColor },
              { name: 'Chen Wei', active: false, badge: null },
              { name: 'Kim Nanako', active: false, badge: '3' },
              { name: 'Mohammed A.', active: false, badge: null },
            ].map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 8px', borderRadius: 8,
                background: c.active ? '#e8e8e8' : 'transparent',
                marginBottom: 2,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c.active ? appColor : '#ddd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 700, fontFamily: SANS, flexShrink: 0,
                }}>{c.name[0]}</div>
                <span style={{ fontSize: 11, color: c.active ? '#1a1a1a' : '#888', fontFamily: SANS, flex: 1 }}>{c.name}</span>
                {c.badge && (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: c.badge === '!' ? M.red : appColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#fff', fontWeight: 800,
                  }}>{c.badge}</div>
                )}
              </div>
            ))}
          </div>

          {/* Chat window */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Chat header */}
            <div style={{ height: 40, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: appColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                {(chat[0]?.text || 'A')[0]}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', fontFamily: SANS }}>
                {scenario?.id === 'zh_normal' ? 'Liu Jing' : scenario?.id === 'ja_highrisk' ? 'Tanaka Yuki ⚠' : scenario?.id === 'en_normal' ? 'Sarah M.' : 'Park Minho'}
              </span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', background: '#fafafa' }}>
              {chat.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start',
                  animation: 'fadeSlideIn 0.3s ease',
                }}>
                  <div style={{
                    maxWidth: '72%', padding: '7px 10px',
                    background: msg.from === 'me' ? appColor : '#fff',
                    color: msg.from === 'me' ? '#fff' : '#1a1a1a',
                    borderRadius: msg.from === 'me' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    fontSize: 11, lineHeight: 1.55, fontFamily: SANS,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                    {msg.text}
                    <span style={{ display: 'block', fontSize: 8, opacity: 0.55, marginTop: 3, textAlign: 'right' }}>{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input bar */}
            <div style={{ height: 40, background: '#fff', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
              <div style={{ flex: 1, height: 24, background: '#f0f0f0', borderRadius: 12, padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#bbb', fontFamily: SANS }}>Reply…</span>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: appColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff' }}>↑</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan overlay visual (selection box sim) */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-17%, -8%)',
        width: 280, height: 140,
        border: `2px dashed ${M.mocha}80`,
        borderRadius: 6,
        pointerEvents: 'none',
        boxShadow: `0 0 0 2000px rgba(0,0,0,0.12)`,
      }}>
        <div style={{
          position: 'absolute', top: -10, left: 8,
          fontSize: 8, color: M.gold, fontFamily: SANS, fontWeight: 700,
          background: 'rgba(28,15,10,0.7)', padding: '2px 6px', borderRadius: 4,
        }}>CAPTURE ZONE</div>
      </div>
    </div>
  );
}

// ── Scenario switcher (dev toolbar) ──────────────────────────────────────────
function ScenarioSwitcher({ current, onSelect }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, zIndex: 200,
      background: 'rgba(28,15,10,0.75)',
      backdropFilter: 'blur(12px)',
      padding: '7px 10px', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginRight: 4, letterSpacing: '0.06em', fontFamily: SANS }}>SCENARIO</span>
      {SCENARIOS.map(s => (
        <button
          key={s.id}
          className={`scenario-btn${current === s.id ? ' active' : ''}`}
          onClick={() => onSelect(s.id)}
          style={{
            fontSize: 9, fontWeight: 700, padding: '4px 9px',
            borderRadius: 7, cursor: 'pointer',
            background: current === s.id ? M.mocha : 'rgba(255,255,255,0.08)',
            color: current === s.id ? '#fff' : 'rgba(255,255,255,0.65)',
            border: `1px solid ${current === s.id ? M.mocha : 'rgba(255,255,255,0.12)'}`,
            fontFamily: SANS, transition: 'all 0.15s',
          }}
        >{s.label}</button>
      ))}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function OverlayPrototype() {
  const [scenarioId, setScenarioId] = useState('idle');
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [tikiActive, setTikiActive] = useState(false);
  const tikiTimer = useRef(null);

  const scenario = SCENARIOS.find(s => s.id === scenarioId);

  // When scenario changes, reset state
  useEffect(() => {
    setResult(null);
    setScanning(false);
    setGenerating(false);
  }, [scenarioId]);

  const triggerTiki = useCallback(() => {
    if (tikiTimer.current) clearTimeout(tikiTimer.current);
    setTikiActive(false);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTikiActive(true);
      tikiTimer.current = setTimeout(() => setTikiActive(false), 700);
    }));
  }, []);

  const handleScan = () => {
    if (scanning || scenarioId === 'idle') return;
    setResult(null);
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      // After scan, show OCR text only (no replies yet)
      setResult({ ocrText: scenario.ocrText, language: null, intent: null, replies: null, highRisk: false });
      triggerTiki();
    }, 1800);
  };

  const handleGenerate = () => {
    if (generating || !result?.ocrText) return;
    setGenerating(true);
    triggerTiki();
    setTimeout(() => {
      setGenerating(false);
      setResult({
        ocrText: scenario.ocrText,
        language: scenario.language,
        intent: scenario.intent,
        highRisk: scenario.highRisk,
        highRiskReason: scenario.highRiskReason,
        replies: scenario.replies,
      });
      triggerTiki();
    }, 2200);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: SANS }}>
      <style>{GLOBAL_CSS}</style>

      {/* Simulated desktop */}
      <MockDesktop scenario={scenario} />

      {/* The overlay panel */}
      <OverlayPanel
        scenario={scenario}
        onScan={handleScan}
        scanning={scanning}
        result={result}
        onGenerate={handleGenerate}
        generating={generating}
        onTiki={triggerTiki}
      />

      {/* Tiki flash (global) */}
      <TikiFlash active={tikiActive} />

      {/* Scenario switcher */}
      <ScenarioSwitcher current={scenarioId} onSelect={setScenarioId} />

      {/* Top label */}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: SANS,
        letterSpacing: '0.12em', textTransform: 'uppercase', pointerEvents: 'none',
      }}>
        TikiDoc Overlay — Frontend Prototype
      </div>
    </div>
  );
}
