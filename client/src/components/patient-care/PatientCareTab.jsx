import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RefreshCw,
  Send,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  AFTERCARE_FILTER_LABELS,
  ESCALATION_ROLE_LABELS,
  ESCALATION_TYPE_LABELS,
  getAftercareRiskMeta,
  getEscalationPriorityMeta,
  isAftercareUnanswered,
  isEscalationUnanswered,
} from '../../lib/opsStatusMeta';

const TEXT = '#1B262C';
const MUTED = '#5A6874';
const BORDER = '#D6E1EA';
const PRIMARY = '#0145F2';
const PRIMARY_DARK = '#10367D';
const SURFACE = '#EDF1F5';

const DEFAULT_CONFIRM_SUMMARY = {
  total: 0,
  requested: 0,
  assigned: 0,
  acknowledged: 0,
  responded: 0,
  resolved: 0,
  closed: 0,
  urgent: 0,
  overdue: 0,
  due_soon: 0,
  unanswered: 0,
};

const DEFAULT_AFTERCARE_SUMMARY = {
  due: 0,
  responded: 0,
  concern: 0,
  urgent: 0,
  safe_for_return: 0,
};

const CONFIRM_STATUS_LABELS = {
  all: '전체 상태',
  active: '처리할 요청',
  requested: '확인 필요',
  assigned: '담당자 지정됨',
  acknowledged: '확인 중',
  responded: '답변 완료',
  resolved: '처리 완료',
  closed: '종료',
};

const CONFIRM_PRIORITY_LABELS = {
  all: '전체 우선순위',
  low: '낮음',
  normal: '보통',
  high: '우선 확인',
  urgent: '긴급 확인',
};

const AFTERCARE_STATUS_LABELS = {
  all: '전체',
  due: '응답 대기',
  responded: '환자 응답 도착',
  concern: '주의 필요',
  urgent: '긴급',
  safe_for_return: '재방문 가능',
};

function formatElapsed(value) {
  if (!value) return '시간 정보 없음';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '시간 정보 없음';
  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function patientName(row) {
  return row?.patients?.name
    || row?.patient_aftercare_runs?.patients?.name
    || row?.patient?.name
    || row?.patient_name
    || '환자명 없음';
}

function patientLang(row) {
  return row?.patients?.lang
    || row?.patient_aftercare_runs?.patients?.lang
    || row?.patient?.lang
    || row?.detected_language
    || '언어 미확인';
}

function compactText(value, fallback = '내용이 없습니다.') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.length > 170 ? `${text.slice(0, 170)}...` : text;
}

function pickOwnerLabel(item, staffUsers = []) {
  const user = staffUsers.find(row => row.user_id === item.assigned_user_id);
  if (user?.email) return user.email;
  if (item.assigned_role) return ESCALATION_ROLE_LABELS[item.assigned_role] || item.assigned_role;
  return '담당자 미지정';
}

function friendlyConfirmMessage(item = {}) {
  if (item.priority === 'urgent') return '긴급 신호가 있어 먼저 확인해야 합니다.';
  if (!item.assigned_user_id && !item.assigned_role) return '담당자가 아직 지정되지 않았습니다.';
  if (isEscalationUnanswered(item)) return '환자가 직원 확인을 요청했습니다.';
  if (item.status === 'responded') return '환자 안내가 완료됐는지 확인해 주세요.';
  return '확인 이력이 있는 요청입니다.';
}

function aftercareState(item = {}) {
  if (item.urgent_flag || item.risk_level === 'urgent') return { key: 'urgent', label: '긴급', tone: '#DC2626' };
  if (item.risk_level === 'concern' || item.risk_level === 'watch') return { key: 'concern', label: '주의 필요', tone: '#B45309' };
  if (item.safe_for_return) return { key: 'safe_for_return', label: '재방문 가능', tone: '#16A34A' };
  if (item.responded_at || item.response_status === 'responded') return { key: 'responded', label: '환자 응답 도착', tone: PRIMARY_DARK };
  return { key: 'due', label: '응답 대기', tone: MUTED };
}

