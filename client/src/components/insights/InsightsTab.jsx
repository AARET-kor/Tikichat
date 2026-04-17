import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, X, ChevronRight, Loader2, Tag, Clock, Phone, Globe, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const LANG_FLAG = { ja:'🇯🇵', zh:'🇨🇳', en:'🇺🇸', ko:'🇰🇷', vi:'🇻🇳', th:'🇹🇭', ar:'🇸🇦', ru:'🇷🇺' };
const LANG_NAME = { ja:'일본어', zh:'중국어', en:'영어', ko:'한국어', vi:'베트남어', th:'태국어', ar:'아랍어', ru:'러시아어' };

const STATUS_STYLES = {
  consulting: 'bg-blue-50 text-blue-600 border-blue-200',
  booked:     'bg-emerald-50 text-emerald-600 border-emerald-200',
  done:       'bg-zinc-50 text-zinc-500 border-zinc-200',
  care:       'bg-purple-50 text-purple-600 border-purple-200',
  dormant:    'bg-amber-50 text-amber-600 border-amber-200',
};
const STATUS_LABEL = { consulting:'상담중', booked:'예약완료', done:'방문완료', care:'사후케어', dormant:'휴면' };

// ── 환자 상세 모달 ─────────────────────────────────────────────────────────────
function PatientDetailModal({ patient, darkMode, onClose }) {
  const bg   = darkMode ? 'bg-zinc-900' : 'bg-white';
  const text = darkMode ? 'text-zinc-100' : 'text-zinc-900';
  const sub  = darkMode ? 'text-zinc-400' : 'text-zinc-500';
  const bdr  = darkMode ? 'border-zinc-700' : 'border-zinc-200';

  const flag = patient.flag || LANG_FLAG[patient.lang] || '🌍';
  const timeline = Array.isArray(patient.timeline) ? patient.timeline : [];
  const tags     = Array.isArray(patient.tags)     ? patient.tags     : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl border ${bg} ${bdr} flex flex-col`} style={{ maxHeight: '85vh' }}>
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${bdr} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-xl">
              {flag}
            </div>
            <div>
              <p className={`text-sm font-bold ${text}`}>{patient.name}</p>
              <p className={`text-xs ${sub}`}>{LANG_NAME[patient.lang] || patient.lang} {patient.phone && `· ${patient.phone}`}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
            <X size={14} className={sub} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 태그 */}
          {tags.length > 0 && (
            <div>
              <p className={`text-xs font-semibold mb-2 ${sub} uppercase tracking-wider`}>컨텍스트 태그</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 메모 */}
          {patient.note && (
            <div>
              <p className={`text-xs font-semibold mb-2 ${sub} uppercase tracking-wider`}>메모</p>
              <p className={`text-xs leading-relaxed ${text} p-3 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                {patient.note}
              </p>
            </div>
          )}

          {/* 타임라인 */}
          {timeline.length > 0 && (
            <div>
              <p className={`text-xs font-semibold mb-3 ${sub} uppercase tracking-wider`}>상담 타임라인</p>
              <div className="space-y-2">
                {[...timeline].reverse().map((item, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-xl border ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-semibold ${text}`}>{item.type || 'context'}</p>
                      {item.data?.tags && item.data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.data.tags.map((t, j) => (
                            <span key={j} className={`text-[9px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-white text-zinc-500 border border-zinc-200'}`}>{t}</span>
                          ))}
                        </div>
                      )}
                      <p className={`text-[9px] mt-1 ${sub}`}>{item.ts ? new Date(item.ts).toLocaleString('ko-KR') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {timeline.length === 0 && tags.length === 0 && !patient.note && (
            <div className="text-center py-8">
              <Clock size={24} className={`mx-auto mb-2 ${sub}`} />
              <p className={`text-xs ${sub}`}>아직 기록된 상담 내역이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 환자 카드 ─────────────────────────────────────────────────────────────────
function PatientCard({ patient, darkMode, onClick }) {
  const bg   = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const text = darkMode ? 'text-zinc-100' : 'text-zinc-900';
  const sub  = darkMode ? 'text-zinc-400' : 'text-zinc-500';

  const flag   = patient.flag || LANG_FLAG[patient.lang] || '🌍';
  const tags   = Array.isArray(patient.tags) ? patient.tags.slice(0, 5) : [];
  const status = patient.status || 'consulting';

  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${bg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-xl shrink-0">
            {flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold ${text}`}>{patient.name}</p>
              {patient.name_en && <p className={`text-xs ${sub}`}>{patient.name_en}</p>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe size={10} className={sub} />
              <span className={`text-[10px] ${sub}`}>{LANG_NAME[patient.lang] || patient.lang || '-'}</span>
              {patient.phone && (
                <>
                  <Phone size={10} className={sub} />
                  <span className={`text-[10px] ${sub}`}>{patient.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.consulting}`}>
            {STATUS_LABEL[status] || status}
          </span>
          <ChevronRight size={14} className={sub} />
        </div>
      </div>

      {/* 태그 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map((tag, i) => (
            <span key={i} className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 채널 + 마지막 방문 */}
      <div className="flex items-center justify-between mt-2.5">
        {patient.channel ? (
          <div className="flex items-center gap-1.5">
            <MessageSquare size={9} className={sub} />
            <span className={`text-[9px] ${sub}`}>{patient.channel}</span>
          </div>
        ) : <div />}
        {patient.last_visit && (
          <span className={`text-[9px] ${sub}`}>최근 방문: {patient.last_visit}</span>
        )}
      </div>
    </div>
  );
}

// ── InsightsTab ───────────────────────────────────────────────────────────────
export default function InsightsTab({ darkMode }) {
  const { session } = useAuth();
  const clinicId = session?.clinic?.id;

  const [query,      setQuery]      = useState('');
  const [patients,   setPatients]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [selected,   setSelected]   = useState(null);
  const debounceRef = useRef(null);

  const bg   = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const panel= darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const text = darkMode ? 'text-zinc-100' : 'text-zinc-900';
  const sub  = darkMode ? 'text-zinc-400' : 'text-zinc-500';
  const inputCls = darkMode
    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:ring-pink-500/30'
    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-pink-500/20';

  const search = useCallback(async (q) => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const url = q?.trim()
        ? `${API_BASE}/api/patients/search?clinicId=${encodeURIComponent(clinicId)}&q=${encodeURIComponent(q)}`
        : `${API_BASE}/api/patients?clinicId=${encodeURIComponent(clinicId)}`;
      const res = await fetch(url);
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : (data.patients || []));
    } catch { setPatients([]); }
    finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { search(''); }, [search]);

  const handleQuery = (v) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${bg}`}
      style={{ fontFamily: "'Pretendard Variable', 'Inter', system-ui, sans-serif" }}>

      {/* 상단 헤더 */}
      <div className={`border-b px-6 py-4 shrink-0 ${panel}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-base font-bold ${text}`}>VIP 환자 인사이트</h2>
            <p className={`text-xs mt-0.5 ${sub}`}>환자 정보, 상담 태그, 타임라인을 한눈에</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
            {patients.length}명
          </span>
        </div>

        {/* 검색 */}
        <div className="relative mt-3">
          <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="이름, 전화번호, 채널 ID로 검색..."
            className={`w-full pl-8 pr-8 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 ${inputCls}`}
          />
          {query && (
            <button onClick={() => handleQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${sub}`}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 환자 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 size={16} className="animate-spin text-pink-400" />
            <span className={`text-xs ${sub}`}>불러오는 중...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <User size={32} className={sub} />
            <p className={`text-sm font-semibold ${text}`}>환자 없음</p>
            <p className={`text-xs ${sub}`}>{query ? '검색 결과가 없습니다' : '등록된 환자가 없습니다'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {patients.map(p => (
              <PatientCard
                key={p.id}
                patient={p}
                darkMode={darkMode}
                onClick={() => setSelected(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <PatientDetailModal
          patient={selected}
          darkMode={darkMode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
