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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Link2, RefreshCw, XCircle, CheckCircle2,
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
import { buildTikiDeskCounts, buildTikiDeskFlow, buildVisitStatusBadges, getDeskNextAction } from '../../lib/tikiDeskFlow';
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
const MOCHA = '#0145F2';
const MOCHA_DARK = '#10367D';
const MOCHA_SOFT = '#BBE1FA';
const TEAL = MOCHA;
const SAGE = '#3B6500';
const F    = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };

// ── Link status meta ─────────────────────────────────────────────────────────
const LINK_META = {
  none:    { label: '미발송', icon: Clock,         color: '#9CA3AF' },
  active:  { label: '발송됨', icon: Send,          color: '#0145F2' },
  opened:  { label: '열람됨', icon: Eye,           color: SAGE },
  expired: { label: '만료됨', icon: AlertTriangle, color: '#9A4F00' },
  revoked: { label: '폐기됨', icon: XCircle,       color: '#EF4444' },
};

// ── Date range tabs ──────────────────────────────────────────────────────────
const DATE_RANGES = [
  { key: 'today',    label: '오늘' },
  { key: 'tomorrow', label: '내일' },
  { key: 'week',     label: '이번주' },
  { key: 'all',      label: '전체' },
];

const DEFAULT_ESCALATION_SUMMARY = {
  open: 0,
  urgent: 0,
  unanswered: 0,
  overdue: 0,
  due_soon: 0,
};

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

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function visitFitsDateRange(iso, range) {
  if (!iso || range === 'all') return true;
  const visitTime = new Date(iso).getTime();
  const today = startOfLocalDay();
  if (range === 'today') {
    return visitTime >= today.getTime() && visitTime < addLocalDays(today, 1).getTime();
  }
  if (range === 'tomorrow') {
    return visitTime >= addLocalDays(today, 1).getTime() && visitTime < addLocalDays(today, 2).getTime();
  }
  if (range === 'week') {
    return visitTime >= today.getTime() && visitTime < addLocalDays(today, 7).getTime();
  }
  return true;
}

