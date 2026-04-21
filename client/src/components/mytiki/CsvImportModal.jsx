/**
 * client/src/components/mytiki/CsvImportModal.jsx
 * ─────────────────────────────────────────────────────────────
 * Bulk CSV import — zero-integration clinic onboarding.
 *
 * Phases:
 *   upload   → drag-drop / file picker
 *   preview  → column detection, validation summary, row preview
 *   importing → single POST /api/my-tiki/import → spinner
 *   done     → results summary + download result CSV
 *
 * Handles:
 *   • UTF-8 BOM (Excel exports)
 *   • Windows CRLF line endings
 *   • Quoted CSV fields (RFC 4180)
 *   • Korean and English column headers
 *   • Multiple date formats → normalised YYYY-MM-DD
 *   • Deduplication by name + visit_date
 *
 * Props:
 *   clinicId  — from AuthContext
 *   darkMode  — bool
 *   onClose() — dismiss
 *   onImported(count) — called after successful import so parent can refresh
 */

import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, CheckCircle2, AlertTriangle,
  Download, Loader2, ChevronRight, SkipForward, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TEAL = '#4E8FA0';
const SAGE = '#5A8F80';
const SANS = "'Pretendard Variable', 'Inter', system-ui, sans-serif";
const MAX_ROWS = 500;

// ── Auth helper ───────────────────────────────────────────────────────────────
async function authHeaders() {
  const { data: { session: sb } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (sb?.access_token) headers['Authorization'] = `Bearer ${sb.access_token}`;
  return headers;
}

// ── CSV parser (RFC 4180, BOM-safe) ──────────────────────────────────────────
function parseCSVText(text) {
  const content = text.replace(/^\uFEFF/, ''); // strip BOM
  const lines = content.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  function parseLine(line) {
    const cells = [];
    let cell = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cell += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cell); cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell);
    return cells;
  }

  const headers = parseLine(nonEmpty[0]).map(h => h.trim());
  const rows = nonEmpty.slice(1)
    .filter(l => parseLine(l).some(c => c.trim()))
    .map((line, idx) => {
      const cells = parseLine(line);
      const row = { _rowNum: idx + 2 };
      headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
      return row;
    });

  return { headers, rows };
}

// ── Column detection (Korean + English aliases) ───────────────────────────────
const ALIASES = {
  name:        ['이름','name','성명','환자명','patient_name','고객명','환자이름','患者名'],
  visit_date:  ['방문일','visit_date','날짜','date','예약일','방문날짜','예약날짜','방문 일자','내원일'],
  lang:        ['언어','lang','language','언어코드'],
  procedure:   ['시술','procedure','시술명','진료','treatment','시술/진료'],
  phone:       ['전화','phone','연락처','tel','전화번호','폰'],
  email:       ['이메일','email','e-mail'],
  note:        ['메모','note','notes','비고','내부메모','참고','노트'],
  nationality: ['국적','nationality','나라','국가'],
};

function detectColumns(headers) {
  const map = {};
  const used = new Set();
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const found = headers.find(h => h.toLowerCase() === alias.toLowerCase());
      if (found && !used.has(found)) {
        map[field] = found;
        used.add(found);
        break;
      }
    }
  }
  return map; // { name: 'header_col', visit_date: 'header_col', ... }
}

// ── Date normalisation → YYYY-MM-DD ──────────────────────────────────────────
function normaliseDate(str) {
  if (!str) return null;
  const s = str.trim();

  // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  // MM/DD/YYYY (US)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;

  // YYYY년 MM월 DD일
  m = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  // MM월 DD일 → current year
  m = s.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (m) {
    const y = new Date().getFullYear();
    return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  }

  // MM.DD or MM/DD → current year
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})$/);
  if (m) {
    const y = new Date().getFullYear();
    return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  }

  // Excel serial number (e.g. 46022)
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + parseInt(s) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // Generic JS fallback
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);

  return null;
}

