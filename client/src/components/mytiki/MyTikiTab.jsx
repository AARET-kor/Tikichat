/**
 * client/src/components/mytiki/MyTikiTab.jsx
 * ─────────────────────────────────────────────────────────────
 * Tiki Desk — staff operations surface.
 *
 * Columns: patient + time | procedure | stage | forms | room | link | actions
 * Default view: Today, sorted by visit_date ASC (earliest first).
 * Date tabs: 오늘 / 내일 / 이번주 / 전체
 *
 * Actions per row:
 *   - 체크인     → POST /api/my-tiki/visits/:id/check-in
 *   - 링크 발급  → GenerateLinkModal (POST /api/my-tiki/links)
 *   - 링크 폐기  → POST /api/my-tiki/links/:id/revoke
 *   - 방 배정    → RoomCell inline edit (PATCH /api/my-tiki/visits/:id/room)
 *   - 단계 변경  → StagePicker inline (PATCH /api/my-tiki/visits/:id/stage)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Link2, RefreshCw, XCircle, CheckCircle2,
  AlertTriangle, Clock, Eye, Send, Plus, Search,
  ChevronRight, FileText, ClipboardCheck, Copy, Check, Loader2,
  LogIn, DoorOpen, ChevronDown, X, Navigation, UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import QuickVisitCreate from './QuickVisitCreate';
import CsvImportModal   from './CsvImportModal';
import { deriveArrivalFlowState } from '../../lib/opsBoardArrival';
import { buildQrImageUrl, shouldPollOpsBoard } from '../../lib/opsLite';
import {
  AFTERCARE_FILTER_LABELS,
  ESCALATION_PRIORITY_META,
  ESCALATION_ROLE_LABELS,
  ESCALATION_STATUS_LABELS,
  ESCALATION_TYPE_LABELS,
  ROOM_TYPE_LABELS,
  STAGE_META,
  STAGE_ORDER,
  getAftercareGroupLabel,
  getAftercareRiskMeta,
  getEscalationGroupLabel,
  getEscalationPriorityMeta,
  getOperationalUrgencyMeta,
  isAftercareUnanswered,
  isEscalationUnanswered,
} from '../../lib/opsStatusMeta';

// ── Design tokens ────────────────────────────────────────────────────────────
const TEAL = '#4E8FA0';
const SAGE = '#5A8F80';
const F    = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };

// ── Link status meta ─────────────────────────────────────────────────────────
const LINK_META = {
  none:    { label: '미발송', icon: Clock,         color: '#9CA3AF' },
  active:  { label: '발송됨', icon: Send,          color: '#5B72A8' },
  opened:  { label: '열람됨', icon: Eye,           color: SAGE },
  expired: { label: '만료됨', icon: AlertTriangle, color: '#D09262' },
  revoked: { label: '폐기됨', icon: XCircle,       color: '#EF4444' },
};

// ── Date range tabs ──────────────────────────────────────────────────────────
const DATE_RANGES = [
  { key: 'today',    label: '오늘' },
  { key: 'tomorrow', label: '내일' },
  { key: 'week',     label: '이번주' },
  { key: 'all',      label: '전체' },
];

// ── Auth helper ──────────────────────────────────────────────────────────────
async function authHeaders() {
  const { data: { session: sb } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (sb?.access_token) headers['Authorization'] = `Bearer ${sb.access_token}`;
  return headers;
}

// ── Visit normalizer ─────────────────────────────────────────────────────────
function normalizeVisit(v) {
  return {
    id:               v.id,
    patient_id:       v.patient_id,
    patient_name:     v.patients?.name     || '(이름 없음)',
    patient_flag:     v.patients?.flag     || '🏥',
    patient_lang:     v.patients?.lang     || 'ko',
    procedure_name:   v.procedures?.name_ko || '시술 미지정',
    visit_date:       v.visit_date || null,
    stage:            v.stage              || 'booked',
    link_status:      v.link_status        || 'none',
    link:             v.link               || null,
    intake_done:      v.intake_done        || false,
    consent_done:     v.consent_done       || false,
    followup_done:    v.followup_done      || false,
    unreviewed_forms: v.unreviewed_forms   || 0,
    checked_in_at:       v.checked_in_at      || null,
    room:                v.room               || null,
    room_id:             v.room_id            || null,
    room_assigned_at:    v.room_assigned_at   || null,
    room_cleared_at:     v.room_cleared_at    || null,
    room_type:           v.room_type          || v.rooms?.room_type || null,
    patient_arrived_at:  v.patient_arrived_at || null,
    room_ready:          v.room_ready ?? null,
  };
}

function isVisitRoomReadyForOps(visit) {
  if (typeof visit.room_ready === 'boolean') return visit.room_ready;
  return Boolean(
    visit.checked_in_at &&
    visit.intake_done &&
    visit.consent_done &&
    ['pre_visit', 'treatment', 'post_care'].includes(visit.stage),
  );
}

// ── Time / date formatting ────────────────────────────────────────────────────
function fmtVisitTime(iso, dateRange) {
  if (!iso) return '시간 미정';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (dateRange === 'today') return time;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd} ${time}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function fmtAgo(iso) {
  if (!iso) return '';
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}시간 전`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ArrivalBadge: shown when patient self-reported arrival via My Tiki portal
function ArrivalBadge({ arrivedAt, checkedInAt, formsReady, darkMode }) {
  if (!arrivedAt) return null;
  const agoLabel   = fmtAgo(arrivedAt);
  const state = deriveArrivalFlowState({
    patient_arrived_at: arrivedAt,
    checked_in_at: checkedInAt,
    intake_done: formsReady,
    consent_done: formsReady,
  });
  const urgencyMeta = getOperationalUrgencyMeta({ kind: 'arrival', state });
  const arrivalMeta = getOperationalUrgencyMeta({ kind: 'arrival', state: 'desk_confirmation' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
      <span
        className="inline-flex items-center gap-0.5"
        style={{ fontSize: 10, fontWeight: 700, color: arrivalMeta.color }}
        title={`환자 도착 신호: ${new Date(arrivedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
      >
        <Navigation size={9} strokeWidth={2.5} />
        도착 {agoLabel}
      </span>
      {state === 'desk_confirmation' && (
        <span
          className="inline-flex items-center gap-0.5"
          style={{ fontSize: 9, fontWeight: 700, color: urgencyMeta.color }}
        >
          <LogIn size={9} strokeWidth={2.5} />
          데스크 확인 필요
        </span>
      )}
      {state === 'forms_pending' && (
        <span
          className="inline-flex items-center gap-0.5"
          style={{ fontSize: 9, fontWeight: 700, color: urgencyMeta.color }}
        >
          <FileText size={9} strokeWidth={2.5} />
          서류 확인 필요
        </span>
      )}
      {state === 'room_ready' && (
        <span
          className="inline-flex items-center gap-0.5"
          style={{ fontSize: 9, fontWeight: 700, color: urgencyMeta.color }}
        >
          <CheckCircle2 size={9} strokeWidth={2.5} />
          룸 준비
        </span>
      )}
    </div>
  );
}

function StageBadge({ stage, onClick }) {
  const m = STAGE_META[stage] || STAGE_META.booked;
  return (
    <span
      onClick={onClick}
      style={{
        color: m.color, background: m.bg, border: `1px solid ${m.color}30`,
        cursor: onClick ? 'pointer' : 'default',
      }}
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap select-none"
    >
      {m.label}
    </span>
  );
}

function LinkStatusBadge({ status }) {
  const m = LINK_META[status] || LINK_META.none;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: m.color }}>
      <Icon size={11} strokeWidth={2} />
      {m.label}
    </span>
  );
}

function FormChips({ intakeDone, consentDone }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${intakeDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
        {intakeDone ? <CheckCircle2 size={10} /> : <FileText size={10} strokeWidth={1.5} />}
        문진
      </span>
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${consentDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
        {consentDone ? <CheckCircle2 size={10} /> : <FileText size={10} strokeWidth={1.5} />}
        동의서
      </span>
    </div>
  );
}

function UnreviewedPip({ count }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1 py-px text-[9px] font-bold ml-1">
      {count}
    </span>
  );
}

// ── CheckInCell ───────────────────────────────────────────────────────────────
function CheckInCell({ visitId, checkedInAt, loading, darkMode, onCheckIn }) {
  if (checkedInAt) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
        <Check size={11} strokeWidth={2.5} />
        {fmtTime(checkedInAt)}
      </span>
    );
  }
  return (
    <button
      onClick={() => onCheckIn(visitId)}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-50"
      style={{ background: SAGE, boxShadow: `0 1px 4px ${SAGE}40` }}
    >
      {loading
        ? <Loader2 size={9} className="animate-spin" />
        : <LogIn size={9} strokeWidth={2.5} />
      }
      체크인
    </button>
  );
}

function RoomAssignmentCell({
  visit,
  rooms,
  assigning,
  darkMode,
  onAssignRoom,
  onClearRoom,
}) {
  const freeRooms = (rooms || []).filter((room) => room.occupancy_state === 'free' || room.id === visit.room_id);
  const roomReady = isVisitRoomReadyForOps(visit);
  const alternateRooms = freeRooms.filter((room) => room.id !== visit.room_id).slice(0, 2);

  if (visit.room) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: TEAL }}>
          <DoorOpen size={10} />
          {visit.room}
        </span>
        <div className="flex flex-wrap gap-1">
          {alternateRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onAssignRoom(visit.id, room.id)}
              disabled={assigning}
              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border disabled:opacity-50"
              style={{ borderColor: `${TEAL}50`, color: TEAL, background: darkMode ? '#18181B' : '#F8FCFD' }}
            >
              {room.name}
            </button>
          ))}
          <button
            onClick={() => onClearRoom(visit.id)}
            disabled={assigning}
            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border disabled:opacity-50"
            style={{ borderColor: '#FCA5A5', color: '#DC2626', background: darkMode ? '#1C1917' : '#FEF2F2' }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (!roomReady) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-zinc-400">대기</span>
        <span className="text-[9px] text-zinc-400">
          {!visit.checked_in_at ? '체크인 필요' : !visit.intake_done || !visit.consent_done ? '서류 완료 필요' : '단계 대기'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold" style={{ color: '#16A34A' }}>룸 배정 가능</span>
      <div className="flex flex-wrap gap-1">
        {freeRooms.slice(0, 2).map((room) => (
          <button
            key={room.id}
            onClick={() => onAssignRoom(visit.id, room.id)}
            disabled={assigning}
            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white disabled:opacity-50"
            style={{ background: TEAL }}
          >
            {room.name}
          </button>
        ))}
        {freeRooms.length === 0 && (
          <span className="text-[9px] font-semibold text-zinc-400">빈 방 없음</span>
        )}
      </div>
    </div>
  );
}

function RoomTrafficCard({ room, queueVisit, darkMode, busy, onAssignRoom, onClearRoom }) {
  const occupied = room.occupancy_state === 'occupied';
  const currentVisit = room.current_visit;
  const procedureName = currentVisit?.procedures?.name_ko || currentVisit?.procedures?.name_en || '방문 컨텍스트 없음';

  return (
    <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[11px] font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{ROOM_TYPE_LABELS[room.room_type] || '진료실'}</p>
          <p className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{room.name}</p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={occupied
            ? { background: '#FEF2F2', color: '#DC2626' }
            : { background: '#F0FDF4', color: '#16A34A' }}
        >
          {occupied ? '사용 중' : '비어 있음'}
        </span>
      </div>

      {occupied ? (
        <div className="mt-3">
          <div className={`text-[12px] font-semibold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {(currentVisit?.patients?.flag || '🏥')} {currentVisit?.patients?.name || '배정됨'}
          </div>
          <div className={`text-[10px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{procedureName}</div>
          <button
            onClick={() => onClearRoom(currentVisit.id)}
            disabled={busy}
            className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-semibold border disabled:opacity-50"
            style={{ borderColor: '#FCA5A5', color: '#DC2626', background: darkMode ? '#1C1917' : '#FEF2F2' }}
          >
            Clear room
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <div className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>다음 후보</div>
          {queueVisit ? (
            <>
              <div className={`text-[12px] font-semibold mt-1 ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {queueVisit.patient_flag} {queueVisit.patient_name}
              </div>
              <div className={`text-[10px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{queueVisit.procedure_name}</div>
              <button
                onClick={() => onAssignRoom(queueVisit.id, room.id)}
                disabled={busy}
                className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white disabled:opacity-50"
                style={{ background: TEAL }}
              >
                Assign next
              </button>
            </>
          ) : (
            <div className={`text-[11px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>대기열 없음</div>
          )}
        </div>
      )}
    </div>
  );
}

function RoomPresetManager({ rooms, darkMode, onCreateRoom, onUpdateRoom }) {
  const [drafts, setDrafts] = useState({});
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('consultation');

  useEffect(() => {
    setDrafts(Object.fromEntries((rooms || []).map((room) => [room.id, {
      name: room.name,
      room_type: room.room_type,
      sort_order: room.sort_order,
      is_active: room.is_active,
    }])));
  }, [rooms]);

  return (
    <div className={`rounded-2xl border p-4 mt-4 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Room presets</p>
          <p className={`text-[11px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>방 이름을 반복 입력하지 않고 바로 운영에 쓸 수 있게 유지합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-[1.4fr_0.9fr_80px_80px] gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 방 이름"
          className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
        >
          {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <div />
        <button
          onClick={() => {
            if (!newName.trim()) return;
            onCreateRoom({ name: newName.trim(), room_type: newType });
            setNewName('');
            setNewType('consultation');
          }}
          className="rounded-lg text-xs font-semibold text-white"
          style={{ background: TEAL }}
        >
          추가
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {(rooms || []).map((room) => {
          const draft = drafts[room.id] || room;
          return (
            <div key={room.id} className="grid grid-cols-[1.4fr_0.9fr_80px_90px] gap-2 items-center">
              <input
                value={draft.name || ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [room.id]: { ...draft, name: e.target.value } }))}
                className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
              />
              <select
                value={draft.room_type || 'consultation'}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [room.id]: { ...draft, room_type: e.target.value } }))}
                className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
              >
                {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <input
                type="number"
                value={draft.sort_order ?? 100}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [room.id]: { ...draft, sort_order: Number(e.target.value) } }))}
                className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => onUpdateRoom(room.id, draft)}
                  className="flex-1 rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: TEAL }}
                >
                  저장
                </button>
                <button
                  onClick={() => onUpdateRoom(room.id, { ...draft, is_active: false })}
                  className={`px-2 rounded-lg text-[11px] font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}
                >
                  비활성화
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── StagePicker ───────────────────────────────────────────────────────────────
function StagePicker({ visitId, currentStage, clinicId, darkMode, onStageChange, onClose }) {
  const [loading, setLoading] = useState(false);

  async function advance(stage) {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/my-tiki/visits/${visitId}/stage`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onStageChange(visitId, stage);
      onClose();
    } catch (err) {
      console.error('[stage]', err.message);
    } finally {
      setLoading(false);
    }
  }

  const panelBg = darkMode ? '#27272A' : '#fff';
  const border  = darkMode ? '#3F3F46' : '#E5E7EB';

  return (
    <div
      style={{
        position: 'absolute', right: 0, top: '100%', zIndex: 50, marginTop: 4,
        background: panelBg, border: `1px solid ${border}`,
        borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        minWidth: 140, overflow: 'hidden',
      }}
    >
      {STAGE_ORDER.map(s => {
        const m = STAGE_META[s];
        const isCurrent = s === currentStage;
        return (
          <button
            key={s}
            onClick={() => advance(s)}
            disabled={isCurrent || loading}
            style={{
              width: '100%', textAlign: 'left',
              padding: '8px 14px', border: 'none',
              background: isCurrent ? m.bg : 'transparent',
              color: isCurrent ? m.color : (darkMode ? '#D4D4D8' : '#374151'),
              fontSize: 12, fontWeight: isCurrent ? 700 : 500,
              cursor: isCurrent ? 'default' : 'pointer',
              fontFamily: F.sans, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isCurrent && <Check size={11} />}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ── VisitRow ──────────────────────────────────────────────────────────────────
function VisitRow({
  visit,
  dateRange,
  darkMode,
  checkingIn,
  assigningRoom,
  rooms,
  onCheckIn,
  onAction,
  onAssignRoom,
  onClearRoom,
  onStageChange,
}) {
  const [showStage, setShowStage] = useState(false);
  const stageRef = useRef(null);

  // Close stage picker on outside click
  useEffect(() => {
    if (!showStage) return;
    function handler(e) { if (stageRef.current && !stageRef.current.contains(e.target)) setShowStage(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStage]);

  const rowBg  = darkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60' : 'bg-white border-zinc-100 hover:bg-zinc-50';
  const textP  = darkMode ? 'text-zinc-100' : 'text-zinc-800';
  const textS  = darkMode ? 'text-zinc-400' : 'text-zinc-500';

  const canGenerate = visit.link_status === 'none' || visit.link_status === 'expired';
  const canRevoke   = visit.link_status === 'active' || visit.link_status === 'opened';
  const formsReady  = visit.intake_done && visit.consent_done;
  const timeLabel = fmtVisitTime(visit.visit_date, dateRange);
  const isCheckedIn = !!visit.checked_in_at;

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b transition-colors ${rowBg} ${isCheckedIn ? 'border-l-2' : ''}`}
         style={isCheckedIn ? { borderLeftColor: SAGE } : {}}>

      {/* Patient + time */}
      <div style={{ width: 128, flexShrink: 0 }}>
        <div className={`text-[12px] font-semibold ${textP} flex items-center gap-1 truncate`}>
          <span>{visit.patient_flag}</span>
          <span className="truncate">{visit.patient_name}</span>
          {visit.unreviewed_forms > 0 && <UnreviewedPip count={visit.unreviewed_forms} />}
        </div>
        <div className={`text-[10px] mt-0.5 font-medium ${isCheckedIn ? 'text-emerald-600' : textS}`}>
          {timeLabel}
        </div>
        <ArrivalBadge
          arrivedAt={visit.patient_arrived_at}
          checkedInAt={visit.checked_in_at}
          formsReady={formsReady}
          darkMode={darkMode}
        />
      </div>

      {/* Procedure */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className={`text-[11px] ${textP} truncate block`}>{visit.procedure_name}</span>
      </div>

      {/* Stage */}
      <div style={{ width: 80, flexShrink: 0 }} className="relative" ref={stageRef}>
        <StageBadge stage={visit.stage} onClick={() => setShowStage(v => !v)} />
        {showStage && (
          <StagePicker
            visitId={visit.id}
            currentStage={visit.stage}
            darkMode={darkMode}
            onStageChange={onStageChange}
            onClose={() => setShowStage(false)}
          />
        )}
      </div>

      {/* Forms */}
      <div style={{ width: 60, flexShrink: 0 }}>
        <FormChips intakeDone={visit.intake_done} consentDone={visit.consent_done} />
      </div>

      {/* Room */}
      <div style={{ width: 188, flexShrink: 0 }}>
        <RoomAssignmentCell
          visit={visit}
          rooms={rooms}
          darkMode={darkMode}
          assigning={assigningRoom}
          onAssignRoom={onAssignRoom}
          onClearRoom={onClearRoom}
        />
      </div>

      {/* Link status */}
      <div style={{ width: 64, flexShrink: 0 }}>
        <LinkStatusBadge status={visit.link_status} />
      </div>

      {/* Actions */}
      <div style={{ width: 124, flexShrink: 0 }} className="flex items-center gap-1 justify-end">
        {/* Check-in */}
        <CheckInCell
          visitId={visit.id}
          checkedInAt={visit.checked_in_at}
          loading={checkingIn}
          darkMode={darkMode}
          onCheckIn={onCheckIn}
        />

        {/* Link generate / revoke / resend */}
        {canGenerate && !isCheckedIn && (
          <button
            onClick={() => onAction('generate', visit)}
            title="링크 발급"
            className="p-1 rounded-md transition-colors text-zinc-400 hover:text-teal-600 hover:bg-teal-50"
          >
            <Link2 size={13} />
          </button>
        )}
        {canGenerate && isCheckedIn && (
          <button
            onClick={() => onAction('generate', visit)}
            title="링크 발급"
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-all"
            style={{ background: TEAL }}
          >
            <Link2 size={9} />
            링크
          </button>
        )}
        {canRevoke && (
          <button
            onClick={() => onAction('revoke', visit)}
            title="링크 폐기"
            className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <XCircle size={12} />
          </button>
        )}

        {/* Detail (future) */}
        <button
          onClick={() => onAction('detail', visit)}
          title="상세"
          className={`p-1 rounded-md transition-colors ${darkMode ? 'text-zinc-600 hover:bg-zinc-700' : 'text-zinc-300 hover:bg-zinc-100'}`}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, darkMode }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}
      style={{ boxShadow: darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' }}
    >
      <span className={`text-[11px] font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className={`text-[10px] ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{sub}</span>}
    </div>
  );
}

