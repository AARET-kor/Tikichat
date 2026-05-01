/**
 * Sidebar.jsx — 병원/직원용 메인 내비게이션
 *
 * 상단 2개: 티키 Paste | 티키 Room (외부 탭)
 * 중단:     티키 데스크 → 메모리 → 프로토콜 → 시술 관리 → 통계
 * 하단:     설정 + 사용자 정보
 *
 * 크기 기준: 아이콘 24-28px, 라벨 15-16px, 사이드바 폭 208px
 */

import { BarChart3, Settings, Shield, Stethoscope, Sparkles, Brain,
  BookOpen, Monitor, Users, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const MOCHA = '#0145F2';   // signature identity
const MOCHA_DARK = '#10367D';
const MOCHA_SOFT = '#BBE1FA';
const SURFACE = '#EDF1F5';
const BORDER = '#D6E1EA';
const TEXT = '#1B262C';
const TEXT_SECONDARY = '#40515D';
const TEXT_MUTED = '#6B7C88';
const F     = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };

// ── 중단 내비 아이템 (순서 고정) ────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id:            'my_tiki',
    icon:          Users,
    label:         '티키 데스크',
    sublabel:      '운영 현황',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
  {
    id:            'tiki_memory',
    icon:          Brain,
    label:         '메모리',
    sublabel:      '지식 관리',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
  {
    id:            'protocol',
    icon:          BookOpen,
    label:         '프로토콜',
    sublabel:      '응대 가이드',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
  {
    id:            'procedures',
    icon:          Stethoscope,
    label:         '시술 관리',
    sublabel:      '항목·가격',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
  {
    id:            'analytics',
    icon:          BarChart3,
    label:         '통계',
    sublabel:      '분석',
    requiredRoles: ['owner', 'admin'],
    accent:        MOCHA,
  },
];

// ── 역할 뱃지 ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  if (!role) return null;
  const m = {
    owner: { label: '원장',   bg: '#EDF1F5', text: MOCHA_DARK },
    admin: { label: '관리자', bg: '#EDF1F5', text: MOCHA_DARK },
    staff: { label: '직원',   bg: SURFACE,  text: TEXT_SECONDARY },
  }[role] || { label: role, bg: SURFACE, text: TEXT_SECONDARY };

  return (
    <div style={{
      padding: '4px 9px', borderRadius: 999,
      background: m.bg, color: m.text,
      fontSize: 12, fontWeight: 850,
    }}>
      {m.label}
    </div>
  );
}

// ── 잠긴 메뉴 ─────────────────────────────────────────────────────────────────
function LockedItem({ item, darkMode }) {
  return (
    <div
      title={`${item.label} — 원장·관리자 전용`}
      style={{ opacity: 0.28, cursor: 'not-allowed' }}
      className="relative w-full"
    >
      <div style={{ padding: '13px 12px', width: '100%', display: 'flex', alignItems: 'center', gap: 11, borderRadius: 16 }}>
        <item.icon size={24} strokeWidth={1.8} color={darkMode ? '#71717A' : '#A1A1AA'} />
        <div>
          <span style={{ fontSize: 15, fontWeight: 850, color: darkMode ? '#71717A' : '#A1A1AA', lineHeight: 1.1 }}>{item.label}</span>
          <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#52525B' : '#A1A1AA', marginTop: 4 }}>{item.sublabel}</div>
        </div>
      </div>
      <span style={{ position: 'absolute', top: 13, right: 12, fontSize: 11 }}>🔒</span>
    </div>
  );
}

function NavButton({ item, isActive, darkMode, onClick }) {
  const Icon = item.icon;
  const mutedTxt = darkMode ? '#D4D4D8' : TEXT_SECONDARY;
  const mutedSub = darkMode ? '#A1A1AA' : TEXT_MUTED;

  return (
    <button
      onClick={onClick}
      title={`${item.label} · ${item.sublabel}`}
      style={{
        width: '100%',
        minHeight: 68,
        padding: '12px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        border: `1px solid ${isActive ? MOCHA_SOFT : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderRadius: 18,
        background: isActive ? '#E6F0FF' : 'transparent',
        color: isActive ? MOCHA_DARK : mutedTxt,
        boxShadow: isActive ? '0 12px 28px rgba(33, 24, 21, 0.06)' : 'none',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = darkMode ? '#27272A' : SURFACE;
          e.currentTarget.style.color = item.accent;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = mutedTxt;
        }
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? '#FFFFFF' : '#E6F0FF',
          flexShrink: 0,
        }}
      >
        <Icon size={25} strokeWidth={isActive ? 2.5 : 2.1} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 920, lineHeight: 1.12, color: isActive ? MOCHA_DARK : undefined }}>
          {item.label}
        </span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 750, lineHeight: 1.15, marginTop: 5, color: isActive ? TEXT_SECONDARY : mutedSub }}>
          {item.sublabel}
        </span>
      </span>
    </button>
  );
}

