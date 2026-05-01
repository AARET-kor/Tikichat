import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Pause, Play, Save, Brain,
  ShieldAlert, Activity, MessageCircle, User,
  Stethoscope, ChevronRight, Check, Clock,
  Globe, Zap, X, RotateCcw,
} from 'lucide-react';

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

// ── Mock session + turn sequence ──────────────────────────────────────────────
const MOCK_PATIENT = {
  name: '다나카 유미',
  nameRaw: '田中 ゆみ',
  flag: '🇯🇵',
  lang: 'ja',
  langLabel: '일본어',
  room: '상담실 2',
  lastVisit: '3주 전',
};

const MOCK_TURNS = [
  {
    id: 1,
    speaker: 'patient',
    raw: 'ヒアルロン酸の効果はいつ頃から出てきますか？副作用が少し心配なんですが…',
    rawLang: 'ja',
    interpretation: '히알루론산 시술 효과 발현 시점과 부작용 여부에 대해 질문하고 있습니다.',
    intent: '시술 효과 · 부작용 문의',
    confidence: 0.91,
    risk: false,
    newEntities: [
      { category: '시술', value: '히알루론산', color: C.mocha },
      { category: '관심사', value: '효과 발현', color: C.sage },
      { category: '우려', value: '부작용', color: C.gold },
    ],
  },
  {
    id: 2,
    speaker: 'doctor',
    raw: '히알루론산은 시술 직후부터 효과를 느낄 수 있어요. 붓기는 보통 3~5일 안에 가라앉고, 부작용은 경미한 멍이나 붓기 정도입니다.',
    rawLang: 'ko',
    translation: 'ヒアルロン酸は施術直後から効果を感じていただけます。腫れは通常3〜5日で引き、副作用は軽い内出血や腫れ程度です。',
    confidence: 0.94,
    risk: false,
    newEntities: [
      { category: '기간', value: '3~5일 붓기', color: C.sage },
    ],
  },
  {
    id: 3,
    speaker: 'patient',
    raw: '料金はどのくらいかかりますか？分割払いはできますか？',
    rawLang: 'ja',
    interpretation: '시술 비용과 할부 결제 가능 여부를 문의하고 있습니다.',
    intent: '가격 · 결제 방법',
    confidence: 0.88,
    risk: false,
    newEntities: [
      { category: '문의', value: '시술 비용', color: C.gold },
      { category: '결제', value: '할부 납부', color: C.gold },
    ],
  },
  {
    id: 4,
    speaker: 'doctor',
    raw: '비용은 부위와 용량에 따라 다른데요, 보통 30만원에서 80만원 사이예요. 카드 할부 가능하고, 오늘 상담 후 바로 시술도 가능합니다.',
    rawLang: 'ko',
    translation: '費用は部位と量によって異なりますが、通常30万ウォンから80万ウォンです。カード分割払いも可能で、本日ご相談後に施術も可能です。',
    confidence: 0.96,
    risk: false,
    newEntities: [
      { category: '가격', value: '30~80만원', color: C.gold },
      { category: '결제', value: '카드 할부', color: C.sage },
    ],
  },
  {
    id: 5,
    speaker: 'patient',
    raw: 'ダウンタイムはどのくらいですか？明日大事な仕事があるんですが…',
    rawLang: 'ja',
    interpretation: '다운타임 기간을 묻고 있으며, 내일 중요한 업무 일정이 있다고 언급합니다.',
    intent: '다운타임 · 일정 확인',
    confidence: 0.83,
    risk: true,
    riskMsg: '내일 중요 업무 일정 언급 — 시술 일정 및 다운타임 조율 필요',
    riskLevel: 'medium',
    newEntities: [
      { category: '관심사', value: '다운타임', color: C.mocha },
      { category: '일정', value: '내일 업무', color: C.red },
    ],
  },
  {
    id: 6,
    speaker: 'doctor',
    raw: '다운타임은 보통 3~7일이에요. 내일 중요한 일정이 있으시면, 일정 후에 시술받으시는 걸 추천드려요. 붓기가 남을 수 있거든요.',
    rawLang: 'ko',
    translation: 'ダウンタイムは通常3〜7日です。明日大事なご予定がある場合は、その後に施術されることをお勧めします。腫れが残る可能性があります。',
    confidence: 0.97,
    risk: false,
    newEntities: [
      { category: '기간', value: '다운타임 3~7일', color: C.mocha },
    ],
  },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  .tikitalk * { font-family: ${SANS}; box-sizing: border-box; }
  @keyframes ttFadeUp {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ttFadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes ttSlideRight {
    from { opacity:0; transform:translateX(-10px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes ttSlideLeft {
    from { opacity:0; transform:translateX(10px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes ttPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.5; transform:scale(0.9); }
  }
  @keyframes ttBlink {
    0%,100% { opacity:1; }
    50%      { opacity:0.3; }
  }
  @keyframes ttWave {
    0%,100% { transform:scaleY(0.4); }
    50%      { transform:scaleY(1); }
  }
  @keyframes ttRipple {
    0%   { transform:scale(0.95); opacity:0.7; }
    100% { transform:scale(1.6);  opacity:0; }
  }
  @keyframes ttSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  .tt-listening-bar {
    display:inline-block; width:3px; border-radius:2px;
    animation: ttWave 0.8s ease-in-out infinite;
    background: ${C.mocha};
  }
  .tt-btn { transition: all 0.16s ease; cursor:pointer; }
  .tt-btn:hover { opacity:0.85; }
  .tt-ctrl-btn { transition: all 0.2s ease; cursor:pointer; border:none; }
  .tt-entity-chip { transition: all 0.15s ease; }
`;

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const pct   = Math.round(value * 100);
  const color = pct >= 80 ? C.sage : pct >= 60 ? C.gold : C.red;
  const label = pct >= 80 ? '높음' : pct >= 60 ? '보통' : '낮음';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.08em' }}>신뢰도</span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:11, fontWeight:800, color }}>{ pct }%</span>
          <span style={{ fontSize:9, fontWeight:700, color, background:color+'18', padding:'1px 6px', borderRadius:999 }}>{label}</span>
        </div>
      </div>
      <div style={{ height:6, background:C.bgDeep, borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

// ── Listening animation ───────────────────────────────────────────────────────
function ListeningWave({ color = C.mocha, size = 'md' }) {
  const h = size === 'sm' ? 12 : 18;
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.75];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, height:h }}>
      {bars.map((scale, i) => (
        <div key={i} className="tt-listening-bar" style={{
          height:h, background:color,
          animationDelay:`${i * 80}ms`,
          animationDuration:`${0.7 + i * 0.05}s`,
          opacity: 0.6 + scale * 0.4,
        }} />
      ))}
    </div>
  );
}

// ── Turn card — Patient ───────────────────────────────────────────────────────
function PatientTurnCard({ turn, isLatest }) {
  const [showInterp, setShowInterp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowInterp(true), 600);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.round(turn.confidence * 100);
  const confColor = pct >= 80 ? C.sage : pct >= 60 ? C.gold : C.red;

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:8, maxWidth:'76%',
      alignSelf:'flex-start',
      animation: isLatest ? 'ttSlideRight 0.4s cubic-bezier(0.22,1,0.36,1) both' : 'none',
    }}>
      {/* Speaker label */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:14 }}>{MOCK_PATIENT.flag}</span>
        <span style={{ fontSize:10, fontWeight:700, color:C.textMt, letterSpacing:'0.04em' }}>{MOCK_PATIENT.name}</span>
        <span style={{ fontSize:9, color:C.textMt }}>·</span>
        <span style={{ fontSize:10, color:C.textMt, fontWeight:500 }}>{MOCK_PATIENT.langLabel}</span>
        {turn.intent && (
          <span style={{ fontSize:9, fontWeight:700, color:C.mocha, background:C.mochaPale, border:`1px solid ${C.border}`, padding:'1px 7px', borderRadius:999, letterSpacing:'-0.01em' }}>{turn.intent}</span>
        )}
      </div>

      {/* Raw text card */}
      <div style={{
        background: C.mochaPale,
        border: `1px solid ${C.border}`,
        borderRadius: '4px 16px 16px 16px',
        padding: '14px 16px',
        position: 'relative',
        boxShadow: `0 2px 8px rgba(1,69,242,0.08)`,
      }}>
        {/* Language badge */}
        <div style={{ position:'absolute', top:10, right:12, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:9, fontWeight:700, color:confColor, background:confColor+'18', padding:'2px 7px', borderRadius:999, letterSpacing:'0.04em' }}>{pct}%</span>
        </div>
        <p style={{ fontSize:15, fontWeight:600, color:C.text, lineHeight:1.65, letterSpacing:'0.01em', paddingRight:40 }}>{turn.raw}</p>
      </div>

      {/* Korean interpretation */}
      {showInterp && (
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '4px 12px 12px 12px',
          padding: '11px 14px',
          animation: 'ttFadeIn 0.35s ease-out both',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
            <Brain size={10} color={C.mocha} />
            <span style={{ fontSize:9, fontWeight:800, color:C.mocha, letterSpacing:'0.08em', textTransform:'uppercase' }}>한국어 해석</span>
          </div>
          <p style={{ fontSize:13, color:C.textSub, lineHeight:1.7, letterSpacing:'-0.01em' }}>{turn.interpretation}</p>
        </div>
      )}
    </div>
  );
}

// ── Turn card — Doctor ────────────────────────────────────────────────────────
function DoctorTurnCard({ turn, isLatest }) {
  const [showTrans, setShowTrans] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowTrans(true), 500);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.round(turn.confidence * 100);

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:8, maxWidth:'76%',
      alignSelf:'flex-end', alignItems:'flex-end',
      animation: isLatest ? 'ttSlideLeft 0.4s cubic-bezier(0.22,1,0.36,1) both' : 'none',
    }}>
      {/* Speaker label */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:10, color:C.textMt, fontWeight:500 }}>한국어</span>
        <span style={{ fontSize:9, color:C.textMt }}>·</span>
        <span style={{ fontSize:10, fontWeight:700, color:C.textMt, letterSpacing:'0.04em' }}>의사</span>
        <Stethoscope size={11} color={C.mocha} />
      </div>

      {/* Korean speech card */}
      <div style={{
        background: C.white,
        border: `1.5px solid ${C.mocha}40`,
        borderRadius: '16px 4px 16px 16px',
        padding: '14px 16px',
        boxShadow: `0 2px 12px rgba(1,69,242,0.10)`,
        position:'relative',
      }}>
        <div style={{ position:'absolute', top:10, right:12 }}>
          <span style={{ fontSize:9, fontWeight:700, color:C.sage, background:C.sagePale, padding:'2px 7px', borderRadius:999, letterSpacing:'0.04em' }}>{pct}%</span>
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.7, fontWeight:500, letterSpacing:'-0.01em', paddingRight:36 }}>{turn.raw}</p>
      </div>

      {/* Patient-language translation */}
      {showTrans && (
        <div style={{
          background: C.bgSub,
          border: `1px solid ${C.border}`,
          borderRadius: '12px 4px 12px 12px',
          padding: '11px 14px',
          animation: 'ttFadeIn 0.35s ease-out both',
          textAlign:'right',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6, justifyContent:'flex-end' }}>
            <span style={{ fontSize:9, fontWeight:800, color:C.textSub, letterSpacing:'0.08em', textTransform:'uppercase' }}>{MOCK_PATIENT.langLabel} 번역</span>
            <Globe size={10} color={C.textMt} />
          </div>
          <p style={{ fontSize:13, color:C.textSub, lineHeight:1.7, letterSpacing:'0.01em' }}>{turn.translation}</p>
        </div>
      )}
    </div>
  );
}

// ── Live indicator card ───────────────────────────────────────────────────────
function LiveCard({ speaker }) {
  const isPatient = speaker === 'patient';
  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:8, maxWidth:'76%',
      alignSelf: isPatient ? 'flex-start' : 'flex-end',
      animation: 'ttFadeIn 0.3s ease-out',
    }}>
      <div style={{
        padding:'16px 18px',
        background: isPatient ? C.mochaPale : C.white,
        border: `1.5px solid ${isPatient ? C.border : C.mocha + '40'}`,
        borderRadius: isPatient ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        display:'flex', alignItems:'center', gap:12,
        boxShadow: `0 2px 8px rgba(1,69,242,0.08)`,
      }}>
        <ListeningWave color={isPatient ? C.mocha : C.sage} />
        <span style={{ fontSize:12, color:C.textMt, fontWeight:500 }}>
          {isPatient ? '듣는 중...' : '분석 중...'}
        </span>
      </div>
    </div>
  );
}

// ── Right panel — entities ────────────────────────────────────────────────────
function EntityPanel({ entities }) {
  const grouped = entities.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  if (entities.length === 0) {
    return (
      <div style={{ padding:'12px', textAlign:'center' }}>
        <p style={{ fontSize:11, color:C.textMt }}>대화가 시작되면<br />자동으로 추출됩니다</p>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p style={{ fontSize:9, fontWeight:800, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{cat}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {items.map((item, i) => (
              <span key={i} className="tt-entity-chip" style={{
                fontSize:11, fontWeight:700, color:item.color,
                background:item.color+'18', border:`1px solid ${item.color}35`,
                padding:'3px 9px', borderRadius:999, letterSpacing:'-0.01em',
                animation:'ttFadeIn 0.3s ease-out both',
              }}>{item.value}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Right panel — risks ───────────────────────────────────────────────────────
function RiskPanel({ risks }) {
  if (risks.length === 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', background:C.sagePale, border:`1px solid ${C.sage}30`, borderRadius:10 }}>
        <Check size={12} color={C.sage} />
        <span style={{ fontSize:11, color:C.sage, fontWeight:600 }}>위험 신호 없음</span>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {risks.map((r, i) => (
        <div key={i} style={{
          padding:'10px 12px', background:r.level === 'high' ? C.redPale : C.goldPale,
          border:`1px solid ${r.level === 'high' ? C.red + '40' : C.gold + '40'}`,
          borderRadius:10, animation:'ttFadeIn 0.3s ease-out both',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
            <ShieldAlert size={11} color={r.level === 'high' ? C.red : C.gold} />
            <span style={{ fontSize:9, fontWeight:800, color:r.level === 'high' ? C.red : C.gold, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {r.level === 'high' ? '즉시 확인' : '주의'}
            </span>
          </div>
          <p style={{ fontSize:11, color:C.textSub, lineHeight:1.55, letterSpacing:'-0.01em' }}>{r.msg}</p>
        </div>
      ))}
    </div>
  );
}

// ── Session setup view ────────────────────────────────────────────────────────
function SessionSetupView({ onStart }) {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, padding:32 }}>
      <div style={{
        background:C.white, borderRadius:22,
        padding:'36px 40px', maxWidth:420, width:'100%',
        boxShadow:`0 8px 40px rgba(1,69,242,0.12), 0 2px 8px rgba(1,69,242,0.06)`,
        animation:'ttFadeUp 0.4s ease-out',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${C.mocha}40` }}>
            <MessageCircle size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize:16, fontWeight:900, color:C.text, letterSpacing:'-0.04em' }}>Tiki Talk</p>
            <p style={{ fontSize:11, color:C.textMt }}>실시간 AI 통역 세션</p>
          </div>
        </div>

        {/* Patient card */}
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>세션 환자</p>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:C.bgSub, borderRadius:13 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {MOCK_PATIENT.flag}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <p style={{ fontSize:14, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>{MOCK_PATIENT.name}</p>
                <span style={{ fontSize:10, color:C.textMt }}>{MOCK_PATIENT.nameRaw}</span>
              </div>
              <p style={{ fontSize:11, color:C.textMt, marginTop:2 }}>{MOCK_PATIENT.langLabel} · {MOCK_PATIENT.room} · 마지막 방문 {MOCK_PATIENT.lastVisit}</p>
            </div>
            <Check size={14} color={C.sage} />
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginBottom:28, display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { icon:User, text:'환자가 말하면 자동으로 한국어로 해석됩니다' },
            { icon:Stethoscope, text:'의사가 한국어로 말하면 자동으로 환자 언어로 번역됩니다' },
            { icon:Brain, text:'주요 정보는 자동으로 추출되어 오른쪽 패널에 표시됩니다' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:C.mochaPale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <Icon size={11} color={C.mocha} />
              </div>
              <p style={{ fontSize:12, color:C.textSub, lineHeight:1.6 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button className="tt-ctrl-btn" onClick={onStart} style={{
          width:'100%', padding:'14px', borderRadius:12,
          background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`,
          color:'#fff', fontSize:14, fontWeight:800, letterSpacing:'-0.02em',
          boxShadow:`0 6px 22px ${C.mocha}45`,
        }}>
          세션 시작 →
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:C.textMt, marginTop:10 }}>프로토타입 · 모의 데이터 사용 중</p>
      </div>
    </div>
  );
}

// ── Session saved view ────────────────────────────────────────────────────────
function SessionSavedView({ turns, elapsed, onReset }) {
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, padding:32 }}>
      <div style={{
        background:C.white, borderRadius:22,
        padding:'36px 40px', maxWidth:480, width:'100%',
        boxShadow:`0 8px 40px rgba(1,69,242,0.12), 0 2px 8px rgba(1,69,242,0.06)`,
        animation:'ttFadeUp 0.4s ease-out',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:C.sagePale, border:`1px solid ${C.sage}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Check size={18} color={C.sage} />
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>세션 저장 완료</p>
            <p style={{ fontSize:11, color:C.textMt }}>Tiki Memory에 요약이 저장되었습니다</p>
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding:'16px 18px', background:C.bgSub, borderRadius:13, marginBottom:20 }}>
          <p style={{ fontSize:10, fontWeight:800, color:C.textMt, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>AI 세션 요약</p>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              ['환자', MOCK_PATIENT.name + ' · ' + MOCK_PATIENT.langLabel],
              ['발화 수', `${turns.length}회`],
              ['세션 시간', fmt(elapsed)],
              ['주요 관심사', '히알루론산 효과, 비용, 다운타임'],
              ['우려사항', '부작용, 내일 업무 일정'],
              ['의사 답변 요점', '직후 효과, 3~5일 붓기, 할부 가능'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display:'flex', gap:12 }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.textMt, minWidth:80 }}>{k}</span>
                <span style={{ fontSize:11, color:C.textSub }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save options summary */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
          {[
            { label:'Tiki Memory 환자 기록 업데이트', done:true },
            { label:'세션 요약 저장', done:true },
            { label:'원문 텍스트 48시간 후 자동 삭제 예약', done:true },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Check size={12} color={C.sage} />
              <span style={{ fontSize:12, color:C.textSub }}>{item.label}</span>
            </div>
          ))}
        </div>

        <button className="tt-ctrl-btn" onClick={onReset} style={{
          width:'100%', padding:'12px', borderRadius:11,
          background:C.text, color:'#fff',
          fontSize:13, fontWeight:700, letterSpacing:'-0.02em',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <RotateCcw size={14} /> 새 세션 시작
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TikiTalkTab() {
  const [phase, setPhase]           = useState('setup');   // setup | active | paused | saved
  const [speakerMode, setSpeakerMode] = useState('idle');  // idle | patient | doctor | processing
  const [turns, setTurns]           = useState([]);
  const [liveCard, setLiveCard]     = useState(null);       // 'patient' | 'doctor' | null
  const [nextTurnIdx, setNextTurnIdx] = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const [entities, setEntities]     = useState([]);
  const [risks, setRisks]           = useState([]);
  const [currentConf, setCurrentConf] = useState(null);

  const scrollRef = useRef(null);
  const timerRef  = useRef(null);

  // Timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [turns, liveCard]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const handleStart = () => {
    setPhase('active');
    setTurns([]);
    setNextTurnIdx(0);
    setEntities([]);
    setRisks([]);
    setElapsed(0);
    setCurrentConf(null);
  };

  // Simulate a turn: show live card → after delay → add real turn card
  const simulateTurn = useCallback((turn) => {
    setSpeakerMode('processing');
    setLiveCard(turn.speaker);
    setCurrentConf(null);

    const listenDelay  = turn.speaker === 'patient' ? 1800 : 1400;
    const processDelay = 700;

    setTimeout(() => {
      setLiveCard(null);
      setCurrentConf(turn.confidence);

      // Add risk if present
      if (turn.risk && turn.riskMsg) {
        setRisks(prev => [...prev, { msg: turn.riskMsg, level: turn.riskLevel || 'medium' }]);
      }
      // Add entities
      if (turn.newEntities?.length) {
        setEntities(prev => {
          const merged = [...prev];
          turn.newEntities.forEach(ne => {
            if (!merged.find(e => e.value === ne.value)) merged.push(ne);
          });
          return merged;
        });
      }

      setTurns(prev => [...prev, { ...turn, isLatest: true }]);
      setNextTurnIdx(i => i + 1);
      setSpeakerMode('idle');
    }, listenDelay + processDelay);
  }, []);

  const handlePatientPress = () => {
    if (speakerMode !== 'idle' || phase !== 'active') return;
    // Find next patient turn
    let idx = nextTurnIdx;
    while (idx < MOCK_TURNS.length && MOCK_TURNS[idx].speaker !== 'patient') idx++;
    if (idx >= MOCK_TURNS.length) return;
    setNextTurnIdx(idx);
    simulateTurn(MOCK_TURNS[idx]);
  };

  const handleDoctorPress = () => {
    if (speakerMode !== 'idle' || phase !== 'active') return;
    // Find next doctor turn
    let idx = nextTurnIdx;
    while (idx < MOCK_TURNS.length && MOCK_TURNS[idx].speaker !== 'doctor') idx++;
    if (idx >= MOCK_TURNS.length) return;
    setNextTurnIdx(idx);
    simulateTurn(MOCK_TURNS[idx]);
  };

  const handlePause = () => {
    setPhase(p => p === 'paused' ? 'active' : 'paused');
  };

  const handleSave = () => {
    setPhase('saved');
    setSpeakerMode('idle');
  };

  const patientTurnAvail = nextTurnIdx < MOCK_TURNS.length && MOCK_TURNS.find((t, i) => i >= nextTurnIdx && t.speaker === 'patient');
  const doctorTurnAvail  = nextTurnIdx < MOCK_TURNS.length && MOCK_TURNS.find((t, i) => i >= nextTurnIdx && t.speaker === 'doctor');
  const isProcessing     = speakerMode === 'processing';
  const isPaused         = phase === 'paused';

  if (phase === 'setup') return (
    <div className="tikitalk" style={{ flex:1, display:'flex', overflow:'hidden', fontFamily:SANS }}>
      <style>{CSS}</style>
      <SessionSetupView onStart={handleStart} />
    </div>
  );

  if (phase === 'saved') return (
    <div className="tikitalk" style={{ flex:1, display:'flex', overflow:'hidden', fontFamily:SANS }}>
      <style>{CSS}</style>
      <SessionSavedView turns={turns} elapsed={elapsed} onReset={() => { setPhase('setup'); setTurns([]); setEntities([]); setRisks([]); setElapsed(0); setNextTurnIdx(0); setCurrentConf(null); }} />
    </div>
  );

  return (
    <div className="tikitalk" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg, fontFamily:SANS }}>
      <style>{CSS}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        height:52, display:'flex', alignItems:'center', paddingLeft:20, paddingRight:16,
        background:C.white, borderBottom:`1px solid ${C.border}`,
        flexShrink:0, gap:12,
      }}>
        {/* Session identity */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 2px 8px ${C.mocha}40` }}>
            <MessageCircle size={14} color="#fff" />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>{MOCK_PATIENT.room}</span>
              <ChevronRight size={10} color={C.textMt} />
              <span style={{ fontSize:12, fontWeight:700, color:C.textSub }}>{MOCK_PATIENT.name}</span>
              <span style={{ fontSize:14 }}>{MOCK_PATIENT.flag}</span>
            </div>
            <p style={{ fontSize:10, color:C.textMt }}>{MOCK_PATIENT.langLabel} · KO ⇄ JA</p>
          </div>
        </div>

        {/* Live indicator / paused */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isPaused ? (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', background:C.goldPale, borderRadius:999 }}>
              <Pause size={10} color={C.gold} />
              <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'0.04em' }}>일시정지</span>
            </div>
          ) : isProcessing ? (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', background:C.mochaPale, borderRadius:999 }}>
              <ListeningWave size="sm" />
              <span style={{ fontSize:10, fontWeight:700, color:C.mocha, letterSpacing:'0.04em' }}>처리 중</span>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', background:`${C.red}15`, borderRadius:999 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:C.red, animation:'ttBlink 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize:10, fontWeight:800, color:C.red, letterSpacing:'0.06em' }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', background:C.bgSub, borderRadius:999 }}>
          <Clock size={11} color={C.textMt} />
          <span style={{ fontSize:11, fontWeight:700, color:C.textSub, fontVariantNumeric:'tabular-nums', letterSpacing:'0.04em' }}>{fmt(elapsed)}</span>
        </div>

        {/* Turn count */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, color:C.textMt }}>발화</span>
          <span style={{ fontSize:11, fontWeight:800, color:C.textSub }}>{turns.length}회</span>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', minHeight:0, overflow:'hidden' }}>

        {/* Conversation area */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Empty state */}
          {turns.length === 0 && !liveCard && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:14, opacity:0.6 }}>
              <MessageCircle size={32} color={C.textMt} strokeWidth={1.4} />
              <p style={{ fontSize:13, color:C.textMt, textAlign:'center', lineHeight:1.7 }}>
                하단의 버튼을 눌러 세션을 시작하세요<br />
                <span style={{ fontSize:11 }}>환자 또는 의사가 먼저 말할 수 있습니다</span>
              </p>
            </div>
          )}

          {/* Turn cards */}
          {turns.map((turn, i) => (
            turn.speaker === 'patient'
              ? <PatientTurnCard key={turn.id} turn={turn} isLatest={i === turns.length - 1 && !liveCard} />
              : <DoctorTurnCard  key={turn.id} turn={turn} isLatest={i === turns.length - 1 && !liveCard} />
          ))}

          {/* Live card */}
          {liveCard && <LiveCard speaker={liveCard} />}

          {/* Conversation complete hint */}
          {nextTurnIdx >= MOCK_TURNS.length && !liveCard && turns.length > 0 && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', background:C.sagePale, border:`1px solid ${C.sage}40`, borderRadius:999 }}>
                <Check size={12} color={C.sage} />
                <span style={{ fontSize:11, fontWeight:700, color:C.sage }}>모든 시나리오 완료 · 세션을 저장하세요</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div style={{
          width:240, flexShrink:0, borderLeft:`1px solid ${C.border}`,
          background:C.bgSub, overflowY:'auto', padding:16,
          display:'flex', flexDirection:'column', gap:16,
        }}>

          {/* Confidence */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <Activity size={12} color={C.mocha} />
              <span style={{ fontSize:10, fontWeight:800, color:C.text, letterSpacing:'0.06em', textTransform:'uppercase' }}>신뢰도</span>
            </div>
            {currentConf !== null
              ? <ConfidenceBar value={currentConf} />
              : (
                <div style={{ textAlign:'center', padding:'8px 0' }}>
                  {isProcessing
                    ? <div style={{ display:'flex', justifyContent:'center' }}><ListeningWave /></div>
                    : <p style={{ fontSize:11, color:C.textMt }}>발화 대기 중</p>
                  }
                </div>
              )
            }
            {/* Mini history */}
            {turns.length > 1 && (
              <div style={{ marginTop:10, display:'flex', gap:3, alignItems:'flex-end', height:24 }}>
                {turns.map((t, i) => {
                  const pct = t.confidence;
                  const color = pct >= 0.80 ? C.sage : pct >= 0.60 ? C.gold : C.red;
                  return (
                    <div key={i} style={{ flex:1, background:color+'50', borderRadius:2, height:`${pct * 100}%`, minHeight:4, transition:'height 0.4s ease' }} title={`${Math.round(pct*100)}%`} />
                  );
                })}
              </div>
            )}
            {turns.length > 1 && <p style={{ fontSize:9, color:C.textMt, marginTop:4, textAlign:'center' }}>발화별 신뢰도 추이</p>}
          </div>

          {/* Entities */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <Zap size={12} color={C.gold} />
              <span style={{ fontSize:10, fontWeight:800, color:C.text, letterSpacing:'0.06em', textTransform:'uppercase' }}>추출 정보</span>
            </div>
            <EntityPanel entities={entities} />
          </div>

          {/* Risk alerts */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <ShieldAlert size={12} color={risks.length > 0 ? C.red : C.textMt} />
              <span style={{ fontSize:10, fontWeight:800, color:C.text, letterSpacing:'0.06em', textTransform:'uppercase' }}>위험 신호</span>
              {risks.length > 0 && (
                <span style={{ marginLeft:'auto', fontSize:10, fontWeight:800, color:C.red, background:C.redPale, padding:'1px 6px', borderRadius:999 }}>{risks.length}</span>
              )}
            </div>
            <RiskPanel risks={risks} />
          </div>

          {/* Session info */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 14px' }}>
            <p style={{ fontSize:10, fontWeight:800, color:C.text, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>세션 정보</p>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                ['환자', `${MOCK_PATIENT.flag} ${MOCK_PATIENT.name}`],
                ['언어', MOCK_PATIENT.langLabel],
                ['방', MOCK_PATIENT.room],
                ['발화', `${turns.length}회`],
                ['경과', fmt(elapsed)],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:10, color:C.textMt, fontWeight:500 }}>{k}</span>
                  <span style={{ fontSize:11, color:C.textSub, fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom control bar ─────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:0, height:72, background:C.white, borderTop:`1px solid ${C.border}`,
        display:'flex', alignItems:'center', justifyContent:'center', gap:12,
        padding:'0 24px',
      }}>

        {/* Patient button */}
        <button className="tt-ctrl-btn" onClick={handlePatientPress}
          disabled={isProcessing || isPaused || !patientTurnAvail}
          style={{
            display:'flex', alignItems:'center', gap:8, padding:'0 24px',
            height:46, borderRadius:13,
            background: (isProcessing || isPaused || !patientTurnAvail) ? C.bgDeep : C.mochaPale,
            border: `1.5px solid ${(isProcessing || isPaused || !patientTurnAvail) ? C.border : C.mocha + '60'}`,
            color: (isProcessing || isPaused || !patientTurnAvail) ? C.textMt : C.mocha,
            fontSize:13, fontWeight:700, letterSpacing:'-0.02em',
            opacity: (isProcessing || isPaused || !patientTurnAvail) ? 0.5 : 1,
            cursor: (isProcessing || isPaused || !patientTurnAvail) ? 'not-allowed' : 'pointer',
            boxShadow: (isProcessing || isPaused || !patientTurnAvail) ? 'none' : `0 3px 12px ${C.mocha}25`,
          }}>
          {speakerMode === 'processing' && liveCard === 'patient'
            ? <><ListeningWave size="sm" color={C.mocha} /> 듣는 중...</>
            : <><User size={15} /> 환자 발화</>
          }
        </button>

        {/* Doctor button */}
        <button className="tt-ctrl-btn" onClick={handleDoctorPress}
          disabled={isProcessing || isPaused || !doctorTurnAvail}
          style={{
            display:'flex', alignItems:'center', gap:8, padding:'0 24px',
            height:46, borderRadius:13,
            background: (isProcessing || isPaused || !doctorTurnAvail) ? C.bgDeep : `linear-gradient(135deg, ${C.mocha}, ${C.mochaDk})`,
            border:'none',
            color: (isProcessing || isPaused || !doctorTurnAvail) ? C.textMt : '#fff',
            fontSize:13, fontWeight:700, letterSpacing:'-0.02em',
            opacity: (isProcessing || isPaused || !doctorTurnAvail) ? 0.5 : 1,
            cursor: (isProcessing || isPaused || !doctorTurnAvail) ? 'not-allowed' : 'pointer',
            boxShadow: (isProcessing || isPaused || !doctorTurnAvail) ? 'none' : `0 4px 16px ${C.mocha}45`,
          }}>
          {speakerMode === 'processing' && liveCard === 'doctor'
            ? <><ListeningWave size="sm" color="#fff" /> 번역 중...</>
            : <><Stethoscope size={15} /> 의사 발화</>
          }
        </button>

        {/* Divider */}
        <div style={{ width:1, height:28, background:C.border }} />

        {/* Pause */}
        <button className="tt-ctrl-btn" onClick={handlePause}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'0 18px',
            height:46, borderRadius:12,
            background: isPaused ? C.goldPale : C.bgSub,
            border:`1px solid ${isPaused ? C.gold + '50' : C.border}`,
            color: isPaused ? C.gold : C.textSub,
            fontSize:12, fontWeight:700, letterSpacing:'-0.01em',
          }}>
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? '재개' : '일시정지'}
        </button>

        {/* Save */}
        <button className="tt-ctrl-btn" onClick={handleSave}
          disabled={turns.length === 0}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'0 18px',
            height:46, borderRadius:12,
            background: turns.length === 0 ? C.bgSub : C.sagePale,
            border:`1px solid ${turns.length === 0 ? C.border : C.sage + '50'}`,
            color: turns.length === 0 ? C.textMt : C.sage,
            fontSize:12, fontWeight:700, letterSpacing:'-0.01em',
            opacity: turns.length === 0 ? 0.5 : 1,
            cursor: turns.length === 0 ? 'not-allowed' : 'pointer',
          }}>
          <Save size={14} />
          세션 저장
        </button>

        {/* End session */}
        <button className="tt-ctrl-btn" onClick={() => setPhase('setup')}
          style={{
            display:'flex', alignItems:'center', gap:5, padding:'0 14px',
            height:46, borderRadius:12,
            background:'transparent', border:`1px solid ${C.border}`,
            color:C.textMt, fontSize:12, fontWeight:600,
          }}
          title="세션 종료">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
