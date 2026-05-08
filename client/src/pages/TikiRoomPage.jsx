import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Loader2,
  Mic,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
  Volume2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  buildRoomInteractionState,
  canAnalyzeRoomTranscript,
  getSpeechRecognitionConstructor,
  getSpeechSupport,
  getTtsSupport,
  mapRoomSpeechLang,
  resolveTtsVoice,
} from '../lib/roomVoice';

const C = {
  bg: '#EDF1F5',
  panel: '#FFFFFF',
  panelStrong: '#FFFFFF',
  border: 'rgba(16,54,125,0.14)',
  text: '#1B262C',
  textSub: '#40515D',
  textMute: '#6B7C88',
  mocha: '#0145F2',
  mochaSoft: '#E6F0FF',
  sage: '#3B6500',
  sageSoft: '#ECFFD1',
  amber: '#B5701A',
  amberSoft: '#FEF8EC',
  red: '#C04A3F',
  redSoft: '#FEF3F2',
  ink: '#1B262C',
  sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif",
};

const ROOM_STORAGE_KEY = 'tikidoc-room-id';

const LANG_LABELS = {
  ko: '한국어',
  en: 'English',
  ja: '일본어',
  zh: '중국어',
  ar: 'Arabic',
};

async function apiJson(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Staff session expired. Please sign in again.');
  }
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Staff session expired. Please sign in again.');
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function PrepChip({ label, value, tone = 'default' }) {
  const tones = {
    default: { bg: C.mochaSoft, color: C.mocha },
    safe: { bg: C.sageSoft, color: C.sage },
    warn: { bg: C.amberSoft, color: C.amber },
    risk: { bg: C.redSoft, color: C.red },
  };
  const meta = tones[tone] || tones.default;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMute }}>
        {label}
      </span>
      <div
        style={{
          borderRadius: 12,
          padding: '10px 12px',
          background: meta.bg,
          color: meta.color,
          fontSize: 12,
          fontWeight: 700,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1.45,
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function FormsPill({ done, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 700,
        background: done ? C.sageSoft : C.amberSoft,
        color: done ? C.sage : C.amber,
      }}
    >
      {done ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

function ResponseButton({ item, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(item)}
      style={{
        textAlign: 'left',
        borderRadius: 16,
        padding: '14px 16px',
        border: `1px solid ${selected ? C.mocha : C.border}`,
        background: selected ? C.mochaSoft : C.panelStrong,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: selected ? C.mocha : C.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {item.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: item.response_type === 'clinician_check' ? C.red : item.response_type === 'instruction' ? C.sage : C.textSub,
          }}
        >
          {item.response_type}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: C.text }}>
        {item.text}
      </div>
    </button>
  );
}

function PatientOverlay({ visible, text, lang, onClose }) {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,36,32,0.58)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(960px, 92vw)',
          minHeight: '48vh',
          borderRadius: 28,
          background: '#FFFDFB',
          boxShadow: '0 24px 72px rgba(44,36,32,0.24)',
          padding: '34px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: C.textMute, textTransform: 'uppercase' }}>
            Patient Display · {LANG_LABELS[lang] || lang}
          </div>
          <div style={{ marginTop: 22, fontSize: 36, lineHeight: 1.65, color: C.ink, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
            {text || '표시할 문구가 없습니다.'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.textSub,
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomHubMetric({ label, value, helper, tone = 'default' }) {
  const tones = {
    default: { bg: C.panelStrong, border: C.border, color: C.mocha },
    safe: { bg: '#FBFFF4', border: 'rgba(59,101,0,0.18)', color: C.sage },
    warn: { bg: '#FFFDF8', border: 'rgba(181,112,26,0.22)', color: C.amber },
    risk: { bg: '#FFF8F7', border: 'rgba(192,74,63,0.22)', color: C.red },
  };
  const meta = tones[tone] || tones.default;
  return (
    <div
      style={{
        borderRadius: 22,
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        padding: '18px 20px',
        boxShadow: '0 16px 36px rgba(16,54,125,0.05)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 850, color: C.textSub }}>{label}</div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 42, lineHeight: 0.95, fontWeight: 950, color: meta.color }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.textMute, paddingBottom: 4 }}>{helper}</span>
      </div>
    </div>
  );
}

function getRoomVisitName(visit) {
  return visit?.patients?.name || visit?.patient_name || '환자 정보 없음';
}

function getRoomVisitProcedure(visit) {
  return visit?.procedures?.name_ko || visit?.procedures?.name_en || visit?.procedure_name || '시술 정보 없음';
}

function RoomHubCard({ room, queueVisit, busy, onOpenFixed, onLoadNext, onClear }) {
  const occupied = room.occupancy_state === 'occupied';
  const currentVisit = room.current_visit;
  const tone = occupied
    ? { label: '사용 중', color: C.red, bg: C.redSoft, border: 'rgba(192,74,63,0.24)' }
    : queueVisit
      ? { label: '다음 후보 있음', color: C.mocha, bg: C.mochaSoft, border: 'rgba(1,69,242,0.24)' }
      : { label: '빈 방', color: C.sage, bg: C.sageSoft, border: 'rgba(59,101,0,0.22)' };

  return (
    <div
      className="room-hub-card"
      style={{
        borderRadius: 28,
        border: `1px solid ${tone.border}`,
        background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FBFF 100%)',
        padding: 22,
        minHeight: 255,
        boxShadow: '0 22px 48px rgba(16,54,125,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 850, color: C.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {room.room_type || 'procedure'}
          </div>
          <div style={{ marginTop: 5, fontSize: 24, lineHeight: 1.15, fontWeight: 950, color: C.text }}>
            {room.name}
          </div>
        </div>
        <span
          style={{
            borderRadius: 999,
            background: tone.bg,
            color: tone.color,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {tone.label}
        </span>
      </div>

      <div style={{ flex: 1, borderRadius: 20, background: '#F4F8FE', padding: 16 }}>
        {occupied ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textMute }}>현재 환자</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 950, color: C.text }}>
              {currentVisit?.patients?.flag || '🏥'} {getRoomVisitName(currentVisit)}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: C.textSub, fontWeight: 750 }}>{getRoomVisitProcedure(currentVisit)}</div>
          </>
        ) : queueVisit ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textMute }}>다음 후보</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 950, color: C.text }}>
              {queueVisit?.patients?.flag || '🏥'} {getRoomVisitName(queueVisit)}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: C.textSub, fontWeight: 750 }}>{getRoomVisitProcedure(queueVisit)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textMute }}>대기 상태</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 950, color: C.text }}>바로 배정 가능</div>
            <div style={{ marginTop: 8, fontSize: 14, color: C.textSub, fontWeight: 750 }}>룸 이동 가능한 환자가 생기면 여기서 바로 불러옵니다.</div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: occupied ? '1fr 1fr' : '1fr 1fr', gap: 10 }}>
        <button
          onClick={() => onOpenFixed(room.id)}
          style={{
            border: `1px solid ${C.border}`,
            background: C.panelStrong,
            color: C.text,
            borderRadius: 16,
            padding: '13px 12px',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          진료 화면 열기
        </button>
        {occupied ? (
          <button
            onClick={() => onClear(room.id)}
            disabled={busy}
            style={{
              border: 'none',
              background: C.red,
              color: '#fff',
              borderRadius: 16,
              padding: '13px 12px',
              fontSize: 13,
              fontWeight: 900,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.55 : 1,
            }}
          >
            방 비우기
          </button>
        ) : (
          <button
            onClick={() => onLoadNext(room.id)}
            disabled={busy}
            style={{
              border: 'none',
              background: C.mocha,
              color: '#fff',
              borderRadius: 16,
              padding: '13px 12px',
              fontSize: 13,
              fontWeight: 900,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.55 : 1,
              boxShadow: `0 14px 28px ${C.mocha}22`,
            }}
          >
            다음 환자 불러오기
          </button>
        )}
      </div>
    </div>
  );
}