// ── 메인 Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ activeTab, onTabChange, darkMode }) {
  const { session, role, canAccess } = useAuth();

  const bg      = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white';
  const mutedTxt = darkMode ? '#A1A1AA' : TEXT_MUTED;

  function btnStyle(isActive, accent) {
    if (isActive) return {
      background: '#E6F0FF',
      border: `1px solid ${MOCHA_SOFT}`,
      borderRadius: 18,
      color: MOCHA_DARK,
      boxShadow: '0 12px 28px rgba(33, 24, 21, 0.06)',
    };
    return {
      background: darkMode ? `${accent}12` : '#FFFFFF',
      border: `1px solid ${BORDER}`,
      borderRadius: 18,
      color: MOCHA_DARK,
    };
  }

  const isAdminOrAbove = !role || role === 'owner' || role === 'admin';

  return (
    <aside
      className={`flex flex-col ${bg} border-r shrink-0`}
      style={{ width: 208, fontFamily: F.sans, padding: '20px 14px 16px', gap: 0, borderColor: darkMode ? undefined : BORDER }}
    >
      {/* ── 로고 ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 18,
          background: MOCHA,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 18px ${MOCHA}30`,
          flexShrink: 0,
        }}>
          <Layers size={25} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 950, lineHeight: 1.05, color: darkMode ? '#FAFAFA' : TEXT }}>TikiDoc</div>
          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1, marginTop: 5, color: darkMode ? '#A1A1AA' : TEXT_SECONDARY }}>병원 운영</div>
        </div>
      </div>

      {/* ── 상단: Tiki Paste + Tiki Room ──────────────────────────────────── */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Tiki Paste */}
        <button
          onClick={() => onTabChange('tiki_paste')}
          title="Tiki Paste — 문의 복붙 즉시 AI 답변 3종"
          style={{
            width: '100%', minHeight: 68, padding: '12px 13px',
            display: 'flex', alignItems: 'center', gap: 11,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            ...btnStyle(activeTab === 'tiki_paste', MOCHA),
          }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeTab === 'tiki_paste' ? '#fff' : '#E6F0FF' }}>
            <Sparkles size={25} strokeWidth={activeTab === 'tiki_paste' ? 2.5 : 2.1} />
          </span>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 920, lineHeight: 1.1 }}>Tiki Paste</span>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 750, opacity: activeTab === 'tiki_paste' ? 0.82 : 0.72, marginTop: 5 }}>문의 답변</span>
          </span>
        </button>

        {/* Tiki Room */}
        <button
          onClick={() => window.open('/room', '_blank')}
          title="Tiki Room — 진료실 AI 어시스턴트 (새 탭)"
          style={{
            width: '100%', minHeight: 68, padding: '12px 13px',
            display: 'flex', alignItems: 'center', gap: 11,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            position: 'relative',
            ...btnStyle(false, MOCHA),
          }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E6F0FF' }}>
            <Monitor size={25} strokeWidth={2.1} />
          </span>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 920, lineHeight: 1.1 }}>Tiki Room</span>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 750, opacity: 0.72, marginTop: 5 }}>진료실 화면</span>
          </span>
          {/* 외부 링크 표시 */}
          <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 12, opacity: 0.55, color: MOCHA_DARK }}>↗</span>
        </button>

      </div>

      {/* ── 구분선 ──────────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', height: 1,
        background: darkMode ? '#3F3F46' : BORDER,
        margin: '14px 0',
        flexShrink: 0,
      }} />

      {/* ── 중단 내비 ───────────────────────────────────────────────────────── */}
      <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const hasAccess = !item.requiredRoles || canAccess(item.id);
          const isActive  = activeTab === item.id;

          if (!hasAccess) return <LockedItem key={item.id} item={item} darkMode={darkMode} />;

          return (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive}
              darkMode={darkMode}
              onClick={() => onTabChange(item.id)}
            />
          );
        })}
      </nav>

      {/* ── 하단: 설정 + 아바타 ───────────────────────────────────────────── */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {isAdminOrAbove ? (
          <button
            title="설정"
            onClick={() => onTabChange('settings')}
            style={{
              width: '100%', minHeight: 64, padding: '12px 13px',
              display: 'flex', alignItems: 'center', gap: 11,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              ...(activeTab === 'settings' ? btnStyle(true, MOCHA) : {
                borderRadius: 18, background: 'transparent', color: mutedTxt,
              }),
            }}
            onMouseEnter={e => { if (activeTab !== 'settings') { e.currentTarget.style.background = darkMode ? '#27272A' : SURFACE; e.currentTarget.style.color = MOCHA_DARK; } }}
            onMouseLeave={e => { if (activeTab !== 'settings') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedTxt; } }}
          >
            <span style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeTab === 'settings' ? '#fff' : '#E6F0FF' }}>
              <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.4 : 2.1} color={activeTab === 'settings' ? MOCHA_DARK : undefined} />
            </span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 920, lineHeight: 1.1, color: activeTab === 'settings' ? MOCHA_DARK : undefined }}>설정</span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 750, marginTop: 5, color: activeTab === 'settings' ? TEXT_SECONDARY : darkMode ? '#71717A' : TEXT_MUTED }}>운영 환경</span>
            </span>
          </button>
        ) : (
          <div title="설정은 관리자 전용" style={{ opacity: 0.3, cursor: 'not-allowed', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} strokeWidth={1.8} color={mutedTxt} />
            <span style={{ fontSize: 14, fontWeight: 800, color: mutedTxt }}>설정</span>
          </div>
        )}

        {/* 아바타 */}
        {session && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px',
              borderRadius: 18,
              background: darkMode ? '#18181B' : SURFACE,
              border: `1px solid ${darkMode ? '#27272A' : BORDER}`,
            }}
          >
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white font-bold shadow-sm cursor-pointer shrink-0`}
              style={{ fontSize: 14 }}
              title={`${session.staff.name} · ${session.staff.role}`}
            >
              {session.staff.initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.1, color: darkMode ? '#FAFAFA' : TEXT }} className="truncate">
                {session.staff.name}
              </div>
              <div style={{ marginTop: 5 }}>
                <RoleBadge role={role} />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
