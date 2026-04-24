/**
 * client/src/components/shared/IntakeParser.jsx
 * ─────────────────────────────────────────────────────────────
 * Tiki Brief — paste raw booking notes → AI parses → editable draft.
 *
 * Usage:
 *   <IntakeParser
 *     authHeaders={headers}          ← { Authorization, Content-Type }
 *     onConfirm={(patient, visit) => void}
 *     onCancel={() => void}
 *     darkMode={bool}
 *     procedureOptions={array?}
 *     selectedProcedureId={string?}
 *     onProcedureChange={(procedureId) => void}
 *     procedureResolution={object?}
 *     initialText={string?}          ← pre-populate paste zone
 *     mode="full"|"visit-only"       ← "visit-only" hides patient section
 *   />
 *
 * onConfirm receives:
 *   patient: { name, birth_year, gender, nationality, lang, channel_refs }
 *   visit:   { visit_date, procedure_interests, procedure_id, concerns, internal_notes }
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, Sparkles, X, Plus, ChevronDown } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────
const SANS = "'Pretendard Variable', 'Inter', -apple-system, sans-serif";

const LANG_OPTIONS = [
  { value: 'ko', flag: '🇰🇷', label: '한국어' },
  { value: 'zh', flag: '🇨🇳', label: '중국어' },
  { value: 'ja', flag: '🇯🇵', label: '일본어' },
  { value: 'en', flag: '🇺🇸', label: '영어' },
  { value: 'vi', flag: '🇻🇳', label: '베트남어' },
  { value: 'ar', flag: '🇸🇦', label: '아랍어' },
  { value: 'th', flag: '🇹🇭', label: '태국어' },
  { value: 'ru', flag: '🇷🇺', label: '러시아어' },
];

const CHANNEL_LABELS = {
  wechat:    { icon: '💬', label: '위챗' },
  kakao:     { icon: '💛', label: '카카오' },
  line:      { icon: '💚', label: '라인' },
  instagram: { icon: '📷', label: '인스타' },
  phone:     { icon: '📞', label: '전화' },
  email:     { icon: '✉️', label: '이메일' },
};
const ALL_CHANNELS = Object.keys(CHANNEL_LABELS);

// ── Confidence badge ──────────────────────────────────────────
function ConfBadge({ level, evidence }) {
  if (!level) return null;
  const color = level === 'high' ? '#16A34A' : level === 'medium' ? '#D97706' : '#DC2626';
  const sym   = level === 'high' ? '✓' : level === 'medium' ? '~' : '?';
  return (
    <span
      title={evidence ? `추출 근거: "${evidence}"` : undefined}
      style={{
        fontSize: 10, fontWeight: 700, color,
        cursor: evidence ? 'help' : 'default',
        flexShrink: 0,
      }}
    >
      {sym}
    </span>
  );
}

// ── Chip list (procedures / concerns) ────────────────────────
function ChipList({ values, onChange, placeholder, darkMode }) {
  const [inp, setInp] = useState('');
  const inputRef = useRef(null);

  function add() {
    const v = inp.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInp('');
  }

  const bg      = darkMode ? '#3F3F46' : '#F3F4F6';
  const border  = darkMode ? '#52525B' : '#E5E7EB';
  const chipBg  = darkMode ? '#0E7490' : '#DBEAFE';
  const chipTx  = darkMode ? '#E0F2FE' : '#1D4ED8';
  const textCol = darkMode ? '#D4D4D8' : '#374151';

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '8px 10px', borderRadius: 10, minHeight: 44, cursor: 'text',
        border: `1.5px solid ${border}`, background: bg,
      }}
    >
      {values.map((v, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: chipBg, color: chipTx,
          borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600,
        }}>
          {v}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(values.filter((_, j) => j !== i)); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: chipTx, lineHeight: 1, padding: 0, fontSize: 13, display: 'flex' }}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inp}
        onChange={e => setInp(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !inp && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : '+ 추가'}
        style={{
          border: 'none', outline: 'none', fontSize: 13, minWidth: 80,
          flex: 1, background: 'transparent', color: textCol, fontFamily: SANS,
        }}
      />
    </div>
  );
}

// ── Styled text input ─────────────────────────────────────────
function Field({ label, confidence, evidence, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.03em' }}>
          {label}{required ? ' *' : ''}
        </span>
        <ConfBadge level={confidence} evidence={evidence} />
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, darkMode, confidence, warn }) {
  const borderColor = confidence === 'medium' ? '#D97706'
                    : confidence === 'low'    ? '#DC2626'
                    : warn                    ? '#DC2626'
                    : darkMode ? '#52525B'    : '#E5E7EB';
  const bg    = darkMode ? '#3F3F46' : '#FFFFFF';
  const color = darkMode ? '#F4F4F5' : '#111827';

  return (
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 9,
        border: `1.5px solid ${borderColor}`,
        background: bg, color, fontSize: 13, fontFamily: SANS,
        outline: 'none', boxSizing: 'border-box',
      }}
    />
  );
}

// ── IntakeParser ──────────────────────────────────────────────
export default function IntakeParser({
  authHeaders,
  onConfirm,
  onCancel,
  darkMode = false,
  procedureOptions = [],
  selectedProcedureId = '',
  onProcedureChange = null,
  procedureResolution = null,
  initialText = '',
  mode = 'full',      // 'full' | 'visit-only'
}) {
  // ── State ──────────────────────────────────────────────────
  const [raw,     setRaw]     = useState(initialText);
  const [phase,   setPhase]   = useState(initialText ? 'parsing' : 'paste');
  // phase: paste | parsing | review | error
  const [draft,   setDraft]   = useState(null);
  const [errMsg,  setErrMsg]  = useState('');

  // Editable fields (initialized from draft, then staff-editable)
  const [name,        setName]        = useState('');
  const [birthYear,   setBirthYear]   = useState('');
  const [gender,      setGender]      = useState('');
  const [nationality, setNationality] = useState('');
  const [lang,        setLang]        = useState('');
  const [channels,    setChannels]    = useState({});      // { wechat: '...', ... }
  const [newChanKey,  setNewChanKey]  = useState('');
  const [newChanVal,  setNewChanVal]  = useState('');
  const [visitDate,   setVisitDate]   = useState('');
  const [procedures,  setProcedures]  = useState([]);
  const [concerns,    setConcerns]    = useState([]);
  const [notes,       setNotes]       = useState('');

  // Validation
  const [nameErr,     setNameErr]     = useState(false);

  const debounceRef = useRef(null);
  const autoSelectedProcedureIdRef = useRef('');

  function normalizeProcedureText(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s()[\]{}\-_/.,]+/g, '');
  }

  const localProcedureResolution = useMemo(() => {
    const cleanValues = (procedures || []).map(v => String(v || '').trim()).filter(Boolean);
    if (cleanValues.length === 0 || procedureOptions.length === 0) return null;

    const resolved = cleanValues.map((value) => {
      if (/[,/]| · |&|\+/.test(value)) return { status: 'unmatched', procedure: null };
      const normalized = normalizeProcedureText(value);
      const matches = procedureOptions.filter((procedure) =>
        [procedure.name_ko, procedure.name_en, procedure.name_ja, procedure.name_zh]
          .filter(Boolean)
          .some((name) => normalizeProcedureText(name) === normalized)
      );
      if (matches.length === 1) return { status: 'matched', procedure: matches[0] };
      if (matches.length > 1) return { status: 'ambiguous', procedure: null };
      return { status: 'unmatched', procedure: null };
    });

    const matchedIds = [...new Set(resolved.filter(item => item.status === 'matched').map(item => item.procedure.id))];
    if (matchedIds.length === 1 && resolved.every(item => item.status === 'matched')) {
      const procedure = resolved.find(item => item.procedure?.id === matchedIds[0])?.procedure || null;
      return { status: 'matched', procedure, message: `시술을 "${procedure?.name_ko || procedure?.name_en}"로 자동 제안합니다.` };
    }
    if (matchedIds.length > 1) {
      return { status: 'ambiguous', procedure: null, message: '여러 시술 후보가 있어 자동 지정하지 않았습니다. 직접 선택해 주세요.' };
    }
    if (matchedIds.length === 1) {
      return { status: 'partial', procedure: null, message: '일부 표현만 일치해 자동 지정하지 않았습니다. 직접 선택해 주세요.' };
    }
    return { status: 'unmatched', procedure: null, message: '일치하는 활성 시술을 찾지 못해 자동 지정하지 않았습니다.' };
  }, [procedures, procedureOptions]);

  useEffect(() => {
    if (!onProcedureChange || !localProcedureResolution?.procedure?.id) return;
    if (selectedProcedureId) return;
    if (localProcedureResolution.status === 'matched') {
      autoSelectedProcedureIdRef.current = localProcedureResolution.procedure.id;
      onProcedureChange(localProcedureResolution.procedure.id);
    }
  }, [localProcedureResolution, onProcedureChange, selectedProcedureId]);

  useEffect(() => {
    if (!onProcedureChange || !selectedProcedureId || !autoSelectedProcedureIdRef.current) return;
    if (selectedProcedureId !== autoSelectedProcedureIdRef.current) {
      autoSelectedProcedureIdRef.current = '';
      return;
    }

    const suggestedId = localProcedureResolution?.status === 'matched'
      ? localProcedureResolution.procedure?.id
      : '';

    if (!suggestedId || suggestedId !== selectedProcedureId) {
      autoSelectedProcedureIdRef.current = '';
      onProcedureChange('');
    }
  }, [localProcedureResolution, onProcedureChange, selectedProcedureId]);

  // ── Parse function ──────────────────────────────────────────
  const parse = useCallback(async (text) => {
    if (!text.trim() || text.trim().length < 3) return;
    if (!authHeaders?.Authorization) {
      setErrMsg('로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.');
      setPhase('error');
      return;
    }
    setPhase('parsing');
    setErrMsg('');
    try {
      const res = await fetch('/api/intake/parse', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDraft(data);
      autoSelectedProcedureIdRef.current = '';
      onProcedureChange?.('');
      // Initialize editable state
      if (mode !== 'visit-only') {
        setName(data.patient.name || '');
        setBirthYear(data.patient.birth_year ? String(data.patient.birth_year) : '');
        setGender(data.patient.gender || '');
        setNationality(data.patient.nationality || '');
        setLang(data.patient.lang || '');
        setChannels(data.patient.channel_refs || {});
      }
      setVisitDate(data.visit.visit_date || '');
      setProcedures(data.visit.procedure_interests || []);
      setConcerns(data.visit.concerns || []);
      setNotes(data.visit.internal_notes || '');
      setPhase('review');
    } catch (err) {
      setErrMsg(err.message);
      setPhase('error');
    }
  }, [authHeaders, mode]);

  // Auto-parse initialText
  useEffect(() => {
    if (initialText) parse(initialText);
  }, []); // eslint-disable-line

  // ── Paste handler ───────────────────────────────────────────
  function handlePaste(e) {
    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) {
      setRaw(text);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => parse(text), 350);
    }
  }

  function handleChange(e) {
    const text = e.target.value;
    setRaw(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => parse(text), 600);
  }

  // ── Channel helpers ─────────────────────────────────────────
  function updateChannel(key, val) {
    setChannels(prev => {
      const next = { ...prev };
      if (val) next[key] = val; else delete next[key];
      return next;
    });
  }

  function addNewChannel() {
    if (!newChanKey || !newChanVal.trim()) return;
    updateChannel(newChanKey, newChanVal.trim());
    setNewChanKey('');
    setNewChanVal('');
  }

  // ── Confirm ─────────────────────────────────────────────────
  function handleConfirm() {
    if (mode !== 'visit-only' && !name.trim()) {
      setNameErr(true);
      return;
    }
    const patient = {
      name:         name.trim(),
      birth_year:   birthYear ? parseInt(birthYear) : null,
      gender:       gender || null,
      nationality:  nationality || null,
      lang:         lang || null,
      channel_refs: channels,
    };
    const visit = {
      visit_date:          visitDate || null,
      procedure_interests: procedures,
      procedure_id:        selectedProcedureId || null,
      concerns,
      internal_notes:      notes || null,
    };
    onConfirm(patient, visit);
  }

  function handleProcedureSelect(nextProcedureId) {
    if (!onProcedureChange) return;
    if (nextProcedureId !== autoSelectedProcedureIdRef.current) {
      autoSelectedProcedureIdRef.current = '';
    }
    onProcedureChange(nextProcedureId);
  }

  // ── Theme ───────────────────────────────────────────────────
  const bg       = darkMode ? '#18181B' : '#FFFFFF';
  const bgSub    = darkMode ? '#27272A' : '#F9FAFB';
  const border   = darkMode ? '#3F3F46' : '#E5E7EB';
  const textP    = darkMode ? '#F4F4F5' : '#111827';
  const textS    = darkMode ? '#A1A1AA' : '#6B7280';
  const teal     = '#4E8FA0';

  const conf   = draft?.confidence   ?? {};
  const evid   = draft?.raw_evidence ?? {};

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: SANS, display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Paste zone */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, background: bgSub, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Sparkles size={13} color={teal} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 700, color: teal, letterSpacing: '-0.01em' }}>
            Tiki Brief
          </span>
          <span style={{ fontSize: 11, color: textS }}>
            — 예약 메모 / DM을 붙여넣으면 자동으로 분석합니다
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            value={raw}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder={"예) Wang Fang, 35세, 중국, 위챗 wangfang2024\n리프팅 관심, 붓기 걱정. 5월 3일 오후 2시 예약"}
            rows={3}
            style={{
              width: '100%', resize: 'vertical', padding: '10px 12px',
              borderRadius: 10, border: `1.5px solid ${phase === 'parsing' ? teal : border}`,
              background: bg, color: textP, fontSize: 13, fontFamily: SANS,
              outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
              transition: 'border-color 0.15s',
            }}
          />
          {phase === 'parsing' && (
            <div style={{
              position: 'absolute', right: 10, top: 10,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Loader2 size={13} color={teal} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: teal, fontWeight: 600 }}>분석 중…</span>
            </div>
          )}
        </div>
        {draft?.warnings?.length > 0 && (
          <p style={{ fontSize: 11, color: '#D97706', marginTop: 6 }}>
            ⚠ {draft.warnings.join(' · ')}
          </p>
        )}
        {phase === 'error' && (
          <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>분석 오류: {errMsg}</p>
        )}
      </div>

      {/* Review fields — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Patient section ─────────────────────────────── */}
        {mode !== 'visit-only' && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: textS, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: -8 }}>
              환자 정보
            </p>

            {/* Name */}
            <Field label="이름" confidence={conf.name} evidence={evid.name} required>
              <TextInput
                value={name} onChange={v => { setName(v); setNameErr(false); }}
                placeholder="환자 이름 (필수)"
                darkMode={darkMode}
                confidence={conf.name}
                warn={nameErr}
              />
              {nameErr && <p style={{ fontSize: 11, color: '#DC2626' }}>이름은 필수입니다</p>}
            </Field>

            {/* Lang + Nationality — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="언어" confidence={conf.lang} evidence={evid.lang}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 28px 9px 12px', borderRadius: 9, appearance: 'none',
                      border: `1.5px solid ${conf.lang === 'medium' ? '#D97706' : darkMode ? '#52525B' : '#E5E7EB'}`,
                      background: darkMode ? '#3F3F46' : '#FFF',
                      color: textP, fontSize: 13, fontFamily: SANS, outline: 'none',
                    }}
                  >
                    <option value="">— 선택</option>
                    {LANG_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.flag} {o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: textS, pointerEvents: 'none' }} />
                </div>
              </Field>

              <Field label="국적" confidence={conf.nationality} evidence={evid.nationality}>
                <TextInput
                  value={nationality} onChange={setNationality}
                  placeholder="예: 중국"
                  darkMode={darkMode} confidence={conf.nationality}
                />
              </Field>
            </div>

            {/* Birth year + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="출생연도" confidence={conf.birth_year} evidence={evid.birth_year}>
                <TextInput
                  value={birthYear} onChange={setBirthYear}
                  placeholder="예: 1990"
                  darkMode={darkMode} confidence={conf.birth_year}
                />
              </Field>

              <Field label="성별" confidence={conf.gender} evidence={evid.gender}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 28px 9px 12px', borderRadius: 9, appearance: 'none',
                      border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
                      background: darkMode ? '#3F3F46' : '#FFF',
                      color: textP, fontSize: 13, fontFamily: SANS, outline: 'none',
                    }}
                  >
                    <option value="">— 미확인</option>
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: textS, pointerEvents: 'none' }} />
                </div>
              </Field>
            </div>

            {/* Channel refs */}
            <Field label="연락처" confidence={conf.channel_refs}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Detected channels */}
                {Object.entries(channels).map(([key, val]) => {
                  const meta = CHANNEL_LABELS[key] || { icon: '🔗', label: key };
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: textS, width: 52, flexShrink: 0 }}>
                        {meta.icon} {meta.label}
                      </span>
                      <input
                        value={val}
                        onChange={e => updateChannel(key, e.target.value)}
                        style={{
                          flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 13,
                          border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
                          background: darkMode ? '#3F3F46' : '#FFF', color: textP, fontFamily: SANS, outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateChannel(key, '')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: textS, padding: 2, display: 'flex' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}

                {/* Add new channel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative', width: 90, flexShrink: 0 }}>
                    <select
                      value={newChanKey}
                      onChange={e => setNewChanKey(e.target.value)}
                      style={{
                        width: '100%', padding: '7px 22px 7px 8px', borderRadius: 8, appearance: 'none',
                        border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
                        background: darkMode ? '#3F3F46' : '#F9FAFB',
                        color: newChanKey ? textP : textS, fontSize: 12, fontFamily: SANS, outline: 'none',
                      }}
                    >
                      <option value="">+ 채널</option>
                      {ALL_CHANNELS.filter(k => !channels[k]).map(k => (
                        <option key={k} value={k}>{CHANNEL_LABELS[k].icon} {CHANNEL_LABELS[k].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: textS, pointerEvents: 'none' }} />
                  </div>
                  <input
                    value={newChanVal}
                    onChange={e => setNewChanVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNewChannel(); }}
                    placeholder="ID / 번호"
                    disabled={!newChanKey}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 13,
                      border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
                      background: darkMode ? '#3F3F46' : '#FFF', color: textP, fontFamily: SANS, outline: 'none',
                      opacity: newChanKey ? 1 : 0.5,
                    }}
                  />
                  <button
                    type="button"
                    onClick={addNewChannel}
                    disabled={!newChanKey || !newChanVal.trim()}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: (!newChanKey || !newChanVal.trim()) ? (darkMode ? '#3F3F46' : '#F3F4F6') : teal,
                      color: (!newChanKey || !newChanVal.trim()) ? textS : '#fff',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    추가
                  </button>
                </div>
              </div>
            </Field>
          </>
        )}

        {/* ── Visit section ────────────────────────────────── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: textS, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: -8 }}>
          방문 정보
        </p>

        {/* Visit date */}
        <Field label="방문 예정일" confidence={conf.visit_date} evidence={evid.visit_date}>
          <input
            type="date"
            value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9, boxSizing: 'border-box',
              border: `1.5px solid ${conf.visit_date === 'medium' ? '#D97706' : darkMode ? '#52525B' : '#E5E7EB'}`,
              background: darkMode ? '#3F3F46' : '#FFF',
              color: textP, fontSize: 13, fontFamily: SANS, outline: 'none',
            }}
          />
        </Field>

        {/* Procedure interests */}
        <Field label="시술 관심" confidence={conf.procedure_interests} evidence={evid.procedure_interests}>
          <ChipList
            values={procedures}
            onChange={setProcedures}
            placeholder="예: 보톡스, 필러 (Enter로 추가)"
            darkMode={darkMode}
          />
        </Field>

        {procedureOptions.length > 0 && (
          <Field label="확정 시술">
            <div style={{ position: 'relative' }}>
              <select
                value={selectedProcedureId}
                onChange={e => handleProcedureSelect(e.target.value)}
                style={{
                  width: '100%', padding: '9px 28px 9px 12px', borderRadius: 9, appearance: 'none',
                  border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
                  background: darkMode ? '#3F3F46' : '#FFF',
                  color: textP, fontSize: 13, fontFamily: SANS, outline: 'none',
                }}
              >
                <option value="">— 자동 지정 안 함</option>
                {procedureOptions.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.name_ko || procedure.name_en}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: textS, pointerEvents: 'none' }} />
            </div>
            {(procedureResolution?.message || localProcedureResolution?.message) && (
              <p style={{ fontSize: 11, color: (procedureResolution?.status || localProcedureResolution?.status) === 'matched' ? '#16A34A' : '#D97706', marginTop: 6 }}>
                {procedureResolution?.message || localProcedureResolution?.message}
              </p>
            )}
          </Field>
        )}

        {/* Concerns */}
        <Field label="우려 사항" confidence={conf.concerns} evidence={evid.concerns}>
          <ChipList
            values={concerns}
            onChange={setConcerns}
            placeholder="예: 붓기, 회복기간 (Enter로 추가)"
            darkMode={darkMode}
          />
        </Field>

        {/* Internal notes */}
        <Field label="코디 메모 (내부용)" confidence={conf.internal_notes} evidence={evid.internal_notes}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="코디네이터 / 에이전시 전달 내용"
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9, resize: 'vertical',
              border: `1.5px solid ${darkMode ? '#52525B' : '#E5E7EB'}`,
              background: darkMode ? '#3F3F46' : '#FFF',
              color: textP, fontSize: 13, fontFamily: SANS, outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
            }}
          />
        </Field>

        {/* Spacer for action bar */}
        <div style={{ height: 8 }} />
      </div>

      {/* ── Action bar ──────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px', borderTop: `1px solid ${border}`,
        display: 'flex', gap: 10, justifyContent: 'flex-end',
        background: bgSub, flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 18px', borderRadius: 10, border: `1px solid ${border}`,
            background: 'transparent', color: textS, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: SANS,
          }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={phase === 'parsing'}
          style={{
            padding: '9px 22px', borderRadius: 10, border: 'none',
            background: phase === 'parsing' ? teal + '60' : teal,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: phase === 'parsing' ? 'default' : 'pointer',
            fontFamily: SANS, boxShadow: `0 2px 8px ${teal}40`,
          }}
        >
          {mode === 'visit-only' ? '방문 생성' : '환자 + 방문 생성'}
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
