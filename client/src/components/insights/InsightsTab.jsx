import { useEffect, useMemo, useState } from 'react';
import {
  Search, X, Brain, Globe, Stethoscope, AlertTriangle,
  Clock, Calendar, ChevronDown, ChevronRight, Sparkles,
  MessageCircle, Activity, User, MapPin, Shield, Edit3, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── CSS injection ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes tmFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes tmFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#EDF1F5',
  surface:   '#FFFFFF',
  mocha:     '#0145F2',
  mochaDark: '#10367D',
  mochaLight:'#BBE1FA',
  mochaPale: '#E6F0FF',
  sage:      '#3B6500',
  sagePale:  '#ECFFD1',
  risk:      '#C04A3F',
  riskPale:  '#FEF3F2',
  riskBorder:'rgba(192,74,63,0.18)',
  warn:      '#B5701A',
  warnPale:  '#FEF8EC',
  amberBorder:'rgba(181,112,26,0.18)',
  text:      '#1B262C',
  textMid:   '#40515D',
  textLight: '#6B7C88',
  border:    'rgba(16,54,125,0.12)',
  borderMid: 'rgba(1,69,242,0.18)',
  F:         "'Pretendard Variable', 'Inter', system-ui, sans-serif",
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const MEMORY_RECORDS = [
  {
    id: 'pat-001',
    name: '다나카 유미',
    nameOrig: '田中由美',
    lang: 'ja', langLabel: '일본어', flag: '🇯🇵',
    country: '일본', city: '도쿄',
    age: 34, sessionCount: 3, lastSessionAt: '2026-04-18',
    riskCount: 1,
    context: {
      procedureInterests: {
        values: ['히알루론산 필러', '눈 밑 교정', '광대 볼륨'],
        sessionRef: '2026-04-18 진료실 B',
      },
      painSensitivity: {
        level: 'high',
        note: '주사에 대한 불안 반복 표현. 마취 크림 강하게 선호. 처치 중 호흡 빠름.',
        sessionRef: '2026-04-18',
      },
      downtimeConcern: {
        level: 'medium',
        note: '3일 이내 일상 복귀 요구. 관광 일정 포함. 붓기에 민감.',
        sessionRef: '2026-04-16',
      },
      scheduleDuration: {
        stay: '5박 6일',
        departure: '2026-04-23',
        constraint: '항공편 고정 — 연장 불가',
        sessionRef: '2026-04-16',
      },
      complaintRisk: {
        level: 'low',
        note: '과거 불만 이력 없음. 상담 태도 협조적. 의료진 설명에 즉각 동의.',
        sessionRef: '2026-04-18',
      },
    },
    sessions: [
      {
        id: 's-001', date: '2026-04-18', surface: 'room', room: '진료실 B',
        duration: '22분', turns: 12,
        summary: [
          { cat: 'concern', text: '눈 밑 꺼짐 및 광대 볼륨 부족 주 관심사' },
          { cat: 'history', text: '6개월 전 타 클리닉 필러 경험' },
          { cat: 'symptom', text: '상담 중 경미한 어지러움 호소 — 긴장성 추정' },
          { cat: 'consent', text: '시술 설명 청취 완료, 당일 동의' },
        ],
        riskFlags: [
          { level: 'HIGH', cat: 'distress', phrase: '頭がふわふわ · 어지러운 느낌', dismissed: true, dismissedBy: '간호사' },
        ],
      },
      {
        id: 's-002', date: '2026-04-16', surface: 'talk',
        duration: '8분', turns: 6,
        summary: [
          { cat: 'request', text: '자연스러운 볼륨 결과 선호 명확히 표현' },
          { cat: 'concern', text: '과도한 볼륨 추가 원하지 않음' },
        ],
        riskFlags: [],
      },
      {
        id: 's-003', date: '2026-03-28', surface: 'talk',
        duration: '5분', turns: 4,
        summary: [
          { cat: 'concern', text: '초진 문의 — 눈 밑 꺼짐 개선 가능 여부 확인' },
        ],
        riskFlags: [],
      },
    ],
    followUps: [
      { type: 'check', priority: 'high', text: 'D+3 붓기·어지러움 경과 확인 필요 — 진료실 내 distress 이력', dueDate: '2026-04-21' },
      { type: 'rebook', priority: 'medium', text: '잔여 광대 볼륨 보완 상담 가능 — 재방문 의사 표현 있음', dueDate: '2026-05-05' },
      { type: 'lang', priority: 'low', text: '동의서 일본어 번역본 준비 권고 (재방문 시 적용)' },
    ],
  },
  {
    id: 'pat-002',
    name: '왕리', nameOrig: '王莉',
    lang: 'zh', langLabel: '중국어', flag: '🇨🇳',
    country: '중국', city: '상하이',
    age: 29, sessionCount: 2, lastSessionAt: '2026-04-15',
    riskCount: 0,
    context: {
      procedureInterests: {
        values: ['보톡스 (이마·미간)', '쌍꺼풀 상담', '피부 레이저'],
        sessionRef: '2026-04-15 진료실 A',
      },
      painSensitivity: {
        level: 'low',
        note: '통증 관련 언급 없음. 이전 보톡스 경험 있음 — 내성 높은 것으로 추정.',
        sessionRef: '2026-04-15',
      },
      downtimeConcern: {
        level: 'low',
        note: '다운타임 무관. 회사 원격근무 중이라 일정 유연.',
        sessionRef: '2026-04-10',
      },
      scheduleDuration: {
        stay: '7박 8일',
        departure: '2026-04-20',
        constraint: '없음 — 유연한 일정',
        sessionRef: '2026-04-10',
      },
      complaintRisk: {
        level: 'medium',
        note: '결과에 대한 기대치 높음. 시술 전·후 사진 비교 요청. 비현실적 기대 가능성.',
        sessionRef: '2026-04-15',
      },
    },
    sessions: [
      {
        id: 's-004', date: '2026-04-15', surface: 'room', room: '진료실 A',
        duration: '18분', turns: 10,
        summary: [
          { cat: 'concern', text: '이마 주름 + 미간 보톡스 우선 논의' },
          { cat: 'request', text: '시술 전후 사진 비교 요청 — 차이 시각화 원함' },
          { cat: 'consent', text: '시술 동의 완료. 쌍꺼풀 재방문 상담 예정.' },
        ],
        riskFlags: [],
      },
      {
        id: 's-005', date: '2026-04-10', surface: 'talk',
        duration: '11분', turns: 8,
        summary: [
          { cat: 'concern', text: '초진 — 전체 안면 리뉴얼에 관심' },
          { cat: 'history', text: '상하이 클리닉 보톡스 1회 경험 (1년 전)' },
        ],
        riskFlags: [],
      },
    ],
    followUps: [
      { type: 'rebook', priority: 'high', text: '쌍꺼풀 상담 예약 — 이전 세션에서 재방문 의사 확인', dueDate: '2026-04-25' },
      { type: 'check', priority: 'medium', text: '보톡스 D+7 효과 확인 연락 권고', dueDate: '2026-04-22' },
    ],
  },
  {
    id: 'pat-003',
    name: 'Sarah Chen', nameOrig: '',
    lang: 'en', langLabel: '영어', flag: '🇺🇸',
    country: '미국', city: '뉴욕',
    age: 41, sessionCount: 1, lastSessionAt: '2026-04-12',
    riskCount: 1,
    context: {
      procedureInterests: {
        values: ['레이저 토닝', '피부 리쥬비네이션', '리프팅'],
        sessionRef: '2026-04-12 진료실 C',
      },
      painSensitivity: {
        level: 'medium',
        note: '레이저 열감 불편 표현. 쿨링 요청. 통증보다 열 민감도 높음.',
        sessionRef: '2026-04-12',
      },
      downtimeConcern: {
        level: 'high',
        note: '업무 복귀 D+1 필수. 빨간 기 노출 불가 (발표 일정). 즉시 복귀 시술만 가능.',
        sessionRef: '2026-04-12',
      },
      scheduleDuration: {
        stay: '3박 4일',
        departure: '2026-04-15',
        constraint: 'D+1 회의 일정 — 붓기·홍조 불가',
        sessionRef: '2026-04-12',
      },
      complaintRisk: {
        level: 'high',
        note: '기대치와 실제 결과 간 차이에 민감. 시술 효과 즉시 확인 요구. SNS 노출 가능성.',
        sessionRef: '2026-04-12',
      },
    },
    sessions: [
      {
        id: 's-006', date: '2026-04-12', surface: 'room', room: '진료실 C',
        duration: '28분', turns: 14,
        summary: [
          { cat: 'concern', text: '색소침착·잔주름 레이저 개선 원함' },
          { cat: 'symptom', text: '시술 중 열감 과민 반응 — 쿨링 2회 추가 요청' },
          { cat: 'request', text: '시술 직후 효과 확인 요청 (거울 요청)' },
          { cat: 'consent', text: '동의서 영문본 요구 → 제공 완료' },
        ],
        riskFlags: [
          { level: 'HIGH', cat: 'distress', phrase: 'It feels like it\'s burning · 화끈거린다고 표현', dismissed: true, dismissedBy: '의사' },
        ],
      },
    ],
    followUps: [
      { type: 'check', priority: 'high', text: 'D+2 피부 상태 사진 확인 요청 — 열 과민 이력', dueDate: '2026-04-14' },
      { type: 'rebook', priority: 'medium', text: '2차 레이저 토닝 예약 — 다음 방한 시 연속 시술 권고', dueDate: '2026-06-01' },
      { type: 'lang', priority: 'low', text: '영문 시술 후 관리 안내문 이메일 발송 권고' },
    ],
  },
  {
    id: 'pat-004',
    name: '응우옌 티 란', nameOrig: 'Nguyễn Thị Lan',
    lang: 'vi', langLabel: '베트남어', flag: '🇻🇳',
    country: '베트남', city: '호치민',
    age: 26, sessionCount: 2, lastSessionAt: '2026-04-08',
    riskCount: 0,
    context: {
      procedureInterests: {
        values: ['입술 필러', '눈 밑 애교살', '윤곽 주사'],
        sessionRef: '2026-04-08 진료실 B',
      },
      painSensitivity: {
        level: 'medium',
        note: '입술 시술 통증 우려 표현. 마취 크림 충분한 시간 요청. 시술 중 통증 없었음.',
        sessionRef: '2026-04-08',
      },
      downtimeConcern: {
        level: 'medium',
        note: '3~5일 붓기 수용 가능. 인플루언서 활동 — 1주일 후 촬영 일정 있음.',
        sessionRef: '2026-04-08',
      },
      scheduleDuration: {
        stay: '4박 5일',
        departure: '2026-04-12',
        constraint: '촬영 일정 고려 — D+7 이후 공개 예정',
        sessionRef: '2026-04-05',
      },
      complaintRisk: {
        level: 'low',
        note: '결과에 매우 만족 표현. SNS 후기 게시 희망 — 긍정적 바이럴 기대.',
        sessionRef: '2026-04-08',
      },
    },
    sessions: [
      {
        id: 's-007', date: '2026-04-08', surface: 'room', room: '진료실 B',
        duration: '16분', turns: 9,
        summary: [
          { cat: 'concern', text: '입술 볼륨 · 애교살 동시 시술 상담' },
          { cat: 'request', text: 'SNS 포스팅용 자연스러운 결과 요청' },
          { cat: 'consent', text: '동의 완료. 당일 시술.' },
        ],
        riskFlags: [],
      },
      {
        id: 's-008', date: '2026-04-05', surface: 'talk',
        duration: '7분', turns: 5,
        summary: [
          { cat: 'concern', text: '초진 문의 — 입술 필러 상담 요청' },
          { cat: 'history', text: '베트남 현지 시술 경험 없음 — 초시술' },
        ],
        riskFlags: [],
      },
    ],
    followUps: [
      { type: 'rebook', priority: 'medium', text: '윤곽 주사 재방문 상담 — 관심 표현했으나 당일 미결정', dueDate: '2026-06-15' },
      { type: 'check', priority: 'low', text: 'SNS 후기 게시 시 모니터링 — 긍정 바이럴 기대 환자', dueDate: '2026-04-20' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const LANG_COLOR = { ja: C.mocha, zh: '#0F4C75', en: '#3B6500', vi: '#10367D', th: '#0145F2', ko: '#1B262C' };

const CAT_CONFIG = {
  concern: { label: '불만',      color: C.mocha,   bg: C.mochaPale  },
  history: { label: '병력',      color: '#7058A8', bg: '#F4F0FB'    },
  allergy: { label: '알레르기',  color: C.risk,    bg: C.riskPale   },
  symptom: { label: '증상',      color: C.warn,    bg: C.warnPale   },
  consent: { label: '동의',      color: C.sage,    bg: C.sagePale   },
  request: { label: '요청',      color: '#7058A8', bg: '#F4F0FB'    },
};

const FOLLOW_UP_CONFIG = {
  check:  { icon: Activity,    color: C.risk,   label: '경과 확인' },
  rebook: { icon: Calendar,    color: C.mocha,  label: '재방문 유도' },
  lang:   { icon: Globe,       color: '#7058A8',label: '언어 지원' },
};

const PRIORITY_CONFIG = {
  high:   { label: '우선',   color: C.risk,   bg: C.riskPale  },
  medium: { label: '권고',   color: C.warn,   bg: C.warnPale  },
  low:    { label: '참고',   color: C.textMid,bg: C.bg        },
};

const LEVEL_CONFIG = {
  low:    { label: '낮음', color: C.sage,   bg: C.sagePale  },
  medium: { label: '주의', color: C.warn,   bg: C.warnPale  },
  high:   { label: '높음', color: C.risk,   bg: C.riskPale  },
};

// reversed for complaint risk (high = dangerous)
const RISK_LEVEL_CONFIG = {
  low:    { label: '낮음', color: C.sage,   bg: C.sagePale  },
  medium: { label: '주의', color: C.warn,   bg: C.warnPale  },
  high:   { label: '높음', color: C.risk,   bg: C.riskPale  },
};

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function riskFlagsToText(flags = []) {
  return (Array.isArray(flags) ? flags : [])
    .map((flag) => {
      if (typeof flag === 'string') return flag;
      const severity = flag.severity || flag.level || 'medium';
      const type = flag.type || flag.cat || 'manual';
      const detail = flag.detail || flag.description || flag.phrase || '';
      return [severity, type, detail].filter(Boolean).join(' | ');
    })
    .filter(Boolean)
    .join('\n');
}

function parseRiskFlags(text) {
  return splitLines(text).map((line) => {
    const parts = line.split('|').map(part => part.trim()).filter(Boolean);
    if (parts.length >= 3) return { severity: parts[0], type: parts[1], detail: parts.slice(2).join(' | ') };
    if (parts.length === 2) return { severity: 'medium', type: parts[0], detail: parts[1] };
    return { severity: 'medium', type: 'manual', detail: parts[0] || line };
  });
}

function langLabel(lang) {
  return { ja: '일본어', zh: '중국어', en: '영어', vi: '베트남어', th: '태국어', ko: '한국어' }[lang] || '언어 미상';
}

function adaptMemoryItemToRecord(item) {
  const patient = item.patient || {};
  const procedureInterests = item.procedure_interests || [];
  const concerns = item.concerns || [];
  const staffPrecautions = item.staff_precautions || [];
  const riskFlags = item.risk_flags || [];
  const year = patient.birth_year ? new Date().getFullYear() - Number(patient.birth_year) : null;
  return {
    id: item.patient_id || item.id,
    name: patient.name || '이름 없는 환자',
    nameOrig: '',
    lang: patient.lang || 'ko',
    langLabel: langLabel(patient.lang),
    flag: patient.flag || '📝',
    country: patient.nationality || '국가 미상',
    city: '',
    age: Number.isFinite(year) ? year : null,
    sessionCount: item.session_count || 0,
    lastSessionAt: item.last_session_at ? item.last_session_at.slice(0, 10) : '기록 없음',
    riskCount: riskFlags.length || (item.risk_level && item.risk_level !== 'none' ? 1 : 0),
    context: {
      procedureInterests: {
        values: procedureInterests,
        sessionRef: item.last_session_at ? `최근 세션 ${item.last_session_at.slice(0, 10)}` : '직원 편집',
      },
      painSensitivity: {
        level: item.risk_level === 'high' ? 'high' : item.risk_level === 'medium' ? 'medium' : 'low',
        note: concerns[0] || item.ai_summary || '아직 별도 위험 신호가 없습니다.',
        sessionRef: item.last_edited_at ? `직원 편집 ${item.last_edited_at.slice(0, 10)}` : null,
      },
      downtimeConcern: {
        level: staffPrecautions.length ? 'medium' : 'low',
        note: staffPrecautions.join(' / ') || '직원 주의사항이 아직 없습니다.',
        sessionRef: item.last_edited_at ? `직원 편집 ${item.last_edited_at.slice(0, 10)}` : null,
      },
      scheduleDuration: {
        stay: '방문/체류 정보는 방문 기록에서 확인',
        departure: '-',
        constraint: '',
        sessionRef: null,
      },
      complaintRisk: {
        level: item.risk_level && item.risk_level !== 'none' ? item.risk_level : 'low',
        note: riskFlags.map(flag => flag.detail || flag.description || flag.phrase).filter(Boolean).join(' / ') || '위험 신호 없음',
        sessionRef: item.last_edited_at ? `직원 편집 ${item.last_edited_at.slice(0, 10)}` : null,
      },
    },
    sessions: [{
      id: `${item.id || item.patient_id}-memory`,
      date: item.updated_at ? item.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      surface: 'memory',
      duration: '-',
      turns: item.session_count || 0,
      summary: [
        { cat: 'concern', text: item.ai_summary || '요약 없음' },
        ...(staffPrecautions.length ? [{ cat: 'request', text: `직원 주의사항: ${staffPrecautions.join(', ')}` }] : []),
        ...(item.staff_notes ? [{ cat: 'history', text: `운영 메모: ${item.staff_notes}` }] : []),
      ],
      riskFlags: riskFlags.map(flag => ({
        level: (flag.severity || item.risk_level || 'medium').toUpperCase(),
        cat: flag.type || 'manual',
        phrase: flag.detail || flag.description || flag.phrase || String(flag),
        dismissed: false,
      })),
    }],
    followUps: staffPrecautions.map(text => ({ type: 'check', priority: 'medium', text })),
    _memory: item,
  };
}

function sHead(label) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: C.textLight,
      marginBottom: 14,
    }}>
      {label}
    </div>
  );
}

function LevelPill({ level }) {
  const c = LEVEL_CONFIG[level] || LEVEL_CONFIG.low;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
      color: c.color, background: c.bg,
      padding: '2px 7px', borderRadius: 5,
    }}>
      {c.label}
    </span>
  );
}

