import { MessageSquare, Calendar, BarChart3, Settings, Users, UserCog, Shield, Stethoscope, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 네비게이션 아이템 정의
// requiredRoles: null → 모든 역할 접근 가능
//               ['owner','admin'] → 해당 역할만 가능
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id:            'chat',
    icon:          MessageSquare,
    label:         '상담 관리',
    requiredRoles: null,                     // 전체 허용
  },
  {
    id:            'patients',
    icon:          Users,
    label:         '환자 관리',
    requiredRoles: null,
  },
  {
    id:            'aftercare',
    icon:          Calendar,
    label:         '애프터케어',
    requiredRoles: null,
  },
  {
    id:            'stats',
    icon:          BarChart3,
    label:         '통계',
    requiredRoles: ['owner', 'admin'],       // owner / admin 전용
  },
  {
    id:            'procedures',
    icon:          Stethoscope,
    label:         '시술 관리',
    requiredRoles: ['owner', 'admin'],
  },
  {
    id:            'staff_mgmt',
    icon:          UserCog,
    label:         '직원 관리',
    requiredRoles: ['owner', 'admin'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 역할 Badge — 사이드바 하단 아바타 아래 표시
// ─────────────────────────────────────────────────────────────────────────────
function RoleBadge({ role, darkMode }) {
  if (!role) return null;

  const configs = {
    owner: { label: '원장',   bg: 'bg-amber-400/20',   text: 'text-amber-400',   dot: 'bg-amber-400' },
    admin: { label: '관리자', bg: 'bg-violet-400/20',  text: 'text-violet-400',  dot: 'bg-violet-400' },
    staff: { label: '직원',   bg: 'bg-slate-400/20',   text: 'text-slate-400',   dot: 'bg-slate-400'  },
  };
  const c = configs[role] || configs.staff;

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${c.bg}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`text-[8px] font-bold tracking-wide ${c.text}`}>{c.label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 접근 제한된 메뉴를 클릭했을 때 표시할 Tooltip
// ─────────────────────────────────────────────────────────────────────────────
function LockedNavItem({ item, darkMode, inactiveClass }) {
  return (
    <div
      title={`${item.label} — 원장·관리자 전용`}
      className={`
        relative w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
        opacity-35 cursor-not-allowed select-none
        ${inactiveClass}
      `}
    >
      <item.icon size={18} strokeWidth={1.6} />
      <span className="text-[9px] font-medium tracking-tight leading-none">{item.label}</span>
      {/* 자물쇠 오버레이 */}
      <span className="absolute top-1 right-1.5 text-[8px]">🔒</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
export default function Sidebar({ activeTab, onTabChange, darkMode }) {
  const { session, role, canAccess } = useAuth();

  // ── 스타일 ──────────────────────────────────────────────────────────────────
  const base         = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const activeClass  = darkMode
    ? 'bg-purple-500/20 text-purple-400 shadow-sm border border-purple-500/30'
    : 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100';
  const inactiveClass = darkMode
    ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'
    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent';

  // ── role이 null(로딩 중)이면 전체 허용으로 안전 처리 ──────────────────────
  const isAdminOrAbove = !role || role === 'owner' || role === 'admin';

  return (
    <aside className={`w-16 flex flex-col items-center ${base} border-r py-4 gap-1 shrink-0`}>

      {/* ── 로고 ──────────────────────────────────────────────────────────── */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center mb-4 shadow-[0_0_12px_rgba(168,85,247,0.35)]">
        <MessageSquare size={16} className="text-white" fill="white" />
      </div>

      {/* ── 메인 네비게이션 ────────────────────────────────────────────────── */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2">

        {/* ✨ Tiki Paste — 포인트 버튼 (딥 브론즈 골드) */}
        <button
          onClick={() => onTabChange('tiki_paste')}
          title="Tiki Paste — 붙여넣기 즉시 AI 답변 3종 자동 생성"
          style={activeTab === 'tiki_paste' ? {
            background: 'linear-gradient(135deg, #c49832 0%, #8a6520 50%, #c49832 100%)',
            backgroundSize: '200% 200%',
            animation: 'goldShimmer 3s ease infinite',
            boxShadow: '0 2px 12px rgba(196,152,50,0.45)',
            border: 'none',
          } : darkMode ? {
            background: 'rgba(196,152,50,0.08)',
            border: '1px solid rgba(196,152,50,0.25)',
          } : {
            background: 'linear-gradient(135deg, #fffbf0, #fef3c7)',
            border: '1px solid #d4a843',
          }}
          className={`
            w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
            transition-all duration-150 relative
            ${activeTab === 'tiki_paste' ? 'text-amber-50' : darkMode ? 'text-amber-500' : 'text-amber-700'}
          `}
        >
          <Sparkles size={18} strokeWidth={activeTab === 'tiki_paste' ? 2.5 : 1.8} />
          <span className="text-[9px] font-bold tracking-tight leading-none">티키</span>
          {activeTab !== 'tiki_paste' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        {/* 구분선 */}
        <div className={`w-8 h-px my-0.5 ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`} />

        {NAV_ITEMS.map(item => {
          const hasAccess = !item.requiredRoles || canAccess(item.id);
          const isActive  = activeTab === item.id;

          // 접근 불가 — 잠긴 상태로 표시 (완전히 숨기지 않고 존재는 알림)
          if (!hasAccess) {
            return (
              <LockedNavItem
                key={item.id}
                item={item}
                darkMode={darkMode}
                inactiveClass={inactiveClass}
              />
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              className={`
                w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
                transition-all duration-150
                ${isActive ? activeClass : inactiveClass}
              `}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── 하단: 설정 + 아바타 ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 w-full px-2">

        {/* 설정 — owner/admin 전용 */}
        {isAdminOrAbove ? (
          <button
            title="병원 설정"
            onClick={() => onTabChange('settings')}
            className={`
              w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
              transition-all duration-150
              ${activeTab === 'settings' ? activeClass : inactiveClass}
            `}
          >
            <Settings size={18} strokeWidth={activeTab === 'settings' ? 2.5 : 1.8} />
            <span className="text-[9px] font-medium">설정</span>
          </button>
        ) : (
          /* staff에게는 설정 아이콘 대신 권한 안내 뱃지만 */
          <div
            title="설정은 관리자 전용입니다"
            className={`w-full flex flex-col items-center gap-1 py-2 px-1 rounded-xl opacity-30 cursor-not-allowed ${inactiveClass}`}
          >
            <Shield size={15} strokeWidth={1.5} />
            <span className="text-[8px]">설정</span>
          </div>
        )}

        {/* 아바타 + 역할 뱃지 */}
        {session && (
          <div className="flex flex-col items-center gap-1 mt-1">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${session.staff.avatarColor}
                flex items-center justify-center text-white text-[11px] font-bold shadow
                cursor-pointer ring-2 ${darkMode ? 'ring-zinc-900' : 'ring-white'}`}
              title={`${session.staff.name} · ${session.staff.role}`}
            >
              {session.staff.initials}
            </div>
            <RoleBadge role={role} darkMode={darkMode} />
          </div>
        )}
      </div>
    </aside>
  );
}
