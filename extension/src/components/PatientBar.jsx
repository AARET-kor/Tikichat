import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserPlus, X, Check, Loader2, ChevronDown, User, Clipboard } from 'lucide-react';

const T = {
  bg: '#ffffff', bgSub: '#fafafa', text: '#09090b', textSub: '#71717a', textMt: '#a1a1aa',
  border: '#e4e4e7', black: '#18181b', coral: '#FC6C85', coralBg: '#fff0f3',
  teal: '#069494', tealBg: '#f0fafa',
};
const SANS = "'Pretendard Variable', 'Inter', system-ui, -apple-system, sans-serif";

const LANG_FLAG = { ja:'🇯🇵', zh:'🇨🇳', en:'🇺🇸', ko:'🇰🇷', vi:'🇻🇳', th:'🇹🇭', ar:'🇸🇦', ru:'🇷🇺' };
const LANG_NAME = { ja:'일본어', zh:'중국어', en:'영어', ko:'한국어', vi:'베트남어', th:'태국어', ar:'아랍어' };

// ── 환자 카드 ─────────────────────────────────────────────────────────────────
function PatientCard({ p, onSelect }) {
  const flag = p.flag || LANG_FLAG[p.lang] || '🌍';
  const langLabel = LANG_NAME[p.lang] || p.lang || '';
  const phone = p.phone ? p.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '';
  return (
    <div
      onClick={() => onSelect(p)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px',
        cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.bgSub}
      onMouseLeave={e => e.currentTarget.style.background = T.bg}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: T.coralBg,
        border: `1px solid ${T.coral}30`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 14, flexShrink: 0,
      }}>{flag}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
          {p.name}
          {p.name_en && <span style={{ fontSize: 9, color: T.textMt, fontWeight: 400, marginLeft: 5 }}>{p.name_en}</span>}
        </p>
        <p style={{ fontSize: 9, color: T.textSub, marginTop: 2 }}>
          {langLabel && <span>{langLabel}</span>}
          {phone && <span style={{ marginLeft: 4 }}>· {phone}</span>}
          {p.last_visit && <span style={{ marginLeft: 4 }}>· {p.last_visit.slice(0,10)}</span>}
        </p>
      </div>
      {p.status && (
        <span style={{ fontSize: 8, fontWeight: 600, color: T.teal, background: T.tealBg, borderRadius: 4, padding: '2px 5px' }}>
          {p.status}
        </span>
      )}
    </div>
  );
}

