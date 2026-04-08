import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Pencil, Loader2, ChevronDown, Copy, Check, X } from 'lucide-react';
import { useStreamApi } from '../../hooks/useStreamApi';

// 페이즈별 상태 텍스트
const PHASE_LABEL = {
  routing:    'AI가 질문을 분석하고 있습니다...',
  generating: '답변을 작성하고 있습니다...',
};

export default function ReplyArea({ conv, onMessageSent }) {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [phase, setPhase] = useState(null); // null | 'routing' | 'generating' | 'done'
  const [loadError, setLoadError] = useState(null); // error message string | null
  const [isSending, setIsSending] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const generationRef = useRef(0); // 세대 카운터 — stale 콜백이 신규 상태를 덮어쓰지 못하게
  const { streamPost, post } = useStreamApi();

  const lastPatientMsg = conv.messages.filter(m => m.from === 'patient').at(-1);
  const isLoading = phase === 'routing' || phase === 'generating';
  // 카드는 한 번이라도 로딩을 시작했으면 유지 (에러 포함)
  const cardVisible = phase !== null && showSuggestion;

  // Auto-load AI suggestion when conversation changes
  useEffect(() => {
    if (!lastPatientMsg) return;
    setSuggestion('');
    setShowSuggestion(true);
    setPhase(null);
    setLoadError(null);
    loadSuggestion();
    return () => abortRef.current?.abort();
  }, [conv.id]);

  const loadSuggestion = async () => {
    if (!lastPatientMsg) return;

    // 세대 번호 증가 — 이전 스트림의 stale 콜백을 무효화
    const gen = ++generationRef.current;
    const isCurrentGen = () => generationRef.current === gen;

    setSuggestion('');
    setLoadError(null);
    setCopied(false);
    setPhase('routing'); // 낙관적 즉시 표시 → 서버 연결 전에도 카드 노출

    abortRef.current = new AbortController();

    await streamPost('/api/suggest', {
      patientMessage: lastPatientMsg.translatedText || lastPatientMsg.originalText,
      procedureHint: conv.procedure,
      patientLang: conv.patient.lang,
    }, {
      signal: abortRef.current.signal,
      onPhase: (p) => { if (isCurrentGen()) setPhase(p); },
      onChunk: (_, full) => { if (isCurrentGen()) setSuggestion(full); },
      onDone: () => { if (isCurrentGen()) setPhase('done'); },
      onError: (err) => {
        if (!isCurrentGen()) return; // 이전 세대 에러는 무시
        // 서버가 보낸 실제 에러 메시지를 그대로 표시
        const raw = err?.message || '';
        const msg = raw.includes('fetch') || raw.includes('Failed to fetch')
          ? '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.'
          : `AI 답변 생성 실패: ${raw || '알 수 없는 오류'}`;
        setLoadError(msg);
        setPhase('done');
      },
    });
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setPhase('done');
  };

  const handleCopy = async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable
    }
  };

  const handleUseSuggestion = () => {
    setInput(suggestion);
    setShowSuggestion(false);
    textareaRef.current?.focus();
  };

  const handleSend = async (textToSend = input) => {
    if (!textToSend.trim() || isSending) return;
    setIsSending(true);

    try {
      const data = await post('/api/translate-reply', {
        replyText: textToSend,
        targetLang: conv.patient.lang,
      });

      const translatedReply = data.translated || textToSend;

      onMessageSent({
        id: `m-${Date.now()}`,
        from: 'staff',
        originalText: textToSend,
        translatedText: translatedReply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      });

      setInput('');
      setSuggestion('');
      setShowSuggestion(false);
      setPhase(null);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSuggestion = () => handleSend(suggestion);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* AI Suggestion Card */}
      {cardVisible && (
        <div className="px-4 pt-3 pb-0 animate-slide-up">
          <div className="ai-card-border rounded-xl bg-white shadow-md overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-navy-50 to-purple-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-navy-500 to-purple-500 flex items-center justify-center">
                  <Sparkles size={10} className="text-white" fill="white" />
                </div>
                <span className="text-xs font-semibold text-navy-700">AI 추천 답변</span>
                {isLoading ? (
                  <span className="text-[10px] text-purple-500 font-medium animate-pulse">
                    · {PHASE_LABEL[phase]}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">· 한국어로 수정 후 발송 가능</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isLoading && (
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="생성 취소"
                  >
                    <X size={10} />
                    취소
                  </button>
                )}
                <button
                  onClick={() => setShowSuggestion(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Suggestion text */}
            <div className="px-4 py-3 min-h-[60px]">
              {/* 에러 상태 */}
              {phase === 'done' && loadError && !suggestion ? (
                <div className="flex items-start gap-2 text-red-600">
                  <X size={13} className="mt-0.5 shrink-0" />
                  <span className="text-xs leading-relaxed">{loadError}</span>
                </div>
              ) : isLoading && !suggestion ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-purple-500" />
                    <span className="text-xs text-purple-600 font-medium">
                      {PHASE_LABEL[phase] || 'AI가 처리 중입니다...'}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-3/5" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {suggestion}
                  {phase === 'generating' && (
                    <span className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5 align-text-bottom animate-pulse" />
                  )}
                </p>
              )}
            </div>

            {/* Action buttons — 완료 또는 에러 후 표시 */}
            {phase === 'done' && (suggestion || loadError) && (
              <div className="flex gap-2 px-4 pb-3 flex-wrap">
                {/* 에러 상태면 재시도만 표시 */}
                {loadError && !suggestion ? (
                  <button
                    onClick={loadSuggestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <Sparkles size={11} />
                    다시 시도
                  </button>
                ) : (
                  <>
                    {/* Copy */}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      {copied ? '복사됨' : '복사'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={handleUseSuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <Pencil size={11} />
                      수정하기
                    </button>

                    {/* Regenerate */}
                    <button
                      onClick={loadSuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <Sparkles size={11} />
                      재생성
                    </button>

                    {/* Send as-is */}
                    <button
                      onClick={handleSendSuggestion}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-700 hover:bg-navy-800 text-white rounded-lg transition-all shadow-sm disabled:opacity-60 ml-auto"
                    >
                      {isSending ? <Loader2 size={11} className="animate-spin" /> : <span>🚀</span>}
                      이대로 발송
                      <span className="text-[10px] opacity-80 font-normal hidden sm:inline">
                        ({conv.patient.langName}으로 번역)
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3">
        <div className="border border-slate-200 rounded-xl focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100 transition-all bg-white overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="한국어로 답변을 입력하세요..."
            rows={3}
            className="w-full px-4 pt-3 pb-1 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none bg-transparent leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-[11px] text-slate-400">
              한국어 입력 → {conv.patient.langName} 자동 번역 발송 · ⌘↵ 발송
            </span>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-navy-700 hover:bg-navy-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              {isSending
                ? <Loader2 size={12} className="animate-spin" />
                : <Send size={12} />
              }
              발송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
