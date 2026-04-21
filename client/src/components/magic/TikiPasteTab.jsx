import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Clipboard, Copy, Check, AlertCircle, Loader2,
  RefreshCcw, Globe, Brain, Monitor, ScanLine,
  ChevronRight, BookOpen, ShieldAlert, Zap, Heart,
  TrendingUp, Save, Search, UserPlus, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  mocha:     '#A47864',
  mochaDk:   '#7A5545',
  mochaLt:   '#C4A090',
  mochaPale: '#F5EDE8',
  bg:        '#FAF6F3',
  bgSub:     '#F0E8E3',
  bgDeep:    '#EAE0D8',
  white:     '#FFFFFF',
  text:      '#1C0F0A',
  textSub:   '#6B4A3A',
  textMt:    '#B09080',
  border:    '#E5CFC5',
  borderMd:  '#CCADA0',
  sage:      '#5A8F80',
  sagePale:  '#E4F2EF',
  gold:      '#D09262',
  goldPale:  '#FBF0E6',
  red:       '#B85C44',
  redPale:   '#FDF2EE',
};

const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

// ── CSS keyframes ─────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  * { font-family: ${SANS}; box-sizing: border-box; }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(14px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shimmerSweep {
    0%   { transform: translateX(-120%); }
    100% { transform: translateX(220%); }
  }
  @keyframes pasteFlash {
    0%   { box-shadow: 0 0 0 0 rgba(164,120,100,0), 0 2px 8px rgba(164,120,100,0.06); }
    35%  { box-shadow: 0 0 0 4px rgba(164,120,100,0.22), 0 6px 28px rgba(164,120,100,0.14); }
    100% { box-shadow: 0 0 0 3px rgba(164,120,100,0.10), 0 2px 8px rgba(164,120,100,0.06); }
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes tikiBurst {
    0%   { opacity:0; transform:scale(0.1) rotate(-20deg); }
    38%  { opacity:1; transform:scale(1.5) rotate(8deg);   }
    65%  { opacity:0.85; transform:scale(1.2) rotate(-4deg); }
    100% { opacity:0; transform:scale(1.9) rotate(14deg);  }
  }
  @keyframes tikiParticle {
    0%   { opacity:1; transform:translate(0,0) scale(1); }
    100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.1); }
  }
  @keyframes tikiRing {
    0%   { opacity:0.5; transform:scale(0.5); }
    100% { opacity:0;   transform:scale(2.4); }
  }
  @keyframes tikiBackdrop {
    0%   { opacity:0; }
    30%  { opacity:1; }
    100% { opacity:0; }
  }
  @keyframes analysisIn {
    from { opacity:0; transform:translateY(-8px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .paste-textarea:focus { outline: none; }
  .mode-tab { transition: all 0.18s ease; cursor: pointer; }
  .action-btn { transition: all 0.15s ease; cursor: pointer; }
  .reply-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
  .reply-card:hover { transform: translateY(-2px); }
  .copy-btn { transition: all 0.15s ease; cursor: pointer; }
  .copy-btn:hover { opacity: 0.8; }
`;

// ── TikiFlash — signature ✦ burst ─────────────────────────────────────────────
const SPARKS = [
  { tx:'-52px', ty:'-46px', ch:'✦', sz:13, d:0    },
  { tx:' 50px', ty:'-40px', ch:'✧', sz:11, d:50   },
  { tx:' 58px', ty:' 28px', ch:'·', sz:17, d:90   },
  { tx:'-50px', ty:' 36px', ch:'✦', sz:10, d:30   },
  { tx:'  4px', ty:'-62px', ch:'✧', sz:12, d:70   },
  { tx:'  6px', ty:' 56px', ch:'·', sz:15, d:20   },
  { tx:'-68px', ty:' -6px', ch:'✦', sz: 9, d:110  },
  { tx:' 64px', ty:'  2px', ch:'·', sz:10, d:10   },
  { tx:'-28px', ty:' 54px', ch:'✧', sz: 8, d:140  },
  { tx:' 32px', ty:'-54px', ch:'✦', sz: 9, d:60   },
];
function TikiFlash({ active }) {
  if (!active) return null;
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 44%, rgba(164,120,100,0.18) 0%, transparent 55%)`, animation:'tikiBackdrop 0.95s ease forwards' }} />
      <div style={{ position:'absolute', width:120, height:120, borderRadius:'50%', border:`2px solid ${C.mocha}`, animation:'tikiRing 0.9s ease-out forwards' }} />
      <div style={{ position:'absolute', width:60, height:60, borderRadius:'50%', border:`1.5px solid ${C.gold}`, animation:'tikiRing 0.7s ease-out 80ms forwards' }} />
      <div style={{ position:'relative', fontSize:42, lineHeight:1, color:C.mocha, zIndex:1, filter:`drop-shadow(0 0 14px ${C.mocha}) drop-shadow(0 0 6px ${C.gold})`, animation:'tikiBurst 0.95s ease-out forwards', userSelect:'none', fontFamily:'serif' }}>✦</div>
      {SPARKS.map((s, i) => (
        <span key={i} style={{ position:'absolute', fontSize:s.sz, zIndex:1, color: i%3===0 ? C.mocha : i%3===1 ? C.gold : C.mochaLt, top:'50%', left:'50%', transform:'translate(-50%,-50%)', '--tx':s.tx, '--ty':s.ty, animation:`tikiParticle 0.8s ease-out ${s.d}ms forwards`, userSelect:'none', lineHeight:1 }}>{s.ch}</span>
      ))}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      zIndex:9998, display:'flex', alignItems:'center', gap:8,
      padding:'10px 18px', borderRadius:12,
      background: C.text, border:`1px solid ${C.mocha}55`,
      color:'#fff', fontSize:12, fontWeight:600,
      animation:'fadeSlideUp 0.2s ease-out',
      boxShadow:`0 4px 24px rgba(164,120,100,0.28)`,
      pointerEvents:'none', whiteSpace:'nowrap',
    }}>
      <Check size={13} style={{ color:C.mocha }} />
      {message}
    </div>
  );
}