function ShellButton({ children, active = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="transition-all duration-200 active:scale-[0.98]"
      style={{
        minHeight: 44,
        padding: '0 18px',
        borderRadius: 15,
        border: `1px solid ${active ? PRIMARY : BORDER}`,
        background: active ? PRIMARY : '#fff',
        color: active ? '#fff' : TEXT,
        fontSize: 15,
        fontWeight: 900,
        opacity: disabled ? 0.45 : 1,
        boxShadow: active ? '0 12px 24px rgba(1, 69, 242, 0.18)' : '0 8px 20px rgba(16, 54, 125, 0.05)',
      }}
    >
      {children}
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, hint, tone = PRIMARY, onClick, active = false }) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="transition-all duration-200 hover:-translate-y-0.5"
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 22,
        background: '#fff',
        padding: 20,
        boxShadow: '0 16px 32px rgba(16, 54, 125, 0.055)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        outline: active ? `2px solid ${tone}` : 'none',
        outlineOffset: active ? 2 : 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: MUTED }}>{label}</div>
          <div style={{ marginTop: 10, fontSize: 38, lineHeight: 1, fontWeight: 950, color: tone }}>{value || 0}</div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: '#7A8792' }}>{hint}</div>
        </div>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          background: `${tone}12`,
          color: tone,
          display: 'grid',
          placeItems: 'center',
        }}>
          <Icon size={23} strokeWidth={2.4} />
        </div>
      </div>
    </Component>
  );
}

function EmptyState({ children }) {
  return (
    <div style={{
      border: `1px dashed ${BORDER}`,
      borderRadius: 22,
      padding: '44px 24px',
      textAlign: 'center',
      color: '#8A98A4',
      fontSize: 17,
      fontWeight: 900,
      background: '#F8FBFF',
    }}>
      {children}
    </div>
  );
}

function ConfirmRequestCard({ item, staffUsers, busy, onAction, onOpenPatient }) {
  const priority = getEscalationPriorityMeta(item.priority);
  const priorityLabel = item.priority === 'urgent' ? '긴급 확인' : (CONFIRM_PRIORITY_LABELS[item.priority] || priority.label);
  const isBusy = busy === item.id;
  const sourceText = item.source_message?.content || item.patient_visible_status_text || item.notes;
  const handled = item.status === 'resolved' || item.status === 'closed';

  return (
    <article
      className="transition-all duration-200 hover:-translate-y-0.5"
      style={{
        border: `1px solid ${item.priority === 'urgent' ? '#FECACA' : BORDER}`,
        borderRadius: 22,
        background: '#fff',
        padding: 22,
        boxShadow: item.priority === 'urgent'
          ? '0 18px 36px rgba(220, 38, 38, 0.08)'
          : '0 16px 32px rgba(16, 54, 125, 0.055)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <button
          type="button"
          onClick={() => onOpenPatient?.(item)}
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950, color: TEXT }}>{patientName(item)}</div>
          <div style={{ marginTop: 7, color: MUTED, fontSize: 14, fontWeight: 850 }}>
            {patientLang(item)} · {ESCALATION_TYPE_LABELS[item.escalation_type] || '확인 요청'} · {formatElapsed(item.opened_at || item.created_at)}
          </div>
        </button>
        <span style={{
          borderRadius: 999,
          padding: '8px 12px',
          background: priority.bg,
          color: item.priority === 'urgent' ? '#DC2626' : priority.color,
          fontSize: 13,
          fontWeight: 950,
          whiteSpace: 'nowrap',
        }}>
          {priorityLabel}
        </span>
      </div>

      <div style={{
        marginTop: 18,
        borderRadius: 18,
        background: item.priority === 'urgent' ? '#FEF2F2' : SURFACE,
        padding: 16,
        color: TEXT,
        fontSize: 16,
        lineHeight: 1.65,
        fontWeight: 820,
      }}>
        {friendlyConfirmMessage(item)}
      </div>

      <p style={{ marginTop: 14, color: MUTED, fontSize: 15, lineHeight: 1.6, fontWeight: 760 }}>
        {compactText(sourceText, '환자 요청 내용이 아직 연결되지 않았습니다.')}
      </p>

      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        color: MUTED,
        fontSize: 13,
        fontWeight: 900,
      }}>
        <span style={{ borderRadius: 999, background: '#F3F7FC', padding: '7px 10px' }}>담당자: {pickOwnerLabel(item, staffUsers)}</span>
        {item.sla_state === 'overdue' && <span style={{ borderRadius: 999, background: '#FEF2F2', color: '#DC2626', padding: '7px 10px' }}>지연된 확인 요청</span>}
        {isEscalationUnanswered(item) && <span style={{ borderRadius: 999, background: '#FFF7ED', color: '#B45309', padding: '7px 10px' }}>아직 확인 안 됨</span>}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {handled ? (
          item.status === 'resolved'
            ? <ShellButton active disabled={isBusy} onClick={() => onAction(item, 'close')}>종료 처리</ShellButton>
            : <ShellButton disabled>종료됨</ShellButton>
        ) : (
          <>
            <ShellButton disabled={isBusy} onClick={() => onAction(item, 'acknowledge')}>확인 시작</ShellButton>
            <ShellButton disabled={isBusy} onClick={() => onAction(item, 'assign')}>담당자 지정</ShellButton>
            <ShellButton disabled={isBusy} onClick={() => onAction(item, 'responded')}>답변 완료</ShellButton>
            <ShellButton active disabled={isBusy} onClick={() => onAction(item, 'resolve')}>처리 완료</ShellButton>
          </>
        )}
      </div>
    </article>
  );
}

