import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Video, MoreHorizontal, X, PhoneOff, Mic, MicOff, Camera, CameraOff, Maximize2, UserSquare2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ReplyArea from './ReplyArea';
import ChannelBadge from './ChannelBadge';

const CHANNEL_LABEL = {
  instagram: 'Instagram DM',
  kakao: 'KakaoTalk',
  whatsapp: 'WhatsApp',
};

// ── Call Modal ────────────────────────────────────────────────────────────────
function CallModal({ type, patient, onClose }) {
  const [calling, setCalling] = useState(true);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Simulate connecting after 2s
    const t = setTimeout(() => setCalling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (calling) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [calling]);

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-80 bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-700">
        {/* Video feed area (mock) */}
        {type === 'video' && (
          <div className="relative h-44 bg-zinc-800 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {patient.initials}
            </div>
            {/* Self-view pip */}
            <div className="absolute bottom-3 right-3 w-14 h-20 bg-zinc-700 rounded-xl border-2 border-zinc-600 flex items-center justify-center">
              {camOff ? <CameraOff size={16} className="text-zinc-500" /> : <span className="text-[10px] text-zinc-400">나</span>}
            </div>
            <button className="absolute top-3 right-3 w-7 h-7 bg-zinc-700/80 rounded-full flex items-center justify-center hover:bg-zinc-600 transition-colors">
              <Maximize2 size={12} className="text-zinc-300" />
            </button>
          </div>
        )}

        {/* Info area */}
        <div className={`${type === 'video' ? 'py-4' : 'py-8'} px-6 flex flex-col items-center gap-3`}>
          {type !== 'video' && (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {patient.initials}
            </div>
          )}
          <div className="text-center">
            <p className="text-white font-semibold text-base">{patient.name}</p>
            <p className="text-zinc-400 text-xs mt-0.5">{patient.flag} {patient.langName}</p>
          </div>

          {calling ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-zinc-400 text-sm">{type === 'video' ? '영상통화' : '통화'} 연결 중...</span>
            </div>
          ) : (
            <span className="text-green-400 text-sm font-medium">{formatTime(seconds)}</span>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 mt-2">
            {/* Mute */}
            <button
              onClick={() => setMuted(v => !v)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* End call */}
            <button
              onClick={onClose}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg"
            >
              <PhoneOff size={22} />
            </button>

            {/* Camera (video only) */}
            {type === 'video' && (
              <button
                onClick={() => setCamOff(v => !v)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOff ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
              >
                {camOff ? <CameraOff size={18} /> : <Camera size={18} />}
              </button>
            )}

            {/* Placeholder for audio-only */}
            {type !== 'video' && <div className="w-12" />}
          </div>

          {!calling && (
            <p className="text-[10px] text-zinc-600 text-center mt-1">
              * WebRTC 실제 연결은 VoIP 서버 세팅 후 활성화됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ conv, onConvUpdate, darkMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState(conv.messages);
  const [callType, setCallType] = useState(null); // null | 'voice' | 'video'

  // URL에서 환자 ID를 읽어 환자 관리 탭으로 역방향 이동
  const fromPid  = searchParams.get('pid')  || '';  // 환자 ID (patients 탭에서 넘어온 경우)
  const fromName = searchParams.get('pname') ? decodeURIComponent(searchParams.get('pname')) : '';

  const handleGoToPatientChart = () => {
    if (fromPid) {
      // 환자 ID가 있으면 해당 Drawer 바로 오픈
      navigate(`/app?tab=patients&openPid=${encodeURIComponent(fromPid)}`);
    } else {
      // 직접 접근한 경우 환자 관리 탭으로만 이동
      navigate('/app?tab=patients');
    }
  };

  useEffect(() => {
    setMessages(conv.messages);
  }, [conv.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessageSent = (newMsg) => {
    const updated = [...messages, newMsg];
    setMessages(updated);
    onConvUpdate?.(conv.id, { messages: updated, status: 'replied' });
  };

  const headerBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const bodyBg = darkMode ? 'bg-zinc-950' : 'bg-slate-50';

  return (
    <div className={`flex flex-col flex-1 min-w-0 ${bodyBg}`}>
      {/* Chat header */}
      <div className={`${headerBg} border-b px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm`}>
        <div className="flex items-center gap-3 min-w-0">

          {/* ── 역방향 버튼: 환자 차트로 이동 ──────────────────────────── */}
          <button
            onClick={handleGoToPatientChart}
            title={fromName ? `${fromName}님의 전체 차트 보기` : '환자 관리로 이동'}
            className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all shrink-0
              ${darkMode
                ? 'bg-zinc-800 hover:bg-blue-900/40 text-zinc-500 hover:text-blue-400 border border-zinc-700 hover:border-blue-800'
                : 'bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200 hover:border-blue-200'
              }`}
          >
            <UserSquare2 size={14} className="transition-colors" />
            <span className={`text-[11px] font-semibold hidden sm:block transition-colors ${darkMode ? 'text-zinc-500 group-hover:text-blue-400' : 'text-slate-500 group-hover:text-blue-700'}`}>
              {fromName ? `${fromName}` : '환자 차트'}
            </span>
          </button>

          {/* ── 구분선 ── */}
          <div className={`w-px h-6 shrink-0 ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}/>

          {/* ── 환자 아바타 + 이름 ── */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className={`w-10 h-10 rounded-full ${conv.patient.color} flex items-center justify-center text-sm font-semibold`}>
                {conv.patient.initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5">
                <ChannelBadge channel={conv.channel} />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold truncate ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{conv.patient.name}</h3>
                <span className="text-base shrink-0">{conv.patient.flag}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                  {conv.patient.langName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{CHANNEL_LABEL[conv.channel]}</span>
                <span className={darkMode ? 'text-zinc-700' : 'text-slate-300'}>·</span>
                <span className={`text-xs font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{conv.procedureName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCallType('voice')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-green-400' : 'hover:bg-slate-100 text-slate-500 hover:text-green-600'}`}
            title="통화"
          >
            <Phone size={15} />
          </button>
          <button
            onClick={() => setCallType('video')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-purple-400' : 'hover:bg-slate-100 text-slate-500 hover:text-purple-600'}`}
            title="영상통화"
          >
            <Video size={15} />
          </button>
          <div className={`w-px h-5 ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'} mx-1`} />
          <button
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
            title="더보기"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 my-1">
          <div className={`flex-1 h-px ${darkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
          <span className={`text-[10px] font-medium whitespace-nowrap ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>오늘</span>
          <div className={`flex-1 h-px ${darkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
        </div>

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            patient={conv.patient}
            channel={conv.channel}
            darkMode={darkMode}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply area */}
      <ReplyArea conv={conv} onMessageSent={handleMessageSent} darkMode={darkMode} />

      {/* Call modal */}
      {callType && (
        <CallModal
          type={callType}
          patient={conv.patient}
          onClose={() => setCallType(null)}
        />
      )}
    </div>
  );
}
