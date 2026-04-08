import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import ChatListItem from './ChatListItem';

const TABS = [
  { id: 'all',      label: '전체' },
  { id: 'unread',   label: '미답변' },
  { id: 'replied',  label: '답변완료' },
];

const COUNTRIES = [
  { code: 'JP', flag: '🇯🇵', name: '일본', lang: 'ja', langName: '일본어' },
  { code: 'CN', flag: '🇨🇳', name: '중국', lang: 'zh', langName: '중국어' },
  { code: 'US', flag: '🇺🇸', name: '미국', lang: 'en', langName: '영어' },
  { code: 'SA', flag: '🇸🇦', name: '사우디', lang: 'ar', langName: '아랍어' },
  { code: 'TH', flag: '🇹🇭', name: '태국', lang: 'th', langName: '태국어' },
  { code: 'VN', flag: '🇻🇳', name: '베트남', lang: 'vi', langName: '베트남어' },
  { code: 'FR', flag: '🇫🇷', name: '프랑스', lang: 'fr', langName: '프랑스어' },
  { code: 'AU', flag: '🇦🇺', name: '호주', lang: 'en', langName: '영어' },
  { code: 'KR', flag: '🇰🇷', name: '한국', lang: 'ko', langName: '한국어' },
];

const CHANNELS = ['instagram', 'kakao', 'whatsapp'];
const PROCEDURES = ['보톡스', '필러', '리쥬란', '울쎄라', '써마지', '레이저 토닝', '스킨부스터', '실리프팅', '기타'];

function NewChatModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', country: 'JP', phone: '', procedure: '보톡스', channel: 'instagram',
  });
  const country = COUNTRIES.find(c => c.code === form.country) || COUNTRIES[0];

  const handleSave = () => {
    if (!form.name.trim()) return;
    const newConv = {
      id: `conv-${Date.now()}`,
      patient: {
        name: form.name,
        nameKo: form.name,
        flag: country.flag,
        lang: country.lang,
        langName: country.langName,
        initials: form.name.slice(0, 2).toUpperCase(),
        color: 'bg-violet-100 text-violet-700',
        visitCount: 1,
        phone: form.phone,
        tags: ['FIRST_VISIT'],
      },
      channel: form.channel,
      procedure: form.procedure.toLowerCase().replace(/ /g, '_'),
      procedureName: form.procedure,
      status: 'unread',
      unreadCount: 0,
      time: '방금',
      preview: '새 상담이 시작되었습니다.',
      timeline: [{ date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace('.', ''), type: 'inquiry', desc: `${form.procedure} 상담 시작 (${form.channel})` }],
      gallery: [],
      notes: '',
      aftercareSummary: { d1: 'pending', d3: 'pending', d7: 'pending' },
      messages: [],
    };
    onSave(newConv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">새 상담 등록</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">현장 방문 · 전화 예약 환자 차트 생성</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">이름 *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="환자 이름 (영문 또는 한글)"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder-slate-400"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">국가</label>
            <select
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.langName})</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">연락처</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+82-10-0000-0000"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-slate-400"
            />
          </div>

          {/* Procedure */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">관심 시술</label>
            <select
              value={form.procedure}
              onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {PROCEDURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">유입 채널</label>
            <div className="flex gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setForm(f => ({ ...f, channel: ch }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.channel === ch ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  {ch === 'instagram' ? '📸 Instagram' : ch === 'kakao' ? '💛 KakaoTalk' : '💬 WhatsApp'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장 후 채팅 시작 →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatList({ conversations, selectedId, onSelect, onNewConversation, darkMode }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const unreadCount = conversations.filter(c => c.status === 'unread').length;

  const filtered = conversations.filter(c => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'unread' && c.status === 'unread') ||
      (filter === 'replied' && c.status === 'replied');

    const matchSearch =
      !search ||
      c.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      c.procedureName.includes(search) ||
      c.preview.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  const bg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const inputBg = darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  return (
    <div className={`w-72 flex flex-col ${bg} border-r shrink-0`}>
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-sm font-semibold ${darkMode ? 'text-zinc-200' : 'text-slate-800'}`}>상담 목록</h2>
          <button
            onClick={() => setShowNewModal(true)}
            className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 flex items-center justify-center transition-colors shadow-[0_0_8px_rgba(168,85,247,0.3)]"
            title="새 상담 등록"
          >
            <Plus size={13} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 시술, 메시지 검색..."
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition ${inputBg}`}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className={`flex border-b px-3 pt-2 ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
        {TABS.map(tab => {
          const count = tab.id === 'unread' ? unreadCount : null;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t transition-colors
                ${isActive
                  ? `${darkMode ? 'text-purple-400 border-b-2 border-purple-500' : 'text-purple-700 border-b-2 border-purple-600'} -mb-px`
                  : `${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700'}`
                }
              `}
            >
              {tab.label}
              {count !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-32 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
            <p className="text-xs">해당 상담이 없습니다</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ChatListItem
              key={conv.id}
              conv={conv}
              isActive={selectedId === conv.id}
              onClick={() => onSelect(conv.id)}
              darkMode={darkMode}
            />
          ))
        )}
      </div>

      {showNewModal && (
        <NewChatModal
          onClose={() => setShowNewModal(false)}
          onSave={onNewConversation}
        />
      )}
    </div>
  );
}
