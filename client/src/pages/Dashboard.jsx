import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import PatientContextPanel from '../components/chat/PatientContextPanel';
import AftercareTab from '../components/aftercare/AftercareTab';
import StatsTab from '../components/stats/StatsTab';
import PatientsTab from '../components/patients/PatientsTab';
import SettingsTab from '../components/settings/SettingsTab';
import ProceduresTab from '../components/procedures/ProceduresTab';
import TikiPasteTab from '../components/magic/TikiPasteTab';
import { conversations as initialConversations } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, LogOut, ChevronDown, User, Sun, Moon, Settings
} from 'lucide-react';

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ session, onLogout, darkMode, onToggleDark, onOpenSettings }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div className={`h-10 border-b flex items-center justify-between px-4 shrink-0 z-10 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2.5 ml-1">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-[0_0_6px_rgba(168,85,247,0.4)]">
          <MessageSquare size={10} className="text-white" fill="white" />
        </div>
        <span className={`text-xs font-semibold ${darkMode ? 'text-zinc-200' : 'text-slate-800'}`}>{session.clinic.name}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${session.clinic.planColor}`}>{session.clinic.plan}</span>
        <span className={`text-[10px] hidden sm:block ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{session.clinic.location}</span>
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

// ── Patient Context Banner (shown in chat when arriving from patients view) ───
function PatientContextBanner({ fromPatient, onBack, darkMode }) {
  if (!fromPatient) return null;
  return (
    <div className={`flex items-center justify-between px-5 py-2.5 border-b shrink-0 ${darkMode ? 'bg-blue-950/60 border-blue-900' : 'bg-blue-50 border-blue-100'}`}
      style={{ animation: 'slideUp 0.2s ease-out' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-base">{fromPatient.flag}</span>
        <div>
          <p className={`text-xs font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
            {fromPatient.name}님과의 상담
          </p>
          <p className={`text-[10px] ${darkMode ? 'text-blue-500' : 'text-blue-500'}`}>
            환자 관리에서 이동했습니다
          </p>
        </div>
      </div>
      <button onClick={onBack}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all
          ${darkMode ? 'bg-blue-900 text-blue-300 hover:bg-blue-800 border border-blue-800' : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm'}`}>
        ← 환자 관리로 돌아가기
      </button>
    </div>
  );
}

