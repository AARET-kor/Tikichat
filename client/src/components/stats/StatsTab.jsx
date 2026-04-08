import { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, MessageSquare, Users,
  Clock, DollarSign, ChevronDown, Calendar, Zap, X, Check
} from 'lucide-react';

// ── Dummy Data ─────────────────────────────────────────────────────────────────

// 30일치 일별 데이터 (3/9 ~ 4/7)
const DAILY_ALL = [
  { date:'3/9',  inq:4,  book:1 }, { date:'3/10', inq:6,  book:2 },
  { date:'3/11', inq:3,  book:1 }, { date:'3/12', inq:8,  book:3 },
  { date:'3/13', inq:5,  book:2 }, { date:'3/14', inq:7,  book:2 },
  { date:'3/15', inq:9,  book:4 }, { date:'3/16', inq:6,  book:2 },
  { date:'3/17', inq:4,  book:1 }, { date:'3/18', inq:11, book:5 },
  { date:'3/19', inq:8,  book:3 }, { date:'3/20', inq:10, book:4 },
  { date:'3/21', inq:7,  book:3 }, { date:'3/22', inq:12, book:5 },
  { date:'3/23', inq:9,  book:4 }, { date:'3/24', inq:6,  book:2 },
  { date:'3/25', inq:14, book:6 }, { date:'3/26', inq:11, book:5 },
  { date:'3/27', inq:8,  book:3 }, { date:'3/28', inq:13, book:6 },
  { date:'3/29', inq:10, book:4 }, { date:'3/30', inq:7,  book:3 },
  { date:'3/31', inq:15, book:7 }, { date:'4/1',  inq:12, book:5 },
  { date:'4/2',  inq:9,  book:4 }, { date:'4/3',  inq:16, book:7 },
  { date:'4/4',  inq:11, book:5 }, { date:'4/5',  inq:8,  book:3 },
  { date:'4/6',  inq:14, book:6 }, { date:'4/7',  inq:10, book:4 },
];

// 국가별 더미 데이터
const COUNTRY_DATA = {
  all: DAILY_ALL,
  JP: DAILY_ALL.map(d => ({ ...d, inq: Math.round(d.inq * 0.39), book: Math.round(d.book * 0.42) })),
  US: DAILY_ALL.map(d => ({ ...d, inq: Math.round(d.inq * 0.22), book: Math.round(d.book * 0.20) })),
  CN: DAILY_ALL.map(d => ({ ...d, inq: Math.round(d.inq * 0.20), book: Math.round(d.book * 0.18) })),
  AR: DAILY_ALL.map(d => ({ ...d, inq: Math.round(d.inq * 0.14), book: Math.round(d.book * 0.12) })),
};

// 채널별 승수
const CHANNEL_MULT = { all: 1, instagram: 0.51, whatsapp: 0.31, kakaotalk: 0.18 };

// 기간별 슬라이스
const PERIOD_SLICE = { today: -1, '7d': -7, thisMonth: -30, lastMonth: -30 };

// 히트맵 데이터 (요일×시간대, 0~4 강도)
const HEATMAP = {
  rows: ['월','화','수','목','금','토','일'],
  cols: ['8시','9시','10시','11시','12시','13시','14시','15시','16시','17시','18시','19시','20시'],
  data: [
    [0,1,2,3,2,1,3,2,1,0,0,0,0], // 월
    [0,1,3,4,3,2,4,3,2,1,0,0,0], // 화
    [1,2,3,4,3,2,3,3,2,1,1,0,0], // 수
    [0,1,2,3,3,2,4,4,3,2,1,0,0], // 목
    [1,2,3,4,3,3,4,4,3,2,1,1,0], // 금
    [2,3,4,4,3,2,2,1,1,0,0,0,0], // 토 (새벽 문의 많음)
    [3,4,4,3,2,1,1,0,0,0,0,0,0], // 일 (시차 새벽 문의)
  ],
};

// 언어별 데이터
const LANG_DATA = [
  { lang:'일본어', flag:'🇯🇵', count:55, pct:39, prev:44, colorBar:'bg-purple-500', colorDot:'bg-purple-400' },
  { lang:'영어',   flag:'🇺🇸', count:31, pct:22, prev:28, colorBar:'bg-sky-500',    colorDot:'bg-sky-400'    },
  { lang:'중국어', flag:'🇨🇳', count:28, pct:20, prev:22, colorBar:'bg-rose-500',   colorDot:'bg-rose-400'   },
  { lang:'아랍어', flag:'🇸🇦', count:20, pct:14, prev:15, colorBar:'bg-amber-500',  colorDot:'bg-amber-400'  },
  { lang:'베트남어',flag:'🇻🇳', count:5,  pct:3,  prev:3,  colorBar:'bg-emerald-500',colorDot:'bg-emerald-400'},
  { lang:'기타',   flag:'🌍',   count:3,  pct:2,  prev:3,  colorBar:'bg-slate-400',  colorDot:'bg-slate-300'  },
];

