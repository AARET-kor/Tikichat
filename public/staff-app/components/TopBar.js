import { ChevronDown, Globe2, html, LayoutDashboard, Search, ShieldCheck } from "../lib.js";

export function TopBar() {
  return html`
    <header className="border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <${LayoutDashboard} size=${14} />
            Premium Concierge Ops
          </div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            Gangnam Multilingual Consultation Desk
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex w-80 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
            <${Search} size=${16} />
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              placeholder="환자명, 채널, 시술명 검색"
            />
          </label>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <${Globe2} size=${16} />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900">12개 언어 실시간 대응</div>
              <div className="text-xs text-slate-500">Instagram, Kakao, WhatsApp 연결</div>
            </div>
          </div>

          <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <${ShieldCheck} size=${16} />
            </span>
            실장 김지현
            <${ChevronDown} size=${16} className="text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  `;
}
