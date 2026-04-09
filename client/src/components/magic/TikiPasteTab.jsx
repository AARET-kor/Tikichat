import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Clipboard, Copy, Check, AlertCircle, Loader2,
  RefreshCcw, Globe, Lightbulb, MessageSquare, ShieldCheck,
  CalendarCheck, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 카드 정의 — Deep Blue 팔레트
// ─────────────────────────────────────────────────────────────────────────────
const CARD_DEFS = [
  {
    key:      'kind',
    label:    '친절/상세형',
    sublabel: 'Detailed & Caring',
    icon:     MessageSquare,
    light: {
      wrap:  'bg-blue-50 ring-1 ring-blue-200',
      head:  'bg-blue-100/60',
      icon:  'text-blue-500 bg-white',
      title: 'text-blue-700',
      body:  'text-slate-700',
      ko:    'text-blue-400',
      btn:   'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200',
    },
    dark: {
      wrap:  'bg-blue-950/40 ring-1 ring-blue-700/40',
      head:  'bg-blue-900/40',
      icon:  'text-blue-400 bg-blue-900/60',
      title: 'text-blue-300',
      body:  'text-zinc-200',
      ko:    'text-blue-500/80',
      btn:   'bg-blue-900/50 hover:bg-blue-800/60 text-blue-300 border-blue-700/40',
    },
  },
  {
    key:      'firm',
    label:    '단호/규정안내형',
    sublabel: 'Firm & Policy-based',
    icon:     ShieldCheck,
    light: {
      wrap:  'bg-indigo-50 ring-1 ring-indigo-200',
      head:  'bg-indigo-100/60',
      icon:  'text-indigo-500 bg-white',
      title: 'text-indigo-700',
      body:  'text-slate-700',
      ko:    'text-indigo-400',
      btn:   'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200',
    },
    dark: {
      wrap:  'bg-indigo-950/40 ring-1 ring-indigo-700/40',
      head:  'bg-indigo-900/40',
      icon:  'text-indigo-400 bg-indigo-900/60',
      title: 'text-indigo-300',
      body:  'text-zinc-200',
      ko:    'text-indigo-500/80',
      btn:   'bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 border-indigo-700/40',
    },
  },
  {
    key:      'booking',
    label:    '예약유도형',
    sublabel: 'Action & Closing',
    icon:     CalendarCheck,
    light: {
      wrap:  'bg-violet-50 ring-1 ring-violet-200',
      head:  'bg-violet-100/60',
      icon:  'text-violet-500 bg-white',
      title: 'text-violet-700',
      body:  'text-slate-700',
      ko:    'text-violet-400',
      btn:   'bg-violet-100 hover:bg-violet-200 text-violet-700 border-violet-200',
    },
    dark: {
      wrap:  'bg-violet-950/40 ring-1 ring-violet-700/40',
      head:  'bg-violet-900/40',
      icon:  'text-violet-400 bg-violet-900/60',
      title: 'text-violet-300',
      body:  'text-zinc-200',
      ko:    'text-violet-500/80',
      btn:   'bg-violet-900/50 hover:bg-violet-800/60 text-violet-300 border-violet-700/40',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, darkMode }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold pointer-events-none
        ${darkMode
          ? 'bg-blue-900 text-blue-200 border border-blue-700'
          : 'bg-white text-blue-700 border border-blue-200 shadow-blue-100'}`}
      style={{ animation: 'slideUp 0.2s ease-out' }}
    >
      <Check size={14} />
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard({ darkMode }) {
  const line = darkMode ? 'bg-blue-900/60' : 'bg-blue-100';
  const wrap = darkMode ? 'bg-blue-950/30 border-blue-900/40' : 'bg-blue-50/60 border-blue-100';
  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${wrap}`}>
      <div className={`h-3 ${line} rounded-full w-1/3 animate-pulse`} />
      <div className={`h-3 ${line} rounded-full w-full animate-pulse delay-75`} />
      <div className={`h-3 ${line} rounded-full w-5/6 animate-pulse delay-150`} />
      <div className={`h-3 ${line} rounded-full w-4/5 animate-pulse delay-200`} />
      <div className={`h-3 ${line} rounded-full w-2/3 animate-pulse delay-300`} />
      <div className={`h-2 ${line} rounded-full w-1/2 animate-pulse delay-500 mt-2`} />
      <div className={`h-2 ${line} rounded-full w-3/5 animate-pulse delay-700`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ def, option, darkMode, onCopy }) {
  const [copied, setCopied] = useState(false);
  const ac = darkMode ? def.dark : def.light;

  // option은 { reply, ko_translation } 또는 string (폴백)
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
    <div className={`flex flex-col rounded-2xl overflow-hidden ${ac.wrap}`}>
      {/* Card header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${ac.head}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${ac.icon}`}>
          <def.icon size={14} />
        </div>
        <div>
          <p className={`text-xs font-bold ${ac.title}`}>{def.label}</p>
          <p className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{def.sublabel}</p>
        </div>
      </div>

      {/* Reply text (patient language) */}
      <div className="flex-1 px-4 pt-3 pb-2">
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${ac.body}`}>
          {replyText}
        </p>
      </div>

      {/* Korean translation (staff reference) */}
      {koText && (
        <div className={`mx-4 mb-3 px-3 py-2 rounded-xl border ${
          darkMode ? 'bg-zinc-900/60 border-zinc-700/60' : 'bg-white/70 border-slate-200'
        }`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
            darkMode ? 'text-zinc-500' : 'text-slate-400'
          }`}>한국어 해석</p>
          <p className={`text-xs leading-relaxed ${ac.ko}`}>{koText}</p>
        </div>
      )}

      {/* Copy button — copies reply ONLY */}
      <div className="px-4 pb-4 flex justify-end">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${ac.btn}`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? '복사됨 ✓' : '복사하기'}
        </button>
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

  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const [pasteErr,    setPasteErr]    = useState(false);
  const [toast,       setToast]       = useState('');
  const [lastCopied,  setLastCopied]  = useState('');   // "currently copied" preview
  const textareaRef = useRef(null);

  // ── AI 생성 ────────────────────────────────────────────────────────────────
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
        body:    JSON.stringify({
          message:    msg,
          clinicId:   clinicId || undefined,
          clinicName: clinicName,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, clinicId, clinicName]);

  // ── textarea onPaste 이벤트 → 즉시 AI 호출 ───────────────────────────────
  const handleTextareaPaste = useCallback((e) => {
    // 브라우저가 붙여넣기 텍스트를 가져오는 시간을 기다림
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText.trim()) {
      // state 업데이트 후 바로 generate 트리거 (setTimeout으로 한 틱 뒤)
      setInput(pastedText);
      setResult(null);
      setError(null);
      setTimeout(() => handleGenerate(pastedText), 0);
    }
  }, [handleGenerate]);

  // ── 클립보드 버튼 ──────────────────────────────────────────────────────────
  const handleClipboardBtn = useCallback(async () => {
    setPasteErr(false);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        setResult(null);
        setError(null);
        textareaRef.current?.focus();
        handleGenerate(text);
      }
    } catch {
      setPasteErr(true);
      setTimeout(() => setPasteErr(false), 3000);
    }
  }, [handleGenerate]);

  const handleReset = () => {
    setInput('');
    setResult(null);
    setError(null);
    setLastCopied('');
    textareaRef.current?.focus();
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleCardCopy = (replyText) => {
    setLastCopied(replyText);
    showToast('클립보드에 복사되었습니다');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────────────────
  const bg    = darkMode ? 'bg-zinc-950'  : 'bg-slate-50';
  const panel = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const muted = darkMode ? 'text-zinc-500' : 'text-slate-400';

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto ${bg}`}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-10 px-4 sm:px-8 py-4 border-b ${panel} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Sparkles size={15} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className={`text-sm font-extrabold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
              Tiki Paste
              <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                darkMode
                  ? 'bg-blue-900/50 text-blue-400 border border-blue-800/50'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}>
                수석 상담실장 AI
              </span>
            </h1>
            <p className={`text-[11px] mt-0.5 ${muted}`}>
              메시지를 붙여넣는 즉시 — 강남 10년차 상담실장이 답변 3종을 완성합니다
            </p>
          </div>
        </div>

        {(result || input) && (
          <button
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              darkMode
                ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <RefreshCcw size={11} />
            새로 시작
          </button>
        )}
      </div>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 py-5 max-w-5xl w-full mx-auto space-y-5">

        {/* ── Input section ────────────────────────────────────────────── */}
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${panel}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null); setError(null); }}
            onPaste={handleTextareaPaste}
            placeholder={`환자 메시지를 이 곳에 붙여넣으세요 (Ctrl+V / ⌘V)\n→ 붙여넣는 즉시 AI가 자동 분석합니다\n\n예) "보톡스の料金はいくらですか？副作用が心配なんですが..."`}
            rows={5}
            className={`w-full px-5 pt-5 pb-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 ${
              darkMode
                ? 'bg-zinc-900 text-zinc-100 placeholder-zinc-600'
                : 'bg-white text-slate-800 placeholder-slate-400'
            }`}
          />

          {/* Toolbar */}
          <div className={`flex items-center justify-between px-4 pb-4 pt-1 gap-2 border-t ${
            darkMode ? 'border-zinc-800' : 'border-slate-100'
          }`}>
            {/* Left: char count + clipboard btn */}
            <div className="flex items-center gap-2">
              {input.length > 0 && (
                <span className={`text-[10px] ${muted}`}>{input.length}자</span>
              )}
              <button
                onClick={handleClipboardBtn}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  pasteErr
                    ? 'border-red-300 text-red-500 bg-red-50'
                    : darkMode
                      ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Clipboard size={11} />
                {pasteErr ? '권한 필요' : '클립보드에서 붙여넣기'}
              </button>
            </div>

            {/* Right: Manual generate */}
            <button
              onClick={() => handleGenerate()}
              disabled={!input.trim() || loading}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                input.trim() && !loading
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-300/30'
                  : darkMode
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {loading
                ? <Loader2 size={12} className="animate-spin" />
                : <Sparkles size={12} />
              }
              {loading ? '분석 중...' : '수동 생성'}
            </button>
          </div>
        </div>

        {/* ── "Currently copied" preview ───────────────────────────────── */}
        {lastCopied && !loading && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
            darkMode
              ? 'bg-blue-950/30 border-blue-800/40 text-blue-300'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <ClipboardList size={13} className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold mb-1 opacity-70">현재 클립보드에 복사된 메시지</p>
              <p className="text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">{lastCopied}</p>
            </div>
          </div>
        )}

        {/* ── Loading skeletons ─────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              darkMode
                ? 'bg-blue-950/30 border-blue-800/40 text-blue-400'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <Loader2 size={14} className="animate-spin shrink-0" />
              <div>
                <p className="text-xs font-semibold">10년차 상담실장이 답변을 작성 중입니다...</p>
                <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-blue-600' : 'text-blue-500'}`}>
                  언어 감지 → 의도 파악 → 병원 DB 검색 → 3가지 답변 생성
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => <SkeletonCard key={i} darkMode={darkMode} />)}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
            darkMode
              ? 'bg-red-900/20 border-red-800/30 text-red-400'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">생성 실패</p>
              <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-red-500' : 'text-red-500'}`}>{error}</p>
            </div>
            <button
              onClick={() => handleGenerate()}
              className={`ml-auto text-[11px] font-semibold shrink-0 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-4">

            {/* Analysis badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                darkMode
                  ? 'bg-blue-900/30 border-blue-700/40 text-blue-400'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <Globe size={11} />
                {result.detected_language || '언어 감지됨'}
              </div>
              {result.intent && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  darkMode
                    ? 'bg-indigo-900/30 border-indigo-700/40 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  <Lightbulb size={11} />
                  {result.intent}
                </div>
              )}
              <span className={`text-[11px] ${muted}`}>
                · 답변은 환자 언어로 작성 / 한국어 해석은 참고용
              </span>
            </div>

            {/* 3 cards */}
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
              💡 복사 버튼은 환자에게 보낼 원문만 복사합니다. 한국어 해석은 복사되지 않습니다.
            </p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!input && !loading && !result && (
          <div className={`flex flex-col items-center justify-center py-14 gap-5 ${muted}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              darkMode ? 'bg-blue-950/50' : 'bg-blue-50'
            }`}>
              <Sparkles size={28} strokeWidth={1.3} className={darkMode ? 'text-blue-700' : 'text-blue-300'} />
            </div>
            <div className="text-center space-y-1.5">
              <p className={`text-sm font-bold ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                뇌를 1%도 쓸 필요 없습니다
              </p>
              <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                위챗 · 라인 · 인스타 메시지를 붙여넣으면
              </p>
              <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                강남 10년차 상담실장이 즉시 3가지 답변을 작성합니다
              </p>
            </div>

            {/* Language badges */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-center">
              {[
                { emoji: '🇯🇵', label: '일본어' },
                { emoji: '🇨🇳', label: '중국어' },
                { emoji: '🇺🇸', label: '영어' },
              ].map(l => (
                <div
                  key={l.label}
                  className={`px-3 py-3 rounded-xl text-[11px] font-medium border ${
                    darkMode
                      ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="text-xl block mb-1">{l.emoji}</span>
                  {l.label}
                </div>
              ))}
            </div>

            {/* How-to hint */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs ${
              darkMode
                ? 'bg-blue-950/20 border-blue-900/40 text-blue-500'
                : 'bg-blue-50 border-blue-100 text-blue-600'
            }`}>
              <span className="text-base">⚡</span>
              <span>텍스트 창에 직접 <strong>Ctrl+V</strong> 하면 자동 생성됩니다</span>
            </div>
          </div>
        )}

      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast} darkMode={darkMode} />}
    </div>
  );
}
