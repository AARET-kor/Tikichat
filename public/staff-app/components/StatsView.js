import { Activity, BarChart3, Globe2, html } from "../lib.js";

export function StatsView({ stats }) {
  const cards = [
    { label: "응답률", value: stats.responseRate, icon: Activity },
    { label: "평균 첫 답변", value: stats.avgReplyTime, icon: BarChart3 },
    { label: "예약 전환", value: stats.converted, icon: Globe2 },
    { label: "운영 언어", value: stats.languages, icon: Activity },
  ];

  return html`
    <section className="soft-scrollbar h-full overflow-y-auto bg-slate-50 px-6 py-6">
      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-panel">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Performance Overview</div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">운영 효율과 다국어 전환 성과</h2>
          <div className="mt-6 grid grid-cols-4 gap-4">
            ${cards.map(({ label, value, icon: Icon }) => html`
              <div key=${label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                  <${Icon} size=${18} />
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-500">${label}</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">${value}</div>
              </div>
            `)}
          </div>
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-panel">
            <div className="text-sm font-bold text-slate-900">언어별 예약 전환 추이</div>
            <div className="mt-6 flex h-72 items-end gap-4 rounded-[24px] bg-slate-50 p-6">
              ${[
                { label: "JP", value: "72%", height: "h-44" },
                { label: "EN", value: "68%", height: "h-36" },
                { label: "AR", value: "49%", height: "h-28" },
                { label: "CN", value: "54%", height: "h-32" },
                { label: "RU", value: "40%", height: "h-24" },
              ].map((bar) => html`
                <div key=${bar.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className=${`w-full rounded-t-[18px] bg-gradient-to-b from-brand-500 to-brand-800 ${bar.height}`}></div>
                  <div className="text-xs font-bold text-slate-400">${bar.label}</div>
                  <div className="text-sm font-semibold text-slate-700">${bar.value}</div>
                </div>
              `)}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-panel">
            <div className="text-sm font-bold text-slate-900">운영 메모</div>
            <div className="mt-4 space-y-3">
              ${[
                "일본어 문의는 저녁 8시 이후 예약 전환율이 가장 높습니다.",
                "아랍어 환자는 스킨부스터, 리쥬란 계열 문의 비중이 증가 중입니다.",
                "AI 추천 답변 사용 후 평균 첫 답변 시간이 18% 단축되었습니다.",
              ].map((note) => html`
                <div key=${note} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  ${note}
                </div>
              `)}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
