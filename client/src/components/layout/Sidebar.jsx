import { BarChart3, Settings, Shield, Stethoscope, Sparkles, MessageSquare, Users } from 'lucide-react';

// ── Design tokens — Zinc base + selective accent colors ───────────────────────
const CORAL  = '#FC6C85';   // Tiki Paste — Watermelon Splash
const TEAL   = '#069494';   // Stats — Tropical Punch
const LIME   = '#89F336';   // Procedures — Watermelon Splash
const F      = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 원장 전용 관제탑 — 티키 Paste · 시술 관리 · 통계 · 설정만 노출
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id:            'stats',
    icon:          BarChart3,
    label:         '통계',
    requiredRoles: ['owner', 'admin'],
    accent:        TEAL,
  },
  {
    id:            'procedures',
    icon:          Stethoscope,
    label:         '시술 관리',
    requiredRoles: ['owner', 'admin'],
    accent:        LIME,
  },
  {
    id:            'insights',
    icon:          Users,
    label:         'VIP 인사이트',
    requiredRoles: ['owner', 'admin'],
    accent:        CORAL,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 역할 Badge — 사이드바 하단 아바타 아래 표시
// ─────────────────────────────────────────────────────────────────────────────
function RoleBadge({ role, darkMode }) {
  if (!role) return null;

  const configs = {
    owner: { label: '원장',   bg: 'bg-[#AD9E90]/20',   text: 'text-[#7A6858]',   dot: 'bg-[#AD9E90]' },
    admin: { label: '관리자', bg: 'bg-[#5C8DC5]/20',  text: 'text-[#3E6DA0]',  dot: 'bg-[#5C8DC5]' },
    staff: { label: '직원',   bg: 'bg-[#909EAE]/20',   text: 'text-[#636E7E]',   dot: 'bg-[#909EAE]'  },
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

  // ── Zinc base styles ────────────────────────────────────────────────────────
  const base      = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const inactCls  = darkMode
    ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'
    : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 border border-transparent';

  const isAdminOrAbove = !role || role === 'owner' || role === 'admin';

  // Per-item active style using accent color
  const activeStyle = (accent) => ({
    background: `${accent}15`,
    border: `1px solid ${accent}40`,
    color: accent,
    boxShadow: `0 1px 6px ${accent}20`,
  });

  return (
    <aside
      className={`w-16 flex flex-col items-center ${base} border-r py-4 gap-1 shrink-0`}
      style={{ fontFamily: F.sans }}
    >
      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#18181b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        <MessageSquare size={15} className="text-white" fill="white" />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2">

        {/* Tiki Paste — coral accent */}
        <button
          onClick={() => onTabChange('tiki_paste')}
          title="Tiki Paste — 붙여넣기 즉시 AI 답변 3종 자동 생성"
          style={activeTab === 'tiki_paste'
            ? { background: CORAL, border: 'none', boxShadow: `0 4px 14px ${CORAL}55`, color: '#fff' }
            : darkMode
              ? { background: `${CORAL}10`, border: `1px solid ${CORAL}25`, color: CORAL }
              : { background: '#fff', border: `1px solid ${CORAL}30`, color: CORAL, boxShadow: `0 1px 5px ${CORAL}15` }
          }
          className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 relative"
        >
          <Sparkles size={17} strokeWidth={activeTab === 'tiki_paste' ? 2.5 : 1.8} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1 }}>티키</span>
          {activeTab !== 'tiki_paste' && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: CORAL }} />
          )}
        </button>

        {/* Divider */}
        <div className={`w-8 h-px my-0.5 ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

        {NAV_ITEMS.map(item => {
          const hasAccess = !item.requiredRoles || canAccess(item.id);
          const isActive  = activeTab === item.id;

          if (!hasAccess) {
            return <LockedNavItem key={item.id} item={item} darkMode={darkMode} inactiveClass={inactCls} />;
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              style={isActive ? activeStyle(item.accent) : {}}
              className={`
                w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl
                transition-all duration-150
                ${isActive ? '' : inactCls}
              `}
            >
              <item.icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.01em', lineHeight: 1 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Bottom: settings + avatar ──────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {isAdminOrAbove ? (
          <button
            title="병원 설정"
            onClick={() => onTabChange('settings')}
            style={activeTab === 'settings'
              ? { background: '#18181b', border: '1px solid #3f3f46', color: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.2)' }
              : {}
            }
            className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 ${activeTab === 'settings' ? '' : inactCls}`}
          >
            <Settings size={17} strokeWidth={activeTab === 'settings' ? 2.5 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: 500 }}>설정</span>
          </button>
        ) : (
          <div title="설정은 관리자 전용입니다" className={`w-full flex flex-col items-center gap-1 py-2 px-1 rounded-xl opacity-30 cursor-not-allowed ${inactCls}`}>
            <Shield size={15} strokeWidth={1.5} />
            <span style={{ fontSize: 8 }}>설정</span>
          </div>
        )}

        {session && (
          <div className="flex flex-col items-center gap-1 mt-1">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-[11px] font-bold shadow cursor-pointer ring-2 ${darkMode ? 'ring-zinc-900' : 'ring-white'}`}
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
