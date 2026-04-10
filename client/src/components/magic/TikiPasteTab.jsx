import { useState, useRef, useCallback } from 'react';
import {
  Sparkles, Clipboard, Copy, Check, AlertCircle, Loader2,
  RefreshCcw, Globe, Lightbulb, MessageSquare, ShieldCheck,
  CalendarCheck, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 브러시드 골드 / 딥 브론즈 디자인 토큰
// ─────────────────────────────────────────────────────────────────────────────
const BRONZE = {
  // 카드별 팔레트
  kind: {
    light: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #fdf6e3, #fef9ed)', boxShadow: '0 0 0 1px #d4a843' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #f5e6c0, #fdf0d0)' },
      icon:  'text-amber-700',
      title: 'text-amber-800',
      body:  'text-stone-700',
      ko:    'text-amber-600/80',
      btn:   'border border-amber-400 text-amber-800 hover:bg-amber-100',
    },
    dark: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #1c1409, #241a08)', boxShadow: '0 0 0 1px #8a6520' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #2a1e08, #332408)' },
      icon:  'text-amber-400',
      title: 'text-amber-300',
      body:  'text-stone-200',
      ko:    'text-amber-600/70',
      btn:   'border border-amber-700/50 text-amber-400 hover:bg-amber-900/40',
    },
  },
  firm: {
    light: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #f7f0e6, #faf4ea)', boxShadow: '0 0 0 1px #b8903a' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #ede0c4, #f5ecd4)' },
      icon:  'text-stone-600',
      title: 'text-stone-700',
      body:  'text-stone-700',
      ko:    'text-stone-500',
      btn:   'border border-stone-400 text-stone-700 hover:bg-stone-100',
    },
    dark: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #141210, #1e1a14)', boxShadow: '0 0 0 1px #6b5530' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #1e1a10, #261e12)' },
      icon:  'text-stone-400',
      title: 'text-stone-300',
      body:  'text-stone-200',
      ko:    'text-stone-500',
      btn:   'border border-stone-600/50 text-stone-400 hover:bg-stone-800/40',
    },
  },
  booking: {
    light: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #fdf2e0, #fef7ec)', boxShadow: '0 0 0 1px #c9922a' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #f0d9a8, #f9eacc)' },
      icon:  'text-orange-700',
      title: 'text-orange-800',
      body:  'text-stone-700',
      ko:    'text-orange-600/80',
      btn:   'border border-orange-400 text-orange-800 hover:bg-orange-100',
    },
    dark: {
      wrap:  'ring-1',
      wrapStyle: { background: 'linear-gradient(145deg, #1a1205, #221708)', boxShadow: '0 0 0 1px #9a6c18' },
      head:  '',
      headStyle: { background: 'linear-gradient(90deg, #281a06, #32200a)' },
      icon:  'text-orange-400',
      title: 'text-orange-300',
      body:  'text-stone-200',
      ko:    'text-orange-600/70',
      btn:   'border border-orange-700/50 text-orange-400 hover:bg-orange-900/40',
    },
  },
};