// ── Input mode tabs ───────────────────────────────────────────────────────────
const INPUT_MODES = [
  { id: 'paste',  label: 'Paste',       icon: Clipboard,  desc: '텍스트 붙여넣기' },
  { id: 'screen', label: 'Read Screen', icon: Monitor,    desc: '화면 스크린샷 읽기' },
  { id: 'ocr',    label: 'OCR Capture', icon: ScanLine,   desc: '영역 캡처' },
];

function InputModeTabs({ mode, onSelect }) {
  return (
    <div style={{ display:'flex', gap:4, padding:'3px', background:C.bgSub, borderRadius:10, border:`1px solid ${C.border}` }}>
      {INPUT_MODES.map(m => {
        const active = mode === m.id;
        const Icon = m.icon;
        return (
          <button key={m.id} className="mode-tab" onClick={() => onSelect(m.id)} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'5px 11px', borderRadius:7, border:'none',
            background: active ? C.white : 'transparent',
            color: active ? C.mocha : C.textMt,
            fontSize:11, fontWeight: active ? 700 : 500,
            boxShadow: active ? `0 1px 4px rgba(164,120,100,0.14)` : 'none',
            letterSpacing:'-0.01em',
          }}>
            <Icon size={11} strokeWidth={active ? 2.2 : 1.8} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Paste zone ────────────────────────────────────────────────────────────────
function PasteZone({ value, onChange, onPaste, pasting }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      position:'relative', borderRadius:14, overflow:'hidden',
      background:C.white,
      border:`1.5px solid ${focused || pasting ? C.mocha + '70' : C.border}`,
      boxShadow: pasting ? undefined
        : focused ? `0 0 0 3px rgba(164,120,100,0.12), 0 2px 12px rgba(164,120,100,0.08)`
        : `0 1px 4px rgba(164,120,100,0.06)`,
      animation: pasting ? 'pasteFlash 0.75s ease-out forwards' : 'none',
      transition:'border-color 0.2s, box-shadow 0.2s',
    }}>
      {pasting && (
        <div style={{ position:'absolute', inset:0, zIndex:10, pointerEvents:'none', overflow:'hidden', borderRadius:14 }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, transparent 35%, rgba(164,120,100,0.12) 50%, transparent 65%)', animation:'shimmerSweep 0.6s ease-out' }} />
        </div>
      )}
      <textarea
        className="paste-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={'환자 메시지를 여기에 붙여넣으세요 (Ctrl+V / ⌘V)\n붙여넣는 즉시 자동 분석을 시작합니다\n\n예) "ヒアルロン酸の効果はいつ出ますか？副作用が心配です..."'}
        rows={5}
        style={{
          width:'100%', padding:'16px 18px', fontSize:13, lineHeight:1.7,
          color:C.text, background:'transparent', border:'none', resize:'none',
          caretColor:C.mocha, position:'relative', zIndex:20,
        }}
      />
      {/* Bottom accent line */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, transparent, ${C.mocha}, transparent)`,
        opacity: focused || pasting ? 1 : 0,
        transition:'opacity 0.2s',
      }} />
      {/* Paste badge */}
      {pasting && (
        <div style={{
          position:'absolute', top:12, right:14, zIndex:30,
          display:'flex', alignItems:'center', gap:5,
          padding:'4px 10px', borderRadius:999,
          background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`,
          color:'#fff', fontSize:10, fontWeight:700,
          boxShadow:`0 2px 12px rgba(164,120,100,0.4)`,
          animation:'fadeSlideUp 0.2s ease-out',
        }}>
          <Sparkles size={10} /> 분석 시작
        </div>
      )}
    </div>
  );
}

