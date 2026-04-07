import {
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Globe2,
  ImagePlus,
  NotebookText,
  Tags,
  html,
} from "../lib.js";

const toneMap = {
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function SnapshotBadge({ snapshot }) {
  const className =
    snapshot.state === "sent"
      ? "bg-emerald-50 text-emerald-700"
      : snapshot.state === "scheduled"
        ? "bg-amber-50 text-amber-700"
        : "border border-dashed border-slate-300 text-slate-400";

  return html`
    <div className="rounded-2xl px-3 py-2 text-xs font-semibold ${className}">
      <div>${snapshot.key}</div>
      <div className="mt-1 text-[11px] font-medium">${snapshot.detail}</div>
    </div>
  `;
}

export function PatientContextPanel({
  conversation,
  galleryIndex,
  onPrevGallery,
  onNextGallery,
}) {
  if (!conversation) {
    return html`<aside className="border-l border-slate-200 bg-white"></aside>`;
  }

  const activeImage = conversation.gallery[galleryIndex] || conversation.gallery[0];

  return html`
    <aside className="soft-scrollbar h-full overflow-y-auto border-l border-slate-200 bg-white px-5 py-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-base font-bold text-brand-700">
            ${conversation.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">${conversation.patientName}</h3>
              <span className="text-lg">${conversation.countryFlag}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <${Globe2} size=${14} />
              ${conversation.language}
              <span className="text-slate-300">•</span>
              총 방문 ${conversation.visits}회
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          ${conversation.tags.map((tag) => html`
            <span key=${tag.label} className=${`rounded-full px-3 py-1.5 text-xs font-semibold ${toneMap[tag.tone] || toneMap.brand}`}>
              ${tag.label}
            </span>
          `)}
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <${CalendarClock} size=${16} className="text-brand-700" />
          Patient Timeline
        </div>
        <div className="mt-5 space-y-5">
          ${conversation.timeline.map((item, index) => html`
            <div key=${item.date + item.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600"></span>
                ${index < conversation.timeline.length - 1
                  ? html`<span className="timeline-line mt-2 h-16 w-px"></span>`
                  : null}
              </div>
              <div className="pb-1">
                <div className="text-xs font-semibold text-slate-400">${item.date}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">${item.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">${item.detail}</div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <${Camera} size=${16} className="text-brand-700" />
            Before & After Quick View
          </div>
          <div className="flex gap-2">
            <button onClick=${onPrevGallery} className="rounded-xl border border-slate-200 p-2 text-slate-500">
              <${ChevronLeft} size=${14} />
            </button>
            <button onClick=${onNextGallery} className="rounded-xl border border-slate-200 p-2 text-slate-500">
              <${ChevronRight} size=${14} />
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] bg-slate-100">
          <img src=${activeImage.image} alt=${activeImage.label} className="h-52 w-full object-cover" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">${activeImage.label}</div>
            <div className="text-xs text-slate-500">${activeImage.type}</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            <${ImagePlus} size=${14} />
            채트 이미지 저장 가능
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <${NotebookText} size=${16} className="text-brand-700" />
          메모 및 애프터케어 현황
        </div>
        <div className="mt-4 space-y-3">
          ${conversation.notes.map((note) => html`
            <div key=${note} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              ${note}
            </div>
          `)}
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900">
          <${Tags} size=${15} className="text-brand-700" />
          Aftercare Snapshot
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          ${conversation.aftercareSnapshot.map((snapshot) => html`
            <${SnapshotBadge} key=${snapshot.key} snapshot=${snapshot} />
          `)}
        </div>
      </div>
    </aside>
  `;
}
