/**
 * client/src/components/mytiki/MyTikiTab.jsx
 * ─────────────────────────────────────────────────────────────
 * Ops Board — morning coordinator whiteboard.
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
  LogIn, DoorOpen, ChevronDown, X, Navigation,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import QuickVisitCreate from './QuickVisitCreate';
import CsvImportModal   from './CsvImportModal';

// ── Design tokens ────────────────────────────────────────────────────────────
const TEAL = '#4E8FA0';
const SAGE = '#5A8F80';
const F    = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };

// ── Stage meta ───────────────────────────────────────────────────────────────
const STAGE_META = {
  booked:    { label: '예약 확정', color: '#5B72A8', bg: '#5B72A810' },
  pre_visit: { label: '방문 전',   color: '#D09262', bg: '#D0926210' },
  treatment: { label: '시술 중',   color: '#5A8F80', bg: '#5A8F8010' },
  post_care: { label: '사후 관리', color: '#A47764', bg: '#A4776410' },
  followup:  { label: '팔로업',    color: '#9B72CF', bg: '#9B72CF10' },
  closed:    { label: '완료',      color: '#6B7280', bg: '#6B728010' },
};
const STAGE_ORDER = ['booked','pre_visit','treatment','post_care','followup','closed'];

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
    patient_arrived_at:  v.patient_arrived_at || null,
  };
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
function ArrivalBadge({ arrivedAt, formsReady, darkMode }) {
  if (!arrivedAt) return null;
  const agoLabel   = fmtAgo(arrivedAt);
  const readyColor = '#16A34A';
  const arrColor   = '#D09262';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
      <span
        className="inline-flex items-center gap-0.5"
        style={{ fontSize: 10, fontWeight: 700, color: arrColor }}
        title={`환자 도착 신호: ${new Date(arrivedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
      >
        <Navigation size={9} strokeWidth={2.5} />
        도착 {agoLabel}
      </span>
      {formsReady && (
        <span
          className="inline-flex items-center gap-0.5"
          style={{ fontSize: 9, fontWeight: 700, color: readyColor }}
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

// ── RoomCell — inline edit ───────────────────────────────────────────────────
function RoomCell({ visitId, room, darkMode, onRoomChange }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(room || '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(room || ''); }, [room]);

  async function save() {
    setEditing(false);
    const trimmed = val.trim() || null;
    if (trimmed === (room || null)) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/my-tiki/visits/${visitId}/room`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ room: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRoomChange(visitId, trimmed);
    } catch {
      setVal(room || '');
    }
  }

  function cancel() { setEditing(false); setVal(room || ''); }

  const roomColor = room ? TEAL : '#9CA3AF';

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        placeholder="방 이름"
        maxLength={20}
        className="w-16 text-[11px] px-1.5 py-0.5 rounded border outline-none"
        style={{
          borderColor: TEAL,
          background: darkMode ? '#27272A' : '#fff',
          color: darkMode ? '#F4F4F5' : '#111827',
          fontFamily: F.sans,
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-0.5 text-[10px] font-semibold transition-colors rounded px-1 py-0.5 hover:bg-black/5"
      style={{ color: roomColor }}
      title={room ? '방 변경' : '방 배정'}
    >
      {room ? (
        <><DoorOpen size={10} /> {room}</>
      ) : (
        <span className="text-zinc-400">배정</span>
      )}
    </button>
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
function VisitRow({ visit, dateRange, darkMode, checkingIn, onCheckIn, onAction, onRoomChange, onStageChange }) {
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
      <div style={{ width: 72, flexShrink: 0 }}>
        <RoomCell visitId={visit.id} room={visit.room} darkMode={darkMode} onRoomChange={onRoomChange} />
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
  const [summary,         setSummary]         = useState({ total: 0, formsPending: 0, checkedIn: 0, activeLinks: 0, arrived: 0 });
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState(null);
  const [search,          setSearch]          = useState('');
  const [stageFilter,     setStageFilter]     = useState('all');
  const [dateRange,       setDateRange]       = useState('today');
  const [actionModal,     setActionModal]     = useState(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showCsvImport,   setShowCsvImport]   = useState(false);
  const [checkingInIds,   setCheckingInIds]   = useState(new Set());

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
      const params = new URLSearchParams({ clinicId, dateRange, limit: 300 });
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      const res = await fetch(`/api/my-tiki/visits?${params}`, { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVisits((data.visits || []).map(normalizeVisit));
      setSummary(data.summary || { total: 0, formsPending: 0, checkedIn: 0, activeLinks: 0, arrived: 0 });
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, dateRange, stageFilter]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  // ── Derived filtered list ──────────────────────────────────────────────────
  const filtered = visits.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.patient_name.toLowerCase().includes(q) || v.procedure_name.toLowerCase().includes(q);
  });

  // ── Check-in action ────────────────────────────────────────────────────────
  async function handleCheckIn(visitId) {
    if (checkingInIds.has(visitId)) return;
    setCheckingInIds(prev => new Set([...prev, visitId]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/my-tiki/visits/${visitId}/check-in`, { method: 'POST', headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status !== 409) throw new Error(d.error);
      }
      const d = await res.json();
      const checkedAt = d.checked_in_at || new Date().toISOString();
      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, checked_in_at: checkedAt } : v));
      setSummary(prev => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
    } catch (err) {
      console.error('[check-in]', err.message);
    } finally {
      setCheckingInIds(prev => { const next = new Set(prev); next.delete(visitId); return next; });
    }
  }

  // ── Room update ────────────────────────────────────────────────────────────
  function handleRoomChange(visitId, room) {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, room } : v));
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
    setVisits(prev => [normalizeVisit(rawVisit), ...prev]);
    setSummary(prev => ({ ...prev, total: prev.total + 1, formsPending: prev.formsPending + 1 }));
    setShowQuickCreate(false);
  }

  // ── Today date label ───────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bg}`} style={{ fontFamily: F.sans }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`px-6 py-4 border-b ${headerBg} ${borderCls} shrink-0`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} style={{ color: TEAL }} />
              <h1 className={`text-sm font-bold ${textP}`}>Ops Board</h1>
              <span className={`text-[11px] font-medium ${textS}`}>— {todayLabel}</span>
            </div>
            <p className={`text-[11px] mt-0.5 ${textS}`}>코디네이터 운영 현황 · 체크인 · 링크 · 방 배정</p>
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
        <div className="grid grid-cols-5 gap-2 mt-4">
          <SummaryCard label="방문 수"     value={loading ? '…' : summary.total}        color={TEAL}    sub={dateRange === 'today' ? '오늘' : DATE_RANGES.find(d => d.key === dateRange)?.label} darkMode={darkMode} />
          <SummaryCard label="폼 미완료"   value={loading ? '…' : summary.formsPending}  color="#D09262" sub="문진·동의서"      darkMode={darkMode} />
          <SummaryCard label="도착 신호"   value={loading ? '…' : summary.arrived}       color="#D09262" sub="환자 자가 도착"   darkMode={darkMode} />
          <SummaryCard label="체크인 완료" value={loading ? '…' : summary.checkedIn}     color={SAGE}    sub="데스크 확인"     darkMode={darkMode} />
          <SummaryCard label="활성 링크"   value={loading ? '…' : summary.activeLinks}   color="#5B72A8" sub="발송·열람됨"     darkMode={darkMode} />
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
          { label: '방',     w: 72 },
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
              onCheckIn={handleCheckIn}
              onAction={handleAction}
              onRoomChange={handleRoomChange}
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
    </div>
  );
}
