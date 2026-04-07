import { Camera, Clock3, MessageCircleMore, PhoneCall, html } from "../lib.js";

const channelBadgeMap = {
  instagram: { icon: Camera, className: "bg-pink-500 text-white" },
  kakao: { icon: MessageCircleMore, className: "bg-yellow-300 text-slate-900" },
  whatsapp: { icon: PhoneCall, className: "bg-emerald-500 text-white" },
};

const tabs = [
  { id: "all", label: "전체" },
  { id: "pending", label: "미답변" },
  { id: "booked", label: "예약완료" },
];

function getChannelBadge(channel) {
  return channelBadgeMap[channel] || { icon: MessageCircleMore, className: "bg-slate-400 text-white" };
}

export function ChatList({
  allConversations,
  conversations,
  activeConversationId,
  activeFilter,
  onFilterChange,
  onSelectConversation,
}) {
  const counts = {
    all: allConversations.length,
    pending: allConversations.filter((item) => item.status === "pending").length,
    booked: allConversations.filter((item) => item.status === "booked").length,
  };

  return html`
    <section className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Inbox</div>
            <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">실시간 상담 리스트</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            총 ${counts.all}건
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-100 p-1">
          ${tabs.map((tab) => html`
            <button
              key=${tab.id}
              onClick=${() => onFilterChange(tab.id)}
              className=${`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeFilter === tab.id
                  ? "bg-white text-brand-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ${tab.label}${tab.id !== "all" ? ` (${counts[tab.id]})` : ""}
            </button>
          `)}
        </div>
      </div>

      <div className="soft-scrollbar flex-1 overflow-y-auto">
        ${conversations.length === 0
          ? html`
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <${Clock3} size=${18} />
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-700">현재 조건에 맞는 대화가 없습니다</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  다른 필터를 선택하거나 새로 유입된 메시지를 확인해 주세요.
                </div>
              </div>
            `
          : conversations.map((conversation) => {
              const channel = getChannelBadge(conversation.channel);
              const Icon = channel.icon;
              const isActive = conversation.id === activeConversationId;
              return html`
                <button
                  key=${conversation.id}
                  onClick=${() => onSelectConversation(conversation.id)}
                  className=${`flex w-full items-start gap-4 border-b border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50 ${
                    isActive ? "bg-slate-50" : "bg-white"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
                      ${conversation.avatar}
                    </div>
                    <span className=${`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${channel.className}`}>
                      <${Icon} size=${11} strokeWidth=${2.4} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">${conversation.patientName}</span>
                      <span className="text-base">${conversation.countryFlag}</span>
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">${conversation.preview}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <${Clock3} size=${12} />
                      ${conversation.language}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <span className="text-xs font-medium text-slate-400">${conversation.time}</span>
                    ${conversation.unread
                      ? html`<span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>`
                      : html`<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">Done</span>`}
                  </div>
                </button>
              `;
            })}
      </div>
    </section>
  `;
}