function ReadyQueueCard({ visit, rooms, busy, onAssign }) {
  const freeRooms = (rooms || []).filter((room) => room.occupancy_state !== 'occupied');
  return (
    <div
      className="room-queue-card"
      style={{
        borderRadius: 22,
        border: `1px solid ${C.border}`,
        background: C.panelStrong,
        padding: 18,
        boxShadow: '0 14px 32px rgba(16,54,125,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 950, color: C.text }}>
            {visit?.patients?.flag || '🏥'} {getRoomVisitName(visit)}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 750, color: C.textSub }}>{getRoomVisitProcedure(visit)}</div>
        </div>
        <span style={{ height: 32, borderRadius: 999, padding: '8px 11px', background: C.sageSoft, color: C.sage, fontSize: 12, fontWeight: 900 }}>
          룸 이동 가능
        </span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {freeRooms.slice(0, 4).map((room) => (
          <button
            key={room.id}
            onClick={() => onAssign(visit.id, room.id)}
            disabled={busy}
            style={{
              border: `1px solid ${C.border}`,
              background: C.mochaSoft,
              color: C.mocha,
              borderRadius: 999,
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 900,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.55 : 1,
            }}
          >
            {room.name} 배정
          </button>
        ))}
        {freeRooms.length === 0 && (
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textMute }}>현재 빈 방이 없습니다.</span>
        )}
      </div>
    </div>
  );
}