// ── Staff Management placeholder ─────────────────────────────────────────────
function StaffMgmtTab({ darkMode }) {
  const items = [
    { name: '김지연', role: '실장',        email: 'jiyeon@libhib.com',    status: '활성' },
    { name: '박소희', role: '코디네이터',  email: 'sohee@libhib.com',     status: '활성' },
    { name: '최민준', role: '상담실장',    email: 'minjun@libhib.com',    status: '활성' },
    { name: '이유나', role: '직원',        email: 'yuna@libhib.com',      status: '비활성' },
  ];
  const card = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const th   = darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-50 text-slate-500';
  const td   = darkMode ? 'border-zinc-800 text-zinc-300' : 'border-slate-100 text-slate-700';
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className={`text-base font-extrabold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>직원 관리</h2>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>클리닉에 등록된 직원 계정을 관리합니다</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-xs font-semibold shadow-sm hover:from-purple-500 hover:to-fuchsia-400 transition-all">
          + 직원 초대
        </button>
      </div>
      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-[11px] uppercase tracking-wide font-semibold border-b ${th} ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
              <th className="px-5 py-3 text-left">이름</th>
              <th className="px-5 py-3 text-left">역할</th>
              <th className="px-5 py-3 text-left hidden md:table-cell">이메일</th>
              <th className="px-5 py-3 text-left">상태</th>
              <th className="px-5 py-3 text-center">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => (
              <tr key={i} className={`border-b last:border-0 ${td} ${darkMode ? 'border-zinc-800 hover:bg-zinc-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border
                    ${s.role === '실장' || s.role === '상담실장'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {s.role}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-xs hidden md:table-cell ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{s.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border
                    ${s.status === '활성' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition-colors
                    ${darkMode ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    편집
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Notice */}
      <div className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border ${darkMode ? 'bg-amber-900/20 border-amber-800/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        <span className="text-sm">⚠️</span>
        <p className="text-xs font-medium">직원 초대 및 권한 변경은 Supabase Auth 연동 후 활성화됩니다.</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { session, logout, role, canAccess, authReady } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Tab state — synced with URL param ?tab=xxx ────────────────────────────
  const activeTab = searchParams.get('tab') || 'tiki_paste';
  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      // Clear cross-tab params when switching manually
      if (tab !== 'chat') { p.delete('pid'); p.delete('pname'); p.delete('pflag'); }
      if (tab !== 'patients') { p.delete('openPid'); }
      // tiki_paste는 별도 파라미터 없음
      return p;
    });
  };

  // ── openPid: 상담 → 환자 역방향 이동 시 Drawer 자동 오픈 ──────────────────
  // Dashboard가 React Router의 searchParams에서 직접 읽어 prop으로 내려줌
  // → PatientsTab 내부의 useSearchParams / window.location 충돌 완전 차단
  const openPid = searchParams.get('openPid') || '';

  // PatientsTab이 Drawer를 열면 이 callback 호출 → URL에서 openPid 제거
  // (React Router의 setSearchParams 사용 → window.history와 충돌 없음)
  const handleDrawerOpened = useCallback(() => {
    if (!searchParams.has('openPid')) return;
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.delete('openPid');
      return p;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── Patient context — set when navigating from patients → chat ────────────
  const [fromPatient, setFromPatient] = useState(null);

  const [darkMode, setDarkMode] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState(initialConversations[0].id);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  // ── React to URL params (patient deep-link into chat) ─────────────────────
  useEffect(() => {
    const pid   = searchParams.get('pid');
    const pname = searchParams.get('pname');
    const pflag = searchParams.get('pflag');
    const tab   = searchParams.get('tab');

    if (tab === 'chat' && pname) {
      const decoded = decodeURIComponent(pname);
      const decodedFlag = decodeURIComponent(pflag || '');
      setFromPatient({ id: pid, name: decoded, flag: decodedFlag });

      // Try to find matching conversation by patient name (case-insensitive)
      const match = conversations.find(c =>
        c.patient.name.toLowerCase() === decoded.toLowerCase() ||
        c.patient.nameKo?.toLowerCase() === decoded.toLowerCase()
      );
      if (match) setSelectedConvId(match.id);
    } else if (tab !== 'chat') {
      // Clear fromPatient banner when leaving chat tab
      setFromPatient(null);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConvUpdate = (convId, updates) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, ...updates } : c));
  };

  const handleNewConversation = (newConv) => {
    setConversations(prev => [newConv, ...prev]);
    setSelectedConvId(newConv.id);
    setActiveTab('chat');
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // "← 환자 관리로 돌아가기" — navigate back to patients tab with drawer open
  const handleBackToPatients = () => {
    const pid = searchParams.get('pid');
    setFromPatient(null);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', 'patients');
      if (pid) p.set('openPid', pid);
      p.delete('pid'); p.delete('pname'); p.delete('pflag');
      return p;
    });
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

          {/* ── 상담 관리 ── */}
          {activeTab === 'chat' && (
            <>
              <ChatList
                conversations={conversations}
                selectedId={selectedConvId}
                onSelect={setSelectedConvId}
                onNewConversation={handleNewConversation}
                darkMode={darkMode}
              />
              {selectedConv ? (
                <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
                  {/* Patient context banner — appears when coming from patients view */}
                  <PatientContextBanner
                    fromPatient={fromPatient}
                    onBack={handleBackToPatients}
                    darkMode={darkMode}
                  />
                  <div className="flex flex-1 min-w-0 overflow-hidden">
                    <ChatWindow
                      key={selectedConv.id}
                      conv={selectedConv}
                      onConvUpdate={handleConvUpdate}
                      darkMode={darkMode}
                    />
                    <PatientContextPanel conv={selectedConv} darkMode={darkMode} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
                  <PatientContextBanner
                    fromPatient={fromPatient}
                    onBack={handleBackToPatients}
                    darkMode={darkMode}
                  />
                  <EmptyState darkMode={darkMode} />
                </div>
              )}
            </>
          )}

          {/* ── Tiki Paste ── */}
          {activeTab === 'tiki_paste' && (
            <TikiPasteTab darkMode={darkMode} />
          )}

          {/* ── 환자 관리 ── */}
          {activeTab === 'patients' && (
            <PatientsTab
              darkMode={darkMode}
              openPid={openPid}
              onDrawerOpened={handleDrawerOpened}
            />
          )}

          {/* ── 애프터케어 ── */}
          {activeTab === 'aftercare' && <AftercareTab darkMode={darkMode} />}

          {/* ── 통계 (owner/admin 전용) ── */}
          {activeTab === 'stats' && (
            canAccess('stats')
              ? <StatsTab darkMode={darkMode} />
              : <AccessDenied feature="통계 대시보드" darkMode={darkMode} />
          )}

          {/* ── 시술 관리 (owner/admin 전용) ── */}
          {activeTab === 'procedures' && (
            canAccess('procedures')
              ? <ProceduresTab darkMode={darkMode} />
              : <AccessDenied feature="시술 관리" darkMode={darkMode} />
          )}

          {/* ── 직원 관리 (owner/admin 전용) ── */}
          {activeTab === 'staff_mgmt' && (
            canAccess('staff_mgmt')
              ? <StaffMgmtTab darkMode={darkMode} />
              : <AccessDenied feature="직원 관리" darkMode={darkMode} />
          )}

          {/* ── 설정 (owner/admin 전용) ── */}
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

function EmptyState({ darkMode }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
        <MessageSquare size={28} strokeWidth={1.5} />
      </div>
      <p className={`text-sm font-medium ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>상담을 선택하세요</p>
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
