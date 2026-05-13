import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Lock,
  MessageSquareOff,
  ShieldCheck,
} from 'lucide-react';

const C = {
  mocha: '#0145F2',
  mochaDark: '#10367D',
  mochaSoft: '#BBE1FA',
  green: '#3B6500',
  red: '#B42318',
  amber: '#9A4F00',
  text: '#1B262C',
  sub: '#40515D',
  muted: '#6B7C88',
  line: '#D6E1EA',
  surface: '#EDF1F5',
};

const F = { sans: "'Pretendard Variable', 'Inter', system-ui, sans-serif" };

const STATS = [
  { label: '안전 기준', value: 3, tone: 'mocha' },
  { label: '금지 표현', value: 3, tone: 'red' },
  { label: '승인 문구', value: 3, tone: 'green' },
  { label: '보완 필요', value: 4, tone: 'amber' },
];

const SECTIONS = [
  {
    icon: ShieldCheck,
    accent: C.mocha,
    title: '응대 기준',
    subtitle: '직원이 환자 문의에 답할 때 반드시 지켜야 하는 기준',
    items: [
      {
        title: '시술 전 금기 확인',
        body: '임신, 수유, 항응고제, 스테로이드 복용 여부는 시술 전 의료진 확인으로 넘깁니다.',
        tag: '의료진 확인',
      },
      {
        title: '레이저·필링 전 준비 안내',
        body: '최근 피부 자극, 강한 햇빛 노출, 각질 제거 여부를 확인하고 필요 시 일정 조정을 안내합니다.',
        tag: '방문 전',
      },
      {
        title: '통증·붓기·출혈 문의',
        body: '증상이 강하거나 지속되면 단정하지 않고 즉시 병원 확인 요청으로 분류합니다.',
        tag: '위험 신호',
      },
    ],
  },
  {
    icon: MessageSquareOff,
    accent: C.red,
    title: '금지 표현',
    subtitle: 'AI와 직원 응대에서 피해야 하는 과장·단정 표현',
    items: [
      {
        title: '효과 보장 표현',
        body: '"100% 효과", "완전히 없어집니다", "무조건 좋아집니다"처럼 결과를 보장하는 표현을 쓰지 않습니다.',
        tag: '과장 금지',
      },
      {
        title: '진단처럼 들리는 표현',
        body: '사진이나 메시지만 보고 질환명, 원인, 치료 필요성을 단정하지 않습니다.',
        tag: '진단 금지',
      },
      {
        title: '타 병원 비교',
        body: '경쟁 병원과 직접 비교하거나 우위를 단정하는 표현은 응대에 포함하지 않습니다.',
        tag: '비교 금지',
      },
    ],
  },
  {
    icon: CheckCircle2,
    accent: C.green,
    title: '승인 문구',
    subtitle: '환자에게 바로 사용해도 되는 표준 안내 문장',
    items: [
      {
        title: '예약 확인',
        body: '예약이 확인되었습니다. 방문 전 문진표와 동의서를 작성해 주시면 대기 시간을 줄일 수 있습니다.',
        tag: '예약',
      },
      {
        title: '도착 확인',
        body: '도착 알림이 확인되었습니다. 잠시만 기다려 주시면 순서대로 안내드리겠습니다.',
        tag: '내원',
      },
      {
        title: '애프터케어 확인',
        body: '남겨주신 회복 상태를 병원에서 확인하겠습니다. 통증, 출혈, 호흡 불편 등은 즉시 연락해 주세요.',
        tag: '애프터케어',
      },
    ],
  },
];

const GAPS = [
  '시술별 금기사항이 병원 기준으로 충분히 채워져 있는지 확인',
  '가격·다운타임 안내가 현재 병원 정책과 맞는지 확인',
  '외국어 안내 문구가 My Tiki 번역과 충돌하지 않는지 확인',
  '애프터케어 문구가 실제 발송 템플릿과 같은 톤인지 확인',
];

function toneColor(tone) {
  return {
    mocha: C.mochaDark,
    green: C.green,
    red: C.red,
    amber: C.amber,
  }[tone] || C.mochaDark;
}

function StatTile({ label, value, tone, darkMode }) {
  const color = toneColor(tone);
  return (
    <div
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : C.line,
        background: darkMode ? '#18181B' : '#FFFFFF',
        borderRadius: 18,
        padding: '18px 20px',
        minHeight: 112,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 850, color: darkMode ? '#D4D4D8' : C.sub }}>{label}</div>
      <div style={{ marginTop: 11, fontSize: 38, lineHeight: 1, fontWeight: 950, letterSpacing: '-0.05em', color }}>{value}</div>
    </div>
  );
}

