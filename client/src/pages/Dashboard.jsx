import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import StatsTab from '../components/stats/StatsTab';
import SettingsTab from '../components/settings/SettingsTab';
import ProceduresTab from '../components/procedures/ProceduresTab';
import TikiPasteTab from '../components/magic/TikiPasteTab';
import InsightsTab from '../components/insights/InsightsTab';
import ProtocolTab from '../components/protocol/ProtocolTab';
import MyTikiTab from '../components/mytiki/MyTikiTab';
import { useAuth } from '../context/AuthContext';
import {
  Layers, LogOut, ChevronDown, User, Sun, Moon, Settings, MapPin
} from 'lucide-react';

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ session, onLogout, darkMode, onToggleDark, onOpenSettings }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div
      className={`h-[82px] border-b flex items-center justify-between px-8 shrink-0 z-10 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white'}`}
      style={{
        fontFamily: "'Pretendard Variable', 'Inter', system-ui, sans-serif",
        borderColor: darkMode ? undefined : 'var(--td-border)',
        boxShadow: darkMode ? 'none' : '0 10px 28px rgba(33, 24, 21, 0.035)',
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--td-primary)', boxShadow: '0 12px 28px rgba(164,120,100,0.22)' }}>
          <Layers size={24} color="#fff" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[23px] leading-none font-black tracking-[-0.04em] truncate ${darkMode ? 'text-zinc-100' : 'text-[#211815]'}`}>{session.clinic.name}</span>
            <span className="td-badge td-badge-brand shrink-0">{session.clinic.plan}</span>
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-[14px] font-bold ${darkMode ? 'text-zinc-400' : 'text-[#6F5D55]'}`}>
            <MapPin size={15} />
            <span className="truncate">{session.clinic.location}</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <button onClick={() => setShowMenu(v => !v)}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-colors ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-[#F8F6F3]'}`}>
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-[15px] font-black`}>
            {session.staff.initials}
          </div>
          <div className="hidden sm:block text-left">
            <span className={`block text-[15px] leading-none font-black ${darkMode ? 'text-zinc-200' : 'text-[#211815]'}`}>{session.staff.name}</span>
            <span className={`block text-[13px] mt-1.5 font-bold ${darkMode ? 'text-zinc-500' : 'text-[#9A8880]'}`}>{session.staff.role}</span>
          </div>
          <ChevronDown size={16} className={darkMode ? 'text-zinc-500' : 'text-slate-400'} />
        </button>

        {showMenu && (
          <div className={`absolute right-0 top-full mt-2 rounded-xl shadow-xl border py-2 w-56 z-50 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => { setShowMenu(false); setShowProfileModal(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-[#6F5D55] hover:bg-[#F8F6F3]'}`}>
              <User size={16} className="text-slate-500" /> 내 정보 수정
            </button>
            <button onClick={() => { onToggleDark(); setShowMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-[#6F5D55] hover:bg-[#F8F6F3]'}`}>
              {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-500" />}
              {darkMode ? '라이트 모드' : '다크 모드'}
            </button>
            <button onClick={() => { setShowMenu(false); onOpenSettings(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-700' : 'text-[#6F5D55] hover:bg-[#F8F6F3]'}`}>
              <Settings size={16} className="text-slate-500" /> 설정
            </button>
            <div className={`my-1 border-t ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`} />
            <button onClick={() => { setShowMenu(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={16} /> 로그아웃
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
          <h3 className={`text-[16px] font-bold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>내 정보 수정</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex justify-center mb-2">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
              {session.staff.initials}
            </div>
          </div>
          <div>
            <label className={`block text-[12px] font-bold mb-1.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>이름</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className={`w-full px-4 py-3 text-[15px] font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D8C0B4] ${darkMode ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-[#F8F6F3] border-[#E7DDD7] text-[#211815]'}`} />
          </div>
          <div>
            <label className={`block text-[12px] font-bold mb-1.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>직책</label>
            <input value={role} onChange={e => setRole(e.target.value)}
              className={`w-full px-4 py-3 text-[15px] font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D8C0B4] ${darkMode ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-[#F8F6F3] border-[#E7DDD7] text-[#211815]'}`} />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>취소</button>
          <button onClick={onClose} className="td-btn td-btn-primary">저장</button>
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

  // Normalize legacy tab IDs → current IDs
  const rawTab   = searchParams.get('tab') || 'my_tiki';
  const activeTab = rawTab === 'stats' ? 'analytics' : rawTab === 'insights' ? 'tiki_memory' : rawTab === 'tiki_talk' ? 'my_tiki' : rawTab;
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

  const bg = darkMode ? 'bg-zinc-950' : 'td-page';

  return (
    <div className={`flex flex-col ${bg} overflow-hidden`} style={{ height: '100dvh', minHeight: 0 }}>
      <TopBar
        session={session}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
        onOpenSettings={() => setActiveTab('settings')}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} />

        <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden">

          {/* ── 티키 Paste ── */}
          {activeTab === 'tiki_paste' && <TikiPasteTab darkMode={darkMode} />}

          {/* ── 통계 (analytics) ── */}
          {activeTab === 'analytics' && (
            canAccess('analytics')
              ? <StatsTab darkMode={darkMode} />
              : <AccessDenied feature="통계 대시보드" darkMode={darkMode} />
          )}

          {/* ── 시술 관리 ── */}
          {activeTab === 'procedures' && (
            canAccess('procedures')
              ? <ProceduresTab darkMode={darkMode} />
              : <AccessDenied feature="시술 관리" darkMode={darkMode} />
          )}

          {/* ── Tiki Memory (구 insights) ── */}
          {activeTab === 'tiki_memory' && (
            canAccess('tiki_memory')
              ? <InsightsTab darkMode={darkMode} />
              : <AccessDenied feature="Tiki Memory" darkMode={darkMode} />
          )}

          {/* ── 프로토콜 라이브러리 ── */}
          {activeTab === 'protocol' && (
            canAccess('protocol')
              ? <ProtocolTab darkMode={darkMode} />
              : <AccessDenied feature="프로토콜 라이브러리" darkMode={darkMode} />
          )}

          {/* ── Tiki Desk (환자 운영 surface) ── */}
          {activeTab === 'my_tiki' && (
            canAccess('my_tiki')
              ? <MyTikiTab darkMode={darkMode} />
              : <AccessDenied feature="Tiki Desk" darkMode={darkMode} />
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
