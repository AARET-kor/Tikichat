import { CalendarClock, CheckCheck, Clock3, GripVertical, ScanSearch, html } from "../lib.js";

function StatusBadge({ item }) {
  if (item.state === "sent") {
    return html`
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        ${item.label}
      </div>
    `;
  }

  if (item.state === "scheduled") {
    return html`
      <div className="group relative inline-flex">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
          ${item.label}
        </div>
        <div className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden w-72 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-xs leading-6 text-slate-100 shadow-float group-hover:block">
          <div className="mb-1 font-bold text-white">실제 발송 예정 메시지</div>
          ${item.tooltip}
        </div>
      </div>
    `;
  }

  return html`
    <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400">
      <span className="h-2 w-2 rounded-full bg-slate-300"></span>
      미설정
    </div>
  `;
}

function FunnelCard({ item, onDragStart }) {
  return html`
    <article
      draggable="true"
      onDragStart=${(event) => onDragStart(event, item.id)}
      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-400">
          <${GripVertical} size=${14} />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 font-bold text-brand-700">
          ${item.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-bold text-slate-900">${item.patientName}</div>
            <span>${item.countryFlag}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">${item.procedure} · ${item.language}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        ${item.tags.map((tag) => html`
          <span key=${tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            ${tag}
          </span>
        `)}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-600">
        다음 자동 세팅 메시지
        <div className="mt-1 font-semibold text-slate-900">${item.nextTemplate}</div>
      </div>

      <div className="mt-4 space-y-2">
        ${["d1", "d3", "d7"].map((key) => html`
          <div key=${key} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2">
            <div className="text-xs font-semibold text-slate-500">${key.toUpperCase()}</div>
            <${StatusBadge} item=${item.statuses[key]} />
          </div>
        `)}
      </div>
    </article>
  `;
}

export function AftercareBoard({ rows, columns, onMoveCard }) {
  const rowsByStage = columns.map((column) => ({
    ...column,
    items: rows.filter((row) => row.stage === column.id),
  }));

  const handleDragOver = (event) => event.preventDefault();
  const handleDrop = (event, stageId) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) onMoveCard(cardId, stageId);
  };
  const handleDragStart = (event, cardId) => {
    event.dataTransfer.setData("text/plain", cardId);
  };

  return html`
    <section className="soft-scrollbar h-full overflow-y-auto bg-slate-50 px-6 py-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Aftercare Funnel</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              예약 유도부터 시술 후 D+7 케어까지 한 보드에서 운영
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              카드를 드래그하면 단계별 메시지 전략이 자동으로 바뀌는 CRM형 퍼널 보드입니다.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
              오늘 자동 발송 예정 <span className="font-extrabold text-slate-900">7건</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
              재방문 유도 대상 <span className="font-extrabold text-slate-900">4명</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          ${rowsByStage.map((column) => html`
            <section
              key=${column.id}
              onDragOver=${handleDragOver}
              onDrop=${(event) => handleDrop(event, column.id)}
              className="min-h-[34rem] rounded-[28px] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="rounded-[22px] bg-white px-4 py-4 shadow-sm">
                <div className="text-sm font-extrabold text-slate-900">${column.label}</div>
                <div className="mt-1 text-xs text-slate-500">${column.hint}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                  <${ScanSearch} size=${13} />
                  ${column.items.length}명
                </div>
              </div>

              <div className="mt-4 space-y-4">
                ${column.items.map((item) => html`
                  <${FunnelCard}
                    key=${item.id}
                    item=${item}
                    onDragStart=${handleDragStart}
                  />
                `)}
              </div>
            </section>
          `)}
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            <div>환자 정보</div>
            <div>시술명</div>
            <div>D+1 알림</div>
            <div>D+3 알림</div>
            <div>D+7 알림</div>
          </div>

          ${rows.map((row) => html`
            <div key=${row.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center border-t border-slate-200 px-6 py-5 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 font-bold text-brand-700">
                  ${row.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    ${row.patientName}
                    <span>${row.countryFlag}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">${row.language} · ${row.completedAt} 기준</div>
                </div>
              </div>

              <div>
                <div className="inline-flex rounded-full bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                  ${row.procedure}
                </div>
              </div>

              ${["d1", "d3", "d7"].map((key) => html`
                <div key=${key} className="space-y-2">
                  <${StatusBadge} item=${row.statuses[key]} />
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    ${row.statuses[key].state === "sent"
                      ? html`<${CheckCheck} size=${13} />`
                      : row.statuses[key].state === "scheduled"
                        ? html`<${Clock3} size=${13} />`
                        : html`<${CalendarClock} size=${13} />`}
                    ${row.statuses[key].detail || "메시지 템플릿을 설정해 주세요"}
                  </div>
                </div>
              `)}
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}
