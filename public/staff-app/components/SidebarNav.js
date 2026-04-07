import { BarChart3, HeartPulse, html, MessageSquareMore } from "../lib.js";

const items = [
  { id: "consult", label: "상담 관리", icon: MessageSquareMore },
  { id: "aftercare", label: "애프터케어", icon: HeartPulse },
  { id: "stats", label: "통계", icon: BarChart3 },
];

export function SidebarNav({ activeView, onChange }) {
  return html`
    <aside className="border-r border-slate-200 bg-brand-900 px-3 py-5 text-slate-300">
      <div className="mb-8 flex items-center justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-100 to-slate-300 text-center text-sm font-extrabold leading-8 text-brand-900">
            CC
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        ${items.map(({ id, label, icon: Icon }) => html`
          <button
            key=${id}
            onClick=${() => onChange(id)}
            className=${`group flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[11px] font-semibold transition ${
              activeView === id
                ? "bg-white text-brand-900 shadow-sm"
                : "hover:bg-white/8 hover:text-white"
            }`}
            title=${label}
          >
            <span className=${`flex h-10 w-10 items-center justify-center rounded-2xl ${
              activeView === id ? "bg-brand-50 text-brand-700" : "bg-white/5"
            }`}>
              <${Icon} size=${18} strokeWidth=${2} />
            </span>
            <span className=${activeView === id ? "" : "text-slate-400"}>${label}</span>
          </button>
        `)}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-slate-400">
        <div className="font-semibold text-slate-200">Global Desk</div>
        <div>다국어 문의를 한 화면에서 관리</div>
      </div>
    </aside>
  `;
}