function AftercareCard({ item, busy, onReview, onOpenPatient }) {
  const state = aftercareState(item);
  const riskMeta = getAftercareRiskMeta(item.risk_level);
  const template = item.aftercare_steps?.content_template || item.step_content || item.notes;
  const buttonLabel = state.key === 'urgent'
    ? '응답 확인'
    : state.key === 'concern'
      ? '주의 표시'
      : state.key === 'safe_for_return'
        ? '재방문 안내'
        : '검토 완료';

  return (
    <article
      className="transition-all duration-200 hover:-translate-y-0.5"
      style={{
        border: `1px solid ${state.key === 'urgent' ? '#FECACA' : BORDER}`,
        borderRadius: 22,
        background: '#fff',
        padding: 22,
        boxShadow: '0 16px 32px rgba(16, 54, 125, 0.055)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <button
          type="button"
          onClick={() => onOpenPatient?.(item)}
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950, color: TEXT }}>{patientName(item)}</div>
          <div style={{ marginTop: 7, color: MUTED, fontSize: 14, fontWeight: 850 }}>
            {patientLang(item)} · {formatElapsed(item.responded_at || item.sent_at || item.scheduled_for || item.created_at)}
          </div>
        </button>
        <span style={{
          borderRadius: 999,
          padding: '8px 12px',
          background: riskMeta.bg,
          color: state.tone,
          fontSize: 13,
          fontWeight: 950,
          whiteSpace: 'nowrap',
        }}>
          {state.label}
        </span>
      </div>

      <p style={{ marginTop: 18, color: TEXT, fontSize: 16, lineHeight: 1.65, fontWeight: 820 }}>
        {state.key === 'urgent' && '긴급 회복 신호가 있어 먼저 확인해야 합니다.'}
        {state.key === 'concern' && '회복 상태에 주의가 필요합니다.'}
        {state.key === 'safe_for_return' && '재방문 가능 상태로 보입니다. 필요하면 안내를 이어가세요.'}
        {state.key === 'responded' && '환자 응답이 도착했습니다. 회복 상태를 확인해 주세요.'}
        {state.key === 'due' && '사후관리 응답을 기다리는 중입니다.'}
      </p>

      <div style={{
        marginTop: 14,
        borderRadius: 18,
        background: SURFACE,
        padding: 16,
        color: MUTED,
        fontSize: 15,
        lineHeight: 1.6,
        fontWeight: 760,
      }}>
        {compactText(template, '연결된 사후관리 안내 내용이 없습니다.')}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {isAftercareUnanswered(item) && <ShellButton disabled={busy === item.id} onClick={() => onReview(item.id)}>응답 확인</ShellButton>}
        <ShellButton active disabled={busy === item.id} onClick={() => onReview(item.id)}>{buttonLabel}</ShellButton>
      </div>
    </article>
  );
}

