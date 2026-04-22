import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
  Volume2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const C = {
  bg: '#F8F3EE',
  panel: '#FFFDFC',
  panelStrong: '#FFFFFF',
  border: 'rgba(164,120,100,0.12)',
  text: '#2C2420',
  textSub: '#6F6258',
  textMute: '#AA9C90',
  mocha: '#A47864',
  mochaSoft: '#F2E7DF',
  sage: '#5A8F80',
  sageSoft: '#ECF4F2',
  amber: '#B5701A',
  amberSoft: '#FEF8EC',
  red: '#C04A3F',
  redSoft: '#FEF3F2',
  ink: '#1F2937',
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

function langForSpeech(lang) {
  if (lang === 'ja') return 'ja-JP';
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'ar') return 'ar-SA';
  if (lang === 'en') return 'en-US';
  return 'ko-KR';
}

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

export default function TikiRoomPage() {
  const [roomId, setRoomId] = useState(() => window.localStorage.getItem(ROOM_STORAGE_KEY) || '');
  const [boot, setBoot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const loadCurrent = useCallback(async (explicitRoomId) => {
    setLoading(true);
    try {
      const target = explicitRoomId ?? roomId;
      const params = target ? `?roomId=${encodeURIComponent(target)}` : '';
      const data = await apiJson(`/api/room/current${params}`);
      setBoot(data);
      if (!target && data.available_rooms?.length > 0) {
        const firstRoom = data.available_rooms[0]?.id;
        if (firstRoom) {
          window.localStorage.setItem(ROOM_STORAGE_KEY, firstRoom);
          setRoomId(firstRoom);
        }
      }
      if (data.communication_state?.latest_input) setAnalysis(data.communication_state.latest_input);
      if (data.communication_state?.latest_response) setSelectedResponse(data.communication_state.latest_response);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, showToast]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    if (!roomId) return;
    window.localStorage.setItem(ROOM_STORAGE_KEY, roomId);
  }, [roomId]);

  const availableRooms = boot?.available_rooms || [];
  const currentRoom = boot?.room || availableRooms.find((room) => room.id === roomId) || null;
  const prep = boot?.prep;
  const currentPatient = boot?.current_patient;
  const nextPatient = boot?.next_patient;

  const currentLanguage = prep?.patient_language || currentPatient?.patients?.lang || 'en';

  const speakText = useCallback((text, lang) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langForSpeech(lang);
    window.speechSynthesis.speak(utterance);
  }, []);

  const submitLiveInput = async () => {
    if (!roomId || !inputText.trim()) return;
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
              Tiki Room
            </div>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
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
              background: currentPatient ? C.sageSoft : C.mochaSoft,
              color: currentPatient ? C.sage : C.mocha,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {currentPatient ? 'Current patient loaded' : 'Idle / next patient ready'}
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
                <span style={{ fontSize: 14, fontWeight: 800 }}>Patient input placeholder</span>
                <span style={{ fontSize: 11, color: C.textMute }}>voice-ready architecture / text input for now</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: C.textSub }}>
                  AI는 요약과 추천만 합니다. 응답은 의사가 선택합니다.
                </div>
                <button
                  onClick={submitLiveInput}
                  disabled={!currentPatient || !inputText.trim() || !!busyAction}
                  style={{
                    borderRadius: 12,
                    border: 'none',
                    background: C.mocha,
                    color: '#fff',
                    padding: '12px 18px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: !currentPatient || !inputText.trim() || !!busyAction ? 'default' : 'pointer',
                    opacity: !currentPatient || !inputText.trim() || !!busyAction ? 0.5 : 1,
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
            Speak selected
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
            Repeat
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