function EscalationMiniCard({ label, value, sub, color, darkMode }) {
  return (
    <div className={`rounded-xl px-3 py-3 border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <div className={`text-[10px] font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</div>
      <div className="text-lg font-bold mt-1" style={{ color }}>{value}</div>
      <div className={`text-[10px] mt-0.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{sub}</div>
    </div>
  );
}

function EscalationTaskCard({ item, darkMode, onOpen, staffUsers = [] }) {
  const priority = getEscalationPriorityMeta(item.priority);
  const typeLabel = ESCALATION_TYPE_LABELS[item.escalation_type] || item.escalation_type;
  const roleLabel = ESCALATION_ROLE_LABELS[item.assigned_role] || item.assigned_role;
  const patientName = item.patients?.name || '(이름 없음)';
  const patientFlag = item.patients?.flag || '🏥';
  const procedureName = item.visits?.procedures?.name_ko || item.visits?.procedures?.name_en || '방문 컨텍스트 없음';
  const unanswered = isEscalationUnanswered(item);
  const ownerUser = (staffUsers || []).find((user) => user.user_id === item.assigned_user_id);
  const latestActorId = item.closed_by || item.resolved_by || item.responded_by || item.acknowledged_by || null;
  const latestActor = (staffUsers || []).find((user) => user.user_id === latestActorId);
  const ownerLabel = ownerUser?.email || roleLabel || 'queue';
  const latestActorLabel = latestActor?.email || '—';

  return (
    <button
      onClick={() => onOpen(item.id)}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-100 hover:bg-zinc-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{patientFlag}</span>
            <span className={`text-[12px] font-semibold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{patientName}</span>
            {unanswered && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                미응답
              </span>
            )}
          </div>
          <p className={`text-[10px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{procedureName}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: priority.color, background: priority.bg }}>
          {priority.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: '#4E8FA0', background: '#EDF4F6' }}>
          {typeLabel}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-zinc-100'}`}>
          {roleLabel}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-zinc-100'}`}>
          {ESCALATION_STATUS_LABELS[item.status] || item.status}
        </span>
      </div>

      <p className={`text-[10px] mt-2 line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {item.patient_visible_status_text}
      </p>

      <div className={`mt-2 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Owner: {ownerLabel} · Last: {latestActorLabel}
      </div>

      <div className={`mt-2 text-[10px] font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {fmtAgo(item.opened_at || item.created_at)}
      </div>
    </button>
  );
}

function AftercareTaskCard({ item, darkMode, busy, onReview }) {
  const risk = getAftercareRiskMeta(item.risk_level);
  const patient = item.patient_aftercare_runs?.patients || {};
  const visit = item.patient_aftercare_runs?.visits || {};
  const procedureName = visit?.procedures?.name_ko || visit?.procedures?.name_en || '사후관리';
  const unanswered = isAftercareUnanswered(item);

  return (
    <div className={`rounded-xl border p-3 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{patient.flag || '🏥'}</span>
            <span className={`text-[12px] font-semibold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{patient.name || '(이름 없음)'}</span>
            {item.urgent_flag && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200">
                긴급
              </span>
            )}
            {unanswered && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                미응답
              </span>
            )}
          </div>
          <p className={`text-[10px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{procedureName} · {item.aftercare_steps?.step_key || 'aftercare'}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: risk.color, background: risk.bg }}>
          {risk.label}
        </span>
      </div>

      <p className={`text-[10px] mt-2 line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {item.aftercare_steps?.content_template || '체크인 응답을 검토해 주세요.'}
      </p>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-zinc-100'}`}>
          {item.response_status}
        </span>
        {item.safe_for_return && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50">
            리턴 가능
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`text-[10px] font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {fmtAgo(item.responded_at || item.sent_at || item.scheduled_for)}
        </div>
        <button
          onClick={() => onReview(item.id)}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
        >
          {busy ? '검토 중…' : 'Review'}
        </button>
      </div>
    </div>
  );
}

function EscalationDetailDrawer({
  item,
  staffUsers,
  darkMode,
  onClose,
  onAction,
}) {
  const [assignedRole, setAssignedRole] = useState(item?.assigned_role || 'coordinator');
  const [assignedUserId, setAssignedUserId] = useState(item?.assigned_user_id || '');
  const [priority, setPriority] = useState(item?.priority || 'normal');
  const [escalationType, setEscalationType] = useState(item?.escalation_type || 'simple_logistics');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setAssignedRole(item?.assigned_role || 'coordinator');
    setAssignedUserId(item?.assigned_user_id || '');
    setPriority(item?.priority || 'normal');
    setEscalationType(item?.escalation_type || 'simple_logistics');
  }, [item]);

  if (!item) return null;

  const filteredUsers = (staffUsers || []).filter(user => {
    if (!assignedRole) return true;
    if (assignedRole === 'doctor') return ['owner', 'admin'].includes(user.role);
    if (assignedRole === 'nurse') return ['admin', 'staff', 'owner'].includes(user.role);
    return true;
  });

  async function run(action) {
    setBusy(action);
    try {
      await onAction(action, {
        assigned_role: assignedRole,
        assigned_user_id: assignedUserId || null,
        priority,
        escalation_type: escalationType,
      });
    } finally {
      setBusy(null);
    }
  }

  function actorLabel(userId) {
    if (!userId) return '—';
    const match = (staffUsers || []).find((user) => user.user_id === userId);
    return match?.email || userId;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`h-full w-full max-w-md border-l ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}
        style={{ fontFamily: F.sans }}
      >
        <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div>
            <p className={`text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Escalation Detail</p>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{item.patients?.flag || '🏥'} {item.patients?.name || '(이름 없음)'}</p>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className={`rounded-xl p-4 border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50">{ESCALATION_TYPE_LABELS[item.escalation_type] || item.escalation_type}</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: getEscalationPriorityMeta(item.priority).color, background: getEscalationPriorityMeta(item.priority).bg }}>{getEscalationPriorityMeta(item.priority).label}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-white border border-zinc-200'}`}>{ESCALATION_STATUS_LABELS[item.status] || item.status}</span>
            </div>
            <p className={`text-[12px] mt-3 leading-6 ${darkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{item.source_message?.content || '원문 메시지 없음'}</p>
            <p className={`text-[11px] mt-3 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.patient_visible_status_text}</p>
            <div className={`mt-4 grid grid-cols-2 gap-2 text-[10px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <div>Acknowledged by: {actorLabel(item.acknowledged_by)}</div>
              <div>Responded by: {actorLabel(item.responded_by)}</div>
              <div>Resolved by: {actorLabel(item.resolved_by)}</div>
              <div>Closed by: {actorLabel(item.closed_by)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Type</span>
              <select value={escalationType} onChange={e => setEscalationType(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Priority</span>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Assigned Role</span>
              <select value={assignedRole} onChange={e => setAssignedRole(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Assigned User</span>
              <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                <option value="">Role queue only</option>
                {filteredUsers.map(user => <option key={user.user_id} value={user.user_id}>{user.email}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => run('assign')} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: TEAL }}>{busy === 'assign' ? '저장 중…' : '재배정 저장'}</button>
            <button onClick={() => run('acknowledge')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'acknowledge' ? '처리 중…' : 'Acknowledge'}</button>
            <button onClick={() => run('responded')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'responded' ? '처리 중…' : 'Mark Responded'}</button>
            <button onClick={() => run('resolve')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'resolve' ? '처리 중…' : 'Resolve'}</button>
            <button onClick={() => run('close')} className="col-span-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-700">{busy === 'close' ? '처리 중…' : 'Close'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GenerateLinkModal ─────────────────────────────────────────────────────────
function GenerateLinkModal({ visit, darkMode, clinicId, onClose, onGenerated }) {
  const [phase, setPhase]   = useState('confirm');
  const [url, setUrl]       = useState(null);
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  async function generate() {
    setPhase('generating');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/my-tiki/links', {
        method: 'POST', headers,
        body: JSON.stringify({ visitId: visit.id, clinicId, patientLang: visit.patient_lang || 'ko' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUrl(data.url);
      setPhase('done');
      onGenerated(visit.id, { id: data.link_id, status: 'active', expires_at: data.expires_at, first_opened_at: null });
    } catch (err) {
      setErrMsg(err.message);
      setPhase('error');
    }
  }

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const panelBg = darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200';
  const textP   = darkMode ? 'text-zinc-100' : 'text-zinc-800';
  const textS   = darkMode ? 'text-zinc-300' : 'text-zinc-700';
  const textM   = darkMode ? 'text-zinc-500' : 'text-zinc-400';
  const urlBg   = darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-50 text-zinc-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border ${panelBg}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-zinc-700' : 'border-zinc-100'}`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${textP}`}>
            <Link2 size={14} style={{ color: TEAL }} />
            My Tiki 링크 발급
          </h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className={`text-sm ${textS}`}>
            <span className="font-semibold">{visit.patient_flag} {visit.patient_name}</span>에게 링크를 발급합니다.
          </div>
          {phase === 'confirm' && <div className={`text-[11px] ${textM}`}>유효 기간: 90일</div>}
          {phase === 'generating' && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: TEAL }}>
              <Loader2 size={14} className="animate-spin" /> 발급 중…
            </div>
          )}
          {phase === 'done' && url && (
            <>
              <div className={`rounded-xl border p-3 ${darkMode ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-semibold ${textP}`}>프런트 데스크 QR</p>
                    <p className={`text-[10px] mt-1 ${textM}`}>링크 복사 대신 태블릿/모니터에서 바로 보여줄 수 있습니다.</p>
                  </div>
                  <img
                    src={buildQrImageUrl(url)}
                    alt="My Tiki QR"
                    width={112}
                    height={112}
                    style={{ width: 112, height: 112, borderRadius: 10, background: '#fff', padding: 6 }}
                  />
                </div>
              </div>
              <div className={`rounded-lg px-3 py-2 font-mono text-[11px] break-all ${urlBg}`}>{url}</div>
              <button onClick={copyUrl} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: copied ? SAGE : TEAL }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? '복사됨' : '링크 복사'}
              </button>
            </>
          )}
          {phase === 'error' && (
            <div className="rounded-lg px-3 py-2 text-[11px] bg-red-50 text-red-700 border border-red-100">발급 실패: {errMsg}</div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-xs font-medium border ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
            {phase === 'done' ? '닫기' : '취소'}
          </button>
          {(phase === 'confirm' || phase === 'error') && (
            <button onClick={generate} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: TEAL }}>
              {phase === 'error' ? '재시도' : '링크 발급'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MyTikiTab — Ops Board ────────────────────────────────────────────────────
export default function MyTikiTab({ darkMode }) {
  const { clinicId } = useAuth();

  const [visits,          setVisits]          = useState([]);
  const [summary,         setSummary]         = useState({ total: 0, formsPending: 0, checkedIn: 0, activeLinks: 0, arrived: 0, roomReady: 0 });
  const [rooms,           setRooms]           = useState([]);
  const [roomSummary,     setRoomSummary]     = useState({ total: 0, free: 0, occupied: 0, readyQueue: 0 });
  const [roomQueue,       setRoomQueue]       = useState([]);
  const [escalations,     setEscalations]     = useState([]);
  const [escalationSummary, setEscalationSummary] = useState({ open: 0, urgent: 0, unanswered: 0 });
  const [aftercareItems,  setAftercareItems]  = useState([]);
  const [aftercareSummary, setAftercareSummary] = useState({ due: 0, responded: 0, concern: 0, urgent: 0, safe_for_return: 0 });
  const [aftercareScheduler, setAftercareScheduler] = useState(null);
  const [staffUsers,      setStaffUsers]      = useState([]);
  const [loadingEscalations, setLoadingEscalations] = useState(true);
  const [loadingAftercare, setLoadingAftercare] = useState(true);
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState(null);
  const [search,          setSearch]          = useState('');
  const [stageFilter,     setStageFilter]     = useState('all');
  const [dateRange,       setDateRange]       = useState('today');
  const [escalationGroupBy, setEscalationGroupBy] = useState('status');
  const [escalationStatusFilter, setEscalationStatusFilter] = useState('all');
  const [escalationPriorityFilter, setEscalationPriorityFilter] = useState('all');
  const [escalationRoleFilter, setEscalationRoleFilter] = useState('all');
  const [aftercareFilter, setAftercareFilter] = useState('all');
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [actionModal,     setActionModal]     = useState(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showCsvImport,   setShowCsvImport]   = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [checkingInIds,   setCheckingInIds]   = useState(new Set());
  const [assigningRoomIds, setAssigningRoomIds] = useState(new Set());
  const [reviewingAftercareIds, setReviewingAftercareIds] = useState(new Set());

  // ── Theme ──────────────────────────────────────────────────────────────────
  const bg        = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const textP     = darkMode ? 'text-zinc-100' : 'text-zinc-800';
  const textS     = darkMode ? 'text-zinc-400' : 'text-zinc-500';
  const borderCls = darkMode ? 'border-zinc-800' : 'border-zinc-200';
  const headerBg  = darkMode ? 'bg-zinc-900' : 'bg-white';
  const inputBg   = darkMode
    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
    : 'bg-white border-zinc-200 text-zinc-700 placeholder-zinc-400';

  // ── Fetch visits ───────────────────────────────────────────────────────────
  const fetchVisits = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({ dateRange, limit: 300 });
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      const res = await fetch(`/api/staff/ops-board?${params}`, { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVisits((data.visits || []).map(normalizeVisit));
      setSummary(data.summary || { total: 0, formsPending: 0, checkedIn: 0, activeLinks: 0, arrived: 0, roomReady: 0 });
      setRooms(data.rooms || []);
      setRoomSummary(data.room_summary || { total: 0, free: 0, occupied: 0, readyQueue: 0 });
      setRoomQueue((data.room_ready_queue || []).map(normalizeVisit));
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, dateRange, stageFilter]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    if (!shouldPollOpsBoard(dateRange)) return undefined;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      fetchVisits();
    }, 20000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchVisits();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dateRange, fetchVisits]);

  const fetchEscalations = useCallback(async () => {
    if (!clinicId) return;
    setLoadingEscalations(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (escalationStatusFilter !== 'all') params.set('status', escalationStatusFilter);
      if (escalationPriorityFilter !== 'all') params.set('priority', escalationPriorityFilter);
      if (escalationRoleFilter !== 'all') params.set('assigned_role', escalationRoleFilter);
      const res = await fetch(`/api/staff/escalations?${params.toString()}`, { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEscalations(data.items || []);
      setEscalationSummary(data.summary || { open: 0, urgent: 0, unanswered: 0 });
      setStaffUsers(data.staff_users || []);
    } catch (err) {
      console.error('[escalations]', err.message);
    } finally {
      setLoadingEscalations(false);
    }
  }, [clinicId, escalationStatusFilter, escalationPriorityFilter, escalationRoleFilter]);

  useEffect(() => { fetchEscalations(); }, [fetchEscalations]);

  const fetchAftercare = useCallback(async () => {
    if (!clinicId) return;
    setLoadingAftercare(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (aftercareFilter !== 'all') params.set('filter', aftercareFilter);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/staff/aftercare${suffix}`, { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAftercareItems(data.items || []);
      setAftercareSummary(data.summary || { due: 0, responded: 0, concern: 0, urgent: 0, safe_for_return: 0 });
      setAftercareScheduler(data.scheduler || null);
    } catch (err) {
      console.error('[aftercare]', err.message);
    } finally {
      setLoadingAftercare(false);
    }
  }, [clinicId, aftercareFilter]);

  useEffect(() => { fetchAftercare(); }, [fetchAftercare]);

  // ── Derived filtered list ──────────────────────────────────────────────────
  const filtered = visits.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.patient_name.toLowerCase().includes(q) || v.procedure_name.toLowerCase().includes(q);
  });

  const groupedEscalations = escalations.reduce((acc, item) => {
    const key = escalationGroupBy === 'priority'
      ? item.priority
      : escalationGroupBy === 'role'
        ? item.assigned_role
        : item.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const groupedAftercare = aftercareItems.reduce((acc, item) => {
    const key = item.urgent_flag ? 'urgent' : item.risk_level || 'normal';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const escalationUrgentMeta = getOperationalUrgencyMeta({ kind: 'escalation', priority: 'urgent' });
  const escalationHighMeta = getOperationalUrgencyMeta({ kind: 'escalation', priority: 'high' });
  const aftercareDueMeta = getOperationalUrgencyMeta({ kind: 'arrival', state: 'forms_pending' });
  const aftercareConcernMeta = getOperationalUrgencyMeta({ kind: 'aftercare', riskLevel: 'concern' });
  const aftercareUrgentMeta = getOperationalUrgencyMeta({ kind: 'aftercare', riskLevel: 'urgent', urgentFlag: true });
  const aftercareSafeReturnMeta = getOperationalUrgencyMeta({ kind: 'room', roomReady: true });

  // ── Check-in action ────────────────────────────────────────────────────────
  async function handleCheckIn(visitId) {
    if (checkingInIds.has(visitId)) return;
    setCheckingInIds(prev => new Set([...prev, visitId]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/my-tiki/visits/${visitId}/check-in`, { method: 'POST', headers });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(d.error);
      await fetchVisits();
    } catch (err) {
      console.error('[check-in]', err.message);
    } finally {
      setCheckingInIds(prev => { const next = new Set(prev); next.delete(visitId); return next; });
    }
  }

  async function handleAssignRoom(visitId, roomId) {
    if (assigningRoomIds.has(visitId)) return;
    setAssigningRoomIds((prev) => new Set([...prev, visitId]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/visits/${visitId}/assign-room`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ room_id: roomId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchVisits();
    } catch (err) {
      console.error('[assign-room]', err.message);
    } finally {
      setAssigningRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(visitId);
        return next;
      });
    }
  }

  async function handleClearRoom(visitId) {
    if (assigningRoomIds.has(visitId)) return;
    setAssigningRoomIds((prev) => new Set([...prev, visitId]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/visits/${visitId}/clear-room`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchVisits();
    } catch (err) {
      console.error('[clear-room]', err.message);
    } finally {
      setAssigningRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(visitId);
        return next;
      });
    }
  }

  async function handleCreateRoom(payload) {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/staff/rooms', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchVisits();
    } catch (err) {
      console.error('[create-room]', err.message);
    }
  }

  async function handleUpdateRoom(roomId, payload) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/rooms/${roomId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchVisits();
    } catch (err) {
      console.error('[update-room]', err.message);
    }
  }

  async function handleReviewAftercare(eventId) {
    if (reviewingAftercareIds.has(eventId)) return;
    setReviewingAftercareIds((prev) => new Set([...prev, eventId]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/aftercare/${eventId}/review`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchAftercare();
    } catch (err) {
      console.error('[aftercare-review]', err.message);
    } finally {
      setReviewingAftercareIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  }

  // ── Stage update ───────────────────────────────────────────────────────────
  function handleStageChange(visitId, stage) {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, stage } : v));
  }

  // ── Link revoke ────────────────────────────────────────────────────────────
  async function handleRevoke(visit) {
    if (!visit.link?.id) return;
    try {
      const headers = await authHeaders();
      await fetch(`/api/my-tiki/links/${visit.link.id}/revoke?clinicId=${clinicId}`, { method: 'POST', headers });
      setVisits(prev => prev.map(v =>
        v.id === visit.id ? { ...v, link_status: 'revoked', link: { ...v.link, status: 'revoked' } } : v
      ));
      setSummary(prev => ({ ...prev, activeLinks: Math.max(0, prev.activeLinks - 1) }));
    } catch (err) {
      console.error('[revoke]', err.message);
    }
  }

  function handleAction(type, visit) {
    if (type === 'generate') setActionModal({ type: 'generate', visit });
    else if (type === 'revoke') handleRevoke(visit);
    // detail — future
  }

  function handleGenerated(visitId, newLink) {
    setVisits(prev => prev.map(v =>
      v.id === visitId ? { ...v, link_status: 'active', link: newLink } : v
    ));
    setSummary(prev => ({ ...prev, activeLinks: prev.activeLinks + 1 }));
  }

  function handleCreated(rawVisit) {
    fetchVisits();
    setShowQuickCreate(false);
  }

  // ── Today date label ───────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  async function openEscalation(id) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/escalations/${id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSelectedEscalation({
        ...data.item,
        source_message: data.source_message,
      });
      if (data.staff_users) setStaffUsers(data.staff_users);
    } catch (err) {
      console.error('[escalation-open]', err.message);
    }
  }

  async function runEscalationAction(action, payload) {
    if (!selectedEscalation) return;
    const actionMap = {
      acknowledge: 'acknowledge',
      assign: 'assign',
      responded: 'responded',
      resolve: 'resolve',
      close: 'close',
    };
    const endpoint = actionMap[action];
    if (!endpoint) return;

    const headers = await authHeaders();
    const res = await fetch(`/api/staff/escalations/${selectedEscalation.id}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setSelectedEscalation(prev => prev ? { ...prev, ...data.item } : prev);
    setEscalations(prev => prev.map(item => item.id === selectedEscalation.id ? { ...item, ...data.item } : item));
    fetchEscalations();
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bg}`} style={{ fontFamily: F.sans }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`px-6 py-4 border-b ${headerBg} ${borderCls} shrink-0`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} style={{ color: TEAL }} />
              <h1 className={`text-sm font-bold ${textP}`}>Tiki Desk</h1>
              <span className={`text-[11px] font-medium ${textS}`}>— {todayLabel}</span>
            </div>
            <p className={`text-[11px] mt-0.5 ${textS}`}>코디네이터 운영 현황 · 체크인 · TikiBell triage · Rooms Lite</p>
            {shouldPollOpsBoard(dateRange) && (
              <p className={`text-[10px] mt-1 ${textS}`}>오늘 보기에서는 20초마다 가볍게 새로고침됩니다.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
              title="CSV 일괄 가져오기"
            >
              CSV 가져오기
            </button>
            <button
              onClick={() => setShowQuickCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: TEAL, boxShadow: `0 1px 6px ${TEAL}40` }}
            >
              <Plus size={11} strokeWidth={2.5} /> 새 환자
            </button>
            <button
              onClick={fetchVisits}
              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-100'}`}
              title="새로고침"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-6 gap-2 mt-4">
          <SummaryCard label="방문 수"     value={loading ? '…' : summary.total}        color={TEAL}    sub={dateRange === 'today' ? '오늘' : DATE_RANGES.find(d => d.key === dateRange)?.label} darkMode={darkMode} />
          <SummaryCard label="폼 미완료"   value={loading ? '…' : summary.formsPending}  color="#D09262" sub="문진·동의서"      darkMode={darkMode} />
          <SummaryCard label="도착 신호"   value={loading ? '…' : summary.arrived}       color="#D09262" sub="환자 자가 도착"   darkMode={darkMode} />
          <SummaryCard label="체크인 완료" value={loading ? '…' : summary.checkedIn}     color={SAGE}    sub="데스크 확인"     darkMode={darkMode} />
          <SummaryCard label="룸 준비"     value={loading ? '…' : summary.roomReady}     color="#16A34A" sub="체크인+서류 완료" darkMode={darkMode} />
          <SummaryCard label="활성 링크"   value={loading ? '…' : summary.activeLinks}   color="#5B72A8" sub="발송·열람됨"     darkMode={darkMode} />
        </div>

        {aftercareScheduler?.status === 'degraded' && (
          <div className={`mt-2 rounded-xl border px-3 py-2 text-[11px] ${darkMode ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            Aftercare scheduler degraded · background delivery may be delayed.
          </div>
        )}

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFCF8' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DoorOpen size={14} style={{ color: TEAL }} />
                <h2 className={`text-sm font-bold ${textP}`}>Rooms Lite</h2>
              </div>
              <p className={`text-[11px] mt-1 ${textS}`}>빈 방, 사용 중인 방, 다음 배정 후보를 한 화면에서 확인합니다.</p>
            </div>
            <button
              onClick={() => setShowRoomSettings((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
            >
              {showRoomSettings ? '설정 닫기' : '룸 설정'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <EscalationMiniCard label="Preset Rooms" value={loading ? '…' : roomSummary.total} sub="등록된 운영 room" color={TEAL} darkMode={darkMode} />
            <EscalationMiniCard label="Free" value={loading ? '…' : roomSummary.free} sub="즉시 배정 가능" color="#16A34A" darkMode={darkMode} />
            <EscalationMiniCard label="Occupied" value={loading ? '…' : roomSummary.occupied} sub="현재 사용 중" color="#DC2626" darkMode={darkMode} />
            <EscalationMiniCard label="Ready Queue" value={loading ? '…' : roomSummary.readyQueue} sub="다음 room 후보" color="#D09262" darkMode={darkMode} />
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {(rooms || []).map((room, index) => (
              <RoomTrafficCard
                key={room.id}
                room={room}
                queueVisit={roomQueue[index] || null}
                darkMode={darkMode}
                busy={assigningRoomIds.has(room.current_visit?.id || roomQueue[index]?.id)}
                onAssignRoom={handleAssignRoom}
                onClearRoom={handleClearRoom}
              />
            ))}
            {!loading && rooms.length === 0 && (
              <div className={`col-span-4 text-xs ${textS}`}>등록된 room preset이 없습니다. 아래에서 첫 room을 추가하면 바로 traffic control에 반영됩니다.</div>
            )}
          </div>

          {showRoomSettings && (
            <RoomPresetManager
              rooms={rooms}
              darkMode={darkMode}
              onCreateRoom={handleCreateRoom}
              onUpdateRoom={handleUpdateRoom}
            />
          )}
        </div>

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFDFC' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck size={14} style={{ color: '#A47764' }} />
                <h2 className={`text-sm font-bold ${textP}`}>Escalations</h2>
              </div>
              <p className={`text-[11px] mt-1 ${textS}`}>환자 질문이 운영 task로 전환된 항목</p>
            </div>
            <button onClick={fetchEscalations} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`} title="Escalations 새로고침">
              <RefreshCw size={13} className={loadingEscalations ? 'animate-spin' : ''} />
            </button>
          </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <EscalationMiniCard label="Open Items" value={loadingEscalations ? '…' : escalationSummary.open} sub="진행 중 triage" color={TEAL} darkMode={darkMode} />
          <EscalationMiniCard label="Urgent" value={loadingEscalations ? '…' : escalationSummary.urgent} sub="즉시 검토 필요" color={escalationUrgentMeta.color} darkMode={darkMode} />
          <EscalationMiniCard label="Unanswered" value={loadingEscalations ? '…' : escalationSummary.unanswered} sub="아직 확인 전" color={escalationHighMeta.color} darkMode={darkMode} />
        </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {[
              ['status', '상태별'],
              ['priority', '우선순위별'],
              ['role', '담당 역할별'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setEscalationGroupBy(key)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold border"
                style={escalationGroupBy === key
                  ? { background: '#A47764', color: '#fff', borderColor: '#A47764' }
                  : { background: 'transparent', color: darkMode ? '#A1A1AA' : '#6B7280', borderColor: darkMode ? '#3F3F46' : '#E5E7EB' }}
              >
                {label}
              </button>
            ))}

            <select value={escalationStatusFilter} onChange={e => setEscalationStatusFilter(e.target.value)} className={`ml-auto rounded-lg border px-2 py-1 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
              <option value="all">전체 상태</option>
              {Object.entries(ESCALATION_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={escalationPriorityFilter} onChange={e => setEscalationPriorityFilter(e.target.value)} className={`rounded-lg border px-2 py-1 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
              <option value="all">전체 우선순위</option>
              {Object.entries(ESCALATION_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={escalationRoleFilter} onChange={e => setEscalationRoleFilter(e.target.value)} className={`rounded-lg border px-2 py-1 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
              <option value="all">전체 역할</option>
              {Object.entries(ESCALATION_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {loadingEscalations ? (
              <div className={`text-xs ${textS}`}>Escalation tasks 불러오는 중…</div>
            ) : Object.keys(groupedEscalations).length === 0 ? (
              <div className={`text-xs ${textS}`}>현재 조건에 맞는 escalation task가 없습니다.</div>
            ) : (
              Object.entries(groupedEscalations).map(([groupKey, items]) => (
                <div key={groupKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] font-bold ${textP}`}>
                      {getEscalationGroupLabel(escalationGroupBy, groupKey)}
                    </span>
                    <span className={`text-[10px] ${textS}`}>{items.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map(item => (
                      <EscalationTaskCard key={item.id} item={item} darkMode={darkMode} onOpen={openEscalation} staffUsers={staffUsers} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFDFC' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={14} style={{ color: '#4E8FA0' }} />
                <h2 className={`text-sm font-bold ${textP}`}>Aftercare</h2>
              </div>
              <p className={`text-[11px] mt-1 ${textS}`}>사후관리 체크인, 위험 신호, 리턴 가능 상태를 운영 task로 확인합니다.</p>
            </div>
            <button onClick={fetchAftercare} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`} title="Aftercare 새로고침">
              <RefreshCw size={13} className={loadingAftercare ? 'animate-spin' : ''} />
            </button>
          </div>

          {aftercareScheduler?.status === 'degraded' && (
            <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${darkMode ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              Aftercare scheduler degraded
              {aftercareScheduler.reason ? ` — ${aftercareScheduler.reason.replaceAll('_', ' ')}` : ''}
              {aftercareScheduler.fallback_mode ? ` · ${aftercareScheduler.fallback_mode}` : ''}
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 mt-4">
            <EscalationMiniCard label="Due" value={loadingAftercare ? '…' : aftercareSummary.due} sub="응답 대기" color={aftercareDueMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="Responded" value={loadingAftercare ? '…' : aftercareSummary.responded} sub="환자 응답 완료" color={SAGE} darkMode={darkMode} />
            <EscalationMiniCard label="Concern" value={loadingAftercare ? '…' : aftercareSummary.concern} sub="검토 필요" color={aftercareConcernMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="Urgent" value={loadingAftercare ? '…' : aftercareSummary.urgent} sub="긴급 신호" color={aftercareUrgentMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="Safe Return" value={loadingAftercare ? '…' : aftercareSummary.safe_for_return} sub="재방문 제안 가능" color={aftercareSafeReturnMeta.color} darkMode={darkMode} />
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {Object.entries(AFTERCARE_FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAftercareFilter(key)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold border"
                style={aftercareFilter === key
                  ? { background: '#4E8FA0', color: '#fff', borderColor: '#4E8FA0' }
                  : { background: 'transparent', color: darkMode ? '#A1A1AA' : '#6B7280', borderColor: darkMode ? '#3F3F46' : '#E5E7EB' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {loadingAftercare ? (
              <div className={`text-xs ${textS}`}>Aftercare items 불러오는 중…</div>
            ) : Object.keys(groupedAftercare).length === 0 ? (
              <div className={`text-xs ${textS}`}>현재 조건에 맞는 aftercare item이 없습니다.</div>
            ) : (
              Object.entries(groupedAftercare).map(([groupKey, items]) => (
                <div key={groupKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] font-bold ${textP}`}>
                      {getAftercareGroupLabel(groupKey)}
                    </span>
                    <span className={`text-[10px] ${textS}`}>{items.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((item) => (
                      <AftercareTaskCard
                        key={item.id}
                        item={item}
                        darkMode={darkMode}
                        busy={reviewingAftercareIds.has(item.id)}
                        onReview={handleReviewAftercare}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-6 py-2.5 border-b ${headerBg} ${borderCls} shrink-0`}>

        {/* Date tabs */}
        <div className="flex items-center gap-1 mr-2">
          {DATE_RANGES.map(dr => {
            const active = dateRange === dr.key;
            return (
              <button
                key={dr.key}
                onClick={() => setDateRange(dr.key)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border`}
                style={active
                  ? { background: TEAL, color: '#fff', border: `1px solid ${TEAL}` }
                  : { background: 'transparent', color: darkMode ? '#A1A1AA' : '#6B7280', border: `1px solid ${darkMode ? '#3F3F46' : '#E5E7EB'}` }
                }
              >
                {dr.label}
              </button>
            );
          })}
        </div>

        <div className={`w-px h-5 ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'} shrink-0`} />

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="환자명 또는 시술명"
            style={{ outline: 'none' }}
            onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${TEAL}40`}
            onBlur={e => e.target.style.boxShadow = ''}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border ${inputBg}`}
          />
        </div>

        {/* Stage filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {['all', ...STAGE_ORDER].map(s => {
            const active = stageFilter === s;
            const label  = s === 'all' ? '전체' : STAGE_META[s]?.label || s;
            const color  = s === 'all' ? TEAL : STAGE_META[s]?.color || '#6B7280';
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all`}
                style={active
                  ? { background: color, color: '#fff', border: `1px solid ${color}` }
                  : { background: 'transparent', color: darkMode ? '#71717A' : '#9CA3AF', border: `1px solid ${darkMode ? '#3F3F46' : '#E5E7EB'}` }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table header ────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 px-4 py-1.5 border-b shrink-0 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
        {[
          { label: '환자',   w: 128 },
          { label: '시술',   flex: 1 },
          { label: '단계',   w: 80 },
          { label: '서류',   w: 60 },
          { label: '방',     w: 188 },
          { label: '링크',   w: 64 },
          { label: '액션',   w: 124, align: 'right' },
        ].map(col => (
          <div
            key={col.label}
            style={{ width: col.w, flex: col.flex, flexShrink: col.flex ? undefined : 0, textAlign: col.align }}
            className={`text-[9px] font-bold uppercase tracking-widest ${textS}`}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* ── Table body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: TEAL }} />
            <p className={`text-xs ${textS}`}>방문 목록 불러오는 중…</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertTriangle size={28} className="text-red-400" strokeWidth={1.4} />
            <p className="text-xs text-red-500">{fetchError}</p>
            <button onClick={fetchVisits} className="text-xs font-medium px-3 py-1.5 rounded-lg border" style={{ color: TEAL, borderColor: TEAL + '40' }}>재시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <ClipboardCheck size={36} className={textS} strokeWidth={1.2} />
            <p className={`text-sm ${textS}`}>
              {visits.length === 0 ? '이 기간에 등록된 방문이 없습니다' : '검색 조건에 맞는 방문이 없습니다'}
            </p>
            {visits.length === 0 && dateRange === 'today' && (
              <button
                onClick={() => setShowQuickCreate(true)}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: TEAL }}
              >
                <Plus size={12} /> 첫 환자 등록
              </button>
            )}
          </div>
        ) : (
          filtered.map(visit => (
            <VisitRow
              key={visit.id}
              visit={visit}
              dateRange={dateRange}
              darkMode={darkMode}
              checkingIn={checkingInIds.has(visit.id)}
              assigningRoom={assigningRoomIds.has(visit.id)}
              rooms={rooms}
              onCheckIn={handleCheckIn}
              onAction={handleAction}
              onAssignRoom={handleAssignRoom}
              onClearRoom={handleClearRoom}
              onStageChange={handleStageChange}
            />
          ))
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {actionModal?.type === 'generate' && (
        <GenerateLinkModal
          visit={actionModal.visit}
          darkMode={darkMode}
          clinicId={clinicId}
          onClose={() => setActionModal(null)}
          onGenerated={handleGenerated}
        />
      )}
      {showQuickCreate && (
        <QuickVisitCreate
          clinicId={clinicId}
          darkMode={darkMode}
          onClose={() => setShowQuickCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showCsvImport && (
        <CsvImportModal
          clinicId={clinicId}
          darkMode={darkMode}
          onClose={() => setShowCsvImport(false)}
          onImported={() => { fetchVisits(); setShowCsvImport(false); }}
        />
      )}
      {selectedEscalation && (
        <EscalationDetailDrawer
          item={selectedEscalation}
          staffUsers={staffUsers}
          darkMode={darkMode}
          onClose={() => setSelectedEscalation(null)}
          onAction={runEscalationAction}
        />
      )}
    </div>
  );
}