export default function PatientCareTab({ darkMode = false }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const listTopRef = useRef(null);
  const clinicId = session?.clinic?.id;
  const [activeTab, setActiveTab] = useState('requests');
  const [confirmItems, setConfirmItems] = useState([]);
  const [confirmSummary, setConfirmSummary] = useState(DEFAULT_CONFIRM_SUMMARY);
  const [aftercareItems, setAftercareItems] = useState([]);
  const [aftercareSummary, setAftercareSummary] = useState(DEFAULT_AFTERCARE_SUMMARY);
  const [staffUsers, setStaffUsers] = useState([]);
  const [filters, setFilters] = useState({ status: 'active', priority: 'all', role: 'all', aftercare: 'all' });
  const [quickFilter, setQuickFilter] = useState('none');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const authHeaders = useCallback(async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authSession.access_token}`,
    };
  }, []);

  const fetchConfirmRequests = useCallback(async () => {
    if (!clinicId) return;
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.priority !== 'all') params.set('priority', filters.priority);
    if (filters.role !== 'all') params.set('assigned_role', filters.role);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/staff/escalations${suffix}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setConfirmItems(data.items || []);
    setConfirmSummary({ ...DEFAULT_CONFIRM_SUMMARY, ...(data.summary || {}) });
    setStaffUsers(data.staff_users || []);
  }, [authHeaders, clinicId, filters.priority, filters.role, filters.status]);

  const fetchAftercare = useCallback(async () => {
    if (!clinicId) return;
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (filters.aftercare !== 'all') params.set('filter', filters.aftercare);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/staff/aftercare${suffix}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setAftercareItems(data.items || []);
    setAftercareSummary({ ...DEFAULT_AFTERCARE_SUMMARY, ...(data.summary || {}) });
  }, [authHeaders, clinicId, filters.aftercare]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setNotice('');
    try {
      await Promise.all([fetchConfirmRequests(), fetchAftercare()]);
    } catch (error) {
      console.error('[patient-care]', error);
      setNotice(error.message || '환자 케어 항목을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchAftercare, fetchConfirmRequests]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function runConfirmAction(item, action) {
    const actionMap = {
      acknowledge: 'acknowledge',
      assign: 'assign',
      responded: 'responded',
      resolve: 'resolve',
      close: 'close',
    };
    const endpoint = actionMap[action];
    if (!endpoint || !item?.id) return;
    setBusy(item.id);
    setNotice('');
    try {
      const headers = await authHeaders();
      const payload = action === 'assign'
        ? {
          assigned_role: item.assigned_role || 'coordinator',
          assigned_user_id: item.assigned_user_id || null,
          priority: item.priority || 'normal',
          escalation_type: item.escalation_type || 'simple_logistics',
        }
        : {};
      const res = await fetch(`/api/staff/escalations/${item.id}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.item) {
        setConfirmItems(prev => prev.map(row => (
          row.id === item.id
            ? { ...row, ...data.item, patients: row.patients, visits: row.visits }
            : row
        )));
      }
      setNotice(action === 'resolve' ? '처리 완료로 기록했습니다.' : '확인 요청 상태를 업데이트했습니다.');
      await fetchConfirmRequests();
    } catch (error) {
      console.error('[patient-care-confirm-action]', error);
      const message = String(error.message || '');
      if (message.toLowerCase().includes('invalid transition')) {
        setNotice('이미 처리된 요청입니다. 목록을 새로고침합니다.');
        await fetchConfirmRequests();
      } else {
        setNotice(message || '확인 요청을 처리하지 못했습니다.');
      }
    } finally {
      setBusy('');
    }
  }

  async function reviewAftercare(eventId) {
    if (!eventId) return;
    setBusy(eventId);
    setNotice('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/staff/aftercare/${eventId}/review`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice('사후관리 검토를 기록했습니다.');
      await fetchAftercare();
    } catch (error) {
      console.error('[patient-care-aftercare-review]', error);
      setNotice(error.message || '사후관리 항목을 처리하지 못했습니다.');
    } finally {
      setBusy('');
    }
  }

  const urgentConfirmCount = useMemo(() => {
    return Number(confirmSummary.urgent || 0);
  }, [confirmSummary.urgent]);

  const visibleConfirmItems = useMemo(() => {
    if (quickFilter === 'overdue') {
      return confirmItems.filter(item => item.sla_state?.status === 'overdue' || item.sla_state === 'overdue');
    }
    return confirmItems;
  }, [confirmItems, quickFilter]);

  function resolvePatientId(item = {}) {
    return item.patient_id
      || item.patients?.id
      || item.patient?.id
      || item.patient_aftercare_runs?.patient_id
      || item.patient_aftercare_runs?.patients?.id
      || null;
  }

  function openPatientMemory(item) {
    const patientId = resolvePatientId(item);
    if (!patientId) {
      setNotice('환자 기록이 아직 연결되지 않았습니다.');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'tiki_memory');
    params.set('patient_id', patientId);
    navigate(`/app?${params.toString()}`);
  }

  function scrollToList() {
    window.requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleSummaryClick(target) {
    setNotice('');
    if (target === 'needs_attention') {
      setActiveTab('requests');
      setQuickFilter('none');
      setFilters(prev => ({ ...prev, status: 'active', priority: 'all', role: 'all' }));
    }
    if (target === 'urgent') {
      setActiveTab('requests');
      setQuickFilter('none');
      setFilters(prev => ({ ...prev, status: 'active', priority: 'urgent', role: 'all' }));
    }
    if (target === 'overdue') {
      setActiveTab('requests');
      setQuickFilter('overdue');
      setFilters(prev => ({ ...prev, status: 'active', priority: 'all', role: 'all' }));
    }
    if (target === 'aftercare_responded') {
      setActiveTab('aftercare');
      setQuickFilter('none');
      setFilters(prev => ({ ...prev, aftercare: 'responded' }));
    }
    if (target === 'safe_for_return') {
      setActiveTab('aftercare');
      setQuickFilter('none');
      setFilters(prev => ({ ...prev, aftercare: 'safe_for_return' }));
    }
    scrollToList();
  }

  const bg = darkMode ? '#09090B' : '#F7FAFE';
  const cardBg = darkMode ? '#18181B' : '#fff';

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto"
      style={{
        background: bg,
        color: darkMode ? '#F4F4F5' : TEXT,
        fontFamily: "'Pretendard Variable', 'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ padding: '34px 38px 46px', minWidth: 920 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              background: PRIMARY,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 18px 36px rgba(1, 69, 242, 0.22)',
            }}>
              <HeartPulse size={34} strokeWidth={2.4} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 46, lineHeight: 1.02, fontWeight: 950, letterSpacing: '-0.055em' }}>환자 케어</h1>
              <p style={{ marginTop: 12, color: MUTED, fontSize: 18, lineHeight: 1.45, fontWeight: 850 }}>
                환자 쪽에서 올라온 확인 요청과 회복 신호를 놓치지 않고 처리합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              border: `1px solid ${BORDER}`,
              background: '#fff',
              display: 'grid',
              placeItems: 'center',
              color: PRIMARY_DARK,
              opacity: loading ? 0.55 : 1,
            }}
            title="새로고침"
          >
            <RefreshCw size={23} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <section style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16 }}>
          <SummaryCard icon={UserCheck} label="확인 필요" value={confirmSummary.unanswered || confirmSummary.requested} hint="직원 확인 요청" tone={PRIMARY} active={activeTab === 'requests' && filters.status === 'active' && filters.priority === 'all' && quickFilter === 'none'} onClick={() => handleSummaryClick('needs_attention')} />
          <SummaryCard icon={ShieldAlert} label="긴급" value={urgentConfirmCount + Number(aftercareSummary.urgent || 0)} hint="먼저 볼 항목" tone="#DC2626" active={activeTab === 'requests' && filters.priority === 'urgent'} onClick={() => handleSummaryClick('urgent')} />
          <SummaryCard icon={Clock3} label="지연" value={confirmSummary.overdue} hint="지연된 확인 요청" tone="#B45309" active={quickFilter === 'overdue'} onClick={() => handleSummaryClick('overdue')} />
          <SummaryCard icon={Send} label="사후관리 응답" value={aftercareSummary.responded} hint="환자 응답 도착" tone={PRIMARY_DARK} active={activeTab === 'aftercare' && filters.aftercare === 'responded'} onClick={() => handleSummaryClick('aftercare_responded')} />
          <SummaryCard icon={CheckCircle2} label="재방문 가능" value={aftercareSummary.safe_for_return} hint="리턴 제안 가능" tone="#16A34A" active={activeTab === 'aftercare' && filters.aftercare === 'safe_for_return'} onClick={() => handleSummaryClick('safe_for_return')} />
        </section>

        {notice && (
          <div style={{
            marginTop: 18,
            borderRadius: 18,
            border: `1px solid ${BORDER}`,
            background: '#fff',
            color: notice.includes('못했습니다') || notice.includes('만료') ? '#B45309' : PRIMARY_DARK,
            padding: '14px 16px',
            fontSize: 15,
            fontWeight: 850,
          }}>
            {notice}
          </div>
        )}

        <section style={{
          marginTop: 24,
          border: `1px solid ${BORDER}`,
          borderRadius: 28,
          background: cardBg,
          padding: 22,
          boxShadow: '0 20px 45px rgba(16, 54, 125, 0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <ShellButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>확인 요청</ShellButton>
              <ShellButton active={activeTab === 'aftercare'} onClick={() => setActiveTab('aftercare')}>사후관리</ShellButton>
            </div>
            <p style={{ margin: 0, color: MUTED, fontSize: 15, fontWeight: 850 }}>
              오늘 놓치면 안 되는 환자 확인 업무를 먼저 보여줍니다.
            </p>
          </div>

          {activeTab === 'requests' && (
            <div ref={listTopRef} style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: '-0.04em' }}>오늘 먼저 볼 확인 요청</h2>
                <p style={{ marginTop: 8, color: MUTED, fontSize: 15, fontWeight: 780 }}>긴급, 지연, 미응답 요청을 직원이 바로 처리합니다.</p>
                <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                  {visibleConfirmItems.length === 0 && <EmptyState>지금 확인할 요청이 없습니다.</EmptyState>}
                  {visibleConfirmItems.map(item => (
                    <ConfirmRequestCard
                      key={item.id}
                      item={item}
                      staffUsers={staffUsers}
                      busy={busy}
                      onAction={runConfirmAction}
                      onOpenPatient={openPatientMemory}
                    />
                  ))}
                </div>
              </div>

              <aside style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 24,
                background: SURFACE,
                padding: 18,
                alignSelf: 'start',
                position: 'sticky',
                top: 18,
              }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>보기 기준</h3>
                <p style={{ marginTop: 8, color: MUTED, fontSize: 14, fontWeight: 760 }}>처리 완료, 보류, 담당자별로 좁혀봅니다.</p>
                <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                  <select value={filters.status} onChange={e => { setQuickFilter('none'); setFilters(prev => ({ ...prev, status: e.target.value })); }} style={selectStyle}>
                    {Object.entries(CONFIRM_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={filters.priority} onChange={e => { setQuickFilter('none'); setFilters(prev => ({ ...prev, priority: e.target.value })); }} style={selectStyle}>
                    {Object.entries(CONFIRM_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={filters.role} onChange={e => { setQuickFilter('none'); setFilters(prev => ({ ...prev, role: e.target.value })); }} style={selectStyle}>
                    <option value="all">전체 담당자</option>
                    {Object.entries(ESCALATION_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'aftercare' && (
            <div ref={listTopRef} style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: '-0.04em' }}>오늘 먼저 볼 사후관리</h2>
                <p style={{ marginTop: 8, color: MUTED, fontSize: 15, fontWeight: 780 }}>회복 상태, 주의 신호, 재방문 가능 여부를 빠르게 확인합니다.</p>
                <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                  {aftercareItems.length === 0 && <EmptyState>지금 확인할 사후관리 항목이 없습니다.</EmptyState>}
                  {aftercareItems.map(item => (
                    <AftercareCard
                      key={item.id}
                      item={item}
                      busy={busy}
                      onReview={reviewAftercare}
                      onOpenPatient={openPatientMemory}
                    />
                  ))}
                </div>
              </div>

              <aside style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 24,
                background: SURFACE,
                padding: 18,
                alignSelf: 'start',
                position: 'sticky',
                top: 18,
              }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>회복 상태 필터</h3>
                <p style={{ marginTop: 8, color: MUTED, fontSize: 14, fontWeight: 760 }}>주의, 긴급, 재방문 가능 항목을 먼저 봅니다.</p>
                <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                  <select value={filters.aftercare} onChange={e => setFilters(prev => ({ ...prev, aftercare: e.target.value }))} style={selectStyle}>
                    {Object.entries(AFTERCARE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{AFTERCARE_FILTER_LABELS[value] || label}</option>
                    ))}
                  </select>
                  <div style={{
                    borderRadius: 18,
                    background: '#fff',
                    border: `1px solid ${BORDER}`,
                    padding: 14,
                    color: MUTED,
                    fontSize: 14,
                    lineHeight: 1.55,
                    fontWeight: 780,
                  }}>
                    사후관리는 응답을 검토하면 현재 항목의 확인 이력이 남습니다. 대형 감사 화면은 만들지 않고 운영 기록만 유지합니다.
                  </div>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const selectStyle = {
  minHeight: 46,
  borderRadius: 15,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  color: TEXT,
  padding: '0 13px',
  fontSize: 14,
  fontWeight: 850,
  outline: 'none',
};