// ── Row validation ────────────────────────────────────────────────────────────
function validateRow(rawRow, colMap) {
  const errors = [];
  const name = rawRow[colMap.name]?.trim() || '';
  const rawDate = rawRow[colMap.visit_date]?.trim() || '';

  if (!name) errors.push('이름 누락');
  if (!rawDate) errors.push('방문일 누락');

  const visit_date = rawDate ? normaliseDate(rawDate) : null;
  if (rawDate && !visit_date) errors.push(`날짜 인식 불가: "${rawDate}"`);

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    data: {
      name,
      visit_date,
      lang:        rawRow[colMap.lang]?.trim()        || null,
      procedure:   rawRow[colMap.procedure]?.trim()   || null,
      phone:       rawRow[colMap.phone]?.trim()       || null,
      email:       rawRow[colMap.email]?.trim()       || null,
      nationality: rawRow[colMap.nationality]?.trim() || null,
      note:        rawRow[colMap.note]?.trim()        || null,
    },
  };
}

// ── Result CSV download ───────────────────────────────────────────────────────
function downloadResultCSV(originalHeaders, originalRows, results) {
  const extra = ['patient_id', 'visit_id', 'portal_url', 'status', 'error_message'];
  const allHeaders = [...originalHeaders, ...extra];

  function esc(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [
    allHeaders.map(esc).join(','),
    ...originalRows.map((row, i) => {
      const res = results[i] || {};
      return allHeaders.map(h => esc(row[h] ?? res[h] ?? '')).join(',');
    }),
  ];

  const csv = '\uFEFF' + lines.join('\r\n'); // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mytiki_import_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = {
    created:       { label: '신규 생성',  bg: '#D1FAE5', color: '#065F46' },
    visit_created: { label: '방문 추가',  bg: '#DBEAFE', color: '#1E40AF' },
    duplicate:     { label: '중복 스킵',  bg: '#FEF3C7', color: '#92400E' },
    failed:        { label: '실패',       bg: '#FEE2E2', color: '#991B1B' },
  }[status] || { label: status, bg: '#F3F4F6', color: '#374151' };

  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

// ── CsvImportModal ────────────────────────────────────────────────────────────
export default function CsvImportModal({ clinicId, darkMode, onClose, onImported }) {
  const [phase,        setPhase]        = useState('upload');
  const [dragOver,     setDragOver]     = useState(false);
  const [parseError,   setParseError]   = useState('');
  const [fileName,     setFileName]     = useState('');

  // Parsed data
  const [rawHeaders,   setRawHeaders]   = useState([]);
  const [rawRows,      setRawRows]      = useState([]);
  const [colMap,       setColMap]       = useState({});
  const [validRows,    setValidRows]    = useState([]);
  const [invalidRows,  setInvalidRows]  = useState([]);

  // Import results
  const [results,      setResults]      = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [importError,  setImportError]  = useState('');

  const fileRef = useRef(null);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const overlay  = darkMode ? 'rgba(0,0,0,0.75)'  : 'rgba(0,0,0,0.5)';
  const panelBg  = darkMode ? '#18181B' : '#FFFFFF';
  const headerBg = darkMode ? '#27272A' : '#F9FAFB';
  const border   = darkMode ? '#3F3F46' : '#E5E7EB';
  const textP    = darkMode ? '#F4F4F5' : '#111827';
  const textS    = darkMode ? '#A1A1AA' : '#6B7280';
  const tblBg    = darkMode ? '#1C1C1F' : '#FAFAFA';
  const tblBdr   = darkMode ? '#2D2D31' : '#E5E7EB';

  // ── File processing ────────────────────────────────────────────────────────
  function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError('.csv 파일만 지원합니다.');
      return;
    }
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const { headers, rows } = parseCSVText(e.target.result);
        if (headers.length === 0) { setParseError('빈 파일이거나 형식을 인식할 수 없습니다.'); return; }
        if (rows.length === 0)    { setParseError('데이터 행이 없습니다 (헤더만 있음).'); return; }
        if (rows.length > MAX_ROWS) { setParseError(`최대 ${MAX_ROWS}행까지 가져올 수 있습니다 (현재 ${rows.length}행).`); return; }

        const map = detectColumns(headers);
        if (!map.name)       { setParseError('이름 열을 찾을 수 없습니다. 헤더에 "이름" 또는 "name"이 있어야 합니다.'); return; }
        if (!map.visit_date) { setParseError('방문일 열을 찾을 수 없습니다. 헤더에 "방문일" 또는 "visit_date"가 있어야 합니다.'); return; }

        const valid = [], invalid = [];
        for (const row of rows) {
          const v = validateRow(row, map);
          if (v.valid) valid.push({ ...v.data, _rowNum: row._rowNum });
          else         invalid.push({ ...row, _errors: v.errors });
        }

        setRawHeaders(headers);
        setRawRows(rows);
        setColMap(map);
        setValidRows(valid);
        setInvalidRows(invalid);
        setPhase('preview');
      } catch (err) {
        setParseError(`파싱 오류: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function onFileChange(e) { processFile(e.target.files[0]); }
  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  async function runImport() {
    setPhase('importing');
    setImportError('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/my-tiki/import', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ rows: validRows }),
        signal:  AbortSignal.timeout(120_000), // 2-minute timeout for 500 rows
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results || []);
      setSummary(data.summary || {});
      setPhase('done');
      if (onImported) onImported((data.summary?.created || 0) + (data.summary?.visit_created || 0));
    } catch (err) {
      setImportError(err.message);
      setPhase('preview'); // allow retry
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: overlay, backdropFilter: 'blur(4px)',
        fontFamily: SANS,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 640,
        maxHeight: 'calc(100dvh - 32px)',
        borderRadius: 20, background: panelBg,
        border: `1px solid ${border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: headerBg, borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={14} color={TEAL} />
            <span style={{ fontSize: 13, fontWeight: 700, color: textP }}>CSV 일괄 가져오기</span>
            {phase !== 'upload' && (
              <span style={{ fontSize: 11, color: textS }}>— {fileName}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Phase indicator */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['upload','preview','importing','done'].map((p, i) => (
                <div key={p} style={{
                  width: p === phase ? 16 : 6, height: 6, borderRadius: 3,
                  background: ['upload','preview','importing','done'].indexOf(phase) >= i ? TEAL : '#D1D5DB',
                  transition: 'all 0.2s',
                }} />
              ))}
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:textS, padding:4, display:'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ══ PHASE: upload ══ */}
          {phase === 'upload' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 20 }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', borderRadius: 16, cursor: 'pointer',
                  border: `2px dashed ${dragOver ? TEAL : border}`,
                  background: dragOver ? `${TEAL}08` : (darkMode ? '#1C1C1F' : '#FAFAFA'),
                  padding: '48px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <Upload size={36} color={dragOver ? TEAL : textS} strokeWidth={1.5} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: textP, marginBottom: 4 }}>
                    CSV 파일을 드래그하거나 클릭하여 선택
                  </p>
                  <p style={{ fontSize: 11, color: textS }}>최대 {MAX_ROWS}행 · Excel CSV(.csv)만 지원</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={onFileChange} />

              {parseError && (
                <div style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'#FEF2F2', color:'#991B1B', fontSize:12, display:'flex', gap:8, alignItems:'flex-start' }}>
                  <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
                  {parseError}
                </div>
              )}

              {/* Column guide */}
              <div style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:`1px solid ${border}`, background: darkMode?'#1C1C1F':'#F9FAFB' }}>
                <p style={{ fontSize:11, fontWeight:700, color:textS, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>필수 열</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                  {['이름 / name', '방문일 / visit_date'].map(c => (
                    <span key={c} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6, background:TEAL+'18', color:TEAL }}>{c}</span>
                  ))}
                </div>
                <p style={{ fontSize:11, fontWeight:700, color:textS, marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>선택 열</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['lang','시술 / procedure','전화 / phone','이메일 / email','국적 / nationality','메모 / note'].map(c => (
                    <span key={c} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:darkMode?'#2D2D31':'#F3F4F6', color:textS }}>{c}</span>
                  ))}
                </div>
                <p style={{ fontSize:10, color:textS, marginTop:10, lineHeight:1.6 }}>
                  날짜 형식: YYYY-MM-DD · YYYY/MM/DD · MM/DD/YYYY · YYYY년 MM월 DD일 · MM월 DD일 · Excel 직렬 숫자
                </p>
              </div>
            </div>
          )}

          {/* ══ PHASE: preview ══ */}
          {phase === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Column map summary */}
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, background: headerBg, flexShrink: 0 }}>
                <p style={{ fontSize:11, fontWeight:700, color:textS, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>감지된 열 매핑</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {Object.entries(ALIASES).map(([field]) => {
                    const found = colMap[field];
                    const isRequired = field === 'name' || field === 'visit_date';
                    return (
                      <span key={field} style={{
                        fontSize:10, padding:'2px 8px', borderRadius:6, fontWeight:600,
                        background: found ? (isRequired ? `${TEAL}18` : '#F0F0F0') : '#FEF2F2',
                        color: found ? (isRequired ? TEAL : '#374151') : '#991B1B',
                        border: found ? 'none' : '1px solid #FCA5A5',
                      }}>
                        {field} {found ? `→ "${colMap[field]}"` : '(없음)'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Validation summary */}
              <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${border}`, flexShrink:0 }}>
                {[
                  { label:'전체', value: rawRows.length,       color: textS },
                  { label:'유효', value: validRows.length,     color: SAGE },
                  { label:'오류', value: invalidRows.length,   color: invalidRows.length ? '#DC2626' : textS },
                ].map(({ label, value, color }, i) => (
                  <div key={label} style={{
                    flex:1, padding:'10px 0', textAlign:'center',
                    borderRight: i < 2 ? `1px solid ${border}` : 'none',
                    background: panelBg,
                  }}>
                    <div style={{ fontSize:20, fontWeight:700, color }}>{value}</div>
                    <div style={{ fontSize:10, color:textS }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Scrollable preview area */}
              <div style={{ flex:1, overflowY:'auto' }}>
                {/* Invalid rows */}
                {invalidRows.length > 0 && (
                  <div style={{ padding:'12px 20px', background: darkMode?'#27272A':'#FEF2F2', borderBottom:`1px solid ${border}` }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#DC2626', marginBottom:8 }}>⚠ 가져오지 않을 행</p>
                    {invalidRows.slice(0, 8).map((row, i) => (
                      <div key={i} style={{ fontSize:11, color:'#991B1B', marginBottom:3 }}>
                        행 {row._rowNum}: {row._errors.join(' / ')}
                        {row[colMap.name] && ` — "${row[colMap.name]}"`}
                      </div>
                    ))}
                    {invalidRows.length > 8 && (
                      <p style={{ fontSize:10, color:textS, marginTop:4 }}>… 외 {invalidRows.length - 8}건</p>
                    )}
                  </div>
                )}

                {/* Valid rows preview table */}
                <div style={{ background: tblBg }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ background: darkMode?'#2D2D31':'#F3F4F6' }}>
                        {['#','이름','방문일','시술','언어','비고'].map(h => (
                          <th key={h} style={{ padding:'6px 12px', textAlign:'left', fontWeight:700, color:textS, borderBottom:`1px solid ${tblBdr}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 10).map((row, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${tblBdr}` }}>
                          <td style={{ padding:'5px 12px', color:textS }}>{row._rowNum}</td>
                          <td style={{ padding:'5px 12px', fontWeight:600, color:textP }}>{row.name}</td>
                          <td style={{ padding:'5px 12px', color:textP }}>{row.visit_date}</td>
                          <td style={{ padding:'5px 12px', color:textS }}>{row.procedure || '—'}</td>
                          <td style={{ padding:'5px 12px', color:textS }}>{row.lang || '—'}</td>
                          <td style={{ padding:'5px 12px', color:textS }}>{row.note ? row.note.slice(0,20)+'…' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 10 && (
                    <p style={{ padding:'8px 14px', fontSize:10, color:textS }}>… 외 {validRows.length - 10}행</p>
                  )}
                </div>
              </div>

              {/* Import error */}
              {importError && (
                <div style={{ padding:'10px 20px', background:'#FEF2F2', borderTop:`1px solid #FCA5A5`, fontSize:12, color:'#991B1B', flexShrink:0 }}>
                  ⚠ {importError}
                </div>
              )}

              {/* Action bar */}
              <div style={{ padding:'14px 20px', borderTop:`1px solid ${border}`, background:headerBg, display:'flex', gap:10, justifyContent:'space-between', flexShrink:0 }}>
                <button
                  onClick={() => { setPhase('upload'); setParseError(''); }}
                  style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${border}`, background:'transparent', color:textS, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:SANS }}
                >
                  다시 선택
                </button>
                <button
                  onClick={runImport}
                  disabled={validRows.length === 0}
                  style={{
                    padding:'8px 22px', borderRadius:9, border:'none',
                    background: validRows.length === 0 ? '#D1D5DB' : TEAL,
                    color:'#fff', fontSize:13, fontWeight:700,
                    cursor: validRows.length === 0 ? 'default' : 'pointer',
                    fontFamily:SANS, boxShadow: validRows.length ? `0 2px 8px ${TEAL}40` : 'none',
                  }}
                >
                  {validRows.length}개 행 가져오기 →
                </button>
              </div>
            </div>
          )}

          {/* ══ PHASE: importing ══ */}
          {phase === 'importing' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:48 }}>
              <Loader2 size={40} color={TEAL} style={{ animation:'spin 1s linear infinite' }} />
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:15, fontWeight:700, color:textP, marginBottom:6 }}>{validRows.length}개 행 처리 중…</p>
                <p style={{ fontSize:12, color:textS }}>환자 · 방문 · My Tiki 링크를 일괄 생성합니다</p>
                <p style={{ fontSize:11, color:textS, marginTop:6 }}>잠시 기다려 주세요 (최대 60초)</p>
              </div>
            </div>
          )}

          {/* ══ PHASE: done ══ */}
          {phase === 'done' && summary && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {/* Summary cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'16px 20px', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
                {[
                  { label:'신규 생성',    value: (summary.created||0)+(summary.visit_created||0), color: SAGE },
                  { label:'중복 스킵',    value: summary.duplicates || 0,                         color: '#D09262' },
                  { label:'실패',         value: summary.failed     || 0,                         color: summary.failed ? '#EF4444' : '#6B7280' },
                  { label:'전체',         value: summary.total      || 0,                         color: TEAL },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign:'center', padding:'10px 0', borderRadius:10, background: darkMode?'#1C1C1F':'#F9FAFB' }}>
                    <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
                    <div style={{ fontSize:10, color:textS, marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Results table */}
              <div style={{ flex:1, overflowY:'auto', background:tblBg }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background: darkMode?'#2D2D31':'#F3F4F6', position:'sticky', top:0 }}>
                      {['이름','방문일','상태','링크','오류'].map(h => (
                        <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:textS, borderBottom:`1px solid ${tblBdr}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => {
                      const res = results[i] || {};
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${tblBdr}` }}>
                          <td style={{ padding:'5px 12px', fontWeight:600, color:textP }}>{row.name}</td>
                          <td style={{ padding:'5px 12px', color:textS }}>{row.visit_date}</td>
                          <td style={{ padding:'5px 12px' }}><StatusChip status={res.status} /></td>
                          <td style={{ padding:'5px 12px' }}>
                            {res.portal_url
                              ? <a href={res.portal_url} target="_blank" rel="noreferrer" style={{ color:TEAL, fontSize:10, fontWeight:600 }}>링크 ↗</a>
                              : <span style={{ color:textS }}>—</span>
                            }
                          </td>
                          <td style={{ padding:'5px 12px', color:'#DC2626', fontSize:10 }}>{res.error_message || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action bar */}
              <div style={{ padding:'14px 20px', borderTop:`1px solid ${border}`, background:headerBg, display:'flex', gap:10, justifyContent:'space-between', flexShrink:0 }}>
                <button
                  onClick={() => downloadResultCSV(rawHeaders, rawRows, results)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, border:`1px solid ${TEAL}50`, background:'transparent', color:TEAL, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:SANS }}
                >
                  <Download size={13} /> 결과 CSV 다운로드
                </button>
                <button
                  onClick={onClose}
                  style={{ padding:'8px 22px', borderRadius:9, border:'none', background:TEAL, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:SANS }}
                >
                  완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