function preferredDateRangeForVisit(iso) {
  if (!iso) return 'all';
  if (visitFitsDateRange(iso, 'today')) return 'today';
  if (visitFitsDateRange(iso, 'tomorrow')) return 'tomorrow';
  if (visitFitsDateRange(iso, 'week')) return 'week';
  return 'all';
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
        className="inline-flex items-center gap-1"
        style={{ fontSize: 12, fontWeight: 800, color: arrivalMeta.color }}
        title={`환자 도착 신호: ${new Date(arrivedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
      >
        <Navigation size={12} strokeWidth={2.5} />
        도착 {agoLabel}
      </span>
      {state === 'desk_confirmation' && (
        <span
          className="inline-flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 800, color: urgencyMeta.color }}
        >
          <LogIn size={12} strokeWidth={2.5} />
          데스크 확인 필요
        </span>
      )}
      {state === 'forms_pending' && (
        <span
          className="inline-flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 800, color: urgencyMeta.color }}
        >
          <FileText size={12} strokeWidth={2.5} />
          서류 확인 필요
        </span>
      )}
      {state === 'room_ready' && (
        <span
          className="inline-flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 800, color: urgencyMeta.color }}
        >
          <CheckCircle2 size={12} strokeWidth={2.5} />
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
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold whitespace-nowrap select-none"
    >
      {m.label}
    </span>
  );
}

function LinkStatusBadge({ status }) {
  const m = LINK_META[status] || LINK_META.none;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: m.color }}>
      <Icon size={14} strokeWidth={2.3} />
      {m.label}
    </span>
  );
}

function FormChips({ intakeDone, consentDone }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${intakeDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
        {intakeDone ? <CheckCircle2 size={13} /> : <FileText size={13} strokeWidth={1.8} />}
        문진
      </span>
      <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${consentDone ? 'text-emerald-600' : 'text-zinc-400'}`}>
        {consentDone ? <CheckCircle2 size={13} /> : <FileText size={13} strokeWidth={1.8} />}
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

const DESK_TONE = {
  urgent: { color: '#B42318', bg: '#FFE6E1', border: 'rgba(250, 87, 62, 0.38)' },
  warn: { color: '#9A4F00', bg: '#FFF0DE', border: 'rgba(255, 173, 92, 0.55)' },
  ready: { color: '#527500', bg: '#F2FFD9', border: 'rgba(185, 250, 72, 0.9)' },
  steady: { color: MOCHA_DARK, bg: '#E6F0FF', border: MOCHA_SOFT },
  info: { color: MOCHA_DARK, bg: '#EDF1F5', border: '#D6E1EA' },
  muted: { color: '#40515D', bg: '#EDF1F5', border: '#D6E1EA' },
};

function DeskMetric({ label, value, helper, tone = 'info', darkMode }) {
  const m = DESK_TONE[tone] || DESK_TONE.info;
  return (
    <div
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : m.border,
        background: darkMode ? '#18181B' : '#FFFFFF',
        borderRadius: 18,
        padding: '17px 18px',
        minHeight: 116,
        boxShadow: darkMode ? 'none' : '0 12px 32px rgba(33, 24, 21, 0.06)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 850, color: darkMode ? '#D4D4D8' : '#40515D' }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 38, lineHeight: 1, fontWeight: 950, letterSpacing: '-0.05em', color: m.color }}>{value}</div>
      <div style={{ marginTop: 9, fontSize: 13, lineHeight: 1.35, fontWeight: 700, color: darkMode ? '#A1A1AA' : '#9A8880' }}>{helper}</div>
    </div>
  );
}

const VISIT_BADGE_TONE = {
  done: { color: '#16A34A', bg: '#ECFDF3', border: '#BBF7D0' },
  active: { color: '#0145F2', bg: '#EAF2FF', border: '#BBE1FA' },
  missing: { color: '#B42318', bg: '#FFE6E1', border: 'rgba(250, 87, 62, 0.32)' },
  waiting: { color: '#6B7C88', bg: '#EDF1F5', border: '#D6E1EA' },
};

function VisitStatusRail({ visit, darkMode, compact = false }) {
  const badges = buildVisitStatusBadges(visit);
  return (
    <div className={`grid grid-cols-7 ${compact ? 'gap-1 mt-2' : 'gap-1.5 mt-3'}`}>
      {badges.map((badge) => {
        const tone = VISIT_BADGE_TONE[badge.state] || VISIT_BADGE_TONE.waiting;
        return (
          <div
            key={badge.key}
            title={`${badge.label}: ${badge.helper}`}
            className="flex flex-col items-center justify-center border"
            style={{
              borderColor: darkMode ? '#27272A' : tone.border,
              background: darkMode ? '#0F172A' : tone.bg,
              borderRadius: compact ? 10 : 12,
              minHeight: compact ? 32 : 42,
              padding: compact ? '4px 2px' : '6px 3px',
            }}
          >
            <span
              style={{
                width: compact ? 7 : 9,
                height: compact ? 7 : 9,
                borderRadius: 999,
                background: badge.state === 'waiting' && darkMode ? '#52525B' : tone.color,
                boxShadow: badge.state === 'missing' ? `0 0 0 4px ${tone.color}14` : 'none',
              }}
            />
            <span
              className="truncate"
              style={{
                marginTop: compact ? 3 : 5,
                maxWidth: '100%',
                fontSize: compact ? 9 : 10,
                lineHeight: 1,
                fontWeight: 850,
                color: darkMode ? '#D4D4D8' : tone.color,
              }}
            >
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MyTikiStatusStrip({ visit, action, darkMode, compact = false }) {
  const linkStatus = visit.link_status || 'none';
  const linkLabel = linkStatus === 'opened'
    ? '열람됨'
    : ['active', 'sent'].includes(linkStatus)
      ? '링크 발급됨'
      : linkStatus === 'expired'
        ? '링크 만료'
        : '링크 필요';
  const linkTone = linkStatus === 'opened'
    ? VISIT_BADGE_TONE.done
    : ['active', 'sent'].includes(linkStatus)
      ? VISIT_BADGE_TONE.active
      : VISIT_BADGE_TONE.missing;

  const chips = [
    { key: 'link', label: linkLabel, tone: linkTone },
    { key: 'intake', label: visit.intake_done ? '문진 완료' : '문진 필요', tone: visit.intake_done ? VISIT_BADGE_TONE.done : VISIT_BADGE_TONE.missing },
    { key: 'consent', label: visit.consent_done ? '동의 완료' : '동의 필요', tone: visit.consent_done ? VISIT_BADGE_TONE.done : VISIT_BADGE_TONE.missing },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5" style={{ marginTop: compact ? 8 : 10 }}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center"
          style={{
            borderRadius: 999,
            border: `1px solid ${darkMode ? '#27272A' : chip.tone.border}`,
            background: darkMode ? '#0F172A' : chip.tone.bg,
            color: darkMode ? '#E4E4E7' : chip.tone.color,
            padding: compact ? '4px 7px' : '5px 8px',
            fontSize: compact ? 10 : 11,
            lineHeight: 1,
            fontWeight: 850,
            whiteSpace: 'nowrap',
          }}
        >
          {chip.label}
        </span>
      ))}
      <span
        className="inline-flex items-center min-w-0"
        title={action.detail}
        style={{
          borderRadius: 999,
          border: `1px solid ${darkMode ? '#27272A' : '#D6E1EA'}`,
          background: darkMode ? '#111827' : '#F8FAFC',
          color: darkMode ? '#D4D4D8' : '#40515D',
          padding: compact ? '4px 7px' : '5px 8px',
          fontSize: compact ? 10 : 11,
          lineHeight: 1,
          fontWeight: 850,
          whiteSpace: 'nowrap',
        }}
      >
        오늘 할 일: {action.label}
      </span>
    </div>
  );
}

function FlowPatientLine({ visit, mode, darkMode, compact = false }) {
  const action = getDeskNextAction(visit);
  const tone = DESK_TONE[action.tone] || DESK_TONE.muted;
  const timeSource = mode === 'booked'
    ? visit.visit_date
    : mode === 'arrived'
      ? visit.patient_arrived_at || visit.checked_in_at
      : action.at || visit.visit_date;

  return (
    <div
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : '#D6E1EA',
        background: darkMode ? '#111827' : '#FFFFFF',
        borderRadius: compact ? 14 : 16,
        padding: compact ? '10px 11px' : '14px 15px',
        minHeight: compact ? 72 : 88,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div style={{ fontSize: compact ? 13 : 16, lineHeight: 1.2, fontWeight: 900, color: darkMode ? '#FAFAFA' : '#1B262C' }} className="truncate">
            {visit.patient_flag} {visit.patient_name}
          </div>
          <div style={{ marginTop: compact ? 4 : 6, fontSize: compact ? 11 : 13, lineHeight: 1.3, fontWeight: 700, color: darkMode ? '#A1A1AA' : '#40515D' }} className="truncate">
            {visit.procedure_name}
          </div>
        </div>
        <span
          className="shrink-0 border"
          style={{
            borderColor: tone.border,
            background: tone.bg,
            color: tone.color,
            borderRadius: 999,
            padding: compact ? '4px 7px' : '6px 10px',
            fontSize: compact ? 10 : 12,
            fontWeight: 850,
            whiteSpace: 'nowrap',
          }}
        >
          {action.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3" style={{ marginTop: compact ? 7 : 10 }}>
        <span style={{ fontSize: compact ? 14 : 20, lineHeight: 1, fontWeight: 950, color: darkMode ? '#E4E4E7' : '#1B262C' }}>
          {fmtVisitTime(timeSource, 'today')}
        </span>
        <span style={{ fontSize: compact ? 10 : 13, fontWeight: 750, color: darkMode ? '#A1A1AA' : '#40515D' }} className="truncate">
          {mode === 'next' ? action.detail : visit.link_status === 'opened' ? 'My Tiki 열람' : LINK_META[visit.link_status]?.label || '상태 확인'}
        </span>
      </div>
      <MyTikiStatusStrip visit={visit} action={action} darkMode={darkMode} compact={compact} />
      <VisitStatusRail visit={visit} darkMode={darkMode} compact={compact} />
    </div>
  );
}

function FlowColumn({ title, subtitle, empty, visits, mode, darkMode, compact = false }) {
  return (
    <section
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : '#D6E1EA',
        background: darkMode ? '#18181B' : '#EDF1F5',
        borderRadius: compact ? 18 : 22,
        padding: compact ? 12 : 16,
        minHeight: compact ? 232 : 398,
      }}
    >
      <div>
        <h3 style={{ fontSize: compact ? 16 : 21, lineHeight: 1.14, fontWeight: 950, letterSpacing: '-0.04em', color: darkMode ? '#FAFAFA' : '#1B262C' }}>{title}</h3>
        <p style={{ marginTop: 6, fontSize: compact ? 11 : 13, lineHeight: 1.35, fontWeight: 750, color: darkMode ? '#A1A1AA' : '#40515D' }}>{subtitle}</p>
      </div>
      <div className={`${compact ? 'mt-3 space-y-2' : 'mt-4 space-y-2.5'}`}>
        {visits.length === 0 ? (
          <div
            className="border border-dashed"
            style={{
              borderColor: darkMode ? '#3F3F46' : '#D8C8BF',
              borderRadius: compact ? 14 : 16,
              minHeight: compact ? 74 : 118,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: darkMode ? '#71717A' : '#98A2B3',
              fontSize: compact ? 12 : 14,
              fontWeight: 750,
              textAlign: 'center',
              padding: 18,
            }}
          >
            {empty}
          </div>
        ) : visits.map((visit) => (
          <FlowPatientLine key={`${mode}-${visit.id}`} visit={visit} mode={mode} darkMode={darkMode} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function DeskFlowStep({ index, label, value, helper, tone = 'info', darkMode }) {
  const m = DESK_TONE[tone] || DESK_TONE.info;
  const active = Number(value) > 0;
  return (
    <div className="relative flex-1 min-w-[132px]">
      <div
        className="border h-full"
        style={{
          borderColor: darkMode ? '#27272A' : active ? m.border : '#D6E1EA',
          background: darkMode ? '#111827' : active ? m.bg : '#FFFFFF',
          borderRadius: 22,
          padding: '16px 16px 15px',
          boxShadow: darkMode ? 'none' : active ? `0 18px 38px ${m.color}12` : '0 10px 24px rgba(16, 54, 125, 0.05)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: active ? m.color : darkMode ? '#27272A' : '#EDF1F5',
              color: active ? '#FFFFFF' : darkMode ? '#A1A1AA' : '#40515D',
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            {index}
          </span>
          <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 950, letterSpacing: '-0.06em', color: active ? m.color : darkMode ? '#E4E4E7' : '#1B262C' }}>
            {value}
          </span>
        </div>
        <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.22, fontWeight: 950, letterSpacing: '-0.035em', color: darkMode ? '#FAFAFA' : '#1B262C' }}>
          {label}
        </div>
        <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.35, fontWeight: 750, color: darkMode ? '#A1A1AA' : '#40515D' }}>
          {helper}
        </div>
      </div>
      {index < 6 && (
        <div
          className="hidden xl:block absolute top-1/2 -right-3.5 z-10"
          style={{
            width: 20,
            height: 2,
            background: darkMode ? '#3F3F46' : '#D6E1EA',
          }}
        />
      )}
    </div>
  );
}

function DeskCompactPanel({ title, subtitle, value, helper, tone = 'info', icon: Icon, actionLabel, onAction, darkMode }) {
  const m = DESK_TONE[tone] || DESK_TONE.info;
  return (
    <div
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : m.border,
        background: darkMode ? '#111827' : '#FFFFFF',
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="shrink-0 flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 16, background: m.bg, color: m.color }}>
            <Icon size={21} strokeWidth={2.6} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[16px] font-black tracking-[-0.035em] ${darkMode ? 'text-zinc-100' : 'text-[#1B262C]'}`}>{title}</p>
              <p className={`mt-1 text-[12px] font-bold leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-[#40515D]'}`}>{subtitle}</p>
            </div>
            <span style={{ fontSize: 34, lineHeight: 1, fontWeight: 950, color: m.color }}>{value}</span>
          </div>
          <p className={`mt-3 text-[12px] font-semibold ${darkMode ? 'text-zinc-500' : 'text-[#6B7C88]'}`}>{helper}</p>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="mt-4 w-full rounded-2xl px-4 py-3 text-[13px] font-black text-white"
              style={{ background: m.color, boxShadow: `0 14px 28px ${m.color}22` }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TikiDeskCommandBoard({ flow, counts, roomSummary = {}, loading, darkMode }) {
  const flowSteps = [
    { label: 'My Tiki 준비', value: counts.linkNeeded, helper: '링크 발급 필요', tone: 'info' },
    { label: '오늘 방문', value: counts.total, helper: '예약 시간 기준', tone: 'muted' },
    { label: '도착·서류', value: counts.needsAttention, helper: '데스크가 먼저 확인', tone: 'urgent' },
    { label: '룸 이동', value: counts.roomReady, helper: '바로 배정 가능', tone: 'ready' },
    { label: '진행 중', value: counts.inRoom, helper: '현재 룸 배정됨', tone: 'steady' },
  ];

  return (
    <div className="space-y-5">
      <div
        className="border"
        style={{
          borderColor: darkMode ? '#27272A' : '#D6E1EA',
          background: darkMode ? '#0B1220' : 'linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%)',
          borderRadius: 30,
          padding: 18,
          boxShadow: darkMode ? 'none' : '0 24px 70px rgba(16, 54, 125, 0.08)',
        }}
      >
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className={`text-[13px] font-black ${darkMode ? 'text-zinc-400' : 'text-[#40515D]'}`}>오늘 운영 흐름</p>
            <h2 className={`mt-1 text-[24px] font-black tracking-[-0.055em] ${darkMode ? 'text-zinc-100' : 'text-[#1B262C]'}`}>상담부터 룸 이동까지 한 줄로 봅니다</h2>
          </div>
          <p className={`hidden lg:block text-[12px] font-bold ${darkMode ? 'text-zinc-500' : 'text-[#6B7C88]'}`}>
            숫자가 생기면 확인할 일이 있다는 뜻이고, 처리되면 바로 줄어듭니다.
          </p>
        </div>
        <div className="flex flex-wrap xl:flex-nowrap gap-3">
          {flowSteps.map((step, index) => (
            <DeskFlowStep
              key={step.label}
              index={index + 1}
              label={step.label}
              value={loading ? '…' : step.value}
              helper={step.helper}
              tone={step.tone}
              darkMode={darkMode}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)] gap-4">
        <FlowColumn
          title="지금 할 일"
          subtitle="상담, 링크, 도착, 서류, 룸 순서로 먼저 처리할 항목"
          empty="지금 처리할 일이 없습니다"
          visits={flow.nextActions}
          mode="next"
          darkMode={darkMode}
        />
        <div className="space-y-4">
          <DeskCompactPanel
            title="룸 배정"
            subtitle="빈 방과 다음 배정 후보"
            value={loading ? '…' : roomSummary.readyQueue || 0}
            helper={`빈 방 ${roomSummary.free || 0} · 사용 중 ${roomSummary.occupied || 0} · 전체 ${roomSummary.total || 0}`}
            tone={roomSummary.readyQueue > 0 ? 'ready' : 'info'}
            icon={DoorOpen}
            darkMode={darkMode}
          />
          <div className="grid grid-cols-2 gap-3">
            <FlowColumn
              title="예약 순서"
              subtitle="예정 시간"
              empty="예약 없음"
              visits={flow.booked.slice(0, 3)}
              mode="booked"
              darkMode={darkMode}
              compact
            />
            <FlowColumn
              title="도착 순서"
              subtitle="도착 알림"
              empty="도착 없음"
              visits={flow.arrived.slice(0, 3)}
              mode="arrived"
              darkMode={darkMode}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CheckInCell ───────────────────────────────────────────────────────────────
function CheckInCell({ visitId, checkedInAt, loading, darkMode, onCheckIn }) {
  if (checkedInAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[13px] font-bold">
        <Check size={14} strokeWidth={2.6} />
        {fmtTime(checkedInAt)}
      </span>
    );
  }
  return (
    <button
      onClick={() => onCheckIn(visitId)}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition-all disabled:opacity-50"
      style={{ background: SAGE, boxShadow: `0 6px 14px ${SAGE}30` }}
    >
      {loading
        ? <Loader2 size={13} className="animate-spin" />
        : <LogIn size={13} strokeWidth={2.5} />
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
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: TEAL }}>
          <DoorOpen size={14} />
          {visit.room}
        </span>
        <div className="flex flex-wrap gap-1">
          {alternateRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onAssignRoom(visit.id, room.id)}
              disabled={assigning}
              className="px-2 py-1 rounded-md text-[11px] font-bold border disabled:opacity-50"
              style={{ borderColor: `${TEAL}50`, color: TEAL, background: darkMode ? '#18181B' : '#F8FCFD' }}
            >
              {room.name}
            </button>
          ))}
          <button
            onClick={() => onClearRoom(visit.id)}
            disabled={assigning}
            className="px-2 py-1 rounded-md text-[11px] font-bold border disabled:opacity-50"
            style={{ borderColor: '#FCA5A5', color: '#DC2626', background: darkMode ? '#1C1917' : '#FEF2F2' }}
          >
            방 비우기
          </button>
        </div>
      </div>
    );
  }

  if (!roomReady) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold text-zinc-400">대기</span>
        <span className="text-[11px] font-semibold text-zinc-400">
          {!visit.checked_in_at ? '체크인 필요' : !visit.intake_done || !visit.consent_done ? '서류 완료 필요' : '단계 대기'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-black" style={{ color: '#16A34A' }}>룸 배정 가능</span>
      <div className="flex flex-wrap gap-1">
        {freeRooms.slice(0, 2).map((room) => (
          <button
            key={room.id}
            onClick={() => onAssignRoom(visit.id, room.id)}
            disabled={assigning}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white disabled:opacity-50"
            style={{ background: TEAL }}
          >
            {room.name}
          </button>
        ))}
        {freeRooms.length === 0 && (
          <span className="text-[11px] font-semibold text-zinc-400">빈 방 없음</span>
        )}
      </div>
    </div>
  );
}

function RoomTrafficCard({ room, queueVisit, darkMode, busy, onAssignRoom, onClearRoom }) {
  const occupied = room.occupancy_state === 'occupied';
  const currentVisit = room.current_visit;
  const procedureName = currentVisit?.procedures?.name_ko || currentVisit?.procedures?.name_en || '방문 컨텍스트 없음';
  const tone = occupied
    ? { color: '#DC2626', bg: '#FEF2F2', label: '사용 중' }
    : queueVisit
      ? { color: TEAL, bg: '#EAF2FF', label: '배정 가능' }
      : { color: '#16A34A', bg: '#F0FDF4', label: '빈 방' };

  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: darkMode ? '#27272A' : `${tone.color}2E`, background: darkMode ? '#0F172A' : '#FFFFFF' }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-[10px] font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{ROOM_TYPE_LABELS[room.room_type] || '진료실'}</p>
          <p className={`text-[14px] font-black mt-0.5 ${darkMode ? 'text-zinc-100' : 'text-[#1B262C]'}`}>{room.name}</p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black"
          style={{ background: tone.bg, color: tone.color }}
        >
          {tone.label}
        </span>
      </div>

      {occupied ? (
        <div className="mt-2">
          <div className={`text-[12px] font-black truncate ${darkMode ? 'text-zinc-100' : 'text-[#1B262C]'}`}>
            {(currentVisit?.patients?.flag || '🏥')} {currentVisit?.patients?.name || '배정됨'}
          </div>
          <div className={`text-[10px] mt-1 truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{procedureName}</div>
          <button
            onClick={() => onClearRoom(currentVisit.id)}
            disabled={busy}
            className="mt-2 w-full px-3 py-2 rounded-lg text-[10px] font-black border disabled:opacity-50"
            style={{ borderColor: '#FCA5A5', color: '#DC2626', background: darkMode ? '#1C1917' : '#FEF2F2' }}
          >
            방 비우기
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <div className={`text-[10px] font-bold ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>다음 후보</div>
          {queueVisit ? (
            <>
              <div className={`text-[12px] font-black mt-1 truncate ${darkMode ? 'text-zinc-100' : 'text-[#1B262C]'}`}>
                {queueVisit.patient_flag} {queueVisit.patient_name}
              </div>
              <div className={`text-[10px] mt-1 truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{queueVisit.procedure_name}</div>
              <button
                onClick={() => onAssignRoom(queueVisit.id, room.id)}
                disabled={busy}
                className="mt-2 w-full px-3 py-2 rounded-lg text-[10px] font-black text-white disabled:opacity-50"
                style={{ background: TEAL }}
              >
                다음 배정
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
          <p className={`text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>방 목록</p>
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
    <div className={`flex items-center gap-4 px-5 py-4 border-b transition-colors ${rowBg} ${isCheckedIn ? 'border-l-4' : ''}`}
         style={isCheckedIn ? { borderLeftColor: SAGE } : {}}>

      {/* Patient + time */}
      <div style={{ width: 190, flexShrink: 0 }}>
        <div className={`text-[16px] font-black ${textP} flex items-center gap-1.5 truncate`}>
          <span>{visit.patient_flag}</span>
          <span className="truncate">{visit.patient_name}</span>
          {visit.unreviewed_forms > 0 && <UnreviewedPip count={visit.unreviewed_forms} />}
        </div>
        <div className={`text-[13px] mt-1 font-bold ${isCheckedIn ? 'text-emerald-600' : textS}`}>
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
        <span className={`text-[14px] font-bold ${textP} truncate block`}>{visit.procedure_name}</span>
        <span className={`text-[12px] mt-1 font-semibold ${textS} truncate block`}>{getDeskNextAction(visit).detail}</span>
      </div>

      {/* Stage */}
      <div style={{ width: 108, flexShrink: 0 }} className="relative" ref={stageRef}>
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
      <div style={{ width: 88, flexShrink: 0 }}>
        <FormChips intakeDone={visit.intake_done} consentDone={visit.consent_done} />
      </div>

      {/* Room */}
      <div style={{ width: 220, flexShrink: 0 }}>
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
      <div style={{ width: 96, flexShrink: 0 }}>
        <LinkStatusBadge status={visit.link_status} />
      </div>

      {/* Actions */}
      <div style={{ width: 168, flexShrink: 0 }} className="flex items-center gap-1.5 justify-end">
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
            className="p-2 rounded-md transition-colors text-zinc-400 hover:text-teal-600 hover:bg-teal-50"
          >
            <Link2 size={17} />
          </button>
        )}
        {canGenerate && isCheckedIn && (
          <button
            onClick={() => onAction('generate', visit)}
            title="링크 발급"
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition-all"
            style={{ background: TEAL }}
          >
            <Link2 size={13} />
            링크
          </button>
        )}
        {canRevoke && (
          <button
            onClick={() => onAction('revoke', visit)}
            title="링크 폐기"
            className="p-2 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <XCircle size={16} />
          </button>
        )}

        {/* Detail (future) */}
        <button
          onClick={() => onAction('detail', visit)}
          title="상세"
          className={`p-2 rounded-md transition-colors ${darkMode ? 'text-zinc-600 hover:bg-zinc-700' : 'text-zinc-300 hover:bg-zinc-100'}`}
        >
          <ChevronRight size={17} />
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
  const slaState = item.sla_state?.status;
  const slaLabel = slaState === 'overdue'
    ? 'SLA 초과'
    : slaState === 'due_soon'
      ? 'SLA 임박'
      : null;
  const slaTone = slaState === 'overdue'
    ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

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
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: '#10367D', background: '#E6F0FF' }}>
          {typeLabel}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-zinc-100'}`}>
          {roleLabel}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${darkMode ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 bg-zinc-100'}`}>
          {ESCALATION_STATUS_LABELS[item.status] || item.status}
        </span>
        {slaLabel && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${slaTone}`}>
            {slaLabel}
            {Number.isFinite(item.sla_state?.age_minutes) ? ` · ${item.sla_state.age_minutes}분` : ''}
          </span>
        )}
      </div>

      <p className={`text-[10px] mt-2 line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {item.patient_visible_status_text}
      </p>

      <div className={`mt-2 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
        담당: {ownerLabel} · 최근: {latestActorLabel}
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
          {busy ? '검토 중…' : '검토'}
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
            <p className={`text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>에스컬레이션 상세</p>
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
              <div>확인자: {actorLabel(item.acknowledged_by)}</div>
              <div>응답자: {actorLabel(item.responded_by)}</div>
              <div>해결자: {actorLabel(item.resolved_by)}</div>
              <div>종료자: {actorLabel(item.closed_by)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>유형</span>
              <select value={escalationType} onChange={e => setEscalationType(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>우선순위</span>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>담당 역할</span>
              <select value={assignedRole} onChange={e => setAssignedRole(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                {Object.entries(ESCALATION_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold">
              <span className={`block mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>담당자</span>
              <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                <option value="">역할 대기열</option>
                {filteredUsers.map(user => <option key={user.user_id} value={user.user_id}>{user.email}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => run('assign')} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: TEAL }}>{busy === 'assign' ? '저장 중…' : '재배정 저장'}</button>
            <button onClick={() => run('acknowledge')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'acknowledge' ? '처리 중…' : '확인'}</button>
            <button onClick={() => run('responded')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'responded' ? '처리 중…' : '응답 완료'}</button>
            <button onClick={() => run('resolve')} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-700'}`}>{busy === 'resolve' ? '처리 중…' : '해결'}</button>
            <button onClick={() => run('close')} className="col-span-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-700">{busy === 'close' ? '처리 중…' : '종료'}</button>
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
  const { clinicId, role } = useAuth();

  const [visits,          setVisits]          = useState([]);
  const [summary,         setSummary]         = useState({ total: 0, formsPending: 0, checkedIn: 0, activeLinks: 0, arrived: 0, roomReady: 0 });
  const [rooms,           setRooms]           = useState([]);
  const [roomSummary,     setRoomSummary]     = useState({ total: 0, free: 0, occupied: 0, readyQueue: 0 });
  const [roomQueue,       setRoomQueue]       = useState([]);
  const [escalations,     setEscalations]     = useState([]);
  const [escalationSummary, setEscalationSummary] = useState(DEFAULT_ESCALATION_SUMMARY);
  const [aftercareItems,  setAftercareItems]  = useState([]);
  const [aftercareSummary, setAftercareSummary] = useState({ due: 0, responded: 0, concern: 0, urgent: 0, safe_for_return: 0 });
  const [aftercareScheduler, setAftercareScheduler] = useState(null);
  const [aftercarePlanProcedures, setAftercarePlanProcedures] = useState([]);
  const [aftercarePlans, setAftercarePlans] = useState([]);
  const [staffUsers,      setStaffUsers]      = useState([]);
  const [loadingEscalations, setLoadingEscalations] = useState(true);
  const [loadingAftercare, setLoadingAftercare] = useState(true);
  const [loadingAftercarePlans, setLoadingAftercarePlans] = useState(true);
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
  const [showAftercareEditor, setShowAftercareEditor] = useState(false);
  const [selectedAftercareProcedureId, setSelectedAftercareProcedureId] = useState('');
  const [checkingInIds,   setCheckingInIds]   = useState(new Set());
  const [assigningRoomIds, setAssigningRoomIds] = useState(new Set());
  const [reviewingAftercareIds, setReviewingAftercareIds] = useState(new Set());
  const [savingAftercareStepIds, setSavingAftercareStepIds] = useState(new Set());
  const [ensuringAftercarePlan, setEnsuringAftercarePlan] = useState(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const bg        = darkMode ? 'bg-zinc-950' : 'td-page';
  const textP     = darkMode ? 'text-zinc-100' : 'text-[#1B262C]';
  const textS     = darkMode ? 'text-zinc-400' : 'text-[#40515D]';
  const borderCls = darkMode ? 'border-zinc-800' : 'border-[#D6E1EA]';
  const headerBg  = darkMode ? 'bg-zinc-900' : 'bg-white';
  const inputBg   = darkMode
    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
    : 'bg-white border-[#D6E1EA] text-[#1B262C] placeholder-[#6B7C88]';

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
      setEscalationSummary({ ...DEFAULT_ESCALATION_SUMMARY, ...(data.summary || {}) });
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

  const fetchAftercarePlans = useCallback(async () => {
    if (!clinicId) return;
    setLoadingAftercarePlans(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/staff/aftercare/plans', { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAftercarePlanProcedures(data.procedures || []);
      setAftercarePlans((data.plans || []).map((plan) => ({
        ...plan,
        steps: (plan.steps || []).map((step) => ({
          ...step,
          original_trigger_offset_hours: step.trigger_offset_hours,
          original_content_template: step.content_template,
          original_next_action_type: step.next_action_type,
        })),
      })));
      setSelectedAftercareProcedureId((prev) => prev || data.plans?.[0]?.procedure_id || data.procedures?.[0]?.id || '');
    } catch (err) {
      console.error('[aftercare-plans]', err.message);
    } finally {
      setLoadingAftercarePlans(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchAftercarePlans(); }, [fetchAftercarePlans]);

  // ── Derived filtered list ──────────────────────────────────────────────────
  const filtered = visits
    .filter(v => {
      if (!search) return true;
      const q = search.toLowerCase();
      return v.patient_name.toLowerCase().includes(q) || v.procedure_name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // 도착 신호 환자 먼저
      if (a.patient_arrived_at && !b.patient_arrived_at) return -1;
      if (!a.patient_arrived_at && b.patient_arrived_at) return 1;
      // 도착 시간 기준 (더 최근에 도착한 환자 먼저)
      if (a.patient_arrived_at && b.patient_arrived_at) {
        return new Date(b.patient_arrived_at) - new Date(a.patient_arrived_at);
      }
      // 나머지는 예약 시간 순
      if (!a.visit_date && !b.visit_date) return 0;
      if (!a.visit_date) return 1;
      if (!b.visit_date) return -1;
      return new Date(a.visit_date) - new Date(b.visit_date);
    });

  const deskCounts = useMemo(() => buildTikiDeskCounts(visits), [visits]);
  const deskFlow = useMemo(() => buildTikiDeskFlow(visits, 4), [visits]);

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
  const canEditAftercarePlans = ['owner', 'admin'].includes(role);
  const selectedAftercarePlan = aftercarePlans.find((plan) => plan.procedure_id === selectedAftercareProcedureId) || null;

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

  function handleAftercareStepDraftChange(stepId, field, value) {
    setAftercarePlans((prev) => prev.map((plan) => ({
      ...plan,
      steps: (plan.steps || []).map((step) => (
        step.id === stepId ? { ...step, [field]: value } : step
      )),
    })));
  }

  async function handleEnsureAftercarePlan() {
    if (!selectedAftercareProcedureId || ensuringAftercarePlan) return;
    setEnsuringAftercarePlan(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/staff/aftercare/plans/ensure', {
        method: 'POST',
        headers,
        body: JSON.stringify({ procedureId: selectedAftercareProcedureId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchAftercarePlans();
    } catch (err) {
      console.error('[aftercare-plan-ensure]', err.message);
    } finally {
      setEnsuringAftercarePlan(false);
    }
  }

  async function handleSaveAftercareStep(step) {
    if (!step?.id || savingAftercareStepIds.has(step.id)) return;
    const timingChanged = Number(step.trigger_offset_hours) !== Number(step.original_trigger_offset_hours);
    if (timingChanged) {
      const ok = window.confirm('Trigger timing changed. This affects future aftercare scheduling from this plan. Continue?');
      if (!ok) return;
    }
    setSavingAftercareStepIds((prev) => new Set([...prev, step.id]));
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/aftercare/steps/${step.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          trigger_offset_hours: Number(step.trigger_offset_hours),
          content_template: step.content_template,
          next_action_type: step.next_action_type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAftercarePlans((prev) => prev.map((plan) => ({
        ...plan,
        steps: (plan.steps || []).map((row) => (
          row.id === step.id ? {
            ...row,
            ...data.step,
            original_trigger_offset_hours: data.step.trigger_offset_hours,
            original_content_template: data.step.content_template,
            original_next_action_type: data.step.next_action_type,
          } : row
        )),
      })));
    } catch (err) {
      console.error('[aftercare-step-save]', err.message);
    } finally {
      setSavingAftercareStepIds((prev) => {
        const next = new Set(prev);
        next.delete(step.id);
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
    const normalized = normalizeVisit(rawVisit);
    setVisits(prev => [normalized, ...prev.filter(v => v.id !== normalized.id)]);
    const nextRange = visitFitsDateRange(normalized.visit_date, dateRange)
      ? dateRange
      : preferredDateRangeForVisit(normalized.visit_date);
    if (nextRange !== dateRange) {
      setDateRange(nextRange);
    } else {
      fetchVisits();
    }
  }

  // ── Today date label ───────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const attentionItems = [
    escalationSummary.overdue > 0 ? `에스컬레이션 SLA 초과 ${escalationSummary.overdue}건` : null,
    escalationSummary.due_soon > 0 ? `에스컬레이션 SLA 임박 ${escalationSummary.due_soon}건` : null,
    escalationSummary.urgent > 0 ? `긴급 에스컬레이션 ${escalationSummary.urgent}건` : null,
    aftercareSummary.urgent > 0 ? `긴급 사후관리 ${aftercareSummary.urgent}건` : null,
    aftercareScheduler?.status === 'degraded' ? '사후관리 스케줄러 이상' : null,
  ].filter(Boolean);

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
    <div className={`flex-1 flex flex-col overflow-y-auto ${bg}`} style={{ fontFamily: F.sans, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`px-8 py-7 border-b ${headerBg} ${borderCls} shrink-0`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{ width: 50, height: 50, borderRadius: 18, background: TEAL, boxShadow: `0 12px 28px ${TEAL}30` }}
              >
                <ClipboardCheck size={25} color="#fff" strokeWidth={2.6} />
              </div>
              <div>
                <h1 className={`text-[34px] leading-none font-black tracking-[-0.055em] ${textP}`}>오늘 운영</h1>
                <p className={`text-[15px] mt-2.5 font-bold ${textS}`}>Tiki Desk · {todayLabel}</p>
              </div>
            </div>
            <p className={`text-[16px] mt-5 font-bold leading-relaxed ${textS}`}>예약 순서, 실제 도착 순서, 지금 처리할 일을 한 화면에서 봅니다.</p>
            {shouldPollOpsBoard(dateRange) && (
              <p className={`text-[13px] mt-1.5 font-semibold ${textS}`}>오늘 보기는 20초마다 자동 새로고침됩니다.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-bold border transition-colors ${darkMode ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-[#D6E1EA] text-[#40515D] hover:bg-[#EDF1F5]'}`}
              title="CRM/EMR 환자·방문 가져오기"
            >
              CRM/EMR 가져오기
            </button>
            <button
              onClick={() => setShowQuickCreate(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-bold text-white"
              style={{ background: TEAL, boxShadow: `0 12px 28px ${TEAL}28` }}
            >
              <Plus size={16} strokeWidth={2.6} /> 새 환자
            </button>
            <button
              onClick={fetchVisits}
              className={`p-3 rounded-2xl transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-[#6B7C88] hover:bg-[#EDF1F5]'}`}
              title="새로고침"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <TikiDeskCommandBoard
            flow={deskFlow}
            counts={deskCounts}
            roomSummary={roomSummary}
            loading={loading}
            darkMode={darkMode}
          />
        </div>

        {attentionItems.length > 0 && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-[13px] font-bold ${darkMode ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            주의 필요 · {attentionItems.join(' · ')}
          </div>
        )}

        {aftercareScheduler?.status === 'degraded' && (
          <div className={`mt-3 rounded-xl border px-4 py-3 text-[13px] font-semibold ${darkMode ? 'border-amber-800 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            사후관리 스케줄러 이상 · 백그라운드 발송이 지연될 수 있습니다.
          </div>
        )}

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFFFF' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck size={14} style={{ color: '#10367D' }} />
                <h2 className={`text-sm font-bold ${textP}`}>에스컬레이션</h2>
              </div>
              <p className={`text-[11px] mt-1 ${textS}`}>환자 질문이 운영 task로 전환된 항목</p>
            </div>
            <button onClick={fetchEscalations} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`} title="Escalations 새로고침">
              <RefreshCw size={13} className={loadingEscalations ? 'animate-spin' : ''} />
            </button>
          </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <EscalationMiniCard label="처리 중" value={loadingEscalations ? '…' : escalationSummary.open} sub="진행 중 트리아지" color={TEAL} darkMode={darkMode} />
          <EscalationMiniCard label="긴급" value={loadingEscalations ? '…' : escalationSummary.urgent} sub="즉시 검토 필요" color={escalationUrgentMeta.color} darkMode={darkMode} />
          <EscalationMiniCard label="SLA 초과" value={loadingEscalations ? '…' : escalationSummary.overdue} sub="기한 초과" color="#DC2626" darkMode={darkMode} />
          <EscalationMiniCard label="미응답" value={loadingEscalations ? '…' : escalationSummary.unanswered} sub="아직 확인 전" color={escalationHighMeta.color} darkMode={darkMode} />
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
                  ? { background: '#10367D', color: '#fff', borderColor: '#10367D' }
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

        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFFFF' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={14} style={{ color: '#0145F2' }} />
                <h2 className={`text-sm font-bold ${textP}`}>사후관리</h2>
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
            <EscalationMiniCard label="응답 대기" value={loadingAftercare ? '…' : aftercareSummary.due} sub="체크인 발송됨" color={aftercareDueMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="응답 완료" value={loadingAftercare ? '…' : aftercareSummary.responded} sub="환자 응답 완료" color={SAGE} darkMode={darkMode} />
            <EscalationMiniCard label="주의" value={loadingAftercare ? '…' : aftercareSummary.concern} sub="검토 필요" color={aftercareConcernMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="긴급" value={loadingAftercare ? '…' : aftercareSummary.urgent} sub="긴급 신호" color={aftercareUrgentMeta.color} darkMode={darkMode} />
            <EscalationMiniCard label="재방문 가능" value={loadingAftercare ? '…' : aftercareSummary.safe_for_return} sub="리턴 제안 가능" color={aftercareSafeReturnMeta.color} darkMode={darkMode} />
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {Object.entries(AFTERCARE_FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAftercareFilter(key)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold border"
                style={aftercareFilter === key
                  ? { background: '#0145F2', color: '#fff', borderColor: '#0145F2' }
                  : { background: 'transparent', color: darkMode ? '#A1A1AA' : '#6B7280', borderColor: darkMode ? '#3F3F46' : '#E5E7EB' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowAftercareEditor((prev) => !prev)}
              className="ml-auto px-3 py-1 rounded-lg text-[11px] font-semibold border"
              style={showAftercareEditor
                ? { background: '#0145F2', color: '#fff', borderColor: '#0145F2' }
                : { background: 'transparent', color: darkMode ? '#A1A1AA' : '#6B7280', borderColor: darkMode ? '#3F3F46' : '#E5E7EB' }}
            >
              {showAftercareEditor ? '플랜 편집 닫기' : '플랜 편집'}
            </button>
          </div>

          {showAftercareEditor && (
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: darkMode ? '#3F3F46' : '#E5E7EB', background: darkMode ? '#0F172A' : '#F8FAFC' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className={`text-[11px] font-bold ${textP}`}>사후관리 플랜 편집</p>
                  <p className={`text-[11px] mt-1 ${textS}`}>시술별 체크 시점, 안내 문구, 다음 액션을 작게 조정합니다.</p>
                </div>
                {!canEditAftercarePlans && (
                  <div className={`text-[11px] ${textS}`}>관리자/원장만 수정 가능 · 현재는 읽기 전용</div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <select
                  value={selectedAftercareProcedureId}
                  onChange={(e) => setSelectedAftercareProcedureId(e.target.value)}
                  className={`rounded-lg border px-2 py-1 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
                >
                  {(aftercarePlanProcedures || []).map((procedure) => (
                    <option key={procedure.id} value={procedure.id}>
                      {procedure.name_ko || procedure.name_en || '시술 미지정'}
                    </option>
                  ))}
                </select>
                {canEditAftercarePlans && !selectedAftercarePlan && (
                  <button
                    onClick={handleEnsureAftercarePlan}
                    disabled={!selectedAftercareProcedureId || ensuringAftercarePlan}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
                    style={{ background: TEAL }}
                  >
                    {ensuringAftercarePlan ? '기본 플랜 생성 중…' : '기본 플랜 만들기'}
                  </button>
                )}
                <button
                  onClick={fetchAftercarePlans}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                >
                  플랜 새로고침
                </button>
              </div>

              {loadingAftercarePlans ? (
                <div className={`mt-4 text-xs ${textS}`}>Aftercare plan 불러오는 중…</div>
              ) : !selectedAftercarePlan ? (
                <div className={`mt-4 text-xs ${textS}`}>선택한 시술에 아직 aftercare plan이 없습니다. 필요하면 기본 플랜을 먼저 만드세요.</div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(selectedAftercarePlan.steps || []).map((step) => (
                    <div
                      key={step.id}
                      className="rounded-2xl border p-3"
                      style={{ borderColor: darkMode ? '#3F3F46' : '#E5E7EB', background: darkMode ? '#111827' : '#FFFFFF' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className={`text-[11px] font-bold ${textP}`}>{step.step_key}</p>
                          <p className={`text-[10px] ${textS}`}>정렬 {step.sort_order}</p>
                        </div>
                        <span className={`text-[10px] ${textS}`}>Updated {fmtAgo(step.updated_at)}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className={`text-[10px] font-semibold ${textS}`}>발송 시점 (시간)</span>
                          <input
                            type="number"
                            min="1"
                            max="720"
                            value={step.trigger_offset_hours ?? ''}
                            disabled={!canEditAftercarePlans}
                            onChange={(e) => handleAftercareStepDraftChange(step.id, 'trigger_offset_hours', e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-[11px] ${inputBg}`}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className={`text-[10px] font-semibold ${textS}`}>다음 액션</span>
                          <select
                            value={step.next_action_type || 'continue_plan'}
                            disabled={!canEditAftercarePlans}
                            onChange={(e) => handleAftercareStepDraftChange(step.id, 'next_action_type', e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-700'}`}
                          >
                            {['symptom_check', 'progress_check', 'return_prompt', 'extra_check', 'staff_review', 'continue_plan'].map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="mt-3 flex flex-col gap-1">
                        <span className={`text-[10px] font-semibold ${textS}`}>메시지 내용</span>
                        <textarea
                          rows={4}
                          value={step.content_template || ''}
                          disabled={!canEditAftercarePlans}
                          onChange={(e) => handleAftercareStepDraftChange(step.id, 'content_template', e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-[11px] resize-y ${inputBg}`}
                        />
                      </label>

                      <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${darkMode ? 'border-zinc-700 bg-zinc-900 text-zinc-300' : 'border-sky-100 bg-sky-50 text-sky-900'}`}>
                        <div className="font-bold mb-1">환자 미리보기</div>
                        <div className="leading-relaxed">{step.content_template || '메시지 내용을 입력하세요.'}</div>
                        <div className={`mt-2 ${textS}`}>
                          사후관리 시작 후 {step.trigger_offset_hours || '—'}시간 뒤 발송 · 다음: {step.next_action_type || '—'}
                        </div>
                        {Number(step.trigger_offset_hours) !== Number(step.original_trigger_offset_hours) && (
                          <div className="mt-2 font-bold text-amber-700">
                            타이밍 변경됨. 저장 시 확인 요청됩니다.
                          </div>
                        )}
                      </div>

                      {canEditAftercarePlans && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleSaveAftercareStep(step)}
                            disabled={savingAftercareStepIds.has(step.id)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
                            style={{ background: TEAL }}
                          >
                            {savingAftercareStepIds.has(step.id) ? '저장 중…' : 'Step 저장'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

        <div className="mt-6 rounded-3xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#D6E1EA', background: darkMode ? '#0B1220' : '#F8FBFF' }}>
          <div className="mb-4">
            <p className={`text-[12px] font-black ${textP}`}>룸 요약</p>
            <p className={`text-[11px] mt-1 ${textS}`}>Tiki Desk에서는 방 상태만 빠르게 확인하고, 상세 운영은 Tiki Room에서 이어갑니다.</p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: darkMode ? '#27272A' : '#D6E1EA', background: darkMode ? '#111827' : '#FFFFFF' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <DoorOpen size={14} style={{ color: TEAL }} />
                  <h2 className={`text-sm font-bold ${textP}`}>룸 배정 현황</h2>
                </div>
                <p className={`text-[11px] mt-1 ${textS}`}>빈 방, 사용 중인 방, 다음 배정 후보만 빠르게 확인합니다.</p>
              </div>
              <button
                onClick={() => window.open('/room', '_blank', 'noopener,noreferrer')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
              >
                Tiki Room 열기
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-2">
              {[
                ['전체 방', roomSummary.total, '등록된 방', TEAL],
                ['빈 방', roomSummary.free, '즉시 배정', '#16A34A'],
                ['사용 중', roomSummary.occupied, '현재 진행', '#DC2626'],
                ['다음 후보', roomSummary.readyQueue, '룸 이동 가능', '#0F4C75'],
              ].map(([label, value, sub, color]) => (
                <div key={label} className="rounded-2xl border px-4 py-3" style={{ borderColor: `${color}32`, background: darkMode ? '#0F172A' : '#FFFFFF' }}>
                  <p className={`text-[10px] font-black ${textS}`}>{label}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 950, color }}>{loading ? '…' : value}</span>
                    <span className={`text-[10px] font-bold ${textS}`}>{sub}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
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
                <div className={`col-span-4 text-xs ${textS}`}>등록된 방이 없습니다. Tiki Room에서 방을 먼저 설정하세요.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-7 py-3.5 border-b ${headerBg} ${borderCls} shrink-0`}>

        {/* Date tabs */}
        <div className="flex items-center gap-1 mr-2">
          {DATE_RANGES.map(dr => {
            const active = dateRange === dr.key;
            return (
              <button
                key={dr.key}
                onClick={() => setDateRange(dr.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all border`}
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
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="환자명 또는 시술명"
            style={{ outline: 'none' }}
            onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${TEAL}40`}
            onBlur={e => e.target.style.boxShadow = ''}
            className={`w-full pl-10 pr-3 py-2.5 text-[13px] font-semibold rounded-lg border ${inputBg}`}
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
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all`}
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
      <div className={`flex items-center gap-4 px-5 py-3 border-b shrink-0 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
        {[
          { label: '환자',   w: 190 },
          { label: '시술',   flex: 1 },
          { label: '단계',   w: 108 },
          { label: '서류',   w: 88 },
          { label: '방',     w: 220 },
          { label: '링크',   w: 96 },
          { label: '액션',   w: 168, align: 'right' },
        ].map(col => (
          <div
            key={col.label}
            style={{ width: col.w, flex: col.flex, flexShrink: col.flex ? undefined : 0, textAlign: col.align }}
            className={`text-[11px] font-black ${textS}`}
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
