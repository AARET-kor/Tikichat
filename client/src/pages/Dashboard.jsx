import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import StatsTab from '../components/stats/StatsTab';
import SettingsTab from '../components/settings/SettingsTab';
import ProceduresTab from '../components/procedures/ProceduresTab';
import TikiPasteTab from '../components/magic/TikiPasteTab';
import InsightsTab from '../components/insights/InsightsTab';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, LogOut, ChevronDown, User, Sun, Moon, Settings
} from 'lucide-react';

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ session, onLogout, darkMode, onToggleDark, onOpenSettings }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div className={`h-10 border-b flex items-center justify-between px-4 shrink-0 z-10 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
      style={{ fontFamily: "'Pretendard Variable', 'Inter', system-ui, sans-serif" }}>
      <div className="flex items-center gap-2.5 ml-1">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#18181b', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
          <MessageSquare size={10} className="text-white" fill="white" />
        </div>
        <span className={`text-xs font-semibold ${darkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{session.clinic.name}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${session.clinic.planColor}`}>{session.clinic.plan}</span>
        <span className={`text-[10px] hidden sm:block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{session.clinic.location}</span>
      </div>

      <div className="relative">
        <button onClick={() => setShowMenu(v => !v)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'}`}>
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-[10px] font-bold`}>
            {session.staff.initials}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${darkMode ? 'text-zinc-300' : 'text-slate-700'}`}>{session.staff.name}</span>
          <ChevronDown size={11} className={darkMode ? 'text-zinc-500' : 'text-slate-400'} />
        </button>

        {showMenu && (
          <div className={`absolute right-0 top-full mt-1 rounded-xl shadow-xl border py-1 w-44 z-50 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => { setShowMenu(false); setShowProfileModal(true); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              <User size={12} className="text-purple-500" /> 내 정보 수정
            </button>
            <button onClick={() => { onToggleDark(); setShowMenu(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              {darkMode ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-slate-500" />}
              {darkMode ? '라이트 모드' : '다크 모드'}
            </button>
            <button onClick={() => { setShowMenu(false); onOpenSettings(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              <Settings size={12} className="text-slate-500" /> 설정
            </button>
            <div className={`my-1 border-t ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`} />
            <button onClick={() => { setShowMenu(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={12} /> 로그아웃
            </button>
          </div>
        )}
      </div>

      {showProfileModal && (
        <ProfileEditModal session={session} darkMode={darkMode} onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}

function ProfileEditModal({ session, darkMode, onClose }) {
  const [name, setName] = useState(session.staff.name);
  const [role, setRole] = useState(session.staff.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`}>
          <h3 className={`text-sm font-semibold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>내 정보 수정</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex justify-center mb-2">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
              {session.staff.initials}
            </div>
          </div>
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>이름</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${darkMode ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
          </div>
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>직책</label>
            <input value={role} onChange={e => setRole(e.target.value)}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${darkMode ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>취소</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 transition-all">저장</button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { session, logout, role, canAccess, authReady } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'tiki_paste';
  const setActiveTab = useCallback((tab) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
  }, [setSearchParams]);

  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const bg = darkMode ? 'bg-zinc-950' : 'bg-slate-50';

  return (
    <div className={`flex flex-col h-screen ${bg} overflow-hidden`}>
      <TopBar
        session={session}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
        onOpenSettings={() => setActiveTab('settings')}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} />

        <main className="flex flex-1 min-w-0 overflow-hidden">

          {/* ── 티키 Paste ── */}
          {activeTab === 'tiki_paste' && <TikiPasteTab darkMode={darkMode} />}

          {/* ── 통계 ── */}
          {activeTab === 'stats' && (
            canAccess('stats')
              ? <StatsTab darkMode={darkMode} />
              : <AccessDenied feature="통계 대시보드" darkMode={darkMode} />
          )}

          {/* ── 시술 관리 ── */}
          {activeTab === 'procedures' && (
            canAccess('procedures')
              ? <ProceduresTab darkMode={darkMode} />
              : <AccessDenied feature="시술 관리" darkMode={darkMode} />
          )}

          {/* ── VIP 인사이트 ── */}
          {activeTab === 'insights' && (
            canAccess('insights')
              ? <InsightsTab darkMode={darkMode} />
              : <AccessDenied feature="VIP 환자 인사이트" darkMode={darkMode} />
          )}

          {/* ── 설정 ── */}
          {activeTab === 'settings' && (
            canAccess('settings')
              ? <SettingsTab darkMode={darkMode} />
              : <AccessDenied feature="병원 설정" darkMode={darkMode} />
          )}

        </main>
      </div>
    </div>
  );
}

// ── 권한 없음 화면 ─────────────────────────────────────────────────────────────
function AccessDenied({ feature, darkMode }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl
        ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
        🔒
      </div>
      <div className="text-center">
        <p className={`text-sm font-bold ${darkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
          {feature}에 접근할 수 없습니다
        </p>
        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
          이 기능은 원장 또는 관리자 전용입니다
        </p>
      </div>
    </div>
  );
}
