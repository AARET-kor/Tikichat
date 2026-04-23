import { BarChart3, Settings, Shield, Stethoscope, Sparkles, MessageSquare, Brain, MessageCircle, BookOpen, Monitor, Users } from 'lucide-react';

// ── Design tokens — Zinc base + selective accent colors ───────────────────────
const MOCHA  = '#A47764';   // Signature — Mocha Mousse / Tiki Paste / Tiki Memory
const SAGE   = '#5A8F80';   // Tiki Talk — Complementary sage
const GOLD   = '#D09262';   // Procedures — Warm gold
const AZURE  = '#5B72A8';   // Protocol Library — Muted indigo
const SLATE  = '#6E7BB8';   // Tiki Room — Muted purple-blue
const TEAL   = '#4E8FA0';   // Tiki Desk — Staff operations teal
const F      = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// 원장 전용 관제탑 — 티키 Paste · 시술 관리 · 통계 · 설정만 노출
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id:            'analytics',
    icon:          BarChart3,
    label:         '통계',
    requiredRoles: ['owner', 'admin'],
    accent:        SAGE,
  },
  {
    id:            'procedures',
    icon:          Stethoscope,
    label:         '시술 관리',
    requiredRoles: ['owner', 'admin'],
    accent:        GOLD,
  },
  {
    id:            'tiki_memory',
    icon:          Brain,
    label:         'Tiki Memory',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
  {
    id:            'protocol',
    icon:          BookOpen,
    label:         '프로토콜',
    requiredRoles: ['owner', 'admin'],
    accent:        AZURE,
  },
  {
    id:            'my_tiki',
    icon:          Users,
    label:         'Tiki Desk',
    requiredRoles: ['owner', 'admin'],
    accent:        TEAL,
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
        background: MOCHA,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        boxShadow: `0 4px 12px ${MOCHA}50`,
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
            ? { background: MOCHA, border: 'none', boxShadow: `0 4px 14px ${MOCHA}55`, color: '#fff' }
            : darkMode
              ? { background: `${MOCHA}10`, border: `1px solid ${MOCHA}25`, color: MOCHA }
              : { background: '#fff', border: `1px solid ${MOCHA}30`, color: MOCHA, boxShadow: `0 1px 5px ${MOCHA}15` }
          }
          className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 relative"
        >
          <Sparkles size={17} strokeWidth={activeTab === 'tiki_paste' ? 2.5 : 1.8} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1 }}>티키</span>
          {activeTab !== 'tiki_paste' && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: MOCHA }} />
          )}
        </button>

        {/* Tiki Talk — sage accent */}
        <button
          onClick={() => onTabChange('tiki_talk')}
          title="Tiki Talk — 실시간 진료실 통역"
          style={activeTab === 'tiki_talk'
            ? { background: SAGE, border: 'none', boxShadow: `0 4px 14px ${SAGE}55`, color: '#fff' }
            : darkMode
              ? { background: `${SAGE}10`, border: `1px solid ${SAGE}25`, color: SAGE }
              : { background: '#fff', border: `1px solid ${SAGE}30`, color: SAGE, boxShadow: `0 1px 5px ${SAGE}15` }
          }
          className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150"
        >
          <MessageCircle size={17} strokeWidth={activeTab === 'tiki_talk' ? 2.5 : 1.8} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1 }}>통역</span>
        </button>

        {/* Tiki Room — slate accent, opens in new tab */}
        <button
          onClick={() => window.open('/room', '_blank')}
          title="Tiki Room — 태블릿 AI 진료 보조"
          style={darkMode
            ? { background: `${SLATE}10`, border: `1px solid ${SLATE}25`, color: SLATE }
            : { background: '#fff', border: `1px solid ${SLATE}30`, color: SLATE, boxShadow: `0 1px 5px ${SLATE}15` }
          }
          className="w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 relative"
        >
          <Monitor size={17} strokeWidth={1.8} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1 }}>룸</span>
          {/* External link indicator */}
          <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 7, opacity: 0.5 }}>↗</span>
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
              ? activeStyle(MOCHA)
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