// ── 신규 환자 등록 폼 ─────────────────────────────────────────────────────────
function NewPatientForm({ onClose, onCreated, usePatientHook }) {
  const { createPatient, parsePatientText, creating, parsing } = usePatientHook;
  const [form, setForm] = useState({ name:'', name_en:'', phone:'', lang:'ja', flag:'🇯🇵', channel:'', channel_user_id:'' });
  const [pasteText, setPasteText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleParse = async () => {
    const parsed = await parsePatientText(pasteText);
    if (parsed) {
      setForm(f => ({
        ...f,
        name: parsed.name || f.name,
        name_en: parsed.name_en || f.name_en,
        phone: parsed.phone || f.phone,
        lang: parsed.lang || f.lang,
        flag: parsed.flag || LANG_FLAG[parsed.lang] || f.flag,
        channel: parsed.channel || f.channel,
        channel_user_id: parsed.channel_user_id || f.channel_user_id,
      }));
      setPasteMode(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const patient = await createPatient(form);
    if (patient) onCreated(patient);
  };

  return (
    <div style={{ padding: '12px', background: T.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text }}>신규 환자 등록</p>
        <button onClick={() => setPasteMode(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600,
          color: T.teal, background: T.tealBg, border: `1px solid ${T.teal}30`,
          borderRadius: 5, padding: '3px 7px', cursor: 'pointer',
        }}>
          <Clipboard size={9} /> Magic Paste
        </button>
      </div>

      {/* Magic Paste 영역 */}
      {pasteMode && (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="채널 프로필, 메시지, 명함 등 텍스트를 붙여넣으면 AI가 자동 파싱합니다..."
            rows={3}
            style={{ width: '100%', fontSize: 10, padding: '7px 9px', border: `1px solid ${T.border}`, borderRadius: 7, fontFamily: SANS, resize: 'none', color: T.text }}
          />
          <button
            onClick={handleParse}
            disabled={parsing || !pasteText.trim()}
            style={{
              width: '100%', marginTop: 5, padding: '6px', borderRadius: 7,
              background: parsing ? T.border : T.teal, color: '#fff', border: 'none',
              fontSize: 10, fontWeight: 700, cursor: parsing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: SANS,
            }}
          >
            {parsing ? <Loader2 size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
            {parsing ? 'AI 파싱 중...' : 'AI 자동 파싱'}
          </button>
        </div>
      )}

      {/* 입력 필드들 */}
      {[
        { key: 'name',           label: '이름 *',    placeholder: '유키' },
        { key: 'name_en',        label: '영문명',     placeholder: 'Yuki Tanaka' },
        { key: 'phone',          label: '전화번호',   placeholder: '+81-90-1234-5678' },
        { key: 'channel',        label: '채널',       placeholder: 'Line / WhatsApp / WeChat' },
        { key: 'channel_user_id',label: '채널 ID',   placeholder: 'yuki_line_123' },
      ].map(({ key, label, placeholder }) => (
        <div key={key} style={{ marginBottom: 7 }}>
          <label style={{ fontSize: 9, fontWeight: 600, color: T.textSub, display: 'block', marginBottom: 3 }}>{label}</label>
          <input
            value={form[key]}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '6px 9px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, fontFamily: SANS, color: T.text }}
          />
        </div>
      ))}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 9, fontWeight: 600, color: T.textSub, display: 'block', marginBottom: 3 }}>언어</label>
        <select
          value={form.lang}
          onChange={e => { set('lang', e.target.value); set('flag', LANG_FLAG[e.target.value] || '🌍'); }}
          style={{ width: '100%', padding: '6px 9px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, fontFamily: SANS, color: T.text }}
        >
          {Object.entries(LANG_NAME).map(([code, name]) => (
            <option key={code} value={code}>{LANG_FLAG[code]} {name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.textSub, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: SANS }}>
          취소
        </button>
        <button
          onClick={handleCreate}
          disabled={creating || !form.name.trim()}
          style={{
            flex: 2, padding: '7px', borderRadius: 7, border: 'none',
            background: creating || !form.name.trim() ? T.border : T.coral,
            color: creating || !form.name.trim() ? T.textMt : '#fff',
            fontSize: 10, fontWeight: 700, cursor: creating || !form.name.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: SANS,
          }}
        >
          {creating ? <Loader2 size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={10} />}
          {creating ? '등록 중...' : '환자 등록'}
        </button>
      </div>
    </div>
  );
}

// ── PatientBar (메인) ─────────────────────────────────────────────────────────
export default function PatientBar({ usePatientHook }) {
  const { currentPatient, setCurrentPatient, searchResults, searching, searchPatients } = usePatientHook;

  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // 검색 디바운스
  const handleQuery = useCallback((v) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPatients(v), 300);
  }, [searchPatients]);

  // 패널 열릴 때 인풋 포커스
  useEffect(() => {
    if (open && !showNew) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, showNew]);

  const selectPatient = (p) => {
    setCurrentPatient(p);
    setOpen(false);
    setQuery('');
    setShowNew(false);
  };

  const flag = currentPatient?.flag || LANG_FLAG[currentPatient?.lang] || '';

  return (
    <div style={{ fontFamily: SANS, position: 'relative', zIndex: 100 }}>
      {/* ── 얇은 상단 바 ── */}
      <div
        onClick={() => { setOpen(v => !v); setShowNew(false); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 12px',
          background: currentPatient ? T.coralBg : T.bgSub,
          borderBottom: `1px solid ${currentPatient ? T.coral + '40' : T.border}`,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={10} color={currentPatient ? T.coral : T.textMt} strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 600, color: currentPatient ? T.coral : T.textMt }}>
            {currentPatient ? `${flag} ${currentPatient.name}` : '현재 상담 환자'}
          </span>
          {currentPatient?.lang && (
            <span style={{ fontSize: 8, color: T.textMt, fontWeight: 400 }}>
              · {LANG_NAME[currentPatient.lang] || currentPatient.lang}
            </span>
          )}
          {currentPatient?.phone && (
            <span style={{ fontSize: 8, color: T.textMt }}>· {currentPatient.phone}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {currentPatient && (
            <button
              onClick={e => { e.stopPropagation(); setCurrentPatient(null); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', lineHeight: 1 }}
            >
              <X size={10} color={T.textMt} />
            </button>
          )}
          <ChevronDown
            size={10}
            color={T.textMt}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </div>

      {/* ── 드롭다운 패널 ── */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: T.bg, border: `1px solid ${T.border}`, borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          maxHeight: 340, overflowY: 'auto',
          zIndex: 200,
        }}>
          {showNew ? (
            <NewPatientForm
              usePatientHook={usePatientHook}
              onClose={() => setShowNew(false)}
              onCreated={(p) => selectPatient(p)}
            />
          ) : (
            <>
              {/* 검색 인풋 */}
              <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: T.bgSub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 9px' }}>
                  {searching
                    ? <Loader2 size={11} color={T.textMt} style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    : <Search size={11} color={T.textMt} strokeWidth={2} />
                  }
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => handleQuery(e.target.value)}
                    placeholder="이름 · 전화번호 · 채널ID 검색"
                    style={{ border: 'none', background: 'transparent', fontSize: 11, fontFamily: SANS, color: T.text, flex: 1, outline: 'none' }}
                  />
                  {query && <button onClick={() => handleQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}><X size={10} color={T.textMt} /></button>}
                </div>
                <button
                  onClick={() => setShowNew(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px',
                    background: T.coral, color: '#fff', border: 'none', borderRadius: 7,
                    fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: SANS, flexShrink: 0,
                  }}
                >
                  <UserPlus size={10} /> 신규
                </button>
              </div>

              {/* 검색 결과 */}
              {query.trim() && searchResults.length === 0 && !searching && (
                <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: T.textMt }}>검색 결과가 없습니다</p>
                  <button
                    onClick={() => setShowNew(true)}
                    style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: T.coral, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    + 신규 등록
                  </button>
                </div>
              )}

              {searchResults.map(p => (
                <PatientCard key={p.id} p={p} onSelect={selectPatient} />
              ))}

              {!query.trim() && (
                <div style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: T.textMt }}>이름, 전화번호, 채널 ID로 검색하세요</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
