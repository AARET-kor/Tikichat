import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Clipboard, Copy, Check, AlertCircle, Loader2,
  RefreshCcw, Globe, Brain, Upload, Image as ImageIcon,
  BookOpen, ShieldAlert, Zap, Heart, Send,
  TrendingUp, Save, Search, UserPlus, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import QuickVisitCreate from '../mytiki/QuickVisitCreate';

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

async function getStaffAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

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

// ── Screenshot dropzone ───────────────────────────────────────────────────────
function ScreenshotDropzone({ image, onImage, onImagePaste, onClear }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const acceptFile = (file) => {
    if (!file?.type?.startsWith('image/')) return;
    onImage(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        acceptFile(e.dataTransfer?.files?.[0]);
      }}
      style={{
        borderRadius:14,
        border:`1.5px dashed ${dragging ? C.mocha : C.borderMd}`,
        background: dragging ? C.mochaPale : C.white,
        padding:16,
        display:'flex',
        gap:14,
        alignItems:'center',
        transition:'background 0.15s, border-color 0.15s',
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display:'none' }}
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      <div style={{ width:42, height:42, borderRadius:13, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {image ? <ImageIcon size={18} color={C.mocha} /> : <Upload size={18} color={C.mocha} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>
          {image ? image.name : '스크린샷 드롭 / 업로드'}
        </p>
        <p style={{ fontSize:11, color:C.textMt, lineHeight:1.55, marginTop:3 }}>
          채팅 내용을 복사하기 어려울 때만 사용하세요. 이미지에서 보이는 텍스트를 읽어 분석합니다.
        </p>
      </div>
      {image ? (
        <button className="action-btn" onClick={onClear} style={{ border:'none', background:C.bgSub, color:C.textMt, borderRadius:8, padding:'7px 10px', fontSize:11, fontWeight:700 }}>
          제거
        </button>
      ) : (
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button className="action-btn" onClick={() => fileRef.current?.click()} style={{ border:`1px solid ${C.border}`, background:C.bgSub, color:C.textSub, borderRadius:8, padding:'7px 10px', fontSize:11, fontWeight:700 }}>
            파일 선택
          </button>
          <button className="action-btn" onClick={onImagePaste} style={{ border:'none', background:C.mocha, color:'#fff', borderRadius:8, padding:'7px 10px', fontSize:11, fontWeight:800 }}>
            이미지 붙여넣기
          </button>
        </div>
      )}
    </div>
  );
}

function WorkspaceInput({
  input,
  image,
  loading,
  pasting,
  onInputChange,
  onTextPaste,
  onClipboardText,
  onImage,
  onImagePaste,
  onClearImage,
  onGenerate,
}) {
  const canGenerate = input.trim() || image;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.45fr) minmax(300px, 0.85fr)', gap:16, alignItems:'stretch' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <PasteZone
          value={input}
          onChange={onInputChange}
          onPaste={onTextPaste}
          pasting={pasting}
        />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {input.length > 0 && (
              <span style={{ fontSize:10, color:C.textMt, fontWeight:600 }}>{input.length}자</span>
            )}
            <button className="action-btn" onClick={onClipboardText} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'7px 12px', borderRadius:8,
              background:C.white, color:C.textSub,
              border:`1px solid ${C.border}`,
              fontSize:11, fontWeight:700,
            }}>
              <Clipboard size={11} /> 선택한 채팅 텍스트 붙여넣기
            </button>
          </div>
          <button className="action-btn" onClick={onGenerate} disabled={!canGenerate || loading} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'9px 18px', borderRadius:10, border:'none',
            background: canGenerate && !loading ? C.mocha : C.bgDeep,
            color: canGenerate && !loading ? '#fff' : C.textMt,
            fontSize:12, fontWeight:850, letterSpacing:'-0.01em',
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            boxShadow: canGenerate && !loading ? `0 3px 14px rgba(164,120,100,0.34)` : 'none',
          }}>
            {loading
              ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> 분석 중</>
              : <><Sparkles size={12} /> 분석하고 답장 만들기</>
            }
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <ScreenshotDropzone
          image={image}
          onImage={onImage}
          onImagePaste={onImagePaste}
          onClear={onClearImage}
        />
        <div style={{ padding:'13px 14px', borderRadius:13, background:C.bgSub, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:11, fontWeight:850, color:C.textSub, letterSpacing:'-0.01em', marginBottom:7 }}>운영 원칙</p>
          {[
            '자동 화면 읽기 없이 직원이 붙여넣은 내용만 분석합니다.',
            '답변은 복사만 지원하고 자동 전송하지 않습니다.',
            '위험 신호가 있으면 전송 전 직원 확인이 필요합니다.',
          ].map((item) => (
            <p key={item} style={{ fontSize:10.5, color:C.textMt, lineHeight:1.55, marginTop:4 }}>• {item}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Analysis strip ────────────────────────────────────────────────────────────
function AnalysisStrip({ result }) {
  const risk = result?.risk_level || 'low';
  const isRisk = risk === 'high' || risk === 'medium';
  const summary = result?.conversation_summary || result?.ko_summary;
  const intent = result?.last_message_intent || result?.intent;

  return (
    <div style={{ animation:'analysisIn 0.35s ease-out' }}>
      {/* Conversation summary */}
      {summary && (
        <div style={{
          padding:'12px 16px', marginBottom:12,
          background:C.bgSub,
          borderRadius:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <BookOpen size={11} color={C.textMt} />
            <span style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.08em' }}>대화 요약 · 직원 참고용</span>
          </div>
          <p style={{ fontSize:13, color:C.textSub, lineHeight:1.65, letterSpacing:'-0.01em' }}>{summary}</p>
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
        {intent && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background:C.bgSub }}>
            <span style={{ fontSize:11, fontWeight:600, color:C.textSub, letterSpacing:'-0.01em' }}>마지막 의도: {intent}</span>
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
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');

      const r = await fetch('/api/memory', {
        method:  'POST',
        headers,
        body: JSON.stringify({
          patientId:          patient.id,
          clinicId:           clinicId || undefined,
          koSummary:          result?.ko_summary          || null,
          riskLevel:          result?.risk_level           || 'none',
          procedureInterests: result?.procedure_interests  || [],
          concerns:           result?.concerns             || [],
          riskFlags:          result?.risk_level === 'high'
            ? [{ type: 'flagged', detail: result.last_message_intent || result.intent, severity: 'high' }]
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
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');
      const r = await fetch('/api/patients', {
        method:  'POST',
        headers,
        body: JSON.stringify({
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
          {savedPatient.name}님 상담 컨텍스트가 Tiki Desk로 전달되었습니다
        </p>
        <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>
          {sessionCount > 1 ? `총 ${sessionCount}회 상담 기록됨` : '첫 번째 상담 기록됨'}
          {' · '}환자 기록과 운영 보드에서 이어서 확인할 수 있습니다
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
      <p style={{ fontSize:12, fontWeight:600, color:C.textSub }}>Tiki Desk로 상담 컨텍스트를 보내는 중...</p>
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
          의도, 시술 관심사, 위험도가 Tiki Desk 상담 컨텍스트에 남습니다
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
        Tiki Desk로 보내기
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

  const [input,      setInput]      = useState('');
  const [image,      setImage]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState('');
  const [pasting,    setPasting]    = useState(false);
  const [tikiActive, setTikiActive] = useState(false);
  const [quickVisitOpen, setQuickVisitOpen] = useState(false);
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

  const readImageFile = useCallback((file) => new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('스크린샷은 4MB 이하 이미지만 사용할 수 있습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const data = value.includes(',') ? value.split(',').pop() : value;
      resolve({ name: file.name || 'chat-screenshot', mediaType: file.type, data });
    };
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  }), []);

  const handleImageFile = useCallback(async (file) => {
    try {
      const payload = await readImageFile(file);
      setImage(payload);
      setResult(null);
      setError(null);
      showToast('스크린샷이 추가되었습니다');
    } catch (err) {
      setError(err.message);
    }
  }, [readImageFile]);

  const handleGenerate = useCallback(async (text, imageOverride) => {
    const msg = (text ?? input).trim();
    const imagePayload = imageOverride ?? image;
    if ((!msg && !imagePayload) || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    triggerTiki();
    try {
      const headers = await getStaffAuthHeaders();
      const res = await fetch('/api/tiki-paste', {
        method:  'POST',
        headers,
        body:    JSON.stringify({
          message: msg || undefined,
          imageData: imagePayload?.data,
          imageMediaType: imagePayload?.mediaType,
          clinicId: clinicId || undefined,
          clinicName,
        }),
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
  }, [input, image, loading, clinicId, clinicName, triggerTiki]);

  const handleTextareaPaste = useCallback((e) => {
    const imageFile = Array.from(e.clipboardData?.files || []).find((file) => file.type?.startsWith('image/'));
    if (imageFile) {
      e.preventDefault();
      handleImageFile(imageFile);
      return;
    }
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.trim()) return;
    setInput(pastedText);
    setResult(null);
    setError(null);
    setPasting(true);
    triggerTiki();
    setTimeout(() => setPasting(false), 750);
    setTimeout(() => handleGenerate(pastedText), 0);
  }, [handleGenerate, handleImageFile, triggerTiki]);

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

  const handleClipboardImage = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const file = new File([blob], 'clipboard-screenshot.png', { type: imageType });
        await handleImageFile(file);
        return;
      }
      showToast('클립보드에 이미지가 없습니다');
    } catch {
      setError('브라우저 클립보드 권한 때문에 이미지를 읽지 못했습니다. 파일을 드롭하거나 선택해 주세요.');
    }
  }, [handleImageFile]);

  const handleReset = () => {
    setInput('');
    setImage(null);
    setResult(null);
    setError(null);
  };

  const handoffText = input || result?.extracted_text || result?.conversation_summary || result?.ko_summary || '';
  const hasContent = input.trim() || image || result || loading;

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

        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:C.white, border:`1px solid ${C.border}`, borderRadius:999 }}>
            <span style={{ fontSize:11, fontWeight:800, color:C.textSub }}>웹 사이드카</span>
            <span style={{ width:4, height:4, borderRadius:'50%', background:C.mochaLt }} />
            <span style={{ fontSize:11, color:C.textMt }}>복사 · 붙여넣기 · 스크린샷 드롭</span>
          </div>
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
      <div style={{ flex:1, maxWidth:1180, width:'100%', margin:'0 auto', padding:'24px 24px 40px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Input section ──────────────────────────────────────────────────── */}
        <WorkspaceInput
          input={input}
          image={image}
          loading={loading}
          pasting={pasting}
          onInputChange={(v) => { setInput(v); setResult(null); setError(null); }}
          onTextPaste={handleTextareaPaste}
          onClipboardText={handleClipboardBtn}
          onImage={handleImageFile}
          onImagePaste={handleClipboardImage}
          onClearImage={() => setImage(null)}
          onGenerate={() => handleGenerate()}
        />

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
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', gap:12, alignItems:'stretch' }}>
            <SaveToMemoryBar result={result} input={handoffText} clinicId={clinicId} />
            <div style={{ display:'flex', gap:8, alignItems:'center', padding:'14px 16px', borderRadius:12, background:C.white, border:`1px solid ${C.border}` }}>
              <button className="action-btn" onClick={() => setQuickVisitOpen(true)} style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 14px', borderRadius:9,
                background:C.mocha, color:'#fff', border:'none',
                fontSize:12, fontWeight:850,
                boxShadow:`0 3px 12px rgba(164,120,100,0.26)`,
              }}>
                <UserPlus size={13} /> Quick Visit
              </button>
              <button className="action-btn" onClick={() => setQuickVisitOpen(true)} style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 14px', borderRadius:9,
                background:C.mochaPale, color:C.mochaDk, border:`1px solid ${C.border}`,
                fontSize:12, fontWeight:800,
              }}>
                <Send size={13} /> My Tiki 링크 준비
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!hasContent && !error && <EmptyState />}
      </div>

      {quickVisitOpen && (
        <QuickVisitCreate
          clinicId={clinicId}
          darkMode={false}
          initialText={handoffText}
          onClose={() => setQuickVisitOpen(false)}
          onCreated={() => {
            setQuickVisitOpen(false);
            showToast('Quick Visit과 My Tiki 링크가 준비되었습니다');
          }}
        />
      )}
    </div>
  );
}
