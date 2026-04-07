import { PencilLine, SendHorizontal, Sparkles, WandSparkles, html } from "../lib.js";

export function AICopilot({ language, suggestion, draft, onDraftChange, onInjectSuggestion, onSend }) {
  return html`
    <div className="border-t border-slate-200 bg-white px-6 pb-6 pt-4">
      <div className="ai-ring mb-4 rounded-[28px] bg-white p-4 shadow-float">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <${WandSparkles} size=${16} />
          </span>
          AI 추천 답변
        </div>
        <div className="mt-3 text-sm leading-7 text-slate-700">${suggestion}</div>
        <div className="mt-4 flex gap-3">
          <button
            onClick=${onInjectSuggestion}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
          >
            <${PencilLine} size=${16} />
            텍스트 수정
          </button>
          <button
            onClick=${onSend}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <${SendHorizontal} size=${16} />
            이대로 발송
          </button>
          <div className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
            <${Sparkles} size=${14} />
            발송 시 ${language}로 자동 번역
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
            <${PencilLine} size=${16} />
          </span>
          Desk Reply Editor
        </div>
        <textarea
          value=${draft}
          onInput=${(event) => onDraftChange(event.target.value)}
          className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-brand-300"
          placeholder="직원이 직접 한국어로 답변을 입력하거나 AI 추천 답변을 불러와 수정할 수 있습니다."
        />
        <div className="mt-3 text-xs text-slate-500">
          한국어로 입력하면 환자의 언어(${language})로 자동 번역되어 전송됩니다.
        </div>
      </div>
    </div>
  `;
}
