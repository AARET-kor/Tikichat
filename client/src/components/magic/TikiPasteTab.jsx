import { useState, useRef, useCallback } from 'react';
import {
  Sparkles, Clipboard, Copy, Check, AlertCircle, Loader2,
  RefreshCcw, Globe, Lightbulb, MessageSquare, ShieldCheck,
  CalendarCheck, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 디자인 토큰 — Royal Gold & Charcoal (럭셔리 메디컬)
// ─────────────────────────────────────────────────────────────────────────────
const GOLD   = '#D4AF37';
const GOLD2  = '#B8962E';
const GOLD_L = '#F0D060';
const DARK   = '#1a1200';

const CARD_PALETTE = {
  kind: {
    light: {
      accent:     GOLD,
      headerBg:   'linear-gradient(90deg, #fffdf5, #fefbee)',
      wrapShadow: `0 2px 16px rgba(212,175,55,0.12), 0 1px 4px rgba(0,0,0,0.06)`,
      iconBg:     'rgba(212,175,55,0.12)',
      iconColor:  GOLD2,
      titleColor: '#1a1200',
      bodyColor:  '#333333',
      koColor:    '#8a7030',
      btnBorder:  `1px solid ${GOLD}`,
      btnColor:   GOLD2,
      btnHover:   'rgba(212,175,55,0.08)',
    },
    dark: {
      accent:     GOLD,
      headerBg:   'linear-gradient(90deg, #1c1409, #241a08)',
      wrapShadow: '0 2px 16px rgba(0,0,0,0.5)',
      iconBg:     'rgba(212,175,55,0.08)',
      iconColor:  '#D4AF37',
      titleColor: '#f5e8b0',
      bodyColor:  '#d4c8a0',
      koColor:    '#8a7030',
      btnBorder:  '1px solid rgba(212,175,55,0.3)',
      btnColor:   '#D4AF37',
      btnHover:   'rgba(212,175,55,0.08)',
    },
  },
  firm: {
    light: {
      accent:     '#555555',
      headerBg:   'linear-gradient(90deg, #f8f8f8, #f2f2f2)',
      wrapShadow: '0 2px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      iconBg:     'rgba(85,85,85,0.08)',
      iconColor:  '#555555',
      titleColor: '#1a1a1a',
      bodyColor:  '#333333',
      koColor:    '#777777',
      btnBorder:  '1px solid #cccccc',
      btnColor:   '#555555',
      btnHover:   'rgba(85,85,85,0.06)',
    },
    dark: {
      accent:     '#888888',
      headerBg:   'linear-gradient(90deg, #141414, #1e1e1e)',
      wrapShadow: '0 2px 16px rgba(0,0,0,0.5)',
      iconBg:     'rgba(255,255,255,0.06)',
      iconColor:  '#aaaaaa',
      titleColor: '#e0e0e0',
      bodyColor:  '#cccccc',
      koColor:    '#777777',
      btnBorder:  '1px solid rgba(255,255,255,0.12)',
      btnColor:   '#aaaaaa',
      btnHover:   'rgba(255,255,255,0.06)',
    },
  },
  booking: {
    light: {
      accent:     '#D4AF37',
      headerBg:   'linear-gradient(90deg, #fff9ed, #fef5e0)',
      wrapShadow: '0 2px 16px rgba(212,175,55,0.15), 0 1px 4px rgba(0,0,0,0.06)',
      iconBg:     'rgba(212,175,55,0.15)',
      iconColor:  '#B8962E',
      titleColor: '#1a1200',
      bodyColor:  '#333333',
      koColor:    '#8a7030',
      btnBorder:  `1px solid ${GOLD}`,
      btnColor:   GOLD2,
      btnHover:   'rgba(212,175,55,0.08)',
    },
    dark: {
      accent:     GOLD,
      headerBg:   'linear-gradient(90deg, #1a1205, #221708)',
      wrapShadow: '0 2px 16px rgba(0,0,0,0.5)',
      iconBg:     'rgba(212,175,55,0.10)',
      iconColor:  '#D4AF37',
      titleColor: '#f5e8b0',
      bodyColor:  '#d4c8a0',
      koColor:    '#8a7030',
      btnBorder:  '1px solid rgba(212,175,55,0.3)',
      btnColor:   '#D4AF37',
      btnHover:   'rgba(212,175,55,0.08)',
    },
  },
};

const CARD_DEFS = [
  { key: 'kind',    label: '친절/상세형',    sublabel: 'Detailed & Caring',   icon: MessageSquare, palette: CARD_PALETTE.kind },
  { key: 'firm',    label: '단호/규정안내형', sublabel: 'Firm & Policy-based', icon: ShieldCheck,   palette: CARD_PALETTE.firm },
  { key: 'booking', label: '예약유도형',     sublabel: 'Action & Closing',    icon: CalendarCheck, palette: CARD_PALETTE.booking },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSS keyframes
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
@keyframes goldGlow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes inputFocusGlow {
  0%   { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
  40%  { box-shadow: 0 0 0 4px rgba(212,175,55,0.20), 0 4px 24px rgba(212,175,55,0.12); }
  100% { box-shadow: 0 0 0 3px rgba(212,175,55,0.15), 0 4px 20px rgba(212,175,55,0.10); }
}
@keyframes pasteFlash {
  0%   { box-shadow: 0 0 0 0 rgba(212,175,55,0), 0 4px 20px rgba(0,0,0,0.08); }
  35%  { box-shadow: 0 0 0 5px rgba(212,175,55,0.28), 0 8px 40px rgba(212,175,55,0.18); }
  100% { box-shadow: 0 0 0 3px rgba(212,175,55,0.15), 0 4px 20px rgba(212,175,55,0.10); }
}
@keyframes shimmerSweep {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(200%); }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sparkPop {
  0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
  65%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.tiki-lang-chip {
  transition: all 0.18s ease;
  cursor: default;
}
.tiki-lang-chip:hover {
  background: rgba(212,175,55,0.10) !important;
  border-color: ${GOLD} !important;
  color: ${GOLD2} !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212,175,55,0.15);
}
.tiki-copy-btn {
  transition: all 0.15s ease;
}
.tiki-copy-btn:hover {
  transform: translateY(-1px);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold pointer-events-none"
      style={{
        background: 'linear-gradient(135deg, #1a1200, #2e2000)',
        border: `1px solid ${GOLD}`,
        color: '#f5e8b0',
        animation: 'fadeSlideUp 0.2s ease-out',
        boxShadow: `0 4px 24px rgba(212,175,55,0.25)`,
      }}
    >
      <Check size={14} style={{ color: GOLD }} />
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card — white + gold pulse
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard({ darkMode }) {
  const pulse = darkMode ? 'bg-white/5' : 'bg-gray-100';
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={darkMode
        ? { background: '#111', border: '1px solid #222', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }
        : { background: '#fff', border: '1px solid #efefef', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
    >
      <div
        className="h-12 px-4 flex items-center gap-2"
        style={darkMode ? { background: '#1a1a1a' } : { background: '#fafafa' }}
      >
        <div className={`w-6 h-6 rounded-lg ${pulse} animate-pulse`} />
        <div className={`h-2.5 ${pulse} rounded-full w-24 animate-pulse`} />
      </div>
      <div className="p-4 space-y-2.5">
        {[1, 0.85, 0.95, 0.7, 0.8].map((w, i) => (
          <div
            key={i}
            className={`h-2.5 ${pulse} rounded-full animate-pulse`}
            style={{ width: `${w * 100}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
        <div className={`h-2 ${pulse} rounded-full w-1/2 animate-pulse mt-3`} style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ def, option, darkMode, onCopy, index }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
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
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: darkMode ? '#111' : '#ffffff',
        border: darkMode ? '1px solid #222' : '1px solid #f0f0f0',
        boxShadow: hovered
          ? `0 8px 40px rgba(212,175,55,0.18), 0 2px 8px rgba(0,0,0,0.08)`
          : ac.wrapShadow,
        animation: `cardIn 0.4s ease-out ${index * 80}ms both`,
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header stripe */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ background: ac.headerBg, borderBottom: darkMode ? '1px solid #1a1a1a' : '1px solid #f5f5f5' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: ac.iconBg }}
        >
          <def.icon size={14} style={{ color: ac.iconColor }} strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: ac.titleColor }}>{def.label}</p>
          <p className="text-[10px]" style={{ color: darkMode ? '#555' : '#aaa' }}>{def.sublabel}</p>
        </div>
        {/* accent dot */}
        <div
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ background: ac.accent, opacity: 0.7 }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pt-3.5 pb-2">
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: ac.bodyColor }}
        >{replyText}</p>
      </div>

      {/* Korean translation */}
      {koText && (
        <div
          className="mx-4 mb-3 px-3 py-2.5 rounded-xl"
          style={darkMode
            ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
            : { background: '#fafafa', border: '1px solid #efefef' }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: darkMode ? '#444' : '#bbb' }}
          >한국어 해석 · 직원 참고용</p>
          <p className="text-xs leading-relaxed" style={{ color: ac.koColor }}>{koText}</p>
        </div>
      )}

      {/* Copy button */}
      <div className="px-4 pb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="tiki-copy-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
          style={{
            border: copied ? '1px solid #22c55e' : ac.btnBorder,
            color:  copied ? '#22c55e' : ac.btnColor,
            background: copied
              ? 'rgba(34,197,94,0.08)'
              : hovered ? ac.btnHover : 'transparent',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? '복사됨' : '복사하기'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasteZone — 플로팅 카드 + 골드 포커스 글로우
// ─────────────────────────────────────────────────────────────────────────────
function PasteZone({ value, onChange, onPaste, darkMode, pasting }) {
  const [focused, setFocused] = useState(false);

  const boxShadow = pasting
    ? undefined  // controlled by animation
    : focused
      ? `0 0 0 3px rgba(212,175,55,0.20), 0 4px 24px rgba(212,175,55,0.12), 0 1px 3px rgba(0,0,0,0.06)`
      : darkMode
        ? '0 2px 12px rgba(0,0,0,0.4)'
        : '0 2px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)';

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: darkMode ? '#111' : '#ffffff',
        border: darkMode
          ? `1px solid ${focused || pasting ? GOLD + '55' : '#222'}`
          : `1px solid ${focused || pasting ? GOLD + '80' : '#e5e7eb'}`,
        boxShadow: pasting ? undefined : boxShadow,
        animation: pasting ? 'pasteFlash 0.8s ease-out forwards' : 'none',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Shimmer sweep on paste */}
      {pasting && (
        <div
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl"
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 35%, rgba(212,175,55,0.14) 50%, transparent 65%)',
              animation: 'shimmerSweep 0.65s ease-out',
            }}
          />
        </div>
      )}

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`여기에 환자 메시지를 붙여넣으세요 (Ctrl+V / ⌘V)\n붙여넣는 즉시 AI가 자동 분석합니다\n\n예) "肉毒素の料金はいくらですか？副作用が心配です..."`}
        rows={5}
        className="w-full px-5 pt-5 pb-4 text-sm leading-relaxed resize-none focus:outline-none bg-transparent relative z-20"
        style={{
          color: darkMode ? '#e8dcc8' : '#1a1a1a',
          caretColor: GOLD,
        }}
      />

      {/* Paste badge */}
      {pasting && (
        <div
          className="absolute top-3 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            color: '#fff',
            animation: 'sparkPop 0.3s ease-out',
            boxShadow: `0 2px 12px rgba(212,175,55,0.4)`,
          }}
        >
          <Sparkles size={10} />
          분석 시작
        </div>
      )}

      {/* Focus gold line at bottom */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: focused || pasting ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />
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
  const [pasting,    setPasting]    = useState(false);

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

  const handleTextareaPaste = useCallback((e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.trim()) return;
    setInput(pastedText);
    setResult(null);
    setError(null);
    setPasting(true);
    setTimeout(() => setPasting(false), 750);
    setTimeout(() => handleGenerate(pastedText), 0);
  }, [handleGenerate]);

  const handleClipboardBtn = useCallback(async () => {
    setPasteErr(false);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        setResult(null);
        setError(null);
        setPasting(true);
        setTimeout(() => setPasting(false), 750);
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

  // ── 모드별 색상 ─────────────────────────────────────────────────────────────
  const pageBg   = darkMode ? '#0a0a0a' : '#ffffff';
  const mutedCol = darkMode ? '#555' : '#aaa';
  const divCol   = darkMode ? '#1e1e1e' : '#f0f0f0';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: pageBg }}>
      <style>{GLOBAL_STYLE}</style>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-4 sm:px-8 py-4 flex items-center justify-between"
        style={{
          background: darkMode ? '#0a0a0a' : '#ffffff',
          borderBottom: `1px solid ${divCol}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 50%, ${GOLD_L} 100%)`,
              backgroundSize: '200% 200%',
              animation: 'goldGlow 4s ease infinite',
              boxShadow: `0 2px 16px rgba(212,175,55,0.4)`,
            }}
          >
            <Sparkles size={16} className="text-white" fill="rgba(255,255,255,0.5)" />
          </div>
          <div>
            <h1
              className="text-sm font-extrabold flex items-center gap-2"
              style={{ color: darkMode ? '#f0e8c0' : '#1a1a1a' }}
            >
              Tiki Paste
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: darkMode ? 'rgba(212,175,55,0.12)' : '#fefce8',
                  color: darkMode ? GOLD : GOLD2,
                  border: `1px solid ${darkMode ? 'rgba(212,175,55,0.25)' : '#f0d060'}`,
                }}
              >
                수석 상담실장 AI
              </span>
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: mutedCol }}>
              붙여넣는 즉시 — 강남 10년차 상담실장이 환자 언어로 답변 3종을 완성합니다
            </p>
          </div>
        </div>

        {(result || input) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              color: darkMode ? '#666' : '#999',
              border: `1px solid ${divCol}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = darkMode ? '#ccc' : '#333';
              e.currentTarget.style.borderColor = darkMode ? '#444' : '#ccc';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = darkMode ? '#666' : '#999';
              e.currentTarget.style.borderColor = divCol;
            }}
          >
            <RefreshCcw size={11} />새로 시작
          </button>
        )}
      </div>

      {/* ── Main workspace ──────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 py-6 max-w-5xl w-full mx-auto space-y-5">

        {/* ── Paste zone ──────────────────────────────────────────────────── */}
        <div>
          <PasteZone
            value={input}
            onChange={(v) => { setInput(v); setResult(null); setError(null); }}
            onPaste={handleTextareaPaste}
            darkMode={darkMode}
            pasting={pasting}
          />

          <div className="flex items-center justify-between mt-2.5 px-1 gap-2">
            <div className="flex items-center gap-2">
              {input.length > 0 && (
                <span className="text-[10px]" style={{ color: mutedCol }}>{input.length}자</span>
              )}
              <button
                onClick={handleClipboardBtn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={pasteErr
                  ? { border: '1px solid #ef4444', color: '#ef4444', background: '#fff5f5' }
                  : {
                    border: `1px solid ${divCol}`,
                    color: darkMode ? '#888' : '#666',
                    background: 'transparent',
                  }}
                onMouseEnter={e => {
                  if (!pasteErr) {
                    e.currentTarget.style.borderColor = GOLD + '80';
                    e.currentTarget.style.color = darkMode ? GOLD : GOLD2;
                  }
                }}
                onMouseLeave={e => {
                  if (!pasteErr) {
                    e.currentTarget.style.borderColor = divCol;
                    e.currentTarget.style.color = darkMode ? '#888' : '#666';
                  }
                }}
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
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                color: '#fff',
                boxShadow: `0 2px 12px rgba(212,175,55,0.35)`,
              } : {
                background: darkMode ? '#1a1a1a' : '#f5f5f5',
                color: darkMode ? '#444' : '#ccc',
                cursor: 'not-allowed',
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? '분석 중...' : '수동 생성'}
            </button>
          </div>
        </div>

        {/* ── Copied preview ──────────────────────────────────────────────── */}
        {lastCopied && !loading && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{
              background: darkMode ? 'rgba(212,175,55,0.05)' : '#fffdf5',
              border: `1px solid ${darkMode ? 'rgba(212,175,55,0.15)' : '#f0e0a0'}`,
            }}
          >
            <ClipboardList size={13} className="shrink-0 mt-0.5" style={{ color: GOLD }} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold mb-1" style={{ color: GOLD2 }}>
                현재 클립보드에 복사된 메시지
              </p>
              <p
                className="text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap"
                style={{ color: darkMode ? '#c8b880' : '#5a4a10' }}
              >{lastCopied}</p>
            </div>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{
                background: darkMode ? 'rgba(212,175,55,0.05)' : '#fffdf5',
                border: `1px solid ${darkMode ? 'rgba(212,175,55,0.15)' : '#f0e0a0'}`,
              }}
            >
              <Loader2 size={15} className="animate-spin shrink-0" style={{ color: GOLD }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: darkMode ? '#f5e8b0' : '#5a4a10' }}>
                  10년차 상담실장이 답변을 작성 중입니다...
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: mutedCol }}>
                  언어 감지 → 의도 파악 → 병원 DB 검색 → 3가지 답변 생성
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0,1,2].map(i => <SkeletonCard key={i} darkMode={darkMode} />)}
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{
              background: darkMode ? 'rgba(239,68,68,0.08)' : '#fff5f5',
              border: darkMode ? '1px solid rgba(239,68,68,0.2)' : '1px solid #fecaca',
              color: darkMode ? '#f87171' : '#dc2626',
            }}
          >
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

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">
            {/* 언어 / 의도 배지 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: darkMode ? 'rgba(212,175,55,0.10)' : '#fefce8',
                  border: `1px solid ${darkMode ? 'rgba(212,175,55,0.25)' : '#f0d060'}`,
                  color: darkMode ? GOLD : GOLD2,
                }}
              >
                <Globe size={11} />
                {result.detected_language || '언어 감지됨'}
              </div>
              {result.intent && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: darkMode ? '#1a1a1a' : '#f8f8f8',
                    border: `1px solid ${divCol}`,
                    color: darkMode ? '#888' : '#555',
                  }}
                >
                  <Lightbulb size={11} />
                  {result.intent}
                </div>
              )}
              <span className="text-[11px]" style={{ color: mutedCol }}>
                · 답변은 환자 언어로 작성 / 한국어 해석은 직원 참고용
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CARD_DEFS.map((def, i) => (
                <ResultCard
                  key={def.key}
                  def={def}
                  option={result.options?.[def.key]}
                  darkMode={darkMode}
                  onCopy={handleCardCopy}
                  index={i}
                />
              ))}
            </div>

            <p className="text-center text-[11px]" style={{ color: mutedCol }}>
              💡 복사 버튼은 환자에게 보낼 원문만 복사합니다. 한국어 해석은 직원 전용입니다.
            </p>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!input && !loading && !result && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-6"
            style={{ color: mutedCol }}
          >
            {/* 아이콘 */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: darkMode
                  ? 'rgba(212,175,55,0.08)'
                  : 'linear-gradient(145deg, #fffdf5, #fefce8)',
                border: `1px solid ${darkMode ? 'rgba(212,175,55,0.15)' : '#f0e0a0'}`,
                boxShadow: darkMode ? 'none' : '0 4px 20px rgba(212,175,55,0.12)',
              }}
            >
              <Sparkles
                size={28}
                strokeWidth={1.4}
                style={{ color: darkMode ? 'rgba(212,175,55,0.5)' : GOLD }}
              />
            </div>

            <div className="text-center space-y-2">
              <p
                className="text-sm font-bold"
                style={{ color: darkMode ? '#e8dcc8' : '#1a1a1a' }}
              >
                뇌를 1%도 쓸 필요 없습니다
              </p>
              <p className="text-xs">메시지를 붙여넣으면 환자 언어로 즉시 답변이 생성됩니다</p>
              <p className="text-xs">중국어 → 중국어 답변 · 일본어 → 일본어 답변</p>
            </div>

            {/* 언어 칩 */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {[
                { emoji: '🇯🇵', label: '일본어' },
                { emoji: '🇨🇳', label: '중국어' },
                { emoji: '🇺🇸', label: '영어' },
              ].map(l => (
                <div
                  key={l.label}
                  className="tiki-lang-chip px-3 py-3 rounded-xl text-center text-[11px] font-medium"
                  style={{
                    background: darkMode ? '#111' : '#ffffff',
                    border: `1px solid ${divCol}`,
                    color: darkMode ? '#666' : '#aaa',
                    boxShadow: darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <span className="text-xl block mb-1.5">{l.emoji}</span>
                  {l.label}
                </div>
              ))}
            </div>

            {/* 단축키 안내 */}
            <div
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs"
              style={{
                background: darkMode ? 'rgba(212,175,55,0.05)' : '#fffdf5',
                border: `1px solid ${darkMode ? 'rgba(212,175,55,0.12)' : '#f0e8b0'}`,
                color: darkMode ? 'rgba(212,175,55,0.7)' : GOLD2,
              }}
            >
              <span className="text-base">⚡</span>
              <span>
                텍스트 창에 <strong>Ctrl+V</strong> 하면 자동 생성됩니다
              </span>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