function ProtocolItem({ item, accent, darkMode }) {
  return (
    <div
      className="border"
      style={{
        borderColor: darkMode ? '#27272A' : C.line,
        background: darkMode ? '#111827' : '#FFFFFF',
        borderRadius: 18,
        padding: '18px 20px',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 920, color: darkMode ? '#FAFAFA' : C.text }}>
          {item.title}
        </h3>
        <span
          className="shrink-0"
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            background: `${accent}12`,
            color: accent,
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          {item.tag}
        </span>
      </div>
      <p style={{ marginTop: 11, fontSize: 15, lineHeight: 1.68, fontWeight: 650, color: darkMode ? '#A1A1AA' : C.sub }}>
        {item.body}
      </p>
    </div>
  );
}

function ProtocolSection({ section, darkMode }) {
  const Icon = section.icon;
  return (
    <section>
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: `${section.accent}14`,
            color: section.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={25} strokeWidth={2.3} />
        </div>
        <div>
          <h2 style={{ fontSize: 25, lineHeight: 1.08, fontWeight: 950, letterSpacing: '-0.045em', color: darkMode ? '#FAFAFA' : C.text }}>
            {section.title}
          </h2>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.35, fontWeight: 750, color: darkMode ? '#A1A1AA' : C.sub }}>
            {section.subtitle}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {section.items.map((item) => (
          <ProtocolItem key={item.title} item={item} accent={section.accent} darkMode={darkMode} />
        ))}
      </div>
    </section>
  );
}

function GapChecklist({ darkMode }) {
  return (
    <section
      className="border"
      style={{
        borderColor: darkMode ? '#3F3F46' : '#FEDF89',
        background: darkMode ? '#1C1917' : '#FFFCF5',
        borderRadius: 8,
        padding: 18,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: '#FFFAEB',
            color: C.amber,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle size={23} strokeWidth={2.4} />
        </div>
        <div>
          <h2 style={{ fontSize: 21, lineHeight: 1.1, fontWeight: 950, color: darkMode ? '#FAFAFA' : C.text }}>
            보완 필요
          </h2>
          <p style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: darkMode ? '#D6D3D1' : C.sub }}>
            다음 단계에서 시술관리와 연결해 채워야 하는 항목
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {GAPS.map((gap) => (
          <div
            key={gap}
            className="flex items-start gap-3 border"
            style={{
              borderColor: darkMode ? '#44403C' : 'rgba(255, 173, 92, 0.55)',
              background: darkMode ? '#292524' : '#FFFFFF',
              borderRadius: 18,
              padding: '16px 18px',
            }}
          >
            <FileCheck2 size={18} style={{ color: C.amber, marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 750, color: darkMode ? '#E7E5E4' : C.text }}>
              {gap}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProtocolTab({ darkMode }) {
  const bg = darkMode ? '#09090B' : '#EDF1F5';
  const headerBg = darkMode ? '#18181B' : '#FFFFFF';

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', fontFamily: F.sans, background: bg, overflow: 'hidden' }}
    >
      <div
        style={{
          padding: '30px 32px',
          borderBottom: `1px solid ${darkMode ? '#27272A' : C.line}`,
          background: headerBg,
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 18,
                background: C.mocha,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 28px rgba(1, 69, 242, 0.22)',
              }}
            >
              <BookOpen size={26} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h1 style={{ fontSize: 36, lineHeight: 1, fontWeight: 950, letterSpacing: '-0.055em', color: darkMode ? '#FAFAFA' : C.text }}>
                프로토콜
              </h1>
              <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.45, fontWeight: 750, color: darkMode ? '#A1A1AA' : C.sub }}>
                병원 응대 기준, 금지 표현, 승인 문구를 한눈에 점검합니다.
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 border"
            style={{
              borderColor: darkMode ? '#3F3F46' : C.line,
              borderRadius: 999,
              padding: '8px 12px',
              color: darkMode ? '#A1A1AA' : C.sub,
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            <Lock size={15} />
            관리자 편집 전용
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-6">
          {STATS.map((item) => (
            <StatTile key={item.label} {...item} darkMode={darkMode} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 32px 42px' }}>
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <ProtocolSection key={section.title} section={section} darkMode={darkMode} />
          ))}
          <GapChecklist darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}