// ── ContextCard ───────────────────────────────────────────────────────────────
function ContextCard({ icon: Icon, label, children, sessionRef, accent = C.mocha }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 6px rgba(1,69,242,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7,
          background: `${accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={11} color={accent} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMid, letterSpacing: '0.03em' }}>
          {label}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
      {sessionRef && (
        <div style={{ fontSize: 9, color: C.textLight }}>
          출처: {sessionRef}
        </div>
      )}
    </div>
  );
}

// ── SessionCard ───────────────────────────────────────────────────────────────
function SessionCard({ session, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const surfaceLabel = session.surface === 'room' ? `🏥 ${session.room}` : '💬 Tiki Talk';
  const hasRisk = session.riskFlags?.length > 0;

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(1,69,242,0.04)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: C.F,
        }}
      >
        {/* Date dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: hasRisk ? C.risk : C.mocha,
          flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
              {session.date}
            </span>
            <span style={{
              fontSize: 9, color: C.textMid,
              background: C.bg, padding: '1px 7px', borderRadius: 5,
            }}>
              {surfaceLabel}
            </span>
            {hasRisk && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: C.risk,
                background: C.riskPale, padding: '1px 6px', borderRadius: 5,
              }}>
                ⚠ 위험 감지
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: C.textLight }}>
            {session.duration} · {session.turns}회 발화
          </span>
        </div>

        {open
          ? <ChevronDown size={13} color={C.textLight} />
          : <ChevronRight size={13} color={C.textLight} />
        }
      </button>

      {open && (
        <div style={{
          animation: 'tmFadeIn 0.18s ease both',
          borderTop: `1px solid ${C.border}`,
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {session.summary.map((item, i) => {
            const c = CAT_CONFIG[item.cat] || { label: item.cat, color: C.textMid, bg: C.bg };
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: c.color, background: c.bg,
                  padding: '2px 6px', borderRadius: 5,
                  flexShrink: 0, marginTop: 1,
                }}>
                  {c.label}
                </span>
                <span style={{ fontSize: 12, color: C.text, lineHeight: 1.55 }}>
                  {item.text}
                </span>
              </div>
            );
          })}

          {session.riskFlags?.map((r, i) => (
            <div key={i} style={{
              marginTop: 4,
              background: C.riskPale,
              border: `1px solid ${C.riskBorder}`,
              borderRadius: 8,
              padding: '8px 10px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.risk, flexShrink: 0 }}>
                ⚠ {r.level}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>{r.phrase}</div>
                {r.dismissed && (
                  <div style={{ fontSize: 10, color: C.textMid }}>
                    확인: {r.dismissedBy} · {r.cat}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FollowUpCard ──────────────────────────────────────────────────────────────
function FollowUpCard({ item }) {
  const fc  = FOLLOW_UP_CONFIG[item.type] || FOLLOW_UP_CONFIG.check;
  const pc  = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
  const Icon = fc.icon;

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      boxShadow: '0 1px 6px rgba(1,69,242,0.04)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${fc.color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        <Icon size={12} color={fc.color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: fc.color, background: `${fc.color}12`,
            padding: '2px 7px', borderRadius: 5,
          }}>
            {fc.label}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: pc.color, background: pc.bg,
            padding: '2px 6px', borderRadius: 5,
          }}>
            {pc.label}
          </span>
          {item.dueDate && (
            <span style={{ fontSize: 9, color: C.textLight, marginLeft: 'auto' }}>
              {item.dueDate}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: C.text, lineHeight: 1.55, margin: 0 }}>
          {item.text}
        </p>
      </div>
    </div>
  );
}

// ── MemoryListItem ────────────────────────────────────────────────────────────
function MemoryListItem({ record, isSelected, onClick }) {
  const langColor  = LANG_COLOR[record.lang] || C.textMid;
  const hasRisk    = record.riskCount > 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: isSelected ? C.mochaPale : 'transparent',
        border: 'none',
        borderLeft: isSelected ? `3px solid ${C.mocha}` : '3px solid transparent',
        padding: '14px 16px 14px 13px',
        cursor: 'pointer', fontFamily: C.F,
        transition: 'background 0.15s',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.bg; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Flag avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${langColor}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {record.flag}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            {record.name}
          </span>
          {record.nameOrig && (
            <span style={{ fontSize: 10, color: C.textLight }}>{record.nameOrig}</span>
          )}
          {hasRisk && (
            <span style={{
              marginLeft: 'auto',
              fontSize: 9, fontWeight: 700, color: C.risk,
              background: C.riskPale, padding: '1px 6px', borderRadius: 5,
            }}>
              ⚠
            </span>
          )}
        </div>

        {/* Language + country */}
        <div style={{ fontSize: 11, color: C.textMid, marginBottom: 5 }}>
          {record.langLabel} · {record.country}
        </div>

        {/* Signals */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {record.context.procedureInterests.values.slice(0, 2).map((v, i) => (
            <span key={i} style={{
              fontSize: 9, color: C.mochaDark,
              background: C.mochaPale,
              padding: '2px 7px', borderRadius: 5, fontWeight: 500,
            }}>
              {v}
            </span>
          ))}
        </div>

        {/* Session meta */}
        <div style={{ fontSize: 10, color: C.textLight, marginTop: 5 }}>
          {record.sessionCount}회 세션 · 최근 {record.lastSessionAt}
        </div>
      </div>
    </button>
  );
}

// ── MemoryDetail ──────────────────────────────────────────────────────────────
function MemoryEditPanel({ record, onCancel, onSaved }) {
  const memory = record._memory || {};
  const [summary, setSummary] = useState(memory.ai_summary || '');
  const [interests, setInterests] = useState(joinLines(memory.procedure_interests));
  const [concerns, setConcerns] = useState(joinLines(memory.concerns));
  const [precautions, setPrecautions] = useState(joinLines(memory.staff_precautions));
  const [notes, setNotes] = useState(memory.staff_notes || '');
  const [riskLevel, setRiskLevel] = useState(memory.risk_level || 'none');
  const [riskFlags, setRiskFlags] = useState(riskFlagsToText(memory.risk_flags));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('로그인 세션을 확인할 수 없습니다.');
      const res = await fetch(`/api/staff/memory/${encodeURIComponent(record.patient_id || record.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ai_summary: summary,
          procedure_interests: splitLines(interests),
          concerns: splitLines(concerns),
          staff_precautions: splitLines(precautions),
          staff_notes: notes,
          risk_level: riskLevel,
          risk_flags: parseRiskFlags(riskFlags),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved?.(data.item);
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 12,
    lineHeight: 1.55,
    color: C.text,
    background: C.surface,
    fontFamily: C.F,
    outline: 'none',
  };

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.borderMid}`,
      borderRadius: 16,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 12px 30px rgba(1,69,242,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Edit3 size={16} color={C.mocha} />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: C.text, margin: 0 }}>운영 기억 편집</h3>
          <p style={{ fontSize: 11, color: C.textLight, margin: '3px 0 0' }}>
            환자별 운영 기억만 정리합니다. CRM 원본 덤프나 전체 대화 원문은 저장하지 않습니다.
          </p>
        </div>
      </div>

      <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>요약</label>
      <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} style={inputStyle} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>관심 시술</label>
          <textarea value={interests} onChange={e => setInterests(e.target.value)} rows={4} style={{ ...inputStyle, marginTop: 6 }} placeholder={'리프팅\n보톡스'} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>주의사항</label>
          <textarea value={precautions} onChange={e => setPrecautions(e.target.value)} rows={4} style={{ ...inputStyle, marginTop: 6 }} placeholder={'통역 확인 필요\n통증 불안 높음'} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>환자 우려/걱정</label>
          <textarea value={concerns} onChange={e => setConcerns(e.target.value)} rows={4} style={{ ...inputStyle, marginTop: 6 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>위험 신호</label>
          <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} style={{ ...inputStyle, marginTop: 6, height: 40 }}>
            <option value="none">없음</option>
            <option value="low">낮음</option>
            <option value="medium">주의</option>
            <option value="high">높음</option>
          </select>
          <textarea value={riskFlags} onChange={e => setRiskFlags(e.target.value)} rows={3} style={{ ...inputStyle, marginTop: 8 }} placeholder={'high | allergy | 라텍스 알레르기 우려'} />
        </div>
      </div>

      <label style={{ fontSize: 11, fontWeight: 800, color: C.textMid }}>직원 메모</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={inputStyle} />

      {error && <div style={{ fontSize: 12, color: C.risk, fontWeight: 700 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel} disabled={saving} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, color: C.textMid, fontWeight: 800, padding: '9px 14px', cursor: 'pointer' }}>
          취소
        </button>
        <button onClick={save} disabled={saving} style={{ border: 'none', borderRadius: 10, background: C.mocha, color: '#fff', fontWeight: 900, padding: '9px 15px', cursor: saving ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Save size={13} /> {saving ? '저장 중' : '저장'}
        </button>
      </div>
    </div>
  );
}

function MemoryDetail({ record, onMemorySaved }) {
  const [editing, setEditing] = useState(false);
  const allRisks = record.sessions.flatMap(s =>
    (s.riskFlags || []).map(r => ({ ...r, sessionDate: s.date, sessionSurface: s.surface }))
  );

  return (
    <div
      style={{
        animation: 'tmFadeIn 0.25s ease both',
        flex: 1, overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex', flexDirection: 'column', gap: 32,
      }}
    >
      {/* ── Identity header ── */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '22px 24px',
        boxShadow: '0 2px 12px rgba(1,69,242,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `${LANG_COLOR[record.lang] || C.mocha}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0,
          }}>
            {record.flag}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>
                {record.name}
              </h2>
              {record.nameOrig && (
                <span style={{ fontSize: 13, color: C.textMid }}>{record.nameOrig}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: LANG_COLOR[record.lang] || C.mocha,
                background: `${LANG_COLOR[record.lang] || C.mocha}12`,
                padding: '2px 9px', borderRadius: 6,
              }}>
                {record.langLabel}
              </span>
              <span style={{ fontSize: 11, color: C.textMid }}>
                {record.country} · {record.city}
              </span>
              {record.age && (
                <span style={{ fontSize: 11, color: C.textLight }}>{record.age}세</span>
              )}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            {[
              { label: '세션', value: record.sessionCount },
              { label: '위험 감지', value: record.riskCount, color: record.riskCount > 0 ? C.risk : C.sage },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 20, fontWeight: 800,
                  color: stat.color || C.mocha,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button
            onClick={() => setEditing(v => !v)}
            style={{
              border: `1px solid ${C.borderMid}`,
              borderRadius: 10,
              background: editing ? C.mochaPale : C.surface,
              color: C.mochaDark,
              fontSize: 12,
              fontWeight: 900,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Edit3 size={13} /> {editing ? '편집 닫기' : '운영 기억 편집'}
          </button>
        </div>

        {/* Stay info strip */}
        <div style={{
          background: C.bg, borderRadius: 10,
          padding: '10px 14px',
          display: 'flex', gap: 20, alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={11} color={C.textLight} />
            <span style={{ fontSize: 11, color: C.textMid }}>
              {record.context.scheduleDuration.stay}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={11} color={C.textLight} />
            <span style={{ fontSize: 11, color: C.textMid }}>
              출국: {record.context.scheduleDuration.departure}
            </span>
          </div>
          {record.context.scheduleDuration.constraint && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} color={C.warn} />
              <span style={{ fontSize: 11, color: C.warn, fontWeight: 600 }}>
                {record.context.scheduleDuration.constraint}
              </span>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <MemoryEditPanel
          record={record}
          onCancel={() => setEditing(false)}
          onSaved={(item) => {
            setEditing(false);
            onMemorySaved?.(item);
          }}
        />
      )}

      {/* ── Context cards grid ── */}
      <div>
        {sHead('추출 컨텍스트')}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          {/* 1 — Language */}
          <ContextCard
            icon={Globe} label="언어"
            sessionRef={null}
            accent={LANG_COLOR[record.lang] || C.mocha}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{record.flag}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {record.langLabel}
                </div>
                <div style={{ fontSize: 11, color: C.textMid }}>{record.country}</div>
              </div>
            </div>
          </ContextCard>

          {/* 2 — Procedure interests */}
          <ContextCard
            icon={Stethoscope} label="시술 관심사"
            sessionRef={record.context.procedureInterests.sessionRef}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {record.context.procedureInterests.values.map((v, i) => (
                <span key={i} style={{
                  fontSize: 11, color: C.mochaDark,
                  background: C.mochaPale,
                  padding: '3px 9px', borderRadius: 7, fontWeight: 500,
                }}>
                  {v}
                </span>
              ))}
            </div>
          </ContextCard>

          {/* 3 — Pain sensitivity */}
          <ContextCard
            icon={Activity} label="통증 민감도"
            sessionRef={record.context.painSensitivity.sessionRef}
            accent={LEVEL_CONFIG[record.context.painSensitivity.level]?.color || C.mocha}
          >
            <div style={{ marginBottom: 6 }}>
              <LevelPill level={record.context.painSensitivity.level} />
            </div>
            <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.55, margin: 0 }}>
              {record.context.painSensitivity.note}
            </p>
          </ContextCard>

          {/* 4 — Downtime concern */}
          <ContextCard
            icon={Clock} label="다운타임 우려"
            sessionRef={record.context.downtimeConcern.sessionRef}
            accent={LEVEL_CONFIG[record.context.downtimeConcern.level]?.color || C.mocha}
          >
            <div style={{ marginBottom: 6 }}>
              <LevelPill level={record.context.downtimeConcern.level} />
            </div>
            <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.55, margin: 0 }}>
              {record.context.downtimeConcern.note}
            </p>
          </ContextCard>

          {/* 5 — Schedule / stay */}
          <ContextCard
            icon={Calendar} label="체류 일정"
            sessionRef={record.context.scheduleDuration.sessionRef}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {record.context.scheduleDuration.stay}
              </div>
              <div style={{ fontSize: 11, color: C.textMid }}>
                출국: {record.context.scheduleDuration.departure}
              </div>
              {record.context.scheduleDuration.constraint && (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.warn,
                  background: C.warnPale, padding: '3px 8px', borderRadius: 6, marginTop: 2,
                }}>
                  {record.context.scheduleDuration.constraint}
                </div>
              )}
            </div>
          </ContextCard>

          {/* 6 — Complaint risk */}
          <ContextCard
            icon={Shield} label="컴플레인 위험도"
            sessionRef={record.context.complaintRisk.sessionRef}
            accent={RISK_LEVEL_CONFIG[record.context.complaintRisk.level]?.color || C.sage}
          >
            <div style={{ marginBottom: 6 }}>
              <LevelPill level={record.context.complaintRisk.level} />
            </div>
            <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.55, margin: 0 }}>
              {record.context.complaintRisk.note}
            </p>
          </ContextCard>
        </div>
      </div>

      {/* ── Conversation timeline ── */}
      <div>
        {sHead('대화 타임라인')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {record.sessions.map((s, i) => (
            <SessionCard key={s.id} session={s} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      {/* ── Risk history ── */}
      {allRisks.length > 0 && (
        <div>
          {sHead('위험 이력')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allRisks.map((r, i) => (
              <div key={i} style={{
                animation: `tmFadeUp ${0.1 + i * 0.06}s ease both`,
                background: C.riskPale,
                border: `1px solid ${C.riskBorder}`,
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${C.risk}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={12} color={C.risk} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.risk }}>
                      {r.level}
                    </span>
                    <span style={{
                      fontSize: 9, color: C.textMid,
                      background: 'rgba(0,0,0,0.05)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {r.cat}
                    </span>
                    <span style={{ fontSize: 10, color: C.textLight, marginLeft: 'auto' }}>
                      {r.sessionDate}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: C.text, margin: '0 0 4px' }}>
                    {r.phrase}
                  </p>
                  {r.dismissed && (
                    <span style={{ fontSize: 10, color: C.sage }}>
                      ✓ 확인됨 — {r.dismissedBy}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Follow-up suggestions ── */}
      {record.followUps?.length > 0 && (
        <div>
          {sHead('팔로업 제안')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {record.followUps.map((item, i) => (
              <FollowUpCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14, opacity: 0.5,
    }}>
      <Brain size={36} color={C.textLight} strokeWidth={1.4} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid, margin: '0 0 5px' }}>
          환자를 선택하세요
        </p>
        <p style={{ fontSize: 12, color: C.textLight, margin: 0 }}>
          대화에서 추출된 컨텍스트가 표시됩니다
        </p>
      </div>
    </div>
  );
}

// ── InsightsTab (TikiMemory) ──────────────────────────────────────────────────
export default function InsightsTab({ darkMode }) {
  // Inject CSS
  const [cssInjected] = useState(() => {
    if (typeof document !== 'undefined') {
      const el = document.createElement('style');
      el.textContent = KEYFRAMES;
      document.head.appendChild(el);
    }
    return true;
  });

  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState(null);
  const [langFilter, setLangFilter] = useState('all');
  const [memoryItems, setMemoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadMemory() {
      setLoading(true);
      setLoadError('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('로그인 세션을 확인할 수 없습니다.');
        const res = await fetch('/api/staff/memory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!active) return;
        setMemoryItems((data.items || []).map(adaptMemoryItemToRecord));
      } catch (err) {
        if (!active) return;
        setLoadError(err.message || 'Memory를 불러오지 못했습니다.');
        setMemoryItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadMemory();
    return () => { active = false; };
  }, []);

  const records = memoryItems.length > 0 ? memoryItems : MEMORY_RECORDS;

  const langs = useMemo(() => {
    const seen = new Set();
    records.forEach(r => seen.add(r.lang));
    return Array.from(seen);
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(r => {
      if (langFilter !== 'all' && r.lang !== langFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.nameOrig || '').toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.context.procedureInterests.values.some(v => v.includes(q))
      );
    });
  }, [query, langFilter, records]);

  function handleMemorySaved(item) {
    if (!item) return;
    const updated = adaptMemoryItemToRecord(item);
    setMemoryItems(prev => {
      const next = prev.some(record => record.id === updated.id)
        ? prev.map(record => record.id === updated.id ? updated : record)
        : [updated, ...prev];
      return next;
    });
    setSelected(updated);
  }

  return (
    <div style={{
      flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden',
      fontFamily: C.F, background: C.bg,
    }}>

      {/* ── Left panel: Memory list ── */}
      <div style={{
        width: 340, flexShrink: 0,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: C.mochaPale,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={13} color={C.mocha} strokeWidth={2} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>
                Tiki Memory
              </h2>
              <p style={{ fontSize: 10, color: C.textLight, margin: 0 }}>
                {loading ? '불러오는 중' : `${filtered.length}개 기억`}
              </p>
            </div>
          </div>

          {loadError && (
            <div style={{
              marginBottom: 10,
              padding: '8px 10px',
              borderRadius: 9,
              background: C.warnPale,
              color: C.warn,
              fontSize: 11,
              fontWeight: 700,
            }}>
              실제 Memory를 불러오지 못해 예시 기록을 표시합니다: {loadError}
            </div>
          )}

          {/* Search */}
          <div style={{
            position: 'relative', marginBottom: 10,
          }}>
            <Search size={12} color={C.textLight} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="이름, 국가, 시술..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 32px 8px 30px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 9, outline: 'none',
                fontSize: 12, color: C.text,
                fontFamily: C.F,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                }}
              >
                <X size={11} color={C.textLight} />
              </button>
            )}
          </div>

          {/* Language filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['all', ...langs].map(l => (
              <button
                key={l}
                onClick={() => setLangFilter(l)}
                style={{
                  padding: '3px 10px', borderRadius: 6,
                  fontSize: 10, fontWeight: 600,
                  background: langFilter === l ? C.mocha : C.bg,
                  color: langFilter === l ? '#fff' : C.textMid,
                  border: `1px solid ${langFilter === l ? C.mocha : C.border}`,
                  cursor: 'pointer', fontFamily: C.F,
                  transition: 'all 0.15s',
                }}
              >
                {l === 'all' ? '전체' : { ja: '🇯🇵 일본어', zh: '🇨🇳 중국어', en: '🇺🇸 영어', vi: '🇻🇳 베트남어' }[l] || l}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '40px 20px', opacity: 0.5,
            }}>
              <User size={24} color={C.textLight} strokeWidth={1.4} />
              <p style={{ fontSize: 12, color: C.textMid, margin: 0 }}>
                {query ? '검색 결과 없음' : '기록 없음'}
              </p>
            </div>
          ) : (
            filtered.map(r => (
              <MemoryListItem
                key={r.id}
                record={r}
                isSelected={selected?.id === r.id}
                onClick={() => setSelected(r)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: Memory detail ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
        background: C.bg,
      }}>
        {selected
          ? <MemoryDetail key={selected.id} record={selected} onMemorySaved={handleMemorySaved} />
          : <EmptyDetail />
        }
      </div>
    </div>
  );
}
