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
  mocha:     '#0145F2',
  mochaDk:   '#10367D',
  mochaLt:   '#BBE1FA',
  mochaPale: '#E6F0FF',
  bg:        '#EDF1F5',
  bgSub:     '#EBEBEB',
  bgDeep:    '#D6E1EA',
  white:     '#FFFFFF',
  text:      '#1B262C',
  textSub:   '#40515D',
  textMt:    '#6B7C88',
  border:    '#D6E1EA',
  borderMd:  '#BBE1FA',
  sage:      '#3B6500',
  sagePale:  '#ECFFD1',
  gold:      '#0F4C75',
  goldPale:  '#E6F4FF',
  red:       '#B85C44',
  redPale:   '#FDF2EE',
};

const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

const SOURCE_OPTIONS = [
  { value: 'manual', label: '수기 입력' },
  { value: 'kakao', label: '카카오' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'line', label: 'LINE' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'wechat', label: 'WeChat' },
  { value: 'phone', label: '전화' },
  { value: 'website', label: '웹문의' },
  { value: 'walkin', label: '현장 상담' },
  { value: 'other', label: '기타' },
];

async function getStaffAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

function friendlyError(message, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  const raw = String(message || '').trim();
  if (!raw) return fallback;
  if (/column .* does not exist|schema cache|invalid input syntax|violates|duplicate key|foreign key/i.test(raw)) {
    return '현재 배포된 데이터 구조와 화면이 맞지 않습니다. 관리자에게 알려 주세요.';
  }
  if (/401|jwt|auth|session|로그인|unauthorized/i.test(raw)) {
    return '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }
  if (/message or image required/i.test(raw)) {
    return '상담 내용이나 스크린샷을 먼저 넣어 주세요.';
  }
  return raw.length > 120 ? fallback : raw;
}

function missingFieldLabel(field) {
  const labels = {
    patient_name: '환자 이름',
    visit_date: '방문 예정일',
    contact_channel: '연락 채널',
    phone: '연락처',
    source_handle: '상담 ID',
  };
  return labels[field] || String(field || '').replaceAll('_', ' ');
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
    0%   { box-shadow: 0 0 0 0 rgba(1,69,242,0), 0 2px 8px rgba(1,69,242,0.06); }
    35%  { box-shadow: 0 0 0 4px rgba(1,69,242,0.22), 0 6px 28px rgba(1,69,242,0.14); }
    100% { box-shadow: 0 0 0 3px rgba(1,69,242,0.10), 0 2px 8px rgba(1,69,242,0.06); }
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
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 44%, rgba(1,69,242,0.18) 0%, transparent 55%)`, animation:'tikiBackdrop 0.95s ease forwards' }} />
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
      boxShadow:`0 4px 24px rgba(1,69,242,0.28)`,
      pointerEvents:'none', whiteSpace:'nowrap',
    }}>
      <Check size={13} style={{ color:C.mocha }} />
      {message}
    </div>
  );
}

function WorkflowSteps({ step }) {
  const steps = [
    '상담 입력',
    'AI 분석',
    '환자 확인',
    '다음 조치',
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8 }}>
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        const done = number < step;
        return (
          <div key={label} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 12px', borderRadius:14,
            border:`1px solid ${active ? C.mocha : C.border}`,
            background:active ? C.mochaPale : done ? C.white : C.bgSub,
            color:active ? C.mochaDk : done ? C.textSub : C.textMt,
            boxShadow:active ? '0 8px 22px rgba(1,69,242,0.12)' : 'none',
          }}>
            <span style={{
              width:22, height:22, borderRadius:999,
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              background:done ? C.sage : active ? C.mocha : C.bgDeep,
              color:done || active ? '#fff' : C.textMt,
              fontSize:11, fontWeight:950,
              flexShrink:0,
            }}>
              {done ? '✓' : number}
            </span>
            <span style={{ fontSize:12, fontWeight:900, letterSpacing:'-0.03em' }}>{label}</span>
          </div>
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
        : focused ? `0 0 0 3px rgba(1,69,242,0.12), 0 2px 12px rgba(1,69,242,0.08)`
        : `0 1px 4px rgba(1,69,242,0.06)`,
      animation: pasting ? 'pasteFlash 0.75s ease-out forwards' : 'none',
      transition:'border-color 0.2s, box-shadow 0.2s',
    }}>
      {pasting && (
        <div style={{ position:'absolute', inset:0, zIndex:10, pointerEvents:'none', overflow:'hidden', borderRadius:14 }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, transparent 35%, rgba(1,69,242,0.12) 50%, transparent 65%)', animation:'shimmerSweep 0.6s ease-out' }} />
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
          boxShadow:`0 2px 12px rgba(1,69,242,0.4)`,
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
  sourceCapture,
  loading,
  pasting,
  onInputChange,
  onSourceCaptureChange,
  onTextPaste,
  onClipboardText,
  onImage,
  onImagePaste,
  onClearImage,
  onGenerate,
}) {
  const canGenerate = input.trim() || image;
  return (
    <section style={{ display:'grid', gap:14, padding:18, background:C.white, border:`1px solid ${C.border}`, borderRadius:18, boxShadow:'0 10px 32px rgba(1,69,242,0.06)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:12, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Clipboard size={15} color={C.mocha} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:16, fontWeight:950, color:C.text, letterSpacing:'-0.04em' }}>1. 상담 입력</p>
          <p style={{ fontSize:12, color:C.textMt, marginTop:3, lineHeight:1.55 }}>
            외국인 환자 메시지를 붙여넣거나, 복사하기 어려운 경우에만 스크린샷을 올립니다.
          </p>
        </div>
      </div>

    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.45fr) minmax(300px, 0.85fr)', gap:16, alignItems:'stretch' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <PasteZone
          value={input}
          onChange={onInputChange}
          onPaste={onTextPaste}
          pasting={pasting}
        />
        <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr', gap:8 }}>
          <select
            value={sourceCapture.channel}
            onChange={e => onSourceCaptureChange({ ...sourceCapture, channel: e.target.value })}
            style={{
              border:`1px solid ${C.border}`,
              background:C.white,
              color:C.textSub,
              borderRadius:9,
              padding:'8px 10px',
              fontSize:11,
              fontWeight:700,
              outline:'none',
            }}
          >
            {SOURCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            value={sourceCapture.handle}
            onChange={e => onSourceCaptureChange({ ...sourceCapture, handle: e.target.value })}
            placeholder="상담 ID / 계정 / 고객번호"
            style={{
              border:`1px solid ${C.border}`,
              background:C.white,
              color:C.text,
              borderRadius:9,
              padding:'8px 10px',
              fontSize:11,
              outline:'none',
            }}
          />
          <input
            value={sourceCapture.phone}
            onChange={e => onSourceCaptureChange({ ...sourceCapture, phone: e.target.value })}
            placeholder="전화번호 / 연락처"
            style={{
              border:`1px solid ${C.border}`,
              background:C.white,
              color:C.text,
              borderRadius:9,
              padding:'8px 10px',
              fontSize:11,
              outline:'none',
            }}
          />
        </div>
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
            boxShadow: canGenerate && !loading ? `0 3px 14px rgba(1,69,242,0.34)` : 'none',
          }}>
            {loading
              ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> 분석 중</>
              : <><Sparkles size={12} /> AI 분석 시작</>
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
        <textarea
          value={sourceCapture.memo}
          onChange={e => onSourceCaptureChange({ ...sourceCapture, memo: e.target.value })}
          placeholder="상담 출처 메모: 어느 채팅/상담에서 가져온 내용인지 직원이 알아볼 만큼만 적어주세요"
          rows={3}
          style={{
            border:`1px solid ${C.border}`,
            background:C.white,
            color:C.text,
            borderRadius:13,
            padding:'11px 12px',
            fontSize:11,
            lineHeight:1.55,
            resize:'none',
            outline:'none',
          }}
        />
      </div>
    </div>
    </section>
  );
}

// ── Analysis strip ────────────────────────────────────────────────────────────
function AnalysisStrip({ result }) {
  const risk = result?.risk_level || 'low';
  const isRisk = risk === 'high' || risk === 'medium';
  const summary = result?.conversation_summary || result?.ko_summary;
  const intent = result?.last_message_intent || result?.intent;

  return (
    <section style={{ animation:'analysisIn 0.35s ease-out', display:'grid', gap:14, padding:18, background:C.white, border:`1px solid ${C.border}`, borderRadius:18, boxShadow:'0 10px 32px rgba(1,69,242,0.06)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:12, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Brain size={15} color={C.mocha} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:16, fontWeight:950, color:C.text, letterSpacing:'-0.04em' }}>2. AI 분석</p>
          <p style={{ fontSize:12, color:C.textMt, marginTop:3, lineHeight:1.55 }}>
            환자 의도, 언어, 위험 신호를 먼저 확인합니다. 답변은 자동 전송되지 않습니다.
          </p>
        </div>
      </div>

      {/* Conversation summary */}
      {summary && (
        <div style={{
          padding:'18px 20px',
          background:`linear-gradient(135deg, ${C.mochaPale}, ${C.white})`,
          border:`1px solid ${C.borderMd}`,
          borderRadius:16,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
            <BookOpen size={14} color={C.mocha} />
            <span style={{ fontSize:12, fontWeight:900, color:C.mochaDk, letterSpacing:'-0.02em' }}>환자 대화 요약</span>
          </div>
          <p style={{ fontSize:17, color:C.text, lineHeight:1.72, letterSpacing:'-0.03em', fontWeight:750 }}>{summary}</p>
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
            <span style={{ fontSize:12, fontWeight:750, color:C.textSub, letterSpacing:'-0.01em' }}>마지막 의도: {intent}</span>
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

        <span style={{ fontSize:11, color:C.textMt, marginLeft:'auto', letterSpacing:'-0.01em' }}>답변은 환자 언어로 · 한국어 해석은 직원 참고용</span>
      </div>
    </section>
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
      boxShadow: `0 2px 12px rgba(1,69,242,0.08), 0 1px 2px rgba(1,69,242,0.04)`,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px rgba(1,69,242,0.14), 0 2px 6px rgba(1,69,242,0.06)`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 12px rgba(1,69,242,0.08), 0 1px 2px rgba(1,69,242,0.04)`; }}
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

function getReplyOption(result, key) {
  const option = result?.options?.[key];
  if (!option) return { reply: '', ko_translation: '' };
  if (typeof option === 'string') return { reply: option, ko_translation: '' };
  return { reply: option.reply || '', ko_translation: option.ko_translation || '' };
}

function BestReplyPanel({ result, onCopy }) {
  const [copiedKey, setCopiedKey] = useState('');
  const best = getReplyOption(result, 'kind');
  const quick = getReplyOption(result, 'firm');
  const booking = getReplyOption(result, 'booking');

  const copyText = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onCopy?.(text);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch { /* ignore */ }
  };

  const boosters = [
    { key:'booking', label:'예약 유도 버전 복사', icon:TrendingUp, text:booking.reply, color:C.gold },
    { key:'quick', label:'짧게 줄인 버전 복사', icon:Zap, text:quick.reply, color:C.mocha },
    { key:'kind', label:'더 친절한 표현 복사', icon:Heart, text:best.reply, color:C.sage },
  ].filter(item => item.text);

  return (
    <section style={{ display:'grid', gap:14, padding:18, background:C.white, border:`1px solid ${C.border}`, borderRadius:18, boxShadow:'0 10px 32px rgba(1,69,242,0.06)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:12, background:C.sagePale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Sparkles size={15} color={C.sage} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:16, fontWeight:950, color:C.text, letterSpacing:'-0.04em' }}>바로 쓸 답변</p>
          <p style={{ fontSize:12, color:C.textMt, marginTop:3, lineHeight:1.55 }}>
            선택지를 늘리지 않고, 직원이 바로 복사해 쓸 수 있는 가장 안전한 답변 1개만 먼저 보여줍니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyText(best.reply, 'best')}
          style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'10px 15px', borderRadius:11,
            border:'none', background:C.mocha, color:'#fff',
            fontSize:13, fontWeight:950, cursor:'pointer',
            boxShadow:'0 5px 18px rgba(1,69,242,0.28)',
          }}
        >
          {copiedKey === 'best' ? <Check size={14} /> : <Copy size={14} />}
          {copiedKey === 'best' ? '복사됨' : '답변 복사'}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 320px', gap:14, alignItems:'stretch' }}>
        <div style={{
          padding:22,
          borderRadius:18,
          border:`1px solid ${C.borderMd}`,
          background:'linear-gradient(180deg, #ffffff 0%, #F7FBFF 100%)',
          minHeight:220,
          display:'flex',
          flexDirection:'column',
          justifyContent:'space-between',
        }}>
          <div>
            <p style={{ fontSize:12, fontWeight:900, color:C.mochaDk, marginBottom:12 }}>환자에게 보낼 문장</p>
            <p style={{ fontSize:22, color:C.text, lineHeight:1.78, whiteSpace:'pre-wrap', letterSpacing:'-0.04em', fontWeight:760 }}>
              {best.reply}
            </p>
          </div>
          {best.ko_translation && (
            <div style={{ marginTop:18, padding:14, borderRadius:13, background:C.bg, border:`1px solid ${C.border}` }}>
              <p style={{ fontSize:11, fontWeight:900, color:C.textMt, marginBottom:6 }}>한국어 해석</p>
              <p style={{ fontSize:14, color:C.textSub, lineHeight:1.65 }}>{best.ko_translation}</p>
            </div>
          )}
        </div>

        <aside style={{ padding:16, borderRadius:18, background:C.bgSub, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ fontSize:13, fontWeight:950, color:C.text, letterSpacing:'-0.03em' }}>부족하면 여기서 보강</p>
          <p style={{ fontSize:11, color:C.textMt, lineHeight:1.55 }}>
            기본 답변은 하나만 쓰고, 상황에 따라 아래 보강 버전만 복사하세요.
          </p>
          {boosters.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => copyText(item.text, item.key)}
                style={{
                  display:'flex', alignItems:'center', gap:9,
                  width:'100%', padding:'11px 12px',
                  borderRadius:12, border:`1px solid ${C.border}`,
                  background:C.white, color:C.textSub,
                  fontSize:12, fontWeight:900,
                  cursor:'pointer', textAlign:'left',
                }}
              >
                <Icon size={14} color={item.color} />
                <span style={{ flex:1 }}>{item.label}</span>
                {copiedKey === item.key ? <Check size={13} color={C.sage} /> : <Copy size={13} color={C.textMt} />}
              </button>
            );
          })}
        </aside>
      </div>
    </section>
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
        const params = new URLSearchParams({ q: query.trim() });
        const headers = await getStaffAuthHeaders();
        const r = await fetch(`/api/patients/search?${params}`, { headers });
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
      setErrorMsg(friendlyError(err.message, '상담 컨텍스트 저장에 실패했습니다.'));
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
      setErrorMsg(friendlyError(err.message, '환자 생성에 실패했습니다.'));
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
        boxShadow:`0 3px 12px rgba(1,69,242,0.3)`,
        cursor:'pointer', letterSpacing:'-0.01em', flexShrink:0,
      }}>
        <Save size={11} />
        환자 기록에 저장
      </button>
    </div>
  );
}

function PendingIntakeBar({ result, input, sourceCapture, onSaved }) {
  const [phase, setPhase] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedIntake, setSavedIntake] = useState(null);

  useEffect(() => {
    setPhase('idle');
    setErrorMsg('');
    setSavedIntake(null);
  }, [result]);

  async function savePending() {
    if (!result || phase === 'saving') return;
    setPhase('saving');
    setErrorMsg('');
    try {
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');
      const res = await fetch('/api/conversation-intakes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: sourceCapture,
          raw_text: input || result.extracted_text || '',
          analysis: result,
          patient_candidate: result.patient_candidate || {},
          visit_candidate: {
            ...(result.visit_candidate || {}),
            procedure_interests: result.procedure_interests || [],
          },
          missing_fields: result.missing_fields || [],
          next_suggested_action: result.next_suggested_action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSavedIntake(data.intake);
      setPhase('saved');
      onSaved?.(data.intake);
    } catch (err) {
      setErrorMsg(friendlyError(err.message, '상담 유입 저장에 실패했습니다.'));
      setPhase('error');
    }
  }

  const baseStyle = {
    padding:'14px 18px', borderRadius:12,
    animation:'fadeSlideUp 0.3s ease-out',
    transition:'background 0.25s',
    border:`1px solid ${C.border}`,
  };

  if (phase === 'saved') {
    return (
      <div style={{ ...baseStyle, background:C.sagePale, display:'flex', alignItems:'center', gap:12 }}>
        <Check size={15} color={C.sage} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12, fontWeight:800, color:C.sage }}>상담 유입이 보류 intake로 저장되었습니다</p>
          <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>
            {savedIntake?.source_channel || 'manual'} · {savedIntake?.next_suggested_action || 'create_or_link_patient'}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ ...baseStyle, background:C.redPale, display:'flex', alignItems:'center', gap:12 }}>
        <AlertCircle size={15} color={C.red} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12, fontWeight:800, color:C.red }}>상담 유입 저장 실패</p>
          <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>{errorMsg}</p>
        </div>
        <button onClick={() => setPhase('idle')} style={{ border:'none', background:'none', cursor:'pointer', color:C.textMt }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, background:C.white, display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Clipboard size={14} color={C.mocha} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:12, fontWeight:800, color:C.textSub }}>상담 유입으로 보류 저장</p>
        <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>
          환자 생성 전, TikiPaste 분석 결과를 pending intake로 남깁니다
        </p>
      </div>
      <button onClick={savePending} disabled={phase === 'saving'} style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'8px 14px', borderRadius:9,
        background:C.mochaPale, color:C.mochaDk,
        border:`1px solid ${C.border}`,
        fontSize:11, fontWeight:850,
        cursor: phase === 'saving' ? 'not-allowed' : 'pointer',
        opacity: phase === 'saving' ? 0.65 : 1,
      }}>
        {phase === 'saving'
          ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> 저장 중</>
          : <><Save size={12} /> 보류 저장</>
        }
      </button>
    </div>
  );
}

function PatientMatchPanel({ result, input, sourceCapture, matchState, onCompleted }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [phase, setPhase] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const candidate = result?.patient_candidate || {};
  const visitCandidate = result?.visit_candidate || {};
  const matches = matchState?.candidates || [];

  useEffect(() => {
    setSelectedPatient(matches[0]?.confidence === 'high' ? matches[0].patient : null);
    setPatientName(candidate.name || '');
    setVisitDate(visitCandidate.visit_date || '');
    setPhase('idle');
    setErrorMsg('');
    setLinkUrl('');
  }, [result, matches[0]?.patient?.id]);

  async function saveDecision(mode) {
    if (!result || phase === 'saving') return;
    if (mode === 'link_existing' && !selectedPatient?.id) return;
    if (mode === 'create_patient' && !patientName.trim()) {
      setErrorMsg('새 환자로 저장하려면 환자 이름이 필요합니다.');
      setPhase('error');
      return;
    }

    setPhase('saving');
    setErrorMsg('');
    setLinkUrl('');

    try {
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');

      const intakeRes = await fetch('/api/conversation-intakes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: sourceCapture,
          raw_text: input || result.extracted_text || '',
          analysis: {
            ...result,
            match_context: {
              selected_mode: mode,
              selected_patient_id: selectedPatient?.id || null,
              match_candidates: matches.slice(0, 3),
            },
          },
          patient_candidate: {
            ...candidate,
            name: patientName.trim() || candidate.name || null,
          },
          visit_candidate: {
            ...visitCandidate,
            visit_date: visitDate || visitCandidate.visit_date || null,
            procedure_interests: result.procedure_interests || visitCandidate.procedure_interests || [],
          },
          missing_fields: result.missing_fields || [],
          next_suggested_action: mode === 'link_existing' ? 'link_existing_patient' : 'create_new_patient',
        }),
      });
      const intakeData = await intakeRes.json().catch(() => ({}));
      if (!intakeRes.ok) throw new Error(intakeData.error || `HTTP ${intakeRes.status}`);

      const convertPayload = mode === 'link_existing'
        ? {
            mode,
            patientId: selectedPatient.id,
            visit: { visitDate },
          }
        : {
            mode: 'create_patient',
            patient: {
              name: patientName.trim(),
              nationality: candidate.nationality || null,
              lang: candidate.lang || null,
            },
            visit: { visitDate },
          };

      const convertRes = await fetch(`/api/conversation-intakes/${intakeData.intake.id}/convert`, {
        method: 'POST',
        headers,
        body: JSON.stringify(convertPayload),
      });
      const converted = await convertRes.json().catch(() => ({}));
      if (!convertRes.ok) throw new Error(converted.error || `HTTP ${convertRes.status}`);

      const patientId = converted.patient?.id || selectedPatient?.id;
      if (patientId) {
        await fetch('/api/memory', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            patientId,
            koSummary: result.ko_summary || result.conversation_summary || null,
            riskLevel: result.risk_level || 'none',
            procedureInterests: result.procedure_interests || [],
            concerns: result.concerns || [],
            riskFlags: result.risk_level === 'high'
              ? [{ type: 'tikipaste_intake', detail: result.last_message_intent || result.intent, severity: 'high' }]
              : [],
          }),
        }).catch(() => {});
      }

      setLinkUrl(converted.link?.url || '');
      setPhase('done');
      onCompleted?.(converted);
    } catch (err) {
      setErrorMsg(friendlyError(err.message, '환자/방문 저장에 실패했습니다.'));
      setPhase('error');
    }
  }

  return (
    <section style={{ display:'grid', gap:12, padding:16, background:C.white, border:`1px solid ${C.border}`, borderRadius:16, boxShadow:'0 8px 28px rgba(1,69,242,0.06)' }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:36, height:36, borderRadius:11, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Search size={15} color={C.mocha} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:16, fontWeight:950, color:C.text, letterSpacing:'-0.04em' }}>3. 기존 환자 확인 / 새 환자 등록</p>
          <p style={{ fontSize:11, color:C.textMt, marginTop:3, lineHeight:1.55 }}>
            분석된 환자 정보를 기존 기록과 비교합니다. 자동 확정하지 않고 직원이 직접 선택합니다.
          </p>
        </div>
        {matchState?.loading && <Loader2 size={15} color={C.mocha} style={{ animation:'spin 1s linear infinite' }} />}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:12 }}>
        <div style={{ display:'grid', gap:8, padding:12, borderRadius:12, background:C.bgSub, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:11, fontWeight:900, color:C.textSub }}>분석된 환자/방문 후보</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 150px', gap:8 }}>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="환자 이름 확인"
              style={{ border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 10px', fontSize:12, outline:'none', background:C.white }}
            />
            <input
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              type="date"
              style={{ border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 10px', fontSize:12, outline:'none', background:C.white }}
            />
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(result.procedure_interests || []).slice(0, 5).map((item) => (
              <span key={item} style={{ fontSize:10.5, fontWeight:850, color:C.mochaDk, background:C.mochaPale, borderRadius:999, padding:'4px 8px' }}>{item}</span>
            ))}
            {(result.missing_fields || []).map((field) => (
              <span key={field} style={{ fontSize:10.5, fontWeight:850, color:C.red, background:C.redPale, borderRadius:999, padding:'4px 8px' }}>확인 필요: {missingFieldLabel(field)}</span>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gap:8, padding:12, borderRadius:12, background:C.bgSub, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:11, fontWeight:900, color:C.textSub }}>기존 환자 후보</p>
          {matchState?.error && <p style={{ fontSize:11, color:C.red }}>{matchState.error}</p>}
          {!matchState?.loading && matches.length === 0 && (
            <p style={{ fontSize:11, color:C.textMt, lineHeight:1.5 }}>확실한 기존 환자 후보가 없습니다. 새 환자로 저장하거나 보류 intake에 남겨 확인하세요.</p>
          )}
          {matches.slice(0, 3).map((match) => (
            <button
              key={match.patient.id}
              type="button"
              onClick={() => setSelectedPatient(match.patient)}
              style={{
                display:'grid',
                gap:3,
                textAlign:'left',
                border:`1px solid ${selectedPatient?.id === match.patient.id ? C.mocha : C.border}`,
                background:selectedPatient?.id === match.patient.id ? C.mochaPale : C.white,
                borderRadius:10,
                padding:'9px 10px',
                cursor:'pointer',
              }}
            >
              <span style={{ fontSize:12, fontWeight:900, color:C.text }}>{match.patient.name}</span>
              <span style={{ fontSize:10.5, color:C.textMt }}>
                {match.confidence === 'high' ? '높은 확률' : match.confidence === 'medium' ? '확인 필요' : '낮은 확률'}
                {' · '}{match.reasons.join(', ') || '부분 일치'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {phase === 'error' && (
        <p style={{ fontSize:11, color:C.red, background:C.redPale, borderRadius:10, padding:'9px 11px' }}>{friendlyError(errorMsg, '환자 저장에 실패했습니다. 입력값과 로그인 상태를 확인해 주세요.')}</p>
      )}
      {phase === 'done' && (
        <div style={{ display:'grid', gap:10, background:C.sagePale, borderRadius:12, padding:'13px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Check size={14} color={C.sage} />
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, color:C.sage, fontWeight:950 }}>환자/방문 저장 완료</p>
            <p style={{ fontSize:11, color:C.textMt, marginTop:2 }}>이제 My Tiki 링크를 복사해 환자에게 공유할 수 있습니다.</p>
          </div>
          </div>
          {linkUrl && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:9, borderRadius:10, background:C.white }}>
              <span style={{ flex:1, minWidth:0, color:C.textSub, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{linkUrl}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(linkUrl)} style={{ border:'none', background:C.sage, color:'#fff', borderRadius:8, padding:'7px 10px', fontSize:11, fontWeight:900, cursor:'pointer' }}>
                My Tiki 링크 복사
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
        <button
          type="button"
          disabled={!selectedPatient || phase === 'saving'}
          onClick={() => saveDecision('link_existing')}
          style={{
            border:`1px solid ${C.border}`,
            background:selectedPatient && phase !== 'saving' ? C.mochaPale : C.bgDeep,
            color:selectedPatient && phase !== 'saving' ? C.mochaDk : C.textMt,
            borderRadius:10,
            padding:'9px 13px',
            fontSize:12,
            fontWeight:900,
            cursor:selectedPatient && phase !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          기존 환자로 저장
        </button>
        <button
          type="button"
          disabled={!patientName.trim() || phase === 'saving'}
          onClick={() => saveDecision('create_patient')}
          style={{
            border:'none',
            background:patientName.trim() && phase !== 'saving' ? C.mocha : C.bgDeep,
            color:patientName.trim() && phase !== 'saving' ? '#fff' : C.textMt,
            borderRadius:10,
            padding:'9px 14px',
            fontSize:12,
            fontWeight:950,
            boxShadow:patientName.trim() && phase !== 'saving' ? '0 4px 16px rgba(1,69,242,0.24)' : 'none',
            cursor:patientName.trim() && phase !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          {phase === 'saving' ? '저장 중…' : '새 환자 등록'}
        </button>
      </div>
    </section>
  );
}

function PendingIntakeCard({ intake, clinicId, onConverted }) {
  const [patientName, setPatientName] = useState(intake.patient_candidate?.name || '');
  const [visitDate, setVisitDate] = useState(intake.visit_candidate?.visit_date || '');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [convertedLink, setConvertedLink] = useState(null);

  useEffect(() => {
    let active = true;
    async function searchPatients() {
      const q = patientQuery.trim();
      if (q.length < 2) {
        setPatientResults([]);
        return;
      }
      try {
        const params = new URLSearchParams({ q, ...(clinicId ? { clinicId } : {}) });
        const headers = await getStaffAuthHeaders();
        const res = await fetch(`/api/patients/search?${params}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (active) setPatientResults(data.patients || []);
      } catch {
        if (active) setPatientResults([]);
      }
    }
    const timer = setTimeout(searchPatients, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [patientQuery, clinicId]);

  async function convert(mode) {
    if (phase === 'saving') return;
    setPhase('saving');
    setErrorMsg('');
    setConvertedLink(null);
    try {
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');
      const payload = mode === 'link_existing'
        ? {
            mode,
            patientId: selectedPatient?.id,
            visit: { visitDate },
          }
        : {
            mode: 'create_patient',
            patient: { name: patientName },
            visit: { visitDate },
          };
      const res = await fetch(`/api/conversation-intakes/${intake.id}/convert`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setConvertedLink(data.link?.url || '');
      setPhase('done');
      onConverted?.(data);
    } catch (err) {
      setErrorMsg(friendlyError(err.message, '보류 상담 전환에 실패했습니다.'));
      setPhase('error');
    }
  }

  return (
    <div style={{ border:`1px solid ${C.border}`, background:C.white, borderRadius:14, padding:14, display:'grid', gap:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ width:34, height:34, borderRadius:10, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Clipboard size={14} color={C.mocha} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:850, color:C.text, letterSpacing:'-0.02em' }}>
            {intake.source_channel || 'manual'} 상담 유입
            {intake.source_handle ? ` · ${intake.source_handle}` : ''}
          </p>
          <p style={{ fontSize:11, color:C.textMt, marginTop:3, lineHeight:1.5 }}>
            {intake.last_patient_intent || '의도 미확인'} · 위험도 {intake.risk_level || 'low'}
          </p>
        </div>
        <span style={{ fontSize:10, fontWeight:800, color:C.mocha, background:C.mochaPale, padding:'4px 8px', borderRadius:999 }}>
          pending
        </span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:8 }}>
        <input
          value={patientName}
          onChange={e => setPatientName(e.target.value)}
          placeholder="새 환자명 확인 입력"
          style={{ border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 10px', fontSize:12, outline:'none' }}
        />
        <input
          value={visitDate}
          onChange={e => setVisitDate(e.target.value)}
          placeholder="방문일"
          type="date"
          style={{ border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 10px', fontSize:12, outline:'none' }}
        />
      </div>

      <div style={{ display:'grid', gap:7 }}>
        <input
          value={patientQuery}
          onChange={e => { setPatientQuery(e.target.value); setSelectedPatient(null); }}
          placeholder="기존 환자 검색"
          style={{ border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 10px', fontSize:12, outline:'none' }}
        />
        {patientResults.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {patientResults.slice(0, 4).map(patient => (
              <button
                key={patient.id}
                type="button"
                onClick={() => {
                  setSelectedPatient(patient);
                  setPatientQuery(patient.name);
                  setPatientResults([]);
                }}
                style={{
                  border:`1px solid ${selectedPatient?.id === patient.id ? C.mocha : C.border}`,
                  background:selectedPatient?.id === patient.id ? C.mochaPale : C.bgSub,
                  color:C.textSub,
                  borderRadius:999,
                  padding:'5px 9px',
                  fontSize:11,
                  fontWeight:800,
                  cursor:'pointer',
                }}
              >
                {patient.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {intake.parsed_procedure_interests?.length > 0 && (
        <p style={{ fontSize:10.5, color:C.textMt }}>
          관심 시술: {intake.parsed_procedure_interests.join(', ')}
        </p>
      )}

      {phase === 'error' && (
        <p style={{ fontSize:11, color:C.red, background:C.redPale, borderRadius:9, padding:'8px 10px' }}>{errorMsg}</p>
      )}
      {phase === 'done' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:C.sagePale, borderRadius:9, padding:'8px 10px' }}>
          <Check size={13} color={C.sage} />
          <p style={{ flex:1, fontSize:11, color:C.sage, fontWeight:800 }}>전환 완료 · My Tiki 링크 발급됨</p>
          {convertedLink && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(convertedLink)}
              style={{ border:'none', background:C.white, color:C.sage, borderRadius:8, padding:'5px 8px', fontSize:10, fontWeight:800, cursor:'pointer' }}
            >
              링크 복사
            </button>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap' }}>
        <button
          type="button"
          onClick={() => convert('link_existing')}
          disabled={!selectedPatient || phase === 'saving'}
          style={{
            border:`1px solid ${C.border}`,
            background:selectedPatient && phase !== 'saving' ? C.mochaPale : C.bgDeep,
            color:selectedPatient && phase !== 'saving' ? C.mochaDk : C.textMt,
            borderRadius:9,
            padding:'8px 11px',
            fontSize:11,
            fontWeight:850,
            cursor:selectedPatient && phase !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          기존 환자 연결
        </button>
        <button
          type="button"
          onClick={() => convert('create_patient')}
          disabled={!patientName.trim() || phase === 'saving'}
          style={{
            border:'none',
            background:patientName.trim() && phase !== 'saving' ? C.mocha : C.bgDeep,
            color:patientName.trim() && phase !== 'saving' ? '#fff' : C.textMt,
            borderRadius:9,
            padding:'8px 12px',
            fontSize:11,
            fontWeight:850,
            cursor:patientName.trim() && phase !== 'saving' ? 'pointer' : 'not-allowed',
          }}
        >
          {phase === 'saving' ? '전환 중…' : '새 환자로 전환'}
        </button>
      </div>
    </div>
  );
}

function PendingIntakeQueue({ clinicId, refreshKey, onConverted }) {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadIntakes = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = await getStaffAuthHeaders();
      if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');
      const res = await fetch('/api/conversation-intakes?status=pending&limit=6', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setIntakes(data.intakes || []);
    } catch (err) {
      setErrorMsg(friendlyError(err.message, '보류 상담을 불러오지 못했습니다.'));
      setIntakes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes, refreshKey]);

  if (!loading && !errorMsg && intakes.length === 0) return null;

  return (
    <section style={{ display:'grid', gap:12, padding:'16px', background:C.bgSub, border:`1px solid ${C.border}`, borderRadius:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:14, fontWeight:900, color:C.text, letterSpacing:'-0.03em' }}>보류 상담 intake</p>
          <p style={{ fontSize:11, color:C.textMt, marginTop:3 }}>직원이 확인한 뒤 기존 환자에 연결하거나 새 환자+방문+My Tiki 링크로 전환합니다.</p>
        </div>
        <button
          type="button"
          onClick={loadIntakes}
          style={{ border:`1px solid ${C.border}`, background:C.white, borderRadius:9, padding:'7px 10px', fontSize:11, fontWeight:800, color:C.textSub, cursor:'pointer' }}
        >
          새로고침
        </button>
      </div>
      {loading && <p style={{ fontSize:12, color:C.textMt }}>불러오는 중…</p>}
      {errorMsg && <p style={{ fontSize:12, color:C.red }}>{errorMsg}</p>}
      {!loading && intakes.map(intake => (
        <PendingIntakeCard
          key={intake.id}
          intake={intake}
          clinicId={clinicId}
          onConverted={(data) => {
            setIntakes(current => current.filter(item => item.id !== intake.id));
            onConverted?.(data);
          }}
        />
      ))}
    </section>
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
      <div style={{ width:56, height:56, borderRadius:16, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 20px rgba(1,69,242,0.12)` }}>
        <Sparkles size={24} color={C.mocha} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6, letterSpacing:'-0.02em' }}>외국인 환자 메시지를 분석합니다</p>
        <p style={{ fontSize:12, color:C.textMt, lineHeight:1.7 }}>메시지를 붙여넣으면 언어와 의도를 파악하고<br />바로 복사해 쓸 수 있는 답변을 준비합니다</p>
      </div>
      {examples && (
        <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.1em', textAlign:'center', marginBottom:4 }}>예시 메시지</p>
          {examples.map((ex, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:C.white, boxShadow:`0 1px 6px rgba(1,69,242,0.07)`, borderRadius:10 }}>
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
  const [sourceCapture, setSourceCapture] = useState({
    channel: 'manual',
    handle: '',
    phone: '',
    memo: '',
  });
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState('');
  const [pasting,    setPasting]    = useState(false);
  const [tikiActive, setTikiActive] = useState(false);
  const [quickVisitOpen, setQuickVisitOpen] = useState(false);
  const [intakeRefreshKey, setIntakeRefreshKey] = useState(0);
  const [showPendingIntakes, setShowPendingIntakes] = useState(false);
  const [matchState, setMatchState] = useState({ loading:false, candidates:[], signals:null, recommended_mode:'create_or_review', error:'' });
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
      setError(friendlyError(err.message, '스크린샷을 읽지 못했습니다.'));
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
      setError(friendlyError(err.message, 'AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
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
    setSourceCapture({ channel: 'manual', handle: '', phone: '', memo: '' });
    setResult(null);
    setError(null);
  };

  const handoffText = input || result?.extracted_text || result?.conversation_summary || result?.ko_summary || '';
  const hasContent = input.trim() || image || result || loading;
  const activeStep = loading ? 2 : result ? 3 : 1;

  useEffect(() => {
    let active = true;
    async function loadMatches() {
      if (!result) {
        setMatchState({ loading:false, candidates:[], signals:null, recommended_mode:'create_or_review', error:'' });
        return;
      }
      setMatchState(prev => ({ ...prev, loading:true, error:'' }));
      try {
        const headers = await getStaffAuthHeaders();
        if (!headers.Authorization) throw new Error('로그인 세션이 필요합니다.');
        const res = await fetch('/api/patients/match-candidates', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            analysis: result,
            source: sourceCapture,
            raw_text: handoffText,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (active) {
          setMatchState({
            loading:false,
            candidates:data.candidates || [],
            signals:data.signals || null,
            recommended_mode:data.recommended_mode || 'create_or_review',
            error:'',
          });
        }
      } catch (err) {
        if (active) {
          setMatchState({
            loading:false,
            candidates:[],
            signals:null,
            recommended_mode:'create_or_review',
            error:friendlyError(err.message, '기존 환자 후보를 찾지 못했습니다.'),
          });
        }
      }
    }
    loadMatches();
    return () => { active = false; };
  }, [result, sourceCapture.channel, sourceCapture.handle, sourceCapture.phone, handoffText]);

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
        boxShadow:`0 1px 0 ${C.border}, 0 4px 16px rgba(1,69,242,0.04)`,
        display:'flex', alignItems:'center', gap:16,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 3px 12px rgba(1,69,242,0.40)`, flexShrink:0 }}>
            <Sparkles size={15} color="#fff" fill="rgba(255,255,255,0.5)" />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:14, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>Tiki Paste</span>
              <span style={{ fontSize:9, fontWeight:700, color:C.mocha, background:C.mochaPale, padding:'2px 7px', borderRadius:999, letterSpacing:'0.04em', textTransform:'uppercase' }}>AI Copilot</span>
            </div>
            <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>상담 입력 → AI 분석 → 환자 확인 → 다음 조치</p>
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
        <WorkflowSteps step={activeStep} />

        {/* ── Input section ──────────────────────────────────────────────────── */}
        <WorkspaceInput
          input={input}
          image={image}
          sourceCapture={sourceCapture}
          loading={loading}
          pasting={pasting}
          onInputChange={(v) => { setInput(v); setResult(null); setError(null); }}
          onSourceCaptureChange={setSourceCapture}
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
                <p style={{ fontSize:12, fontWeight:700, color:C.mochaDk }}>언어 감지 → 의도 파악 → 바로 쓸 답변 생성 중...</p>
                <p style={{ fontSize:10, color:C.textMt, marginTop:2 }}>병원 시술 DB를 참조해 직원이 복사할 수 있는 답변 1개를 우선 준비합니다</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr)', gap:14 }}>
              <SkeletonCard delay={0} />
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

        {/* ── Best reply ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <BestReplyPanel
            result={result}
            onCopy={() => { showToast('클립보드에 복사되었습니다'); triggerTiki(); }}
          />
        )}

        {/* ── Patient confirmation ───────────────────────────────────────────── */}
        {result && !loading && (
          <div style={{ display:'grid', gap:12 }}>
            <PatientMatchPanel
              result={result}
              input={handoffText}
              sourceCapture={sourceCapture}
              matchState={matchState}
              onCompleted={() => {
                showToast('상담이 환자 여정으로 저장되었습니다');
                setIntakeRefreshKey((value) => value + 1);
              }}
            />
            <section style={{ display:'grid', gap:12, padding:16, background:C.white, border:`1px solid ${C.border}`, borderRadius:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:C.goldPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Send size={15} color={C.gold} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:16, fontWeight:950, color:C.text, letterSpacing:'-0.04em' }}>4. 다음 조치</p>
                  <p style={{ fontSize:11, color:C.textMt, marginTop:3 }}>My Tiki 링크는 환자와 방문이 확정된 뒤에만 표시됩니다.</p>
                </div>
                <button className="action-btn" onClick={() => setQuickVisitOpen(true)} style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'9px 14px', borderRadius:9,
                  background:C.mochaPale, color:C.mochaDk, border:`1px solid ${C.border}`,
                  fontSize:12, fontWeight:900,
                }}>
                  <UserPlus size={13} /> 직접 새 환자 등록
                </button>
              </div>
              <div style={{ padding:'11px 13px', borderRadius:12, background:C.bgSub, color:C.textMt, fontSize:12, lineHeight:1.65 }}>
                먼저 위에서 기존 환자 연결 또는 새 환자 등록을 확정하세요. 확정되면 환자 기록, 방문, Memory, My Tiki 링크가 이어집니다.
              </div>
            </section>
          </div>
        )}

        <section style={{ display:'grid', gap:12 }}>
          <button
            type="button"
            onClick={() => setShowPendingIntakes(value => !value)}
            style={{
              justifySelf:'start',
              display:'inline-flex',
              alignItems:'center',
              gap:8,
              padding:'9px 13px',
              borderRadius:999,
              border:`1px solid ${C.border}`,
              background:C.white,
              color:C.textSub,
              fontSize:12,
              fontWeight:900,
              cursor:'pointer',
            }}
          >
            <Clipboard size={13} />
            보류 상담 열기
          </button>
          {showPendingIntakes && (
            <>
              {result && !loading && (
                <PendingIntakeBar
                  result={result}
                  input={handoffText}
                  sourceCapture={sourceCapture}
                  onSaved={() => {
                    showToast('상담 유입이 보류 intake로 저장되었습니다');
                    setIntakeRefreshKey((value) => value + 1);
                  }}
                />
              )}
              <PendingIntakeQueue
                clinicId={clinicId}
                refreshKey={intakeRefreshKey}
                onConverted={() => showToast('보류 상담이 환자 방문으로 전환되었습니다')}
              />
            </>
          )}
        </section>

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
            showToast('새 환자 등록과 My Tiki 링크가 준비되었습니다');
          }}
        />
      )}
    </div>
  );
}
