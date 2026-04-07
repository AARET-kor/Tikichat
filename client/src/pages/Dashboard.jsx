import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import PatientContextPanel from '../components/chat/PatientContextPanel';
import AftercareTab from '../components/aftercare/AftercareTab';
import StatsTab from '../components/stats/StatsTab';
import { conversations as initialConversations } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, LogOut, ChevronDown } from 'lucide-react';

// ── Top bar with clinic info ─────────────────────────────────────────────────
function TopBar({ session, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
      {/* Clinic name + plan */}
      <div className="flex items-center gap-2.5 ml-1">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">B</span>
        </div>
        <span className="text-xs font-semibold text-slate-800">{session.clinic.name}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${session.clinic.planColor}`}>
          {session.clinic.plan}
        </span>
        <span className="text-[10px] text-slate-400">{session.clinic.location}</span>
      </div>

      {/* Staff info + logout */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${session.staff.avatarColor} flex items-center justify-center text-white text-[10px] font-bold`}>
            {session.staff.initials}
          </div>
          <span className="text-xs font-medium text-slate-700">{session.staff.name}</span>
          <span className="text-[10px] text-slate-400">{session.staff.role}</span>
          <ChevronDown size={11} className="text-slate-400" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-36 z-50 animate-fade-in">
            <button
              onClick={() => { setShowMenu(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={12} /> 로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('chat');
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState(initialConversations[0].id);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const handleConvUpdate = (convId, updates) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, ...updates } : c)
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top bar */}
      <TopBar session={session} onLogout={handleLogout} />

      {/* Main row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Icon Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <main className="flex flex-1 min-w-0 overflow-hidden">

          {/* ── 상담 관리: 3-column ── */}
          {activeTab === 'chat' && (
            <>
              <ChatList
                conversations={conversations}
                selectedId={selectedConvId}
                onSelect={setSelectedConvId}
              />
              {selectedConv ? (
                <>
                  <ChatWindow
                    key={selectedConv.id}
                    conv={selectedConv}
                    onConvUpdate={handleConvUpdate}
                  />
                  <PatientContextPanel conv={selectedConv} />
                </>
              ) : (
                <EmptyState />
              )}
            </>
          )}

          {/* ── 애프터케어 ── */}
          {activeTab === 'aftercare' && <AftercareTab />}

          {/* ── 통계 ── */}
          {activeTab === 'stats' && <StatsTab />}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <MessageSquare size={28} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-slate-500">상담을 선택하세요</p>
    </div>
  );
}