const CARD_DEFS = [
  { key: 'kind',    label: '친절/상세형',    sublabel: 'Detailed & Caring',   icon: MessageSquare, palette: BRONZE.kind },
  { key: 'firm',    label: '단호/규정안내형', sublabel: 'Firm & Policy-based', icon: ShieldCheck,   palette: BRONZE.firm },
  { key: 'booking', label: '예약유도형',     sublabel: 'Action & Closing',    icon: CalendarCheck, palette: BRONZE.booking },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSS 인라인 keyframes — 금색 물결 테두리 shimmer
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
@keyframes goldShimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes pasteGlow {
  0%   { box-shadow: 0 0 0 0 rgba(196,152,50,0); }
  30%  { box-shadow: 0 0 0 6px rgba(196,152,50,0.35), 0 0 24px 4px rgba(196,152,50,0.18); }
  100% { box-shadow: 0 0 0 0 rgba(196,152,50,0); }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmerSweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes sparkPop {
  0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold pointer-events-none text-amber-100"
      style={{
        background: 'linear-gradient(135deg, #3d2a08, #5c3d0e)',
        border: '1px solid #c49832',
        animation: 'fadeSlideUp 0.2s ease-out',
        boxShadow: '0 4px 24px rgba(196,152,50,0.25)',
      }}
    >
      <Check size={14} className="text-amber-400" />
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card (브론즈 톤)
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard({ darkMode }) {
  const line = darkMode ? 'bg-amber-900/40' : 'bg-amber-100';
  return (
    <div
      className="rounded-2xl border p-5 space-y-3"
      style={darkMode
        ? { background: 'linear-gradient(145deg, #1c1409, #241a08)', border: '1px solid #4a3210' }
        : { background: 'linear-gradient(145deg, #fdf6e3, #fef9ed)', border: '1px solid #d4a843' }}
    >
      <div className={`h-3 ${line} rounded-full w-1/3 animate-pulse`} />
      <div className={`h-3 ${line} rounded-full w-full animate-pulse delay-75`} />
      <div className={`h-3 ${line} rounded-full w-5/6 animate-pulse delay-150`} />
      <div className={`h-3 ${line} rounded-full w-4/5 animate-pulse delay-200`} />
      <div className={`h-3 ${line} rounded-full w-2/3 animate-pulse delay-300`} />
      <div className={`h-2 ${line} rounded-full w-1/2 animate-pulse delay-500 mt-2`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ def, option, darkMode, onCopy }) {
  const [copied, setCopied] = useState(false);
  const ac = darkMode ? def.palette.dark : def.palette.light;

  const replyText = typeof option === 'string' ? option : (option?.reply || '');
  const koText    = typeof option === 'string' ? '' : (option?.ko_translation || '');

  const handleCopy = async () => {
    if (!replyText) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      onCopy?.(replyText);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden ${ac.wrap}`}
      style={{ ...ac.wrapStyle, animation: 'fadeSlideUp 0.35s ease-out' }}
    >
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${ac.head}`} style={ac.headStyle}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ac.icon}`}
          style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
          <def.icon size={14} />
        </div>
        <div>
          <p className={`text-xs font-bold ${ac.title}`}>{def.label}</p>
          <p className={`text-[10px] ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>{def.sublabel}</p>
        </div>
      </div>

      {/* Reply body */}
      <div className="flex-1 px-4 pt-3 pb-2">
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${ac.body}`}>{replyText}</p>
      </div>

      {/* Korean translation */}
      {koText && (
        <div
          className="mx-4 mb-3 px-3 py-2 rounded-xl"
          style={darkMode
            ? { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(138,101,32,0.3)' }
            : { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(196,152,50,0.25)' }}
        >
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>
            한국어 해석
          </p>
          <p className={`text-xs leading-relaxed ${ac.ko}`}>{koText}</p>
        </div>
      )}

      {/* Copy button */}
      <div className="px-4 pb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${ac.btn}`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? '복사됨 ✓' : '복사하기'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasteZone — 신비로운 붙여넣기 영역
// ─────────────────────────────────────────────────────────────────────────────
function PasteZone({ value, onChange, onPaste, darkMode, pasting }) {
  return (
    <div className="relative">
      {/* 금색 물결 테두리 — 항상 살짝, 붙여넣을 때 더 강렬 */}
      <div
        className="absolute -inset-[1.5px] rounded-2xl z-0 pointer-events-none"
        style={{
          background: pasting
            ? 'linear-gradient(90deg, #c49832, #f0d060, #8a6520, #e8c040, #c49832)'
            : 'linear-gradient(90deg, #8a6520, #c49832, #6b4f18, #b08828, #8a6520)',
          backgroundSize: '300% 100%',
          animation: 'goldShimmer 3s ease infinite',
          opacity: pasting ? 1 : 0.55,
          transition: 'opacity 0.3s',
        }}
      />
      <div
        className="relative z-10 rounded-2xl overflow-hidden"
        style={darkMode
          ? { background: '#0f0c06', animation: pasting ? 'pasteGlow 0.7s ease-out' : 'none' }
          : { background: '#fffdf7', animation: pasting ? 'pasteGlow 0.7s ease-out' : 'none' }}
      >
        {/* Shimmer sweep on paste */}
        {pasting && (
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,220,100,0.18) 50%, transparent 60%)',
              animation: 'shimmerSweep 0.6s ease-out',
            }}
          />
        )}

        <textarea
          value={value}
          onChange={e => { onChange(e.target.value); }}
          onPaste={onPaste}
          placeholder={`여기에 환자 메시지를 붙여넣으세요 (Ctrl+V / ⌘V)\n붙여넣는 즉시 AI가 자동 분석합니다\n\n예) "肉毒素の料金はいくらですか？副作用が心配です..."`}
          rows={5}
          className={`w-full px-5 pt-5 pb-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 bg-transparent relative z-10 ${
            darkMode ? 'text-amber-50 placeholder-stone-600' : 'text-stone-800 placeholder-stone-400'
          }`}
        />

        {/* Paste status badge */}
        {pasting && (
          <div
            className="absolute top-3 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'linear-gradient(135deg, #c49832, #8a6520)',
              color: '#fff8e1',
              animation: 'sparkPop 0.3s ease-out',
              boxShadow: '0 2px 12px rgba(196,152,50,0.4)',
            }}
          >
            <Sparkles size={10} />
            분석 시작
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TikiPasteTab — main
// ─────────────────────────────────────────────────────────────────────────────
export default function TikiPasteTab({ darkMode }) {
  const { clinicId, session } = useAuth();
  const clinicName = session?.clinic?.name || '클리닉';

  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [pasteErr,   setPasteErr]   = useState(false);
  const [toast,      setToast]      = useState('');
  const [lastCopied, setLastCopied] = useState('');
  const [pasting,    setPasting]    = useState(false); // 붙여넣기 애니메이션 트리거

  // ── AI 생성 ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

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
  }, [input, loading, clinicId, clinicName]);

  // ── onPaste → 즉시 생성 ──────────────────────────────────────────────────
  const handleTextareaPaste = useCallback((e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.trim()) return;
    setInput(pastedText);
    setResult(null);
    setError(null);
    setPasting(true);
    setTimeout(() => setPasting(false), 700);
    setTimeout(() => handleGenerate(pastedText), 0);
  }, [handleGenerate]);

  // ── 클립보드 버튼 ─────────────────────────────────────────────────────────
  const handleClipboardBtn = useCallback(async () => {
    setPasteErr(false);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        setResult(null);
        setError(null);
        setPasting(true);
        setTimeout(() => setPasting(false), 700);
        handleGenerate(text);
      }
    } catch {
      setPasteErr(true);
      setTimeout(() => setPasteErr(false), 3000);
    }
  }, [handleGenerate]);

  const handleReset = () => {
    setInput(''); setResult(null); setError(null); setLastCopied('');
  };

  const handleCardCopy = (replyText) => {
    setLastCopied(replyText);
    setToast('클립보드에 복사되었습니다');
    setTimeout(() => setToast(''), 2200);
  };

  // ── 스타일 헬퍼 ──────────────────────────────────────────────────────────
  const pageBg = darkMode
    ? { background: 'linear-gradient(160deg, #0a0805 0%, #0f0c06 60%, #120e07 100%)' }
    : { background: 'linear-gradient(160deg, #fdfaf2 0%, #fffcf4 60%, #fef9e8 100%)' };

  const headerBg = darkMode
    ? { background: '#0d0a05', borderBottom: '1px solid #2a1e08' }
    : { background: '#fffdf7', borderBottom: '1px solid #e8d9a8' };

  const muted = darkMode ? 'text-stone-500' : 'text-stone-400';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" style={pageBg}>
      {/* inject keyframes */}
      <style>{GLOBAL_STYLE}</style>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 py-4 flex items-center justify-between" style={headerBg}>
        <div className="flex items-center gap-3">
          {/* 브론즈 아이콘 */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{
              background: 'linear-gradient(135deg, #c49832 0%, #8a6520 50%, #c49832 100%)',
              backgroundSize: '200% 200%',
              animation: 'goldShimmer 4s ease infinite',
              boxShadow: '0 2px 16px rgba(196,152,50,0.35)',
            }}
          >
            <Sparkles size={16} className="text-amber-50" fill="rgba(255,248,225,0.6)" />
          </div>
          <div>
            <h1 className={`text-sm font-extrabold ${darkMode ? 'text-amber-100' : 'text-stone-800'}`}>
              Tiki Paste
              <span
                className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={darkMode
                  ? { background: 'rgba(196,152,50,0.15)', color: '#c49832', border: '1px solid rgba(196,152,50,0.3)' }
                  : { background: '#fef3c7', color: '#92400e', border: '1px solid #d97706' }}
              >
                수석 상담실장 AI
              </span>
            </h1>
            <p className={`text-[11px] mt-0.5 ${muted}`}>
              붙여넣는 즉시 — 강남 10년차 상담실장이 환자 언어로 답변 3종을 완성합니다
            </p>
          </div>
        </div>

        {(result || input) && (
          <button
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              darkMode
                ? 'text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-500'
                : 'text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-400'
            }`}
          >
            <RefreshCcw size={11} />새로 시작
          </button>
        )}
      </div>

      {/* ── Main workspace ──────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 py-5 max-w-5xl w-full mx-auto space-y-5">

        {/* ── Paste zone ─────────────────────────────────────────────── */}
        <div>
          <PasteZone
            value={input}
            onChange={(v) => { setInput(v); setResult(null); setError(null); }}
            onPaste={handleTextareaPaste}
            darkMode={darkMode}
            pasting={pasting}
          />

          {/* Toolbar */}
          <div className={`flex items-center justify-between mt-2 px-1 gap-2`}>
            <div className="flex items-center gap-2">
              {input.length > 0 && (
                <span className={`text-[10px] ${muted}`}>{input.length}자</span>
              )}
              <button
                onClick={handleClipboardBtn}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  pasteErr
                    ? 'border-red-400 text-red-500 bg-red-50'
                    : darkMode
                      ? 'border-stone-700 text-stone-400 hover:border-amber-700/50 hover:text-amber-300'
                      : 'border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-700'
                }`}
              >
                <Clipboard size={11} />
                {pasteErr ? '권한 필요' : '클립보드에서 붙여넣기'}
              </button>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={!input.trim() || loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={input.trim() && !loading ? {
                background: 'linear-gradient(135deg, #c49832, #8a6520)',
                color: '#fff8e1',
                boxShadow: '0 2px 12px rgba(196,152,50,0.3)',
              } : {
                background: darkMode ? '#1a1408' : '#f5f0e8',
                color: darkMode ? '#4a3d28' : '#c0b090',
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? '분석 중...' : '수동 생성'}
            </button>
          </div>
        </div>

        {/* ── 현재 복사된 메시지 미리보기 ────────────────────────────── */}
        {lastCopied && !loading && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={darkMode
              ? { background: 'rgba(196,152,50,0.07)', border: '1px solid rgba(196,152,50,0.2)' }
              : { background: '#fffbf0', border: '1px solid #e8d080' }}
          >
            <ClipboardList size={13} className={`shrink-0 mt-0.5 ${darkMode ? 'text-amber-500' : 'text-amber-600'}`} />
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold mb-1 ${darkMode ? 'text-amber-700' : 'text-amber-600'}`}>
                현재 클립보드에 복사된 메시지
              </p>
              <p className={`text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                {lastCopied}
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={darkMode
                ? { background: 'rgba(196,152,50,0.08)', border: '1px solid rgba(138,101,32,0.3)' }
                : { background: '#fffbf0', border: '1px solid #e8d080' }}
            >
              <Loader2 size={14} className={`animate-spin shrink-0 ${darkMode ? 'text-amber-500' : 'text-amber-600'}`} />
              <div>
                <p className={`text-xs font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                  10년차 상담실장이 답변을 작성 중입니다...
                </p>
                <p className={`text-[10px] mt-0.5 ${muted}`}>
                  언어 감지 → 의도 파악 → 병원 DB 검색 → 3가지 답변 생성
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0,1,2].map(i => <SkeletonCard key={i} darkMode={darkMode} />)}
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
            darkMode ? 'bg-red-900/20 border-red-800/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">생성 실패</p>
              <p className="text-[11px] mt-0.5 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => handleGenerate()}
              className="ml-auto text-[11px] font-semibold shrink-0 underline underline-offset-2"
            >다시 시도</button>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">
            {/* 언어/의도 배지 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={darkMode
                  ? { background: 'rgba(196,152,50,0.12)', border: '1px solid rgba(196,152,50,0.3)', color: '#c49832' }
                  : { background: '#fef3c7', border: '1px solid #d97706', color: '#92400e' }}
              >
                <Globe size={11} />
                {result.detected_language || '언어 감지됨'}
              </div>
              {result.intent && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={darkMode
                    ? { background: 'rgba(120,80,20,0.2)', border: '1px solid rgba(138,101,32,0.3)', color: '#b08030' }
                    : { background: '#fdf0d8', border: '1px solid #c49040', color: '#7c4f10' }}
                >
                  <Lightbulb size={11} />
                  {result.intent}
                </div>
              )}
              <span className={`text-[11px] ${muted}`}>
                · 답변은 환자 언어로 작성 / 한국어 해석은 직원 참고용
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CARD_DEFS.map(def => (
                <ResultCard
                  key={def.key}
                  def={def}
                  option={result.options?.[def.key]}
                  darkMode={darkMode}
                  onCopy={handleCardCopy}
                />
              ))}
            </div>

            <p className={`text-center text-[11px] ${muted}`}>
              💡 복사 버튼은 환자에게 보낼 원문만 복사합니다. 한국어 해석은 직원 전용입니다.
            </p>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!input && !loading && !result && (
          <div className={`flex flex-col items-center justify-center py-14 gap-5 ${muted}`}>
            {/* 골드 아이콘 */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: darkMode
                  ? 'linear-gradient(145deg, #1c1409, #2a1e08)'
                  : 'linear-gradient(145deg, #fdf6e3, #fef0c0)',
                border: darkMode ? '1px solid #3d2c10' : '1px solid #d4a843',
              }}
            >
              <Sparkles size={28} strokeWidth={1.3}
                className={darkMode ? 'text-amber-700' : 'text-amber-400'} />
            </div>

            <div className="text-center space-y-1.5">
              <p className={`text-sm font-bold ${darkMode ? 'text-amber-100' : 'text-stone-700'}`}>
                뇌를 1%도 쓸 필요 없습니다
              </p>
              <p className="text-xs">메시지를 붙여넣으면 환자 언어로 즉시 답변이 생성됩니다</p>
              <p className="text-xs">중국어 → 중국어 답변 · 일본어 → 일본어 답변</p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-center">
              {[
                { emoji: '🇯🇵', label: '일본어' },
                { emoji: '🇨🇳', label: '중국어' },
                { emoji: '🇺🇸', label: '영어' },
              ].map(l => (
                <div
                  key={l.label}
                  className="px-3 py-3 rounded-xl text-[11px] font-medium"
                  style={darkMode
                    ? { background: '#1a1408', border: '1px solid #2e2010', color: '#a08040' }
                    : { background: '#fffdf5', border: '1px solid #e8d090', color: '#8a6020' }}
                >
                  <span className="text-xl block mb-1">{l.emoji}</span>
                  {l.label}
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
              style={darkMode
                ? { background: 'rgba(196,152,50,0.06)', border: '1px solid rgba(196,152,50,0.15)', color: '#c49832' }
                : { background: '#fffbf0', border: '1px solid #e8d080', color: '#92580e' }}
            >
              <span className="text-base">⚡</span>
              <span>텍스트 창에 <strong>Ctrl+V</strong> 하면 자동 생성됩니다</span>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