export default function TikiRoomPage() {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('roomId') || params.get('room_id') || window.localStorage.getItem(ROOM_STORAGE_KEY) || '';
  });
  const [roomViewMode, setRoomViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'room' || params.get('roomId') || params.get('room_id') ? 'fixed' : 'hub';
  });
  const [boot, setBoot] = useState(null);
  const [hub, setHub] = useState({ rooms: [], room_ready_queue: [], room_summary: { total: 0, free: 0, occupied: 0, readyQueue: 0 } });
  const [loading, setLoading] = useState(true);
  const [hubLoading, setHubLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [toast, setToast] = useState('');
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [ttsState, setTtsState] = useState('idle');
  const [ttsMessage, setTtsMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const recognitionRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const loadCurrent = useCallback(async (explicitRoomId) => {
    setLoading(true);
    try {
      const target = explicitRoomId ?? (roomViewMode === 'fixed' ? roomId : '');
      const params = target ? `?roomId=${encodeURIComponent(target)}` : '';
      const data = await apiJson(`/api/room/current${params}`);
      setBoot(data);
      if (data.communication_state?.latest_input) setAnalysis(data.communication_state.latest_input);
      else if (!target) setAnalysis(null);
      if (data.communication_state?.latest_response) setSelectedResponse(data.communication_state.latest_response);
      else if (!target) setSelectedResponse(null);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, roomViewMode, showToast]);

  const loadRoomHub = useCallback(async () => {
    setHubLoading(true);
    try {
      const data = await apiJson('/api/staff/ops-board?dateRange=today&stage=all&limit=300');
      setHub({
        rooms: data.rooms || [],
        room_ready_queue: data.room_ready_queue || [],
        room_summary: data.room_summary || { total: 0, free: 0, occupied: 0, readyQueue: 0 },
      });
    } catch (error) {
      showToast(error.message);
    } finally {
      setHubLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    loadRoomHub();
  }, [loadRoomHub]);

  useEffect(() => {
    if (!roomId) return;
    window.localStorage.setItem(ROOM_STORAGE_KEY, roomId);
  }, [roomId]);

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices() || []);
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const availableRooms = hub.rooms?.length ? hub.rooms : (boot?.available_rooms || []);
  const currentRoom = boot?.room || availableRooms.find((room) => room.id === roomId) || null;
  const prep = boot?.prep;
  const currentPatient = boot?.current_patient;
  const nextPatient = boot?.next_patient;

  const currentLanguage = prep?.patient_language || currentPatient?.patients?.lang || 'en';
  const speechSupport = useMemo(() => getSpeechSupport(window), []);
  const ttsSupport = useMemo(() => getTtsSupport(window), []);
  const roomInteractionState = useMemo(() => buildRoomInteractionState({
    currentPatient,
    voiceState,
    selectedResponse,
    overlayVisible,
  }), [currentPatient, overlayVisible, selectedResponse, voiceState]);
  const canAnalyze = canAnalyzeRoomTranscript({
    currentPatient,
    inputText,
    busyAction,
    voiceState,
  });

  const speakText = useCallback((text, lang) => {
    if (!text) return;
    if (!ttsSupport.supported) {
      setTtsState('unsupported');
      showToast('이 브라우저는 TTS playback을 지원하지 않습니다');
      return;
    }
    setTtsState('speaking');
    window.speechSynthesis.cancel();
    const voiceInfo = resolveTtsVoice({ voices: availableVoices, lang });
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceInfo.spokenLang || voiceInfo.requestedLang;
    if (voiceInfo.voice) utterance.voice = voiceInfo.voice;
    setTtsMessage(voiceInfo.message || `Using ${voiceInfo.spokenLang || voiceInfo.requestedLang} voice.`);
    utterance.onend = () => {
      setTtsState('idle');
      setTtsMessage(voiceInfo.message || 'Playback complete.');
    };
    utterance.onerror = () => {
      setTtsState('error');
      setTtsMessage('Playback failed. You can still show the text to the patient.');
      showToast('TTS playback을 완료하지 못했습니다');
    };
    window.speechSynthesis.speak(utterance);
  }, [availableVoices, showToast, ttsSupport.supported]);

  const stopSpeechInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState('idle');
  }, []);

  const startSpeechInput = useCallback(() => {
    if (!speechSupport.supported) {
      setVoiceState('unsupported');
      setVoiceMessage('이 브라우저는 음성 입력을 지원하지 않습니다. 텍스트 입력을 사용해 주세요.');
      return;
    }
    if (voiceState === 'listening') {
      stopSpeechInput();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor(window);
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = mapRoomSpeechLang(currentLanguage);
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = '';
    recognition.onstart = () => {
      setVoiceState('listening');
      setVoiceMessage('듣고 있습니다. 환자 발화를 말하면 텍스트로 채웁니다.');
    };
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript || '';
        if (result?.isFinal) finalTranscript += text;
        else interimTranscript += text;
      }
      const nextText = `${finalTranscript}${interimTranscript}`.trim();
      if (nextText) setInputText(nextText);
    };
    recognition.onerror = (event) => {
      setVoiceState('error');
      setVoiceMessage(event?.error ? `음성 입력 오류: ${event.error}` : '음성 입력을 완료하지 못했습니다.');
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceState((prev) => (prev === 'error' ? prev : 'idle'));
      setVoiceMessage((prev) => (prev && prev.startsWith('음성 입력 오류') ? prev : '음성 입력이 완료되었습니다. 필요하면 Intent 정리를 눌러주세요.'));
    };
    recognition.start();
  }, [currentLanguage, speechSupport.supported, stopSpeechInput, voiceState]);

  const stopPlayback = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTtsState('idle');
    setTtsMessage('Playback stopped.');
  }, []);

  const submitLiveInput = async () => {
    if (!roomId || !canAnalyze) return;
    setBusyAction('analyze');
    try {
      const data = await apiJson('/api/room/live-input', {
        method: 'POST',
        body: JSON.stringify({ roomId, text: inputText }),
      });
      setAnalysis(data);
      setSelectedResponse(null);
      showToast('환자 의도를 정리했습니다');
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyAction('');
    }
  };

  const chooseResponse = async (item) => {
    if (!roomId) return;
    setBusyAction(item.label);
    try {
      const data = await apiJson('/api/room/respond', {
        method: 'POST',
        body: JSON.stringify({ roomId, response: item }),
      });
      setSelectedResponse(data);
      showToast('선택한 응답을 준비했습니다');
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyAction('');
    }
  };

  const runRoomAction = async (endpoint, successMessage) => {
    if (!roomId) return;
    setBusyAction(endpoint);
    try {
      const data = await apiJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ roomId }),
      });
      if (endpoint === '/api/room/load-next' && data.room) {
        setBoot(data);
        setAnalysis(data.communication_state?.latest_input || null);
        setSelectedResponse(data.communication_state?.latest_response || null);
      } else {
        await loadCurrent(roomId);
      }
      showToast(successMessage);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyAction('');
    }
  };

  const openRoomHub = async () => {
    setRoomViewMode('hub');
    window.history.replaceState(null, '', '/room');
    await loadRoomHub();
    await loadCurrent('');
  };

  const openFixedRoom = async (nextRoomId) => {
    if (!nextRoomId) return;
    setRoomId(nextRoomId);
    setRoomViewMode('fixed');
    window.localStorage.setItem(ROOM_STORAGE_KEY, nextRoomId);
    window.history.replaceState(null, '', `/room?roomId=${encodeURIComponent(nextRoomId)}&mode=room`);
    setAnalysis(null);
    setSelectedResponse(null);
    await loadCurrent(nextRoomId);
  };

  const runHubRoomAction = async (targetRoomId, endpoint, successMessage, { openFixed = false } = {}) => {
    if (!targetRoomId) return;
    setBusyAction(`${endpoint}:${targetRoomId}`);
    try {
      const data = await apiJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ roomId: targetRoomId }),
      });
      await loadRoomHub();
      if (openFixed && data?.room) {
        setBoot(data);
        setRoomId(targetRoomId);
        setRoomViewMode('fixed');
        window.localStorage.setItem(ROOM_STORAGE_KEY, targetRoomId);
        window.history.replaceState(null, '', `/room?roomId=${encodeURIComponent(targetRoomId)}&mode=room`);
      }
      showToast(successMessage);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyAction('');
    }
  };

  const assignVisitToRoom = async (visitId, targetRoomId) => {
    if (!visitId || !targetRoomId) return;
    setBusyAction(`assign-room:${visitId}:${targetRoomId}`);
    try {
      await apiJson(`/api/staff/visits/${visitId}/assign-room`, {
        method: 'POST',
        body: JSON.stringify({ room_id: targetRoomId }),
      });
      await loadRoomHub();
      await openFixedRoom(targetRoomId);
      showToast('환자를 방에 배정했습니다');
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyAction('');
    }
  };

  const statusTone = useMemo(() => {
    if (!analysis?.sensitivity) return 'default';
    if (analysis.sensitivity.level === 'high') return 'risk';
    if (analysis.sensitivity.level === 'medium') return 'warn';
    return 'safe';
  }, [analysis]);

  if (loading && !boot) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.sans }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.mocha, fontWeight: 700 }}>
          <Loader2 size={20} className="animate-spin" />
          Tiki Room 준비 중…
        </div>
      </div>
    );
  }

  if (roomViewMode === 'hub') {
    const rooms = hub.rooms || [];
    const queue = hub.room_ready_queue || [];
    const summary = hub.room_summary || { total: rooms.length, free: 0, occupied: 0, readyQueue: queue.length };
    const queueByIndex = queue.slice(0, Math.max(rooms.length, 1));

    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.sans, color: C.text, padding: 22, overflowY: 'auto' }}>
        <style>{`
          @keyframes roomHubRise {
            from { opacity: 0; transform: translateY(18px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes roomPulseLine {
            0%, 100% { transform: scaleX(0.72); opacity: 0.44; }
            50% { transform: scaleX(1); opacity: 0.9; }
          }
          .room-hub-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 28px 58px rgba(16,54,125,0.13) !important;
          }
          .room-queue-card:hover {
            transform: translateY(-2px);
            transition: transform 180ms ease;
          }
        `}</style>
        <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gap: 18 }}>
          <div
            style={{
              borderRadius: 34,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F7FAFF 58%, #EAF2FF 100%)',
              border: `1px solid ${C.border}`,
              boxShadow: '0 28px 70px rgba(16,54,125,0.10)',
              padding: '28px 30px',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              animation: 'roomHubRise 420ms ease both',
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 22,
                background: C.mocha,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 18px 42px ${C.mocha}33`,
              }}
            >
              <DoorOpen size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05, fontWeight: 980, letterSpacing: '-0.045em' }}>룸 배정 콘솔</h1>
                <span style={{ borderRadius: 999, background: C.mochaSoft, color: C.mocha, padding: '8px 12px', fontSize: 13, fontWeight: 900 }}>
                  Tiki Room
                </span>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 17, lineHeight: 1.55, color: C.textSub, fontWeight: 750 }}>
                빈 방, 사용 중인 방, 다음 후보를 한 화면에서 보고 바로 배정합니다. 방을 열면 고정 진료실 화면으로 전환됩니다.
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={loadRoomHub}
              disabled={hubLoading}
              style={{
                border: `1px solid ${C.border}`,
                background: C.panelStrong,
                color: C.text,
                borderRadius: 16,
                padding: '14px 18px',
                fontSize: 14,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: hubLoading ? 'default' : 'pointer',
              }}
            >
              {hubLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              새로고침
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, animation: 'roomHubRise 460ms ease 80ms both' }}>
            <RoomHubMetric label="전체 방" value={summary.total ?? rooms.length} helper="등록된 룸" />
            <RoomHubMetric label="빈 방" value={summary.free ?? rooms.filter((room) => room.occupancy_state !== 'occupied').length} helper="즉시 배정" tone="safe" />
            <RoomHubMetric label="사용 중" value={summary.occupied ?? rooms.filter((room) => room.occupancy_state === 'occupied').length} helper="진료 진행" tone="risk" />
            <RoomHubMetric label="대기 후보" value={summary.readyQueue ?? queue.length} helper="룸 이동 가능" tone="warn" />
          </div>

          <div
            style={{
              borderRadius: 34,
              border: `1px solid ${C.border}`,
              background: 'rgba(255,255,255,0.86)',
              padding: 24,
              boxShadow: '0 24px 60px rgba(16,54,125,0.08)',
              animation: 'roomHubRise 500ms ease 120ms both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 46, height: 46, borderRadius: 18, background: C.mochaSoft, color: C.mocha, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersRound size={22} />
              </div>
              <div>
                <div style={{ fontSize: 25, fontWeight: 950, color: C.text }}>방별 배정 상태</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 750, color: C.textSub }}>방 카드에서 바로 불러오기, 비우기, 고정 진료 화면 열기를 처리합니다.</div>
              </div>
              <div style={{ flex: 1, height: 3, borderRadius: 999, background: C.mocha, transformOrigin: 'left', animation: 'roomPulseLine 2400ms ease-in-out infinite' }} />
            </div>

            {rooms.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {rooms.map((room, index) => (
                  <RoomHubCard
                    key={room.id}
                    room={room}
                    queueVisit={queueByIndex[index]}
                    busy={!!busyAction}
                    onOpenFixed={openFixedRoom}
                    onLoadNext={(targetRoomId) => runHubRoomAction(targetRoomId, '/api/room/load-next', '다음 환자를 방에 불러왔습니다', { openFixed: true })}
                    onClear={(targetRoomId) => runHubRoomAction(targetRoomId, '/api/room/clear', '방을 비웠습니다')}
                  />
                ))}
              </div>
            ) : (
              <div style={{ borderRadius: 24, border: `1px dashed ${C.border}`, background: '#F8FBFF', padding: 34, textAlign: 'center', color: C.textSub, fontSize: 16, fontWeight: 800 }}>
                등록된 룸이 없습니다. Tiki Desk의 룸 설정에서 방을 먼저 추가해 주세요.
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: 16,
              animation: 'roomHubRise 520ms ease 180ms both',
            }}
          >
            <div style={{ borderRadius: 30, border: `1px solid ${C.border}`, background: C.panelStrong, padding: 24, boxShadow: '0 18px 48px rgba(16,54,125,0.06)' }}>
              <div style={{ fontSize: 24, fontWeight: 950 }}>룸 이동 후보</div>
              <div style={{ marginTop: 5, fontSize: 14, color: C.textSub, fontWeight: 750 }}>문진/동의/체크인이 준비된 환자를 빈 방에 직접 배정합니다.</div>
              <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                {queue.length ? queue.slice(0, 6).map((visit) => (
                  <ReadyQueueCard
                    key={visit.id}
                    visit={visit}
                    rooms={rooms}
                    busy={!!busyAction}
                    onAssign={assignVisitToRoom}
                  />
                )) : (
                  <div style={{ borderRadius: 22, border: `1px dashed ${C.border}`, background: '#F8FBFF', padding: 28, color: C.textSub, fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
                    지금 룸 이동 가능한 환자가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderRadius: 30, border: `1px solid ${C.border}`, background: '#F8FBFF', padding: 24, boxShadow: '0 18px 48px rgba(16,54,125,0.06)' }}>
              <div style={{ fontSize: 24, fontWeight: 950 }}>운영 원칙</div>
              <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                {[
                  ['Tiki Desk', '오늘 운영은 요약만 봅니다.'],
                  ['Room Console', '배정, 불러오기, 비우기는 여기서 처리합니다.'],
                  ['Fixed Room', '환자와 대화할 때만 고정 진료실 화면을 엽니다.'],
                ].map(([title, body]) => (
                  <div key={title} style={{ borderRadius: 20, background: C.panelStrong, border: `1px solid ${C.border}`, padding: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 950, color: C.mocha }}>{title}</div>
                    <div style={{ marginTop: 5, fontSize: 14, lineHeight: 1.55, color: C.textSub, fontWeight: 750 }}>{body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              background: C.ink,
              color: '#fff',
              borderRadius: 999,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              zIndex: 60,
              boxShadow: '0 12px 28px rgba(31,41,55,0.20)',
            }}
          >
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.sans, color: C.text, padding: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          gap: 14,
          minHeight: 'calc(100vh - 36px)',
        }}
      >
        <div
          style={{
            background: C.panelStrong,
            border: `1px solid ${C.border}`,
            borderRadius: 22,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: C.mocha,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 22px ${C.mocha}40`,
            }}
          >
            <DoorOpen size={18} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.10em', color: C.textMute, textTransform: 'uppercase' }}>
              Tiki Room · 진료실 화면
            </div>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={openRoomHub}
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.panel,
                  color: C.textSub,
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ArrowLeft size={13} />
                룸 배정 콘솔
              </button>
              <select
                value={roomId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setRoomId(nextId);
                  setAnalysis(null);
                  setSelectedResponse(null);
                  loadCurrent(nextId);
                }}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.panel,
                  color: C.text,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <option value="">방 선택</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: C.textSub }}>
                {currentRoom ? `${currentRoom.name} · ${currentRoom.room_type}` : '고정 room을 선택하세요'}
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              borderRadius: 999,
              padding: '8px 12px',
              background: roomInteractionState.tone === 'risk' ? C.redSoft : roomInteractionState.tone === 'warn' ? C.amberSoft : roomInteractionState.tone === 'safe' ? C.sageSoft : C.mochaSoft,
              color: roomInteractionState.tone === 'risk' ? C.red : roomInteractionState.tone === 'warn' ? C.amber : roomInteractionState.tone === 'safe' ? C.sage : C.mocha,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {roomInteractionState.label}
          </div>
        </div>

        <div
          style={{
            background: C.panelStrong,
            border: `1px solid ${C.border}`,
            borderRadius: 22,
            padding: 16,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1.4fr 1.2fr 0.9fr', gap: 10 }}>
            <PrepChip
              label="Patient"
              value={prep ? `${prep.patient_name} · ${LANG_LABELS[prep.patient_language] || prep.patient_language}` : 'No patient loaded'}
              tone="default"
            />
            <PrepChip label="Forms" value={prep ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <FormsPill done={prep.forms_status.intake_done} label="문진" />
                <FormsPill done={prep.forms_status.consent_done} label="동의" />
              </div>
            ) : '—'} tone="safe" />
            <PrepChip label="Procedure" value={prep?.procedure_name || '—'} tone="default" />
            <PrepChip label="Concern" value={prep?.concern || 'No current concern loaded'} tone="warn" />
            <PrepChip label="Caution" value={prep?.caution_points?.join(' / ') || 'No caution captured'} tone={prep?.caution_points?.length ? 'risk' : 'safe'} />
            <PrepChip label="Next" value={nextPatient ? `${nextPatient.patient_name} 대기` : '대기 없음'} tone="default" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, minHeight: 0 }}>
          <div
            style={{
              background: C.panelStrong,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              padding: 18,
              display: 'grid',
              gridTemplateRows: 'auto auto 1fr',
              gap: 14,
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color={C.mocha} />
                  <span style={{ fontSize: 15, fontWeight: 800 }}>Live Intent Assist</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>
                  patient utterance → short intent summary → doctor-selected response
                </div>
              </div>
              {analysis?.sensitivity && (
                <div
                  style={{
                    borderRadius: 999,
                    padding: '8px 12px',
                    background: statusTone === 'risk' ? C.redSoft : statusTone === 'warn' ? C.amberSoft : C.sageSoft,
                    color: statusTone === 'risk' ? C.red : statusTone === 'warn' ? C.amber : C.sage,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {analysis.sensitivity.level} · {analysis.sensitivity.tag}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                style={{
                  borderRadius: 18,
                  background: C.mochaSoft,
                  padding: 16,
                  minHeight: 112,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: C.mocha, textTransform: 'uppercase' }}>
                  Intent Summary
                </div>
                <div style={{ marginTop: 10, fontSize: 18, lineHeight: 1.55, color: C.text, fontWeight: 600 }}>
                  {analysis?.intent_summary || '환자 발화를 넣으면, 여기서 의도를 짧게 요약합니다.'}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  padding: 16,
                  minHeight: 112,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: C.textMute, textTransform: 'uppercase' }}>
                  Raw Preview
                </div>
                <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, color: C.textSub }}>
                  {analysis?.raw_preview || '아직 입력된 발화가 없습니다.'}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 20,
                background: C.panel,
                border: `1px solid ${C.border}`,
                padding: 16,
                display: 'grid',
                gridTemplateRows: 'auto auto 1fr',
                gap: 14,
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={16} color={C.sage} />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Patient input</span>
                <span style={{ fontSize: 11, color: C.textMute }}>
                  {speechSupport.supported ? 'browser voice input available' : 'text input fallback'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={startSpeechInput}
                  disabled={!currentPatient || !!busyAction || voiceState === 'unsupported'}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${voiceState === 'listening' ? C.red : C.border}`,
                    background: voiceState === 'listening' ? C.redSoft : C.panelStrong,
                    color: voiceState === 'listening' ? C.red : C.text,
                    padding: '9px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: !currentPatient || !!busyAction || voiceState === 'unsupported' ? 'default' : 'pointer',
                    opacity: !currentPatient || !!busyAction || voiceState === 'unsupported' ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Mic size={13} />
                  {voiceState === 'listening' ? 'Stop voice input' : 'Start voice input'}
                </button>
                <span style={{ fontSize: 11, color: voiceState === 'error' ? C.red : C.textMute }}>
                  {voiceMessage || (speechSupport.supported
                    ? 'Voice fills the text box. Doctor still chooses the response.'
                    : 'Voice input is unavailable in this browser. Text input still works.')}
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="환자 발화를 입력하세요. 예: 갑자기 어지럽고 입술이 붓는 것 같아요."
                style={{
                  width: '100%',
                  minHeight: 110,
                  borderRadius: 16,
                  border: `1px solid ${C.border}`,
                  background: '#fff',
                  padding: 14,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: C.text,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              {inputText.trim() && (
                <div style={{
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: C.amberSoft,
                  color: C.amber,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}>
                  Verify transcript before Intent 정리. Voice text can be wrong in noisy rooms.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: C.textSub }}>
                  AI는 요약과 추천만 합니다. 응답은 의사가 선택합니다.
                </div>
                {inputText.trim() && (
                  <button
                    onClick={() => {
                      setInputText('');
                      setAnalysis(null);
                      setSelectedResponse(null);
                      setVoiceMessage('Transcript cleared. Type or capture again.');
                    }}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      background: C.panelStrong,
                      color: C.textSub,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Clear transcript
                  </button>
                )}
                <button
                  onClick={submitLiveInput}
                  disabled={!canAnalyze}
                  style={{
                    borderRadius: 12,
                    border: 'none',
                    background: C.mocha,
                    color: '#fff',
                    padding: '12px 18px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: !canAnalyze ? 'default' : 'pointer',
                    opacity: !canAnalyze ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {busyAction === 'analyze' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Intent 정리
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              background: C.panelStrong,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              padding: 18,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              gap: 14,
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} color={C.sage} />
              <span style={{ fontSize: 15, fontWeight: 800 }}>Recommended doctor responses</span>
            </div>

            <div style={{ display: 'grid', gap: 10, alignContent: 'start', overflowY: 'auto' }}>
              {analysis?.recommended_responses?.length ? (
                analysis.recommended_responses.map((item) => (
                  <ResponseButton
                    key={`${item.label}-${item.response_type}`}
                    item={item}
                    selected={selectedResponse?.staff_text === item.text}
                    onClick={chooseResponse}
                  />
                ))
              ) : (
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px dashed ${C.border}`,
                    padding: 18,
                    color: C.textSub,
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  아직 추천 응답이 없습니다. 환자 발화를 넣으면 3-4개의 안전한 후보를 보여줍니다.
                </div>
              )}
            </div>

            <div
              style={{
                borderRadius: 20,
                background: selectedResponse ? C.sageSoft : C.panel,
                border: `1px solid ${selectedResponse ? 'rgba(90,143,128,0.20)' : C.border}`,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: selectedResponse ? C.sage : C.textMute, textTransform: 'uppercase' }}>
                    Selected response output
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: C.textSub }}>
                    doctor-selected only · patient-facing text + playback
                  </div>
                </div>
                {selectedResponse?.response_type === 'clinician_check' && (
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.red, background: C.redSoft, borderRadius: 999, padding: '8px 10px' }}>
                    clinician check
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMute, textTransform: 'uppercase' }}>Staff text</div>
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: C.text }}>
                    {selectedResponse?.staff_text || '응답 후보를 선택하면 여기에 doctor-facing 문구가 고정됩니다.'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textMute, textTransform: 'uppercase' }}>
                    Patient text · {LANG_LABELS[selectedResponse?.patient_language] || selectedResponse?.patient_language || currentLanguage}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 20, lineHeight: 1.65, color: C.ink, fontWeight: 500 }}>
                    {selectedResponse?.patient_text || '환자에게 보여줄 번역 문구가 여기 표시됩니다.'}
                  </div>
                </div>
              </div>

              {(selectedResponse?.patient_text || ttsMessage) && (
                <div style={{
                  marginTop: 12,
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: C.panelStrong,
                  border: `1px solid ${C.border}`,
                  color: ttsState === 'error' ? C.red : C.textSub,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                  Playback: {ttsSupport.supported ? (ttsMessage || 'Ready. Tiki Room will use the closest available browser voice.') : 'This browser does not support speech playback. Use patient display text instead.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background: C.panelStrong,
            border: `1px solid ${C.border}`,
            borderRadius: 22,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => speakText(selectedResponse?.patient_text, selectedResponse?.patient_language || currentLanguage)}
            disabled={!selectedResponse?.patient_text}
            style={{
              borderRadius: 12,
              border: 'none',
              background: C.sage,
              color: '#fff',
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              opacity: selectedResponse?.patient_text ? 1 : 0.45,
              cursor: selectedResponse?.patient_text ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Volume2 size={15} />
            {ttsState === 'speaking' ? 'Speaking…' : 'Speak selected'}
          </button>
          <button
            onClick={stopPlayback}
            disabled={ttsState !== 'speaking'}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.textSub,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              opacity: ttsState === 'speaking' ? 1 : 0.45,
              cursor: ttsState === 'speaking' ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <PauseCircle size={15} />
            Stop audio
          </button>
          <button
            onClick={() => setOverlayVisible(true)}
            disabled={!selectedResponse?.patient_text}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.text,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              opacity: selectedResponse?.patient_text ? 1 : 0.45,
              cursor: selectedResponse?.patient_text ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <PlayCircle size={15} />
            Show to patient
          </button>
          <button
            onClick={() => speakText(selectedResponse?.patient_text, selectedResponse?.patient_language || currentLanguage)}
            disabled={!selectedResponse?.patient_text}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.text,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              opacity: selectedResponse?.patient_text ? 1 : 0.45,
              cursor: selectedResponse?.patient_text ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RotateCcw size={15} />
            Replay
          </button>
          <button
            onClick={() => showToast('민감 발화는 clinician check 후보로 유지됩니다')}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.redSoft}`,
              background: C.redSoft,
              color: C.red,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            Escalate
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => runRoomAction('/api/room/end-session', '현재 room session을 종료했습니다')}
            disabled={!roomId || !!busyAction}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.textSub,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <PauseCircle size={15} />
            End session
          </button>
          <button
            onClick={() => runRoomAction('/api/room/load-next', '다음 환자를 room에 불러왔습니다')}
            disabled={!roomId || !!busyAction}
            style={{
              borderRadius: 12,
              border: 'none',
              background: C.mocha,
              color: '#fff',
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ChevronRight size={15} />
            Load next
          </button>
          <button
            onClick={() => runRoomAction('/api/room/clear', 'room 상태를 비웠습니다')}
            disabled={!roomId || !!busyAction}
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.textSub,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <XCircle size={15} />
            Clear room
          </button>
        </div>
      </div>

      <PatientOverlay
        visible={overlayVisible}
        text={selectedResponse?.patient_text}
        lang={selectedResponse?.patient_language || currentLanguage}
        onClose={() => setOverlayVisible(false)}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            background: C.ink,
            color: '#fff',
            borderRadius: 999,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            zIndex: 60,
            boxShadow: '0 12px 28px rgba(31,41,55,0.20)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