// 채널별 데이터
const CHANNEL_STATS = [
  { ch:'Instagram DM', icon:'📸', inq:72, conv:28, rate:'38.9%', color:'bg-pink-500', light:'bg-pink-50 text-pink-700' },
  { ch:'WhatsApp',     icon:'💬', inq:44, conv:16, rate:'36.4%', color:'bg-emerald-500', light:'bg-emerald-50 text-emerald-700' },
  { ch:'KakaoTalk',    icon:'💛', inq:26, conv:7,  rate:'26.9%', color:'bg-amber-400', light:'bg-amber-50 text-amber-700' },
];

// 퍼널 데이터
const FUNNEL = [
  { label:'신규 문의',     value:142, color:'from-purple-600 to-fuchsia-500', width:'100%' },
  { label:'상담 진행',     value:98,  color:'from-purple-500 to-fuchsia-400', width:'69%'  },
  { label:'예약 확정',     value:51,  color:'from-violet-500 to-purple-400',  width:'36%'  },
  { label:'내원 완료',     value:44,  color:'from-indigo-500 to-violet-400',  width:'31%'  },
];

// ── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({ data }) {
  const W = 560, H = 180;
  const PL = 38, PR = 16, PT = 16, PB = 28;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const max = Math.max(...data.map(d => d.inq), 1);
  const gx = (i) => PL + (i / (data.length - 1)) * cW;
  const gy = (v) => PT + cH - (v / (max * 1.1)) * cH;

  // Smooth bezier path
  const smoothPath = (key) => {
    if (data.length < 2) return '';
    return data.map((d, i) => {
      if (i === 0) return `M ${gx(0)} ${gy(d[key])}`;
      const prev = data[i - 1];
      const dx = (gx(i) - gx(i - 1)) * 0.45;
      return `C ${gx(i-1)+dx} ${gy(prev[key])}, ${gx(i)-dx} ${gy(d[key])}, ${gx(i)} ${gy(d[key])}`;
    }).join(' ');
  };

  const areaPath = (key, pathStr) => {
    const last = data.length - 1;
    return `${pathStr} L ${gx(last)} ${PT + cH} L ${gx(0)} ${PT + cH} Z`;
  };

  const inqPath  = smoothPath('inq');
  const bookPath = smoothPath('book');

  // Y-axis ticks
  const ticks = [0, Math.round(max * 0.5), max].map(v => ({
    v, y: gy(v),
  }));

  // X-axis labels — every 5th
  const xLabels = data.reduce((acc, d, i) => {
    if (i % 5 === 0 || i === data.length - 1) acc.push({ d, i });
    return acc;
  }, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="g-inq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9333EA" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#9333EA" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="g-book" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map(({ v, y }) => (
        <g key={v}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E2E8F0" strokeWidth="1" />
          <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94A3B8">{v}</text>
        </g>
      ))}

      {/* Area fills */}
      <path d={areaPath('inq', inqPath)} fill="url(#g-inq)" />
      <path d={areaPath('book', bookPath)} fill="url(#g-book)" />

      {/* Lines */}
      <path d={inqPath}  fill="none" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={bookPath} fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots — only last point */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const li = data.length - 1;
        return (
          <>
            <circle cx={gx(li)} cy={gy(last.inq)}  r="4" fill="#9333EA" stroke="white" strokeWidth="1.5" />
            <circle cx={gx(li)} cy={gy(last.book)} r="4" fill="#10B981" stroke="white" strokeWidth="1.5" />
          </>
        );
      })()}

      {/* X labels */}
      {xLabels.map(({ d, i }) => (
        <text key={i} x={gx(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94A3B8">
          {d.date}
        </text>
      ))}
    </svg>
  );
}

// ── Heatmap ────────────────────────────────────────────────────────────────────
const HEAT_COLORS = [
  'bg-slate-100',
  'bg-purple-100',
  'bg-purple-300',
  'bg-purple-500',
  'bg-purple-700',
];
const HEAT_TEXT = [
  'text-slate-300',
  'text-purple-400',
  'text-purple-200',
  'text-white',
  'text-white',
];

