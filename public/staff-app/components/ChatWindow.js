import {
  Bot,
  CalendarClock,
  CheckCheck,
  ImagePlus,
  MoreHorizontal,
  Pin,
  Sparkles,
  TriangleAlert,
  html,
} from "../lib.js";
import { AICopilot } from "./AICopilot.js";

function MessageBubble({ message, onSaveImage }) {
  if (message.sender === "patient") {
    return html`
      <div className="max-w-3xl">
        <div className="rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-800 shadow-sm">
          ${message.original}
        </div>
        <div className="-mt-1 ml-3 inline-flex max-w-[92%] items-start gap-2 rounded-2xl rounded-tl-md bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800 ring-1 ring-brand-100">
          <span className="mt-0.5 text-brand-600"><${Sparkles} size=${14} /></span>
          <span><span className="font-bold">AI 번역:</span> ${message.translated}</span>
        </div>
        ${message.type === "image" && message.image
          ? html`
              <div className="mt-3 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                <img src=${message.image} alt="patient upload" className="h-56 w-full rounded-[18px] object-cover" />
                <button
                  onClick=${() => onSaveImage(message)}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"
                >
                  <${ImagePlus} size=${14} />
                  환자 차트에 저장
                </button>
              </div>
            `
          : null}
        <div className="mt-2 px-1 text-xs text-slate-400">${message.time}</div>
      </div>
    `;
  }

  return html`
    <div className="ml-auto max-w-3xl">
      <div className="rounded-[24px] rounded-br-md bg-brand-800 px-5 py-4 text-sm leading-7 text-white shadow-sm">
        ${message.original}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-slate-400">
        <${CheckCheck} size=${13} />
        자동 번역 후 전송됨
        <span>${message.time}</span>
      </div>
    </div>
  `;
}

export function ChatWindow({
  conversation,
  draft,
  onDraftChange,
  onInjectSuggestion,
  onSend,
  onSaveImage,
}) {
  if (!conversation) {
    return html`
      <section className="chat-backdrop flex h-full items-center justify-center">
        <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/80 px-10 py-12 text-center shadow-panel">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <${Bot} size=${24} />
          </div>
          <h3 className="mt-4 text-xl font-extrabold text-slate-900">대화를 선택하면 AI 코파일럿이 준비됩니다</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            환자 원문, 실시간 번역, 추천 답변, 자동 번역 발송 흐름을 한 화면에서 확인할 수 있습니다.
          </p>
        </div>
      </section>
    `;
  }

  return html`
    <section className="chat-backdrop flex h-full min-w-0 flex-col border-r border-slate-200">
      <div className="border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
            ${conversation.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">${conversation.patientName}</h2>
              <span className="text-lg">${conversation.countryFlag}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>${conversation.language} 상담</span>
              <span className="text-slate-300">•</span>
              <span>${conversation.procedure}</span>
              <span className="text-slate-300">•</span>
              <span>${conversation.lastActive}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              <${CalendarClock} size=${14} />
              이번 주 예약 전환 가능성 높음
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <${TriangleAlert} size=${14} />
              사진 검토 요청 포함
            </div>
            <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm">
              <${MoreHorizontal} size=${16} />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
            <${Pin} size=${15} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">Pinned AI Context</div>
            <div className="truncate text-xs text-slate-500">
              최근 대화와 차트 기록을 바탕으로 가격, 통증, 예약 유도 문구를 우선 추천합니다.
            </div>
          </div>
        </div>
      </div>

      <div className="soft-scrollbar flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          ${conversation.messages.map((message) => html`
            <${MessageBubble}
              key=${message.id}
              message=${message}
              onSaveImage=${onSaveImage}
            />
          `)}
        </div>
      </div>

      <div className="w-full">
        <${AICopilot}
          language=${conversation.language}
          suggestion=${conversation.aiSuggestion}
          draft=${draft}
          onDraftChange=${onDraftChange}
          onInjectSuggestion=${onInjectSuggestion}
          onSend=${onSend}
        />
      </div>
    </section>
  `;
}