// ── Read screen zone ──────────────────────────────────────────────────────────
function ReadScreenZone({ onTextReady }) {
  const [status, setStatus] = useState('idle'); // idle | reading | done | error
  const [preview, setPreview] = useState('');

  const handleReadClipboard = async () => {
    setStatus('reading');
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text.trim()) {
            setPreview(text);
            setStatus('done');
            onTextReady(text);
            return;
          }
        }
      }
      // Fallback to text
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setPreview(text);
        setStatus('done');
        onTextReady(text);
        return;
      }
      setStatus('error');
    } catch {
      // Try plain text fallback
      try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          setPreview(text);
          setStatus('done');
          onTextReady(text);
          return;
        }
      } catch { /* ignore */ }
      setStatus('error');
    }
  };

  return (
    <div style={{ borderRadius:14, border:`1.5px solid ${C.border}`, background:C.white, overflow:'hidden' }}>
      <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:16, minHeight:120 }}>
        {status === 'idle' && (
          <>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:C.mochaPale, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Monitor size={20} color={C.mocha} strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>화면 스크린샷에서 읽기</p>
                <p style={{ fontSize:11, color:C.textMt, lineHeight:1.6 }}>채팅 화면을 캡처한 후 (Cmd+Ctrl+Shift+4)<br />클립보드 읽기 버튼을 누르세요</p>
              </div>
            </div>
            <button className="action-btn" onClick={handleReadClipboard} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'9px 20px', borderRadius:9,
              background:C.mocha, color:'#fff',
              border:'none', fontSize:12, fontWeight:700,
              boxShadow:`0 4px 14px rgba(164,120,100,0.4)`,
              letterSpacing:'-0.01em',
            }}>
              <Clipboard size={13} /> 클립보드 읽기
            </button>
          </>
        )}
        {status === 'reading' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, color:C.textSub }}>
            <Loader2 size={16} style={{ animation:'spin 1s linear infinite', color:C.mocha }} />
            <span style={{ fontSize:12, fontWeight:600 }}>클립보드를 읽는 중...</span>
          </div>
        )}
        {status === 'done' && (
          <div style={{ width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <Check size={13} color={C.sage} />
              <span style={{ fontSize:11, fontWeight:700, color:C.sage, letterSpacing:'0.04em' }}>텍스트 감지됨</span>
              <button className="action-btn" onClick={() => { setStatus('idle'); setPreview(''); }} style={{ marginLeft:'auto', fontSize:10, color:C.textMt, background:'none', border:'none', padding:0 }}>다시 캡처</button>
            </div>
            <div style={{ padding:'10px 12px', background:C.bg, borderRadius:8, border:`1px solid ${C.border}` }}>
              <p style={{ fontSize:12, color:C.textSub, lineHeight:1.65, whiteSpace:'pre-wrap' }}>{preview.slice(0, 200)}{preview.length > 200 ? '...' : ''}</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, textAlign:'center' }}>
            <p style={{ fontSize:12, color:C.red, fontWeight:600 }}>클립보드 접근 권한이 없습니다</p>
            <p style={{ fontSize:11, color:C.textMt }}>브라우저 설정에서 클립보드 권한을 허용하세요</p>
            <button className="action-btn" onClick={() => setStatus('idle')} style={{ fontSize:11, color:C.textSub, background:'none', border:`1px solid ${C.border}`, padding:'5px 12px', borderRadius:7 }}>다시 시도</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── OCR capture zone ──────────────────────────────────────────────────────────
function OCRCaptureZone({ onTextReady }) {
  const [pastedText, setPastedText] = useState('');

  const openOverlay = () => {
    window.open('/overlay', '_blank', 'width=420,height=680,toolbar=no,menubar=no');
  };

  return (
    <div style={{ borderRadius:14, border:`1.5px solid ${C.border}`, background:C.white, overflow:'hidden' }}>
      <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ width:40, height:40, borderRadius:11, background:C.mochaPale, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ScanLine size={18} color={C.mocha} strokeWidth={1.8} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>화면 영역 OCR 캡처</p>
            <p style={{ fontSize:11, color:C.textMt, lineHeight:1.6 }}>오버레이 창을 열어 화면에서 직접 영역을 캡처하거나, 캡처한 결과 텍스트를 아래에 붙여넣으세요.</p>
          </div>
        </div>

        <button className="action-btn" onClick={openOverlay} style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          padding:'10px', borderRadius:9,
          background:C.bgSub, color:C.textSub,
          border:`1.5px solid ${C.border}`,
          fontSize:12, fontWeight:700, letterSpacing:'-0.01em',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.mochaPale; e.currentTarget.style.borderColor = C.mochaLt; e.currentTarget.style.color = C.mocha; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bgSub; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}
        >
          <ScanLine size={13} /> 오버레이 창 열기 <ChevronRight size={11} style={{ opacity:0.5 }} />
        </button>

        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>캡처 결과 텍스트</label>
          <textarea
            className="paste-textarea"
            value={pastedText}
            onChange={e => { setPastedText(e.target.value); if (e.target.value.trim()) onTextReady(e.target.value); }}
            placeholder="오버레이에서 캡처한 텍스트를 여기에 붙여넣으세요"
            rows={3}
            style={{
              width:'100%', padding:'10px 12px', fontSize:12, lineHeight:1.65,
              color:C.text, background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:9, resize:'none', caretColor:C.mocha,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Analysis strip ────────────────────────────────────────────────────────────
function AnalysisStrip({ result }) {
  const risk = result?.risk_level || 'low';
  const isRisk = risk === 'high' || risk === 'medium';

  return (
    <div style={{ animation:'analysisIn 0.35s ease-out' }}>
      {/* Korean interpretation */}
      {result?.ko_summary && (
        <div style={{
          padding:'12px 16px', marginBottom:12,
          background:C.bgSub,
          borderRadius:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <BookOpen size={11} color={C.textMt} />
            <span style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.08em' }}>한국어 해석 · 직원 참고용</span>
          </div>
          <p style={{ fontSize:13, color:C.textSub, lineHeight:1.65, letterSpacing:'-0.01em' }}>{result.ko_summary}</p>
        </div>
      )}

      {/* Metadata pills row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {/* Language badge */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:C.mochaPale, border:`1px solid ${C.border}` }}>
          <Globe size={11} color={C.mocha} />
          <span style={{ fontSize:11, fontWeight:700, color:C.mocha, letterSpacing:'-0.01em' }}>{result?.detected_language || '언어 감지됨'}</span>
        </div>

        {/* Intent badge */}
        {result?.intent && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:C.bgSub }}>
            <span style={{ fontSize:11, fontWeight:600, color:C.textSub, letterSpacing:'-0.01em' }}>{result.intent}</span>
          </div>
        )}

        {/* Risk flag */}
        {isRisk && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:C.redPale, border:`1px solid ${C.red}35` }}>
            <ShieldAlert size={11} color={C.red} />
            <span style={{ fontSize:11, fontWeight:700, color:C.red, letterSpacing:'-0.01em' }}>
              {risk === 'high' ? '높은 위험 — 전송 전 확인 필요' : '주의 필요'}
            </span>
          </div>
        )}

        <span style={{ fontSize:11, color:C.textMt, marginLeft:'auto', letterSpacing:'-0.01em' }}>답변은 환자 언어로 · 한국어 해석은 참고용</span>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', animationDelay:`${delay}ms` }}>
      <div style={{ padding:'14px 16px', background:C.bgSub, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:C.bgDeep, animation:'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ flex:1 }}>
          <div style={{ height:8, width:80, background:C.bgDeep, borderRadius:4, marginBottom:5, animation:'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height:6, width:50, background:C.bgDeep, borderRadius:4, animation:'pulse 1.4s 200ms ease-in-out infinite' }} />
        </div>
      </div>
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:7 }}>
        {[100, 88, 95, 72, 82].map((w, i) => (
          <div key={i} style={{ height:7, borderRadius:4, background:C.bgSub, width:`${w}%`, animation:`pulse 1.4s ${i*100}ms ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Reply card ────────────────────────────────────────────────────────────────
const REPLY_TYPES = [
  {
    key:      'firm',
    label:    '빠른 답장',
    sublabel: 'Quick Reply',
    icon:     Zap,
    accent:   C.mocha,
    pale:     C.mochaPale,
    hint:     '간결하고 명확한 답장',
  },
  {
    key:      'kind',
    label:    '정중한 답장',
    sublabel: 'Natural Reply',
    icon:     Heart,
    accent:   C.sage,
    pale:     C.sagePale,
    hint:     '따뜻하고 상세한 답장',
  },
  {
    key:      'booking',
    label:    '상담 유도',
    sublabel: 'Conversion Reply',
    icon:     TrendingUp,
    accent:   C.gold,
    pale:     C.goldPale,
    hint:     '예약·상담 전환 유도',
  },
];

function ReplyCard({ type, option, onCopy, delay }) {
  const [copied, setCopied] = useState(false);
  const Icon = type.icon;

  const replyText  = typeof option === 'string' ? option : (option?.reply || '');
  const koText     = typeof option === 'string' ? '' : (option?.ko_translation || '');

  const handleCopy = async () => {
    if (!replyText) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      onCopy?.(replyText);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  return (
    <div className="reply-card" style={{
      background: C.white,
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      animation: `cardIn 0.4s ease-out ${delay}ms both`,
      boxShadow: `0 2px 12px rgba(164,120,100,0.08), 0 1px 2px rgba(164,120,100,0.04)`,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px rgba(164,120,100,0.14), 0 2px 6px rgba(164,120,100,0.06)`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 12px rgba(164,120,100,0.08), 0 1px 2px rgba(164,120,100,0.04)`; }}
    >
      {/* Header */}
      <div style={{ padding:'12px 14px', background:C.bgSub, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:type.pale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={13} color={type.accent} strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontSize:12, fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>{type.label}</p>
          <p style={{ fontSize:10, color:C.textMt, letterSpacing:'0.02em' }}>{type.hint}</p>
        </div>
        <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:type.accent, opacity:0.7 }} />
      </div>

      {/* Reply text */}
      <div style={{ flex:1, padding:'14px 14px 10px', minHeight:80 }}>
        <p style={{ fontSize:13, color:C.textSub, lineHeight:1.75, whiteSpace:'pre-wrap', letterSpacing:'-0.01em' }}>{replyText}</p>
      </div>

      {/* Korean translation */}
      {koText && (
        <div style={{ margin:'0 14px 12px', padding:'10px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9 }}>
          <p style={{ fontSize:9, fontWeight:800, color:C.textMt, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>한국어 해석</p>
          <p style={{ fontSize:11, color:C.textSub, lineHeight:1.6 }}>{koText}</p>
        </div>
      )}

      {/* Copy button */}
      <div style={{ padding:'0 14px 14px', display:'flex', justifyContent:'flex-end' }}>
        <button className="copy-btn" onClick={handleCopy} style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'6px 14px', borderRadius:8, border:'none',
          background: copied ? C.sagePale : type.pale,
          color: copied ? C.sage : type.accent,
          fontSize:11, fontWeight:700, letterSpacing:'-0.01em',
          cursor:'pointer',
        }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? '복사됨' : '복사하기'}
        </button>
      </div>
    </div>
  );
}

// ── Save to memory bar ────────────────────────────────────────────────────────
// States: idle → selecting (patient picker) → saving → saved | error
function SaveToMemoryBar({ result, input, clinicId }) {
  const [phase,        setPhase]        = useState('idle');  // idle|selecting|saving|saved|error
  const [query,        setQuery]        = useState('');
  const [searchRes,    setSearchRes]    = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [savedPatient, setSavedPatient] = useState(null);   // { id, name }
  const [errorMsg,     setErrorMsg]     = useState('');
  const [sessionCount, setSessionCount] = useState(null);
  const searchTimer = useRef(null);
  const inputRef    = useRef(null);

  // Reset when a new analysis result arrives (new paste)
  useEffect(() => {
    if (!result) return;
    setPhase('idle');
    setQuery('');
    setSearchRes([]);
    setSavedPatient(null);
    setSessionCount(null);
    setErrorMsg('');
  }, [result]);

  // Focus the search input when picker opens
  useEffect(() => {
    if (phase === 'selecting') {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [phase]);

  // Debounced patient search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim() || phase !== 'selecting') { setSearchRes([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query.trim(), ...(clinicId ? { clinicId } : {}) });
        const r = await fetch(`/api/patients/search?${params}`);
        const d = await r.json();
        setSearchRes(d.patients || []);
      } catch {
        setSearchRes([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, phase, clinicId]);

  const doSave = async (patient) => {
    setPhase('saving');
    try {
      const r = await fetch('/api/memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId:          patient.id,
          clinicId:           clinicId || undefined,
          koSummary:          result?.ko_summary          || null,
          riskLevel:          result?.risk_level           || 'none',
          procedureInterests: result?.procedure_interests  || [],
          concerns:           result?.concerns             || [],
          riskFlags:          result?.risk_level === 'high'
            ? [{ type: 'flagged', detail: result.intent, severity: 'high' }]
            : [],
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setSavedPatient(patient);
      setSessionCount(d.session_count);
      setPhase('saved');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  const createAndSave = async () => {
    if (!query.trim()) return;
    setPhase('saving');
    try {
      const r = await fetch('/api/patients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: clinicId || undefined,
          patient: {
            name: query.trim(),
            lang: result?.detected_language
              ? ({ '중국어':'zh', '일본어':'ja', '영어':'en', '아랍어':'ar', '한국어':'ko' }[result.detected_language] || null)
              : null,
          },
        }),
      });
      const patient = await r.json();
      if (!r.ok) throw new Error(patient.error || `HTTP ${r.status}`);
      await doSave(patient);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const baseStyle = {
    padding:'14px 18px', borderRadius:12,
    animation:'fadeSlideUp 0.3s ease-out',
    transition:'background 0.25s',
  };

  // Saved state
  if (phase === 'saved') return (
    <div style={{ ...baseStyle, background:C.sagePale, display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:C.sage+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Brain size={14} color={C.sage} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:12, fontWeight:700, color:C.sage, letterSpacing:'-0.01em' }}>
          {savedPatient.name}님 Tiki Memory에 저장되었습니다
        </p>
        <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>
          {sessionCount > 1 ? `총 ${sessionCount}회 상담 기록됨` : '첫 번째 상담 기록됨'}
          {' · '}Insights에서 확인할 수 있습니다
        </p>
      </div>
      <Check size={16} color={C.sage} />
    </div>
  );

  // Error state
  if (phase === 'error') return (
    <div style={{ ...baseStyle, background:C.redPale, display:'flex', alignItems:'center', gap:12 }}>
      <AlertCircle size={15} color={C.red} style={{ flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.red }}>저장 실패</p>
        <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>{errorMsg}</p>
      </div>
      <button onClick={() => { setPhase('idle'); setErrorMsg(''); }} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
        <X size={13} color={C.textMt} />
      </button>
    </div>
  );

  // Saving spinner
  if (phase === 'saving') return (
    <div style={{ ...baseStyle, background:C.bgSub, display:'flex', alignItems:'center', gap:12 }}>
      <Loader2 size={15} color={C.mocha} style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} />
      <p style={{ fontSize:12, fontWeight:600, color:C.textSub }}>Tiki Memory에 저장 중...</p>
    </div>
  );

  // Patient selector (selecting phase)
  if (phase === 'selecting') return (
    <div style={{ ...baseStyle, background:C.bgSub }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Brain size={13} color={C.mocha} />
        </div>
        <p style={{ flex:1, fontSize:12, fontWeight:700, color:C.textSub, letterSpacing:'-0.01em' }}>
          어느 환자의 기록에 저장할까요?
        </p>
        <button onClick={() => { setPhase('idle'); setQuery(''); setSearchRes([]); }}
          style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
          <X size={13} color={C.textMt} />
        </button>
      </div>

      {/* Search input */}
      <div style={{ position:'relative' }}>
        <Search size={12} color={C.textMt} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim() && !searchRes.length) createAndSave(); }}
          placeholder="환자 이름 검색..."
          style={{
            width:'100%', boxSizing:'border-box',
            padding:'8px 10px 8px 30px',
            borderRadius:8, border:`1px solid ${C.border}`,
            background:C.white, fontSize:12, color:C.text,
            outline:'none',
          }}
          onFocus={e => e.target.style.borderColor = C.mocha}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        {searching && <Loader2 size={11} color={C.textMt} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', animation:'spin 0.8s linear infinite' }} />}
      </div>

      {/* Results dropdown */}
      {(searchRes.length > 0 || query.trim()) && (
        <div style={{ marginTop:6, borderRadius:8, border:`1px solid ${C.border}`, background:C.white, overflow:'hidden' }}>
          {searchRes.map(p => (
            <button key={p.id} onClick={() => doSave(p)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.background = C.mochaPale}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize:12, fontWeight:600, color:C.text, flex:1 }}>{p.name}</span>
              {p.lang && <span style={{ fontSize:10, color:C.textMt, background:C.bgSub, padding:'2px 6px', borderRadius:4 }}>{p.lang}</span>}
              {p.flag && <span style={{ fontSize:10, color:C.red, fontWeight:700 }}>⚠</span>}
            </button>
          ))}

          {/* New patient option */}
          {query.trim() && (
            <button onClick={createAndSave}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', border:'none', borderTop: searchRes.length ? `1px solid ${C.border}` : 'none', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.background = C.sagePale}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <UserPlus size={11} color={C.sage} style={{ flexShrink:0 }} />
              <span style={{ fontSize:11, color:C.sage, fontWeight:600 }}>
                &ldquo;{query.trim()}&rdquo; 로 새 환자 등록 후 저장
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Idle state (default)
  return (
    <div style={{ ...baseStyle, background:C.bgSub, display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Brain size={14} color={C.mocha} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:12, fontWeight:700, color:C.textSub, letterSpacing:'-0.01em' }}>
          이 상담을 환자 기록에 저장
        </p>
        <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>
          의도, 시술 관심사, 위험도가 Tiki Memory에 누적됩니다
        </p>
      </div>
      <button onClick={() => setPhase('selecting')} style={{
        display:'flex', alignItems:'center', gap:5,
        padding:'7px 16px', borderRadius:8,
        background:C.mocha, color:'#fff',
        border:'none', fontSize:11, fontWeight:700,
        boxShadow:`0 3px 12px rgba(164,120,100,0.3)`,
        cursor:'pointer', letterSpacing:'-0.01em', flexShrink:0,
      }}>
        <Save size={11} />
        Memory 저장
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ mode }) {
  const hints = {
    paste: [
      { flag:'🇯🇵', text:'ヒアルロン酸の効果はいつ出ますか？副作用が心配です' },
      { flag:'🇨🇳', text:'这个手术恢复期多久？有没有副作用？价格大概是多少？' },
      { flag:'🇺🇸', text:'Is the filler procedure painful? How long is recovery?' },
    ],
    screen: null,
    ocr: null,
  };
  const examples = hints[mode] || hints.paste;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 24px 32px', gap:24 }}>
      <div style={{ width:56, height:56, borderRadius:16, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 20px rgba(164,120,100,0.12)` }}>
        <Sparkles size={24} color={C.mocha} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6, letterSpacing:'-0.02em' }}>외국인 환자 메시지를 분석합니다</p>
        <p style={{ fontSize:12, color:C.textMt, lineHeight:1.7 }}>메시지를 붙여넣으면 언어를 감지하고<br />의료적으로 안전한 답장 3가지를 즉시 생성합니다</p>
      </div>
      {examples && (
        <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.1em', textAlign:'center', marginBottom:4 }}>예시 메시지</p>
          {examples.map((ex, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:C.white, boxShadow:`0 1px 6px rgba(164,120,100,0.07)`, borderRadius:10 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{ex.flag}</span>
              <p style={{ fontSize:12, color:C.textSub, lineHeight:1.6, letterSpacing:'-0.01em' }}>{ex.text}</p>
            </div>
          ))}
        </div>
      )}
      {/* Language chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {[['🇯🇵','일본어'],['🇨🇳','중국어'],['🇺🇸','영어'],['🇹🇭','태국어'],['🇻🇳','베트남어'],['🇷🇺','러시아어'],['🇸🇦','아랍어'],['🇦🇪','아랍어(UAE)']].map(([f,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:C.bgSub, borderRadius:999, fontSize:11, color:C.textMt, fontWeight:500 }}>
            <span style={{ fontSize:13 }}>{f}</span>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TikiPasteTab() {
  const { clinicId, session } = useAuth();
  const clinicName = session?.clinic?.name || '클리닉';

  const [mode,       setMode]       = useState('paste'); // 'paste' | 'screen' | 'ocr'
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState('');
  const [pasting,    setPasting]    = useState(false);
  const [tikiActive, setTikiActive] = useState(false);
  const tikiTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const triggerTiki = useCallback(() => {
    clearTimeout(tikiTimer.current);
    setTikiActive(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setTikiActive(true)));
    tikiTimer.current = setTimeout(() => setTikiActive(false), 1050);
  }, []);

  const handleGenerate = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    triggerTiki();
    try {
      const res = await fetch('/api/tiki-paste', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, clinicId: clinicId || undefined, clinicName }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, clinicId, clinicName, triggerTiki]);

  const handleTextareaPaste = useCallback((e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.trim()) return;
    setInput(pastedText);
    setResult(null);
    setError(null);
    setPasting(true);
    triggerTiki();
    setTimeout(() => setPasting(false), 750);
    setTimeout(() => handleGenerate(pastedText), 0);
  }, [handleGenerate, triggerTiki]);

  const handleClipboardBtn = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        setResult(null);
        setError(null);
        setPasting(true);
        triggerTiki();
        setTimeout(() => setPasting(false), 750);
        handleGenerate(text);
      }
    } catch { /* permission denied — user can paste manually */ }
  }, [handleGenerate, triggerTiki]);

  const handleModeTextReady = useCallback((text) => {
    setInput(text);
    setResult(null);
    setError(null);
    handleGenerate(text);
  }, [handleGenerate]);

  const handleReset = () => {
    setInput(''); setResult(null); setError(null);
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setInput('');
    setResult(null);
    setError(null);
  };

  const hasContent = input.trim() || result || loading;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', background:C.bg, fontFamily:SANS }}>
      <TikiFlash active={tikiActive} />
      {toast && <Toast message={toast} />}
      <style>{GLOBAL_STYLE}</style>

      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div style={{
        position:'sticky', top:0, zIndex:40,
        padding:'12px 24px',
        background:`${C.bg}f0`,
        backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        boxShadow:`0 1px 0 ${C.border}, 0 4px 16px rgba(164,120,100,0.04)`,
        display:'flex', alignItems:'center', gap:16,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 3px 12px rgba(164,120,100,0.40)`, flexShrink:0 }}>
            <Sparkles size={15} color="#fff" fill="rgba(255,255,255,0.5)" />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:14, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>Tiki Paste</span>
              <span style={{ fontSize:9, fontWeight:700, color:C.mocha, background:C.mochaPale, padding:'2px 7px', borderRadius:999, letterSpacing:'0.04em', textTransform:'uppercase' }}>AI Copilot</span>
            </div>
            <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>외국어 메시지 → 의료 안전 답장 3종</p>
          </div>
        </div>

        {/* Mode selector — center */}
        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <InputModeTabs mode={mode} onSelect={handleModeSwitch} />
        </div>

        {/* Reset */}
        {hasContent && (
          <button className="action-btn" onClick={handleReset} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'6px 12px', borderRadius:8,
            background:'transparent', color:C.textMt,
            border:`1px solid ${C.border}`,
            fontSize:11, fontWeight:600,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = C.textSub; e.currentTarget.style.borderColor = C.borderMd; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textMt; e.currentTarget.style.borderColor = C.border; }}
          >
            <RefreshCcw size={11} /> 새로 시작
          </button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, maxWidth:900, width:'100%', margin:'0 auto', padding:'24px 24px 40px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Input section ──────────────────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {mode === 'paste' && (
            <PasteZone
              value={input}
              onChange={(v) => { setInput(v); setResult(null); setError(null); }}
              onPaste={handleTextareaPaste}
              pasting={pasting}
            />
          )}
          {mode === 'screen' && <ReadScreenZone onTextReady={handleModeTextReady} />}
          {mode === 'ocr'    && <OCRCaptureZone onTextReady={handleModeTextReady} />}

          {/* Action row — paste mode only */}
          {mode === 'paste' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {input.length > 0 && (
                  <span style={{ fontSize:10, color:C.textMt, fontWeight:500 }}>{input.length}자</span>
                )}
                <button className="action-btn" onClick={handleClipboardBtn} style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'6px 12px', borderRadius:8,
                  background:'transparent', color:C.textMt,
                  border:`1px solid ${C.border}`,
                  fontSize:11, fontWeight:600,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.mocha + '60'; e.currentTarget.style.color = C.mocha; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMt; }}
                >
                  <Clipboard size={11} /> 클립보드에서 붙여넣기
                </button>
              </div>

              <button className="action-btn" onClick={() => handleGenerate()} disabled={!input.trim() || loading} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 18px', borderRadius:9, border:'none',
                background: input.trim() && !loading ? C.mocha : C.bgDeep,
                color: input.trim() && !loading ? '#fff' : C.textMt,
                fontSize:12, fontWeight:700, letterSpacing:'-0.01em',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() && !loading ? `0 3px 14px rgba(164,120,100,0.40)` : 'none',
                transition:'all 0.15s',
              }}>
                {loading
                  ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> 분석 중...</>
                  : <><Sparkles size={12} /> 답장 생성</>
                }
              </button>
            </div>
          )}
        </div>

        {/* ── Loading state ──────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:C.mochaPale, border:`1px solid ${C.border}`, borderRadius:11 }}>
              <Loader2 size={14} style={{ animation:'spin 1s linear infinite', color:C.mocha, flexShrink:0 }} />
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.mochaDk }}>언어 감지 → 의도 파악 → 답장 3종 생성 중...</p>
                <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>병원 시술 DB를 참조하여 의료적으로 안전한 답변을 준비합니다</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
              {[0, 100, 200].map(d => <SkeletonCard key={d} delay={d} />)}
            </div>
          </div>
        )}

        {/* ── Error state ────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 16px', background:C.redPale, border:`1px solid ${C.red}35`, borderRadius:11 }}>
            <AlertCircle size={14} color={C.red} style={{ flexShrink:0, marginTop:1 }} />
            <div style={{ flex:1 }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.red, marginBottom:3 }}>생성 실패</p>
              <p style={{ fontSize:11, color:C.red, opacity:0.75 }}>{error}</p>
            </div>
            <button className="action-btn" onClick={() => handleGenerate()} style={{ fontSize:11, fontWeight:700, color:C.red, background:'none', border:`1px solid ${C.red}40`, padding:'5px 12px', borderRadius:7, flexShrink:0 }}>
              다시 시도
            </button>
          </div>
        )}

        {/* ── Analysis strip ─────────────────────────────────────────────────── */}
        {result && !loading && (
          <AnalysisStrip result={result} />
        )}

        {/* ── Reply cards ────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
              {REPLY_TYPES.map((type, i) => (
                <ReplyCard
                  key={type.key}
                  type={type}
                  option={result.options?.[type.key]}
                  onCopy={(text) => { showToast('클립보드에 복사되었습니다'); triggerTiki(); }}
                  delay={i * 80}
                />
              ))}
            </div>
            <p style={{ textAlign:'center', fontSize:10, color:C.textMt, marginTop:12, letterSpacing:'-0.01em' }}>
              복사 버튼은 환자에게 전송할 원문만 복사합니다 · 한국어 해석은 직원 전용입니다
            </p>
          </div>
        )}

        {/* ── Save to memory ─────────────────────────────────────────────────── */}
        {result && !loading && (
          <SaveToMemoryBar result={result} input={input} clinicId={clinicId} />
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!hasContent && !error && <EmptyState mode={mode} />}
      </div>
    </div>
  );
}