function Heatmap() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">시간대별 문의 히트맵</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">요일 × 시간대 문의 집중도 — 진할수록 문의 폭발 구간</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">낮음</span>
          {HEAT_COLORS.map((c, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-slate-400">높음</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column headers (hours) */}
          <div className="flex gap-1 mb-1 pl-8">
            {HEATMAP.cols.map(col => (
              <div key={col} className="flex-1 text-center text-[9px] text-slate-400 font-medium">{col}</div>
            ))}
          </div>

          {/* Rows (days) */}
          {HEATMAP.rows.map((row, ri) => (
            <div key={row} className="flex gap-1 mb-1 items-center">
              <div className="w-7 text-[10px] text-slate-500 font-semibold shrink-0">{row}</div>
              {HEATMAP.data[ri].map((val, ci) => {
                const isHovered = hovered?.r === ri && hovered?.c === ci;
                return (
                  <div
                    key={ci}
                    className={`flex-1 aspect-square rounded-md flex items-center justify-center transition-all cursor-pointer
                      ${HEAT_COLORS[val]} ${isHovered ? 'ring-2 ring-purple-400 scale-110' : ''}`}
                    onMouseEnter={() => setHovered({ r: ri, c: ci, val })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {val > 0 && (
                      <span className={`text-[8px] font-bold ${HEAT_TEXT[val]}`}>{val * 3}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="mt-3 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg inline-flex items-center gap-2">
          <span className="font-semibold">{HEATMAP.rows[hovered.r]}요일 {HEATMAP.cols[hovered.c]}</span>
          <span className="text-slate-300">평균 문의 {hovered.val * 3}건</span>
          {hovered.val >= 3 && <span className="text-fuchsia-300">🔥 집중 구간</span>}
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        💡 <span className="font-semibold text-slate-600">토~일 새벽 집중:</span> 미국·중동 시차 문의 다수 — AI 자동화율 100% 유지 권장
      </p>
    </div>
  );
}

// ── Sales Funnel ───────────────────────────────────────────────────────────────
function SalesFunnel({ data }) {
  const max = data[0].value;
  return (
    <div className="flex flex-col gap-2 w-full">
      {data.map((step, i) => {
        const convRate = i === 0 ? null : Math.round((step.value / data[i - 1].value) * 100);
        return (
          <div key={step.label}>
            {/* Conversion rate badge */}
            {convRate !== null && (
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${convRate >= 70 ? 'bg-emerald-100 text-emerald-700' : convRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  ↓ {convRate}% 전환
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}
            {/* Bar */}
            <div className="flex items-center justify-center">
              <div
                className={`bg-gradient-to-r ${step.color} rounded-xl px-4 py-3 flex items-center justify-between transition-all hover:brightness-110`}
                style={{ width: step.width }}
              >
                <span className="text-white text-xs font-semibold truncate">{step.label}</span>
                <div className="text-right ml-2">
                  <span className="text-white text-base font-extrabold">{step.value}</span>
                  <span className="text-white/70 text-[10px] ml-0.5">명</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Drip summary */}
      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          전체 전환율 <span className="font-bold text-purple-700">{Math.round((data[3].value / data[0].value) * 100)}%</span> —
          최대 이탈 구간은{' '}
          <span className="font-bold text-amber-700">상담→예약 (48% 이탈)</span>.
          이 구간의 AI 세일즈 멘트를 강화하세요.
        </p>
      </div>
    </div>
  );
}

// ── Trend Badge ────────────────────────────────────────────────────────────────
function TrendBadge({ value, unit = '%', invert = false }) {
  const isPos = value >= 0;
  const good  = invert ? !isPos : isPos;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {good ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPos ? '+' : ''}{value}{unit}
    </span>
  );
}

// ── Custom Date Range Picker ───────────────────────────────────────────────────
function DateRangePicker({ onApply, onClose }) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const [start, setStart] = useState(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [end,   setEnd]   = useState(fmt(today));
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleApply = () => {
    if (start && end && start <= end) { onApply(start, end); onClose(); }
  };

  return (
    <div ref={ref} className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-700">날짜 범위 선택</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100">
          <X size={12} className="text-slate-400" />
        </button>
      </div>
      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">시작일</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} max={end}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">종료일</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} min={start}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
      </div>
      {start && end && start > end && (
        <p className="text-[10px] text-red-500 mt-2">시작일이 종료일보다 늦을 수 없습니다</p>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          취소
        </button>
        <button onClick={handleApply} disabled={!start || !end || start > end}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white disabled:opacity-50 hover:from-purple-500 hover:to-fuchsia-400 transition-all flex items-center justify-center gap-1.5">
          <Check size={11} /> 적용
        </button>
      </div>
    </div>
  );
}

// ── Main StatsTab ──────────────────────────────────────────────────────────────
export default function StatsTab() {
  const [period,       setPeriod]       = useState('thisMonth');
  const [country,      setCountry]      = useState('all');
  const [channel,      setChannel]      = useState('all');
  const [showCountry,  setShowCountry]  = useState(false);
  const [showChannel,  setShowChannel]  = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customRange,  setCustomRange]  = useState(null); // { start, end }

  const PERIOD_LABELS = {
    today: '오늘', '7d': '최근 7일', thisMonth: '이번 달', lastMonth: '전월', custom: '직접 설정',
  };
  const COUNTRY_LABELS = {
    all:'전체 국가', JP:'🇯🇵 일본어', US:'🇺🇸 영어', CN:'🇨🇳 중국어', AR:'🇸🇦 아랍어',
  };
  const CHANNEL_LABELS = {
    all:'전체 채널', instagram:'📸 Instagram', whatsapp:'💬 WhatsApp', kakaotalk:'💛 KakaoTalk',
  };

  // Compute filtered chart data
  const chartData = useMemo(() => {
    const base = COUNTRY_DATA[country] || DAILY_ALL;
    const mult = CHANNEL_MULT[channel] || 1;
    let sliced;
    if (period === 'today')    sliced = base.slice(-1);
    else if (period === '7d')  sliced = base.slice(-7);
    else                       sliced = base;
    return sliced.map(d => ({
      ...d,
      inq:  Math.max(1, Math.round(d.inq  * mult)),
      book: Math.max(0, Math.round(d.book * mult)),
    }));
  }, [period, country, channel]);

  // Compute KPIs
  const totalInq  = chartData.reduce((s, d) => s + d.inq, 0);
  const totalBook = chartData.reduce((s, d) => s + d.book, 0);
  const convRate  = totalInq > 0 ? ((totalBook / totalInq) * 100).toFixed(1) : 0;
  const pipeline  = totalBook * 1350000; // 평균 시술 단가 135만원

  const kpis = [
    {
      label: '총 문의 건수',
      value: totalInq + '건',
      trend: +23,
      trendUnit: '%',
      icon: MessageSquare,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      sub: `예약 ${totalBook}건 연결됨`,
    },
    {
      label: '예약 전환율',
      value: convRate + '%',
      trend: +4.2,
      trendUnit: '%p',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      sub: '업계 평균 21% 대비',
    },
    {
      label: '파이프라인 매출',
      value: '₩' + (pipeline / 10000).toFixed(0) + '만',
      trend: +18,
      trendUnit: '%',
      icon: DollarSign,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      sub: '예약 확정 기준 예상 매출',
    },
    {
      label: '평균 응답 시간',
      value: '38초',
      trend: -67,
      trendUnit: '%',
      invert: true,
      icon: Clock,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      sub: 'AI 도입 전 1분 54초',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">

      {/* ── 글로벌 필터 바 ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mr-2">
          <Zap size={15} className="text-purple-600" fill="currentColor" />
          성과 대시보드
        </div>

        {/* 기간 프리셋 버튼 */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {Object.entries(PERIOD_LABELS).filter(([k]) => k !== 'custom').map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setPeriod(k); setCustomRange(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                period === k
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* 직접 설정 (custom date range) */}
        <div className="relative">
          <button
            onClick={() => { setShowDatePicker(v => !v); setShowCountry(false); setShowChannel(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              period === 'custom'
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
            }`}
          >
            <Calendar size={11} className={period === 'custom' ? 'text-purple-500' : 'text-slate-400'} />
            {period === 'custom' && customRange
              ? `${customRange.start} ~ ${customRange.end}`
              : '직접 설정'}
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showDatePicker && (
            <DateRangePicker
              onApply={(s, e) => { setCustomRange({ start: s, end: e }); setPeriod('custom'); }}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>

        {/* 국가 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => { setShowCountry(v => !v); setShowChannel(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-purple-300 transition-all"
          >
            <span>{COUNTRY_LABELS[country]}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showCountry && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 w-40">
              {Object.entries(COUNTRY_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { setCountry(k); setShowCountry(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-purple-50 transition-colors ${country === k ? 'text-purple-700 bg-purple-50' : 'text-slate-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 채널 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => { setShowChannel(v => !v); setShowCountry(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-purple-300 transition-all"
          >
            <span>{CHANNEL_LABELS[channel]}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showChannel && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 w-40">
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { setChannel(k); setShowChannel(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-purple-50 transition-colors ${channel === k ? 'text-purple-700 bg-purple-50' : 'text-slate-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
          <Calendar size={11} />
          {period === 'today' ? '2026-04-07 기준'
            : period === '7d' ? '최근 7일'
            : period === 'thisMonth' ? '2026년 4월'
            : period === 'lastMonth' ? '2026년 3월'
            : period === 'custom' && customRange ? `${customRange.start} ~ ${customRange.end}`
            : ''}
          {country !== 'all' && ` · ${COUNTRY_LABELS[country]}`}
          {channel !== 'all' && ` · ${CHANNEL_LABELS[channel]}`}
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── KPI 카드 ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(({ label, value, trend, trendUnit, invert, icon: Icon, iconBg, iconColor, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 hover:shadow-md hover:border-purple-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">{label}</span>
                <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon size={15} className={iconColor} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-extrabold text-slate-900">{value}</span>
                <TrendBadge value={trend} unit={trendUnit} invert={invert} />
              </div>
              <p className="text-[11px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── 메인 차트 영역 (Line + Funnel) ── */}
        <div className="grid grid-cols-5 gap-5">

          {/* Left: Line Chart (3/5) */}
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">문의 vs 예약 트렌드</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">일별 신규 문의 건수 · 예약 확정 건수</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="w-3 h-1.5 rounded-full bg-purple-500 inline-block" /> 문의
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" /> 예약확정
                </span>
              </div>
            </div>
            <LineChart data={chartData} />

            {/* Mini summary below chart */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[11px] text-slate-500">문의 총합</span>
                <span className="text-xs font-bold text-purple-700">{totalInq}건</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-500">예약 총합</span>
                <span className="text-xs font-bold text-emerald-700">{totalBook}건</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">전환율</span>
                <span className="text-xs font-bold text-amber-700">{convRate}%</span>
              </div>
            </div>
          </div>

          {/* Right: Sales Funnel (2/5) */}
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">세일즈 퍼널</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">문의 → 내원 완료 전환 깔때기</p>
            </div>
            <SalesFunnel data={FUNNEL} />
          </div>
        </div>

        {/* ── 히트맵 ── */}
        <Heatmap />

        {/* ── 하단 3열 ── */}
        <div className="grid grid-cols-3 gap-5">

          {/* 언어별 문의 현황 */}
          <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">언어별 문의 현황</h3>
            <div className="space-y-3">
              {LANG_DATA.map(({ lang, flag, count, pct, prev, colorBar }) => (
                <div key={lang} className="flex items-center gap-3">
                  <div className="w-16 flex items-center gap-1.5 shrink-0">
                    <span className="text-sm">{flag}</span>
                    <span className="text-[11px] font-medium text-slate-600">{lang}</span>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${colorBar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5 w-20 justify-end shrink-0">
                    <span className="text-xs font-semibold text-slate-700">{count}건</span>
                    <span className={`text-[10px] font-bold ${count > prev ? 'text-emerald-600' : 'text-red-500'}`}>
                      {count > prev ? '↑' : '↓'}{Math.abs(count - prev)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 채널별 전환율 */}
          <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">채널별 전환율</h3>
            <div className="space-y-4">
              {CHANNEL_STATS.map(({ ch, icon, inq, conv, rate, color, light }) => (
                <div key={ch}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-semibold text-slate-700">{ch}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${light}`}>{rate}</span>
                  </div>
                  <div className="flex gap-1 mb-1">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${(inq / 72) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>문의 {inq}건</span>
                    <span>예약 {conv}건</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 절감 효과 카드 */}
          <div className="col-span-1 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-2xl p-5 text-white shadow-[0_0_30px_rgba(168,85,247,0.25)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap size={16} className="text-white" fill="white" />
              </div>
              <h3 className="text-sm font-bold">AI 티키챗 절감 효과</h3>
            </div>

            <div className="space-y-3">
              {[
                { label: '코디네이터 대체', value: '₩350만/월', sub: '다국어 인건비 절감' },
                { label: '응답 속도 향상', value: '↓ 97%', sub: '1분 54초 → 38초' },
                { label: '처리 언어 수',    value: '6개국어', sub: '일본·영어·중국·아랍·베트남·태국' },
                { label: '야간 자동화율',   value: '100%',    sub: '새벽 2~8시 AI 완전 대응' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex items-center justify-between bg-white/10 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] text-white/70">{label}</p>
                    <p className="text-[11px] text-white/80 mt-0.5">{sub}</p>
                  </div>
                  <span className="text-sm font-extrabold text-white">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-white/60 mt-4 leading-relaxed">
              * 월 인건비 350만원 기준. 실 절감액은 클리닉 규모에 따라 다를 수 있습니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
