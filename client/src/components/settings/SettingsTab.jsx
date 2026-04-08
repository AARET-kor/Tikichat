import { useState } from 'react';
import {
  Building2, Sparkles, Link2, FileText,
  Clock, Upload, Save, Check, RefreshCw,
  Instagram, MessageCircle, Phone, ChevronRight,
  Plus, Trash2, Edit3, X, ToggleLeft, ToggleRight,
  Sliders, AlignLeft, AlignJustify, Zap
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'general',   icon: Building2,   label: '일반' },
  { id: 'ai',        icon: Sparkles,    label: 'AI 튜닝' },
  { id: 'channels',  icon: Link2,       label: '채널 연동' },
  { id: 'templates', icon: FileText,    label: '템플릿 관리' },
];

const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSection({ darkMode }) {
  const [clinicName, setClinicName] = useState('TikiChat 클리닉');
  const [address, setAddress] = useState('서울특별시 강남구 압구정로 00길 00');
  const [phone, setPhone] = useState('+82-2-0000-0000');
  const [hours, setHours] = useState({
    월: { open: '09:00', close: '18:00', enabled: true },
    화: { open: '09:00', close: '18:00', enabled: true },
    수: { open: '09:00', close: '18:00', enabled: true },
    목: { open: '09:00', close: '18:00', enabled: true },
    금: { open: '09:00', close: '18:00', enabled: true },
    토: { open: '10:00', close: '15:00', enabled: true },
    일: { open: '09:00', close: '18:00', enabled: false },
  });
  const [autoReply, setAutoReply] = useState(true);
  const [autoReplyMsg, setAutoReplyMsg] = useState('안녕하세요! 현재 운영 시간이 아닙니다. 운영 시간(월-금 09:00-18:00)에 답변 드리겠습니다.');
  const [saved, setSaved] = useState(false);

  const card = darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200';
  const input = darkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const label = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Clinic info */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${text}`}>병원 기본 정보</h3>
        <div className="space-y-3">
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>병원명</label>
            <input value={clinicName} onChange={e => setClinicName(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
          </div>
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>주소</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
          </div>
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>대표 전화</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
          </div>

          {/* Logo upload */}
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${label}`}>로고 이미지</label>
            <div className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed ${darkMode ? 'border-zinc-600 bg-zinc-700/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${text}`}>clinic_logo.png</p>
                <p className={`text-[11px] ${label}`}>256×256px 권장 · PNG/JPG</p>
              </div>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                <Upload size={12} /> 변경
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operating hours */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${text}`}>운영 시간</h3>
        <div className="space-y-2">
          {DAYS_KO.map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className={`text-xs font-medium w-4 shrink-0 ${text}`}>{day}</span>
              <button onClick={() => setHours(h => ({ ...h, [day]: { ...h[day], enabled: !h[day].enabled } }))} className="shrink-0">
                {hours[day].enabled
                  ? <ToggleRight size={20} className="text-purple-500" />
                  : <ToggleLeft size={20} className={darkMode ? 'text-zinc-600' : 'text-slate-300'} />}
              </button>
              {hours[day].enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={hours[day].open}
                    onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], open: e.target.value } }))}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
                  <span className={`text-[11px] ${label}`}>~</span>
                  <input type="time" value={hours[day].close}
                    onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], close: e.target.value } }))}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
                </div>
              ) : (
                <span className={`text-xs ${label}`}>휴무</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Auto reply */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-sm font-semibold ${text}`}>영업시간 외 자동답변</h3>
            <p className={`text-[11px] mt-0.5 ${label}`}>운영 시간 외 메시지 수신 시 자동 발송</p>
          </div>
          <button onClick={() => setAutoReply(v => !v)}>
            {autoReply
              ? <ToggleRight size={24} className="text-purple-500" />
              : <ToggleLeft size={24} className={darkMode ? 'text-zinc-600' : 'text-slate-300'} />}
          </button>
        </div>
        {autoReply && (
          <textarea value={autoReplyMsg} onChange={e => setAutoReplyMsg(e.target.value)} rows={3}
            className={`w-full px-3 py-2.5 text-xs rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed ${input}`} />
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm
            ${saved
              ? 'bg-emerald-500 text-white'
              : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
            }`}>
          {saved ? <><Check size={15} /> 저장됨</> : <><Save size={15} /> 변경사항 저장</>}
        </button>
      </div>
    </div>
  );
}

// ── AI Tuning ─────────────────────────────────────────────────────────────────
function AISection({ darkMode }) {
  const [friendliness, setFriendliness] = useState(70);
  const [responseLength, setResponseLength] = useState(50);
  const [language, setLanguage] = useState('auto');
  const [emoji, setEmoji] = useState(true);
  const [signature, setSignature] = useState(true);
  const [signatureText, setSignatureText] = useState('감사합니다 😊\n— TikiChat 클리닉 상담팀');
  const [saved, setSaved] = useState(false);

  const card = darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200';
  const input = darkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const label = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-400';

  const friendlinessLabel = friendliness < 30 ? '공식적' : friendliness < 60 ? '균형' : friendliness < 85 ? '친근함' : '매우 친근함';
  const lengthLabel = responseLength < 30 ? '짧게' : responseLength < 60 ? '보통' : responseLength < 85 ? '상세히' : '매우 상세히';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-1 ${text}`}>AI 응답 스타일</h3>
        <p className={`text-[11px] mb-5 ${subText}`}>AI가 생성하는 메시지의 톤과 길이를 조정합니다</p>

        {/* Friendliness slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold ${text}`}>친근함 수준</label>
            <span className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">{friendlinessLabel}</span>
          </div>
          <input type="range" min={0} max={100} value={friendliness}
            onChange={e => setFriendliness(+e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500" />
          <div className={`flex justify-between text-[10px] mt-1 ${subText}`}>
            <span>공식적</span><span>친근함</span>
          </div>
        </div>

        {/* Response length slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold ${text}`}>응답 길이</label>
            <span className="text-xs font-bold text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded-full">{lengthLabel}</span>
          </div>
          <input type="range" min={0} max={100} value={responseLength}
            onChange={e => setResponseLength(+e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-fuchsia-500" />
          <div className={`flex justify-between text-[10px] mt-1 ${subText}`}>
            <span>간결하게</span><span>상세하게</span>
          </div>
        </div>

        {/* Language */}
        <div className="mb-5">
          <label className={`block text-xs font-semibold mb-2 ${text}`}>응답 언어</label>
          <div className="grid grid-cols-3 gap-2">
            {[['auto', '자동 감지'], ['ko', '한국어'], ['en', '영어']].map(([v, l]) => (
              <button key={v} onClick={() => setLanguage(v)}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${language === v ? 'bg-purple-50 border-purple-300 text-purple-700' : darkMode ? 'border-zinc-600 text-zinc-400 hover:border-zinc-500' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${text}`}>이모지 사용</p>
              <p className={`text-[11px] ${subText}`}>AI 응답에 이모지 포함</p>
            </div>
            <button onClick={() => setEmoji(v => !v)}>
              {emoji ? <ToggleRight size={22} className="text-purple-500" /> : <ToggleLeft size={22} className={darkMode ? 'text-zinc-600' : 'text-slate-300'} />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${text}`}>서명 자동 추가</p>
              <p className={`text-[11px] ${subText}`}>메시지 하단에 서명 삽입</p>
            </div>
            <button onClick={() => setSignature(v => !v)}>
              {signature ? <ToggleRight size={22} className="text-purple-500" /> : <ToggleLeft size={22} className={darkMode ? 'text-zinc-600' : 'text-slate-300'} />}
            </button>
          </div>
          {signature && (
            <textarea value={signatureText} onChange={e => setSignatureText(e.target.value)} rows={2}
              className={`w-full px-3 py-2 text-xs rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 ${input}`} />
          )}
        </div>
      </div>

      {/* AI preview */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-500" />
          <h3 className={`text-sm font-semibold ${text}`}>응답 미리보기</h3>
        </div>
        <div className={`rounded-xl p-3 text-xs leading-relaxed ${darkMode ? 'bg-zinc-700/50 text-zinc-300' : 'bg-slate-50 text-slate-600'}`}>
          {friendliness >= 60
            ? `안녕하세요${emoji ? ' 😊' : ''}! 보톡스 시술에 관심 가져주셔서 감사해요. 궁금하신 점 무엇이든 편하게 물어보세요!`
            : `안녕하세요. 보톡스 시술에 관심을 가져주셔서 감사합니다. 문의 사항이 있으시면 안내해 드리겠습니다.`}
          {signature && <span className={`block mt-2 text-[10px] ${subText} whitespace-pre-wrap`}>{signatureText}</span>}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm
            ${saved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'}`}>
          {saved ? <><Check size={15} /> 저장됨</> : <><Save size={15} /> 변경사항 저장</>}
        </button>
      </div>
    </div>
  );
}

// ── Channel Integration ───────────────────────────────────────────────────────
const CHANNEL_CONFIG = [
  {
    id: 'instagram',
    name: 'Instagram',
    desc: 'Instagram DM 자동 응답 · 팔로워 관리',
    color: 'from-pink-500 via-purple-500 to-orange-400',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    activeBg: 'bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400',
    icon: '📸',
    features: ['DM 수신 · 발신', '스토리 언급 감지', '팔로워 태그', '미디어 공유'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'WhatsApp Business API · 글로벌 고객 소통',
    color: 'from-green-500 to-emerald-400',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    activeBg: 'bg-gradient-to-r from-green-500 to-emerald-400',
    icon: '💬',
    features: ['메시지 송수신', '브로드캐스트', '미디어 전송', '읽음 확인'],
  },
  {
    id: 'kakao',
    name: 'KakaoTalk',
    desc: '카카오톡 채널 · 국내 고객 소통',
    color: 'from-yellow-400 to-amber-400',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    activeBg: 'bg-gradient-to-r from-yellow-400 to-amber-400',
    icon: '💛',
    features: ['채널 메시지', '알림톡 발송', '친구 관리', '스마트채팅'],
  },
];

function ChannelCard({ ch, darkMode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (connected) { setConnected(false); return; }
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setConnected(true); }, 1500);
  };

  const card = darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border p-5 ${card} ${connected ? `ring-2 ${darkMode ? 'ring-purple-500/40' : 'ring-purple-200'}` : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${ch.color} flex items-center justify-center text-xl shadow-sm`}>
            {ch.icon}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${text}`}>{ch.name}</h3>
            <p className={`text-[11px] mt-0.5 ${subText}`}>{ch.desc}</p>
          </div>
        </div>

        {connected && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 연결됨
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {ch.features.map(f => (
          <div key={f} className={`flex items-center gap-1.5 text-[11px] ${subText}`}>
            <Check size={10} className={connected ? 'text-emerald-500' : darkMode ? 'text-zinc-600' : 'text-slate-300'} />
            {f}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all
            ${connected
              ? `${darkMode ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`
              : `bg-gradient-to-r ${ch.color} text-white shadow-sm hover:opacity-90 disabled:opacity-60`
            }`}
        >
          {connecting ? (
            <span className="flex items-center justify-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" /> 연결 중...
            </span>
          ) : connected ? '연결 해제' : '연결하기'}
        </button>
        {connected && (
          <button className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${darkMode ? 'border-zinc-600 text-zinc-400 hover:bg-zinc-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            설정
          </button>
        )}
      </div>
    </div>
  );
}

function ChannelsSection({ darkMode }) {
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-purple-50/50 border-purple-100'}`}>
        <div className="flex items-start gap-2.5">
          <Link2 size={14} className="text-purple-500 mt-0.5 shrink-0" />
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
            각 채널을 연결하면 TikiChat에서 모든 메시지를 통합 관리할 수 있습니다.
            연결 시 해당 서비스의 공식 인증 페이지로 이동합니다.
          </p>
        </div>
      </div>
      {CHANNEL_CONFIG.map(ch => (
        <ChannelCard key={ch.id} ch={ch} darkMode={darkMode} />
      ))}
    </div>
  );
}

// ── Template Management ───────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    id: 't1',
    procedure: '보톡스',
    day: 'D+1',
    message: '안녕하세요! 보톡스 시술 후 하루가 지났네요 😊\n시술 부위에 멍이나 부기는 어떠신가요?\n혹시 불편하신 점이 있으시면 편하게 알려주세요!',
  },
  {
    id: 't2',
    procedure: '보톡스',
    day: 'D+3',
    message: '안녕하세요! 보톡스 시술 후 3일이 지났습니다.\n효과가 서서히 나타나고 계신가요? 😊\n궁금하신 점이 있으시면 언제든 연락 주세요!',
  },
  {
    id: 't3',
    procedure: '보톡스',
    day: 'D+7',
    message: '안녕하세요! 보톡스 효과가 본격적으로 나타날 시기입니다 ✨\n만족스러우신지요? 재내원 시 할인 이벤트도 있으니 확인해 보세요!',
  },
  {
    id: 't4',
    procedure: '필러',
    day: 'D+1',
    message: '안녕하세요! 필러 시술 후 하루가 지났습니다.\n붓기와 멍은 정상적인 반응으로 3-5일 내 회복됩니다.\n불편하신 점 있으시면 말씀해 주세요 😊',
  },
  {
    id: 't5',
    procedure: '필러',
    day: 'D+7',
    message: '안녕하세요! 필러 시술 후 일주일이 지났습니다.\n최종 결과가 안정화되는 시기입니다 ✨\n만족스러우신가요? 재방문 시 상담도 진행해 드립니다!',
  },
  {
    id: 't6',
    procedure: '레이저',
    day: 'D+1',
    message: '안녕하세요! 레이저 시술 후 하루가 지났습니다.\n자외선 차단제를 꼭 발라주시고, 세안 시 자극을 최소화해 주세요 ☀️',
  },
];

function TemplateEditor({ tpl, onSave, onCancel, darkMode }) {
  const [msg, setMsg] = useState(tpl.message);
  const input = darkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-700';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';

  return (
    <div className={`rounded-xl border p-4 ${darkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-purple-50 border-purple-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{tpl.procedure}</span>
        <span className={`text-xs font-medium ${text}`}>{tpl.day}</span>
      </div>
      <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
        className={`w-full px-3 py-2.5 text-xs rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed mb-3 ${input}`} />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-zinc-600 text-zinc-400 hover:bg-zinc-600' : 'border-slate-200 text-slate-500 hover:bg-white'}`}>취소</button>
        <button onClick={() => onSave(msg)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors">저장</button>
      </div>
    </div>
  );
}

function TemplatesSection({ darkMode }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingId, setEditingId] = useState(null);
  const [filterProc, setFilterProc] = useState('전체');

  const procedures = ['전체', ...new Set(templates.map(t => t.procedure))];
  const filtered = filterProc === '전체' ? templates : templates.filter(t => t.procedure === filterProc);

  const card = darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-500';

  const handleSave = (id, msg) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, message: msg } : t));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {procedures.map(p => (
          <button key={p} onClick={() => setFilterProc(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterProc === p ? 'bg-purple-50 border-purple-300 text-purple-700' : darkMode ? 'border-zinc-700 text-zinc-500 hover:border-zinc-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {filtered.map(tpl => (
          editingId === tpl.id ? (
            <TemplateEditor key={tpl.id} tpl={tpl} darkMode={darkMode}
              onSave={msg => handleSave(tpl.id, msg)}
              onCancel={() => setEditingId(null)} />
          ) : (
            <div key={tpl.id} className={`rounded-2xl border p-4 ${card}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{tpl.procedure}</span>
                  <span className={`text-xs font-semibold ${text}`}>{tpl.day}</span>
                </div>
                <button onClick={() => setEditingId(tpl.id)}
                  className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${subText} hover:text-purple-600`}>
                  <Edit3 size={11} /> 수정
                </button>
              </div>
              <p className={`text-xs leading-relaxed whitespace-pre-wrap ${subText}`}>{tpl.message}</p>
            </div>
          )
        ))}
      </div>

      {/* Add new */}
      <button className={`w-full py-3 rounded-2xl border-2 border-dashed text-xs font-medium transition-colors flex items-center justify-center gap-2
        ${darkMode ? 'border-zinc-700 text-zinc-600 hover:border-purple-500 hover:text-purple-400' : 'border-slate-200 text-slate-400 hover:border-purple-300 hover:text-purple-600'}`}>
        <Plus size={13} /> 새 템플릿 추가
      </button>
    </div>
  );
}

// ── Main SettingsTab ──────────────────────────────────────────────────────────
export default function SettingsTab({ darkMode }) {
  const [activeSection, setActiveSection] = useState('general');

  const bg = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const sidebarBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const text = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-500';
  const activeItem = darkMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-100';
  const inactiveItem = darkMode ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border-transparent' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent';

  const renderSection = () => {
    switch (activeSection) {
      case 'general':   return <GeneralSection darkMode={darkMode} />;
      case 'ai':        return <AISection darkMode={darkMode} />;
      case 'channels':  return <ChannelsSection darkMode={darkMode} />;
      case 'templates': return <TemplatesSection darkMode={darkMode} />;
      default:          return null;
    }
  };

  return (
    <div className={`flex flex-1 min-h-0 ${bg}`}>
      {/* Left sidebar */}
      <div className={`w-52 shrink-0 border-r ${sidebarBg} flex flex-col`}>
        <div className={`px-5 py-5 border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>설정</h2>
          <p className={`text-[11px] mt-0.5 ${subText}`}>병원 · AI · 채널 관리</p>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1">
          {MENU_ITEMS.map(({ id, icon: Icon, label }) => {
            const isActive = activeSection === id;
            return (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${isActive ? activeItem : inactiveItem}`}>
                <Icon size={14} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
                {isActive && <ChevronRight size={11} className="ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-8 py-7">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
