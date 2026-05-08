/**
 * client/src/components/mytiki/CsvImportModal.jsx
 * ─────────────────────────────────────────────────────────────
 * CRM/EMR patient + visit CSV import — zero-integration clinic onboarding.
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

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, CheckCircle2, AlertTriangle,
  Download, Loader2, ChevronRight, SkipForward, ArrowLeft,
  Copy, Clipboard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TEAL = '#0145F2';
const SAGE = '#3B6500';
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
  external_source: ['외부시스템','external_source','crm','emr','source','시스템'],
  external_patient_id: ['외부환자ID','external_patient_id','crm_patient_id','고객번호','환자번호'],
  external_chart_no: ['차트번호','chart_no','external_chart_no','chart_number'],
  external_visit_id: ['외부예약ID','external_visit_id','crm_visit_id','예약번호','방문번호'],
  external_profile_url: ['CRM링크','EMR링크','external_profile_url','profile_url','url','링크'],
  external_memo: ['외부메모','external_memo','crm_memo','emr_memo'],
};

const CRM_EXPORT_PRESETS = {
  generic: {
    label: '자동 감지',
    description: '일반 CSV / 직접 매핑',
    aliases: {},
  },
  vegas: {
    label: 'Vegas',
    description: '상담/예약 export에서 자주 보이는 고객·차트 컬럼',
    aliases: {
      name: ['고객명', '고객 이름', '이름', '성명', '환자명'],
      visit_date: ['예약일', '예약일자', '예약일시', '내원예정일', '방문예정일'],
      phone: ['휴대폰', '휴대전화', '핸드폰', '전화번호', '연락처'],
      procedure: ['상담항목', '관심시술', '시술명', '예약항목', '진료항목'],
      note: ['상담메모', '예약메모', '고객메모', '비고'],
      external_patient_id: ['고객번호', '고객ID', '회원번호'],
      external_chart_no: ['차트번호', '차트 No', '차트NO'],
      external_visit_id: ['예약번호', '예약ID'],
      external_profile_url: ['고객링크', 'CRM링크'],
    },
  },
  afterdoc: {
    label: 'AfterDoc',
    description: '상담/고객 export의 고객ID·상담메모 중심 컬럼',
    aliases: {
      name: ['고객명', '환자명', '이름', '성명', 'name'],
      visit_date: ['예약일', '예약일시', '방문예정일', '내원예정일', '상담예약일', 'visitDate'],
      phone: ['휴대폰', '휴대폰번호', '연락처', '전화번호', 'mobile', 'phone'],
      email: ['이메일', 'email', '고객이메일'],
      procedure: ['관심시술', '상담항목', '문의시술', '시술명', 'category'],
      note: ['상담메모', '고객메모', '문의내용', '최근상담', 'memo'],
      external_source: ['플랫폼', '유입경로', 'source'],
      external_patient_id: ['고객ID', '고객번호', 'user_id', 'member_id'],
      external_chart_no: ['차트번호', 'chart_no'],
      external_visit_id: ['상담ID', '예약ID', 'inquiry_id', 'appointment_id'],
      external_profile_url: ['고객링크', '상담링크', 'profile_url', 'url'],
      external_memo: ['상담내용', '원문메모', '상담메모', '문의내용'],
    },
  },
  uisarang: {
    label: '의사랑',
    description: '원무/EMR export의 환자번호·내원일 중심 컬럼',
    aliases: {
      name: ['환자명', '성명', '수진자명', '이름'],
      visit_date: ['내원일', '내원일자', '진료일', '진료일자', '예약일자'],
      phone: ['휴대폰', '휴대전화', '연락처', '전화번호', '핸드폰'],
      procedure: ['진료과목', '진료명', '처치명', '시술명'],
      note: ['비고', '메모', '진료메모', '환자메모'],
      external_patient_id: ['환자번호', '등록번호', '수진자번호'],
      external_chart_no: ['차트번호', '챠트번호', '진료카드번호'],
      external_visit_id: ['접수번호', '내원번호', '진료번호'],
    },
  },
  drpalette: {
    label: 'Dr.Palette',
    description: '예약/차트 export의 예약번호·등록번호 중심 컬럼',
    aliases: {
      name: ['환자명', '고객명', 'name', 'patientName'],
      visit_date: ['예약일시', '예약일', '방문일', '진료일시', 'appointmentDate'],
      phone: ['휴대폰번호', '휴대폰', '전화번호', 'mobile', 'phoneNumber'],
      procedure: ['시술명', '진료명', '예약내용', 'treatmentName'],
      note: ['차트메모', '상담메모', '메모', 'memo'],
      external_patient_id: ['등록번호', '환자ID', 'patientId'],
      external_chart_no: ['차트번호', 'chartNo'],
      external_visit_id: ['예약번호', 'appointmentId', 'visitId'],
      external_profile_url: ['환자링크', 'profileUrl'],
    },
  },
};

function getAliasesForPreset(presetKey = 'generic', customPresets = {}) {
  const presetAliases = (customPresets[presetKey] || CRM_EXPORT_PRESETS[presetKey])?.aliases || {};
  return Object.fromEntries(
    Object.entries(ALIASES).map(([field, aliases]) => [
      field,
      [...new Set([...(presetAliases[field] || []), ...aliases])],
    ]),
  );
}

const REQUIRED_FIELDS = ['name', 'visit_date'];
const OPTIONAL_FIELDS = ['lang', 'procedure', 'phone', 'email', 'nationality', 'note', 'external_source', 'external_patient_id', 'external_chart_no', 'external_visit_id', 'external_profile_url', 'external_memo'];
const FIELD_LABELS = {
  name: '이름',
  visit_date: '방문일',
  lang: '언어',
  procedure: '시술/관심 항목',
  phone: '전화번호',
  email: '이메일',
  nationality: '국적',
  note: '메모',
  external_source: 'CRM/EMR 이름',
  external_patient_id: '외부 환자 ID',
  external_chart_no: '차트번호',
  external_visit_id: '외부 예약/방문 ID',
  external_profile_url: 'CRM/EMR 링크',
  external_memo: '외부 메모',
};

function detectColumns(headers, presetKey = 'generic', customPresets = {}) {
  const map = {};
  const used = new Set();
  const aliasesByField = getAliasesForPreset(presetKey, customPresets);
  for (const [field, aliases] of Object.entries(aliasesByField)) {
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
      external_source:      rawRow[colMap.external_source]?.trim()      || null,
      external_patient_id:  rawRow[colMap.external_patient_id]?.trim()  || null,
      external_chart_no:    rawRow[colMap.external_chart_no]?.trim()    || null,
      external_visit_id:    rawRow[colMap.external_visit_id]?.trim()    || null,
      external_profile_url: rawRow[colMap.external_profile_url]?.trim() || null,
      external_memo:        rawRow[colMap.external_memo]?.trim()        || null,
    },
  };
}

function buildCsvRowKey(row = {}) {
  const name = String(row.name || '').trim().toLowerCase();
  const visitDate = String(row.visit_date || '').trim();
  if (!name || !visitDate) return '';
  return `${name}_${visitDate}`;
}

function analyzeValidRowsForPreview(rows = []) {
  const seen = new Map();
  const importRows = [];
  const duplicateRows = [];
  const warningRows = [];

  for (const row of rows) {
    const key = buildCsvRowKey(row);
    if (key && seen.has(key)) {
      duplicateRows.push({
        ...row,
        _warnings: ['CSV 내부 중복'],
        _duplicateOf: seen.get(key),
      });
      continue;
    }
    if (key) seen.set(key, row._rowNum);

    const warnings = [];
    if (!row.phone && !row.email && !row.external_patient_id && !row.external_chart_no) {
      warnings.push('연락처/외부 ID 없음');
    }
    if (row.procedure && row.procedure.includes(',')) {
      warnings.push('시술값 다중 입력 — 서버가 확실한 경우만 매칭');
    }

    const normalizedRow = warnings.length ? { ...row, _warnings: warnings } : row;
    if (warnings.length) warningRows.push(normalizedRow);
    importRows.push(normalizedRow);
  }

  return { importRows, duplicateRows, warningRows };
}

function buildPreviewFromColumnMap(rows, map) {
  const valid = [];
  const invalid = [];
  for (const row of rows) {
    const v = validateRow(row, map);
    if (v.valid) valid.push({ ...v.data, _rowNum: row._rowNum });
    else invalid.push({ ...row, _errors: v.errors });
  }
  return { valid, invalid, ...analyzeValidRowsForPreview(valid) };
}

// ── Result CSV download ───────────────────────────────────────────────────────
function downloadResultCSV(originalHeaders, originalRows, results) {
  const extra = ['patient_id', 'visit_id', 'procedure_id', 'procedure_match_status', 'procedure_match_name', 'portal_url', 'status', 'error_message'];
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
  a.download = `crm_emr_patient_visit_import_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadFailedRowsCSV(rows = [], results = []) {
  const failedRows = rows
    .map((row, index) => ({ row, result: results[index] || {} }))
    .filter(({ result }) => result.status === 'failed');
  if (!failedRows.length) return;

  const headers = [
    'name',
    'visit_date',
    'lang',
    'procedure',
    'phone',
    'email',
    'nationality',
    'note',
    'external_source',
    'external_patient_id',
    'external_chart_no',
    'external_visit_id',
    'external_profile_url',
    'external_memo',
    'error_message',
  ];

  function esc(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [
    headers.map(esc).join(','),
    ...failedRows.map(({ row, result }) => headers.map(h => esc(h === 'error_message' ? result.error_message : row[h])).join(',')),
  ];
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crm_emr_failed_rows_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadTemplateCSV() {
  const headers = [
    'name',
    'visit_date',
    'lang',
    'procedure',
    'phone',
    'email',
    'nationality',
    'note',
    'external_source',
    'external_patient_id',
    'external_chart_no',
    'external_visit_id',
    'external_profile_url',
    'external_memo',
  ];
  const rows = [
    {
      name: 'Wang Fang',
      visit_date: '2026-05-03',
      lang: 'zh',
      procedure: '리프팅',
      phone: '+82-10-0000-0000',
      email: '',
      nationality: '중국',
      note: '상담 후 방문 예정',
      external_source: 'AfterDoc',
      external_patient_id: 'P-001',
      external_chart_no: 'C-001',
      external_visit_id: 'V-001',
      external_profile_url: 'https://example-crm.local/p/P-001',
      external_memo: '기존 CRM에서 내보낸 샘플',
    },
    {
      name: 'Maria Garcia',
      visit_date: '2026-05-04',
      lang: 'es',
      procedure: '보톡스',
      phone: '+82-10-1111-1111',
      email: 'maria@example.com',
      nationality: '멕시코',
      note: '재방문 상담',
      external_source: 'Vegas',
      external_patient_id: 'P-002',
      external_chart_no: 'C-002',
      external_visit_id: 'V-002',
      external_profile_url: '',
      external_memo: '차트번호 기준으로 기존 고객 확인',
    },
  ];

  function esc(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [
    headers.map(esc).join(','),
    ...rows.map(row => headers.map(h => esc(row[h])).join(',')),
  ];
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crm_emr_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCopyBackText(validRows = [], results = []) {
  const lines = [];
  validRows.forEach((row, index) => {
    const result = results[index] || {};
    if (!result.portal_url || result.status === 'failed') return;
    lines.push([
      `[TikiDoc] ${row.name || '환자'} 외국인 환자 안내`,
      `처리 결과: ${result.status === 'created' ? '신규 환자+방문 생성' : '기존 환자 방문 추가'}`,
      row.external_source ? `CRM/EMR: ${row.external_source}` : '',
      row.external_patient_id ? `외부 환자 ID: ${row.external_patient_id}` : '',
      row.external_chart_no ? `차트번호: ${row.external_chart_no}` : '',
      row.external_visit_id ? `외부 예약/방문 ID: ${row.external_visit_id}` : '',
      row.visit_date ? `방문일: ${row.visit_date}` : '',
      row.procedure ? `관심 시술: ${row.procedure}` : '',
      result.procedure_match_status === 'matched' && result.procedure_match_name
        ? `TikiDoc 시술 매칭: ${result.procedure_match_name}`
        : '',
      `My Tiki 링크: ${result.portal_url}`,
      '환자에게 링크를 공유하면 문진/동의/방문 안내를 이어서 확인할 수 있습니다.',
    ].filter(Boolean).join('\n'));
  });
  return lines.join('\n\n---\n\n');
}

function buildCustomAliasesFromColumnMap(colMap = {}) {
  const aliases = {};
  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    const header = colMap[field];
    if (header) aliases[field] = [header];
  }
  return aliases;
}

function CopyBackPanel({ validRows, results, darkMode, border, textP, textS }) {
  const [copied, setCopied] = useState(false);
  const copyBackText = buildCopyBackText(validRows, results);
  const copyableCount = results.filter(result => result?.portal_url && result.status !== 'failed').length;

  if (!copyableCount) return null;

  async function copyText() {
    await navigator.clipboard.writeText(copyBackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ padding:'14px 20px', borderBottom:`1px solid ${border}`, background:darkMode?'#1C1C1F':'#F8FAFC', display:'grid', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`${TEAL}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Clipboard size={13} color={TEAL} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:12, fontWeight:850, color:textP }}>CRM/EMR에 붙여넣기</p>
          <p style={{ fontSize:10.5, color:textS, marginTop:2 }}>
            생성된 My Tiki 링크와 짧은 안내 문구를 기존 CRM/EMR 메모에 복사해 남깁니다.
          </p>
        </div>
        <button
          type="button"
          onClick={copyText}
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'7px 11px', borderRadius:9,
            border:`1px solid ${TEAL}45`, background:copied ? '#ECFFD1' : '#FFFFFF',
            color:copied ? SAGE : TEAL,
            fontSize:11, fontWeight:850, cursor:'pointer', fontFamily:SANS,
          }}
        >
          {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
          {copied ? '복사됨' : `${copyableCount}건 복사`}
        </button>
      </div>
      <textarea
        readOnly
        value={copyBackText}
        rows={Math.min(7, Math.max(3, copyableCount * 4))}
        style={{
          width:'100%', resize:'vertical',
          border:`1px solid ${border}`, borderRadius:10,
          background:darkMode?'#111113':'#FFFFFF',
          color:textP, fontSize:11, lineHeight:1.55,
          padding:'10px 12px', fontFamily:SANS,
        }}
      />
    </div>
  );
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
  const [mappingError, setMappingError] = useState('');
  const [fileName,     setFileName]     = useState('');
  const [selectedPreset, setSelectedPreset] = useState('generic');
  const [customPresets, setCustomPresets] = useState({});
  const [configMessage, setConfigMessage] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Parsed data
  const [rawHeaders,   setRawHeaders]   = useState([]);
  const [rawRows,      setRawRows]      = useState([]);
  const [colMap,       setColMap]       = useState({});
  const [validRows,    setValidRows]    = useState([]);
  const [invalidRows,  setInvalidRows]  = useState([]);
  const [duplicateRows,setDuplicateRows]= useState([]);
  const [warningRows,  setWarningRows]  = useState([]);

  // Import results
  const [results,      setResults]      = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [importError,  setImportError]  = useState('');
  const [failedRowEdits, setFailedRowEdits] = useState([]);

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
  const allPresets = { ...CRM_EXPORT_PRESETS, ...customPresets };

  useEffect(() => {
    let cancelled = false;
    async function loadCustomPresets() {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/staff/csv-import-config', { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (cancelled) return;
        const next = {};
        for (const profile of data.profiles || []) {
          next[`custom:${profile.system_name}`] = {
            label: profile.system_label || profile.system_name,
            description: '이 병원에서 저장한 CSV 컬럼 alias',
            aliases: profile.aliases || {},
            custom: true,
          };
        }
        setCustomPresets(next);
        if (data.storage_available === false) {
          setConfigMessage('병원별 alias 저장 테이블이 아직 배포되지 않았습니다. 기본 preset만 사용합니다.');
        }
      } catch (err) {
        if (!cancelled) setConfigMessage(`병원별 preset을 불러오지 못했습니다: ${err.message}`);
      }
    }
    loadCustomPresets();
    return () => { cancelled = true; };
  }, []);

  // ── File processing ────────────────────────────────────────────────────────
  function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError('.csv 파일만 지원합니다.');
      return;
    }
    setParseError('');
    setDuplicateRows([]);
    setWarningRows([]);
    setInvalidRows([]);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const { headers, rows } = parseCSVText(e.target.result);
        if (headers.length === 0) { setParseError('빈 파일이거나 형식을 인식할 수 없습니다.'); return; }
        if (rows.length === 0)    { setParseError('데이터 행이 없습니다 (헤더만 있음).'); return; }
        if (rows.length > MAX_ROWS) { setParseError(`최대 ${MAX_ROWS}행까지 가져올 수 있습니다 (현재 ${rows.length}행).`); return; }

        const map = detectColumns(headers, selectedPreset, customPresets);

        setRawHeaders(headers);
        setRawRows(rows);
        setColMap(map);
        setMappingError('');

        if (!map.name || !map.visit_date) {
          setValidRows([]);
          setInvalidRows([]);
          setDuplicateRows([]);
          setWarningRows([]);
          setPhase('mapping');
          return;
        }

        applyColumnMap(map, rows);
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

  function applyColumnMap(nextMap = colMap, sourceRows = rawRows) {
    if (!nextMap.name || !nextMap.visit_date) {
      setMappingError('이름 열과 방문일 열은 반드시 지정해야 합니다.');
      return;
    }
    const preview = buildPreviewFromColumnMap(sourceRows, nextMap);
    setColMap(nextMap);
    setValidRows(preview.importRows);
    setInvalidRows(preview.invalid);
    setDuplicateRows(preview.duplicateRows);
    setWarningRows(preview.warningRows);
    setMappingError('');
    setPhase('preview');
  }

  function applyManualMapping() {
    applyColumnMap(colMap, rawRows);
  }

  function applyPreset(presetKey) {
    setSelectedPreset(presetKey);
    if (!rawHeaders.length) return;
    const map = detectColumns(rawHeaders, presetKey, customPresets);
    setColMap(map);
    setMappingError('');
    if (!map.name || !map.visit_date) {
      setValidRows([]);
      setInvalidRows([]);
      setDuplicateRows([]);
      setWarningRows([]);
      setPhase('mapping');
      return;
    }
    applyColumnMap(map, rawRows);
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
        body:    JSON.stringify({
          filename: fileName,
          rows: validRows,
          preview_stats: {
            total: rawRows.length,
            importable: validRows.length,
            warnings: warningRows.length,
            duplicateRows: duplicateRows.length,
            invalid: invalidRows.length,
          },
        }),
        signal:  AbortSignal.timeout(120_000), // 2-minute timeout for 500 rows
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results || []);
      setSummary(data.summary || {});
      setFailedRowEdits(validRows.map((row) => ({ ...row })));
      setPhase('done');
      if (onImported) onImported((data.summary?.created || 0) + (data.summary?.visit_created || 0));
    } catch (err) {
      setImportError(err.message);
      setPhase('preview'); // allow retry
    }
  }

  function retryFailedRows() {
    const sourceRows = failedRowEdits.length ? failedRowEdits : validRows;
    const failedRows = sourceRows
      .map((row, index) => ({ ...row, _last_error: results[index]?.error_message || '' }))
      .filter((_, index) => results[index]?.status === 'failed');
    if (!failedRows.length) return;

    setValidRows(failedRows);
    setRawRows(failedRows);
    setInvalidRows([]);
    setDuplicateRows([]);
    setWarningRows(failedRows.filter(row => row._warnings?.length));
    setResults([]);
    setSummary(null);
    setImportError('실패 행만 다시 처리합니다. 오류 내용을 확인한 뒤 다시 가져오기를 눌러주세요.');
    setPhase('preview');
  }

  async function saveCurrentMappingPreset() {
    if (savingPreset) return;
    const aliases = buildCustomAliasesFromColumnMap(colMap);
    if (!aliases.name || !aliases.visit_date) {
      setConfigMessage('이름과 방문일 매핑이 있어야 병원 preset으로 저장할 수 있습니다.');
      return;
    }
    const systemLabel = window.prompt('이 매핑을 어떤 이름으로 저장할까요?', fileName ? `${fileName.replace(/\.csv$/i, '')} preset` : '우리 병원 CSV preset');
    if (!systemLabel) return;
    setSavingPreset(true);
    setConfigMessage('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/staff/csv-import-config', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          system_name: systemLabel,
          system_label: systemLabel,
          aliases,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const profile = data.profile;
      if (profile?.system_name) {
        const key = `custom:${profile.system_name}`;
        setCustomPresets((prev) => ({
          ...prev,
          [key]: {
            label: profile.system_label || profile.system_name,
            description: '이 병원에서 저장한 CSV 컬럼 alias',
            aliases: profile.aliases || aliases,
            custom: true,
          },
        }));
        setSelectedPreset(key);
      }
      setConfigMessage('현재 열 매핑을 병원별 preset으로 저장했습니다.');
    } catch (err) {
      setConfigMessage(`preset 저장 실패: ${err.message}`);
    } finally {
      setSavingPreset(false);
    }
  }

  function updateFailedRowEdit(index, field, value) {
    setFailedRowEdits((prev) => prev.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
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
            <span style={{ fontSize: 13, fontWeight: 700, color: textP }}>CRM/EMR 환자·방문 가져오기</span>
            {phase !== 'upload' && (
              <span style={{ fontSize: 11, color: textS }}>— {fileName}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Phase indicator */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['upload','mapping','preview','importing','done'].map((p, i) => (
                <div key={p} style={{
                  width: p === phase ? 16 : 6, height: 6, borderRadius: 3,
                  background: ['upload','mapping','preview','importing','done'].indexOf(phase) >= i ? TEAL : '#D1D5DB',
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
                    기존 CRM/EMR에서 내보낸 CSV 파일을 선택
                  </p>
                  <p style={{ fontSize: 11, color: textS }}>최대 {MAX_ROWS}행 · 환자/방문/외부 ID를 일괄 등록합니다</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={onFileChange} />
              <button
                type="button"
                onClick={downloadTemplateCSV}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 14px', borderRadius: 10,
                  border: `1px solid ${TEAL}45`,
                  background: darkMode ? '#1C1C1F' : '#FFFFFF',
                  color: TEAL, fontSize: 12, fontWeight: 800,
                  cursor: 'pointer', fontFamily: SANS,
                }}
              >
                <Download size={13} /> CRM/EMR 샘플 CSV
              </button>

              <div style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:`1px solid ${border}`, background: darkMode?'#1C1C1F':'#FFFFFF' }}>
                <p style={{ fontSize:11, fontWeight:800, color:textS, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  병원별 컬럼 preset
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:8 }}>
                  {Object.entries(allPresets).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      style={{
                        textAlign:'left',
                        padding:'9px 10px',
                        borderRadius:10,
                        border:`1px solid ${selectedPreset === key ? TEAL : border}`,
                        background:selectedPreset === key ? `${TEAL}12` : (darkMode?'#27272A':'#F9FAFB'),
                        color:selectedPreset === key ? TEAL : textP,
                        cursor:'pointer',
                        fontFamily:SANS,
                      }}
                    >
                      <div style={{ fontSize:11, fontWeight:850 }}>{preset.label}</div>
                      <div style={{ fontSize:9.5, color:textS, marginTop:3, lineHeight:1.35 }}>{preset.description}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize:10, color:textS, marginTop:8, lineHeight:1.5 }}>
                  Vegas / AfterDoc / 의사랑 / Dr.Palette export에서 자주 보이는 컬럼명을 우선 인식합니다. 맞지 않으면 다음 단계에서 직접 매핑하세요.
                </p>
                {configMessage && (
                  <p style={{ fontSize:10, color:configMessage.includes('실패') || configMessage.includes('못했습니다') ? '#B45309' : SAGE, marginTop:6, lineHeight:1.5 }}>
                    {configMessage}
                  </p>
                )}
              </div>

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
                <p style={{ fontSize:11, fontWeight:700, color:textS, marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>선택 열 · CRM/EMR 참조값</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['lang','시술 / procedure','전화 / phone','이메일 / email','국적 / nationality','메모 / note','외부시스템','외부 환자 ID','차트번호','외부 예약 ID','CRM/EMR 링크'].map(c => (
                    <span key={c} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:darkMode?'#2D2D31':'#F3F4F6', color:textS }}>{c}</span>
                  ))}
                </div>
                <p style={{ fontSize:10, color:textS, marginTop:10, lineHeight:1.6 }}>
                  먼저 샘플 CSV를 받아 기존 CRM/EMR export 열 이름을 맞춰보세요.
                  <br />
                  TikiPaste는 상담 1건 캡처용입니다. 기존 CRM/EMR의 환자·방문 목록은 이 CSV 가져오기에서 관리합니다.
                  <br />날짜 형식: YYYY-MM-DD · YYYY/MM/DD · MM/DD/YYYY · YYYY년 MM월 DD일 · MM월 DD일 · Excel 직렬 숫자
                </p>
              </div>
            </div>
          )}

          {/* ══ PHASE: mapping ══ */}
          {phase === 'mapping' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'18px 20px', borderBottom:`1px solid ${border}`, background:headerBg, flexShrink:0 }}>
                <p style={{ fontSize:14, fontWeight:800, color:textP, marginBottom:6 }}>열 직접 매핑</p>
                <p style={{ fontSize:11, color:textS, lineHeight:1.6 }}>
                  CRM/EMR export의 헤더명이 자동 인식되지 않았습니다. 실제 파일의 열을 TikiDoc 필드에 연결한 뒤 미리보기를 확인하세요.
                </p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                  {Object.entries(allPresets).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      style={{
                        border:`1px solid ${selectedPreset === key ? TEAL : border}`,
                        background:selectedPreset === key ? `${TEAL}12` : panelBg,
                        color:selectedPreset === key ? TEAL : textS,
                        borderRadius:999,
                        padding:'5px 9px',
                        fontSize:10.5,
                        fontWeight:800,
                        cursor:'pointer',
                        fontFamily:SANS,
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'grid', gap:14 }}>
                <div style={{ padding:'12px 14px', borderRadius:12, background:darkMode?'#1C1C1F':'#F9FAFB', border:`1px solid ${border}` }}>
                  <p style={{ fontSize:11, fontWeight:800, color:textS, marginBottom:10 }}>필수 열</p>
                  <div style={{ display:'grid', gap:10 }}>
                    {REQUIRED_FIELDS.map(field => (
                      <label key={field} style={{ display:'grid', gap:5 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:textP }}>{FIELD_LABELS[field]}</span>
                        <select
                          value={colMap[field] || ''}
                          onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                          style={{ height:38, borderRadius:10, border:`1px solid ${border}`, background:panelBg, color:textP, padding:'0 10px', fontFamily:SANS, fontSize:12 }}
                        >
                          <option value="">— 파일 열 선택</option>
                          {rawHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ padding:'12px 14px', borderRadius:12, background:darkMode?'#1C1C1F':'#FFFFFF', border:`1px solid ${border}` }}>
                  <p style={{ fontSize:11, fontWeight:800, color:textS, marginBottom:10 }}>선택 열</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10 }}>
                    {OPTIONAL_FIELDS.map(field => (
                      <label key={field} style={{ display:'grid', gap:5 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:textS }}>{FIELD_LABELS[field]}</span>
                        <select
                          value={colMap[field] || ''}
                          onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                          style={{ height:34, borderRadius:9, border:`1px solid ${border}`, background:panelBg, color:textP, padding:'0 8px', fontFamily:SANS, fontSize:11 }}
                        >
                          <option value="">— 없음</option>
                          {rawHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ padding:'12px 14px', borderRadius:12, background:darkMode?'#27272A':'#FFFBEB', border:'1px solid #FCD34D' }}>
                  <p style={{ fontSize:11, fontWeight:800, color:'#92400E', marginBottom:5 }}>가져오기 전 확인</p>
                  <p style={{ fontSize:10, color:'#92400E', lineHeight:1.6 }}>
                    이름과 방문일만 있으면 가져올 수 있습니다. 다만 전화번호, 외부 환자 ID, 차트번호 중 하나라도 있으면 기존 CRM/EMR과 나중에 대조하기 훨씬 쉽습니다.
                  </p>
                </div>
              </div>

              {mappingError && (
                <div style={{ padding:'10px 20px', background:'#FEF2F2', borderTop:`1px solid #FCA5A5`, fontSize:12, color:'#991B1B', flexShrink:0 }}>
                  ⚠ {mappingError}
                </div>
              )}

              <div style={{ padding:'14px 20px', borderTop:`1px solid ${border}`, background:headerBg, display:'flex', gap:10, justifyContent:'space-between', flexShrink:0 }}>
                <button
                  onClick={() => { setPhase('upload'); setParseError(''); setMappingError(''); }}
                  style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${border}`, background:'transparent', color:textS, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:SANS }}
                >
                  다시 선택
                </button>
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={saveCurrentMappingPreset}
                    disabled={savingPreset}
                    style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${TEAL}45`, background:'transparent', color:TEAL, fontSize:12, fontWeight:800, cursor:savingPreset?'default':'pointer', fontFamily:SANS, opacity:savingPreset?0.6:1 }}
                  >
                    {savingPreset ? '저장 중…' : '병원 preset 저장'}
                  </button>
                  <button
                    onClick={applyManualMapping}
                    style={{ padding:'8px 22px', borderRadius:9, border:'none', background:TEAL, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:SANS, boxShadow:`0 2px 8px ${TEAL}40` }}
                  >
                    매핑 적용 후 미리보기 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ PHASE: preview ══ */}
          {phase === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Column map summary */}
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, background: headerBg, flexShrink: 0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:textS, textTransform:'uppercase', letterSpacing:'0.04em' }}>감지된 열 매핑</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button
                      type="button"
                      onClick={saveCurrentMappingPreset}
                      disabled={savingPreset}
                      style={{ border:`1px solid ${TEAL}35`, background:'#FFFFFF', color:TEAL, borderRadius:999, padding:'4px 9px', fontSize:10, fontWeight:850, cursor:savingPreset?'default':'pointer', fontFamily:SANS, opacity:savingPreset?0.6:1 }}
                    >
                      {savingPreset ? '저장 중…' : '병원 preset 저장'}
                    </button>
                    <span style={{ fontSize:10, fontWeight:800, color:TEAL, background:`${TEAL}12`, padding:'3px 8px', borderRadius:999 }}>
                      {allPresets[selectedPreset]?.label || '자동 감지'}
                    </span>
                  </div>
                </div>
                {configMessage && (
                  <p style={{ fontSize:10, color:configMessage.includes('실패') || configMessage.includes('못했습니다') ? '#B45309' : SAGE, marginBottom:8, lineHeight:1.5 }}>
                    {configMessage}
                  </p>
                )}
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
                  { label:'전체', value: rawRows.length,        color: textS },
                  { label:'가져오기', value: validRows.length,  color: SAGE },
                  { label:'가져오기 전 확인', value: warningRows.length, color: warningRows.length ? '#B45309' : textS },
                  { label:'CSV 내부 중복', value: duplicateRows.length, color: duplicateRows.length ? '#92400E' : textS },
                  { label:'오류', value: invalidRows.length,    color: invalidRows.length ? '#DC2626' : textS },
                ].map(({ label, value, color }, i) => (
                  <div key={label} style={{
                    flex:1, padding:'10px 0', textAlign:'center',
                    borderRight: i < 4 ? `1px solid ${border}` : 'none',
                    background: panelBg,
                  }}>
                    <div style={{ fontSize:20, fontWeight:700, color }}>{value}</div>
                    <div style={{ fontSize:10, color:textS }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Scrollable preview area */}
              <div style={{ flex:1, overflowY:'auto' }}>
                {/* Warning rows */}
                {warningRows.length > 0 && (
                  <div style={{ padding:'12px 20px', background: darkMode?'#292524':'#FFFBEB', borderBottom:`1px solid ${border}` }}>
                    <p style={{ fontSize:11, fontWeight:800, color:'#B45309', marginBottom:8 }}>가져오기 전 확인</p>
                    {warningRows.slice(0, 8).map((row, i) => (
                      <div key={i} style={{ fontSize:11, color:'#92400E', marginBottom:4 }}>
                        행 {row._rowNum}: {row.name} · {row._warnings?.join(' / ')}
                      </div>
                    ))}
                    {warningRows.length > 8 && (
                      <p style={{ fontSize:10, color:textS, marginTop:4 }}>… 외 {warningRows.length - 8}건</p>
                    )}
                    <p style={{ fontSize:10, color:textS, marginTop:8, lineHeight:1.5 }}>
                      주의 행은 가져오기를 막지는 않습니다. 다만 기존 CRM/EMR 식별값이나 연락처가 없으면 나중에 같은 환자 매칭이 어려울 수 있습니다.
                    </p>
                  </div>
                )}

                {/* Duplicate rows */}
                {duplicateRows.length > 0 && (
                  <div style={{ padding:'12px 20px', background: darkMode?'#27272A':'#FEF3C7', borderBottom:`1px solid ${border}` }}>
                    <p style={{ fontSize:11, fontWeight:800, color:'#92400E', marginBottom:8 }}>CSV 내부 중복 · 가져오기 제외</p>
                    {duplicateRows.slice(0, 8).map((row, i) => (
                      <div key={i} style={{ fontSize:11, color:'#92400E', marginBottom:4 }}>
                        행 {row._rowNum}: {row.name} · {row.visit_date} · 첫 행 {row._duplicateOf} 기준으로 제외
                      </div>
                    ))}
                    {duplicateRows.length > 8 && (
                      <p style={{ fontSize:10, color:textS, marginTop:4 }}>… 외 {duplicateRows.length - 8}건</p>
                    )}
                  </div>
                )}

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
                        {['#','이름','방문일','시술','언어','외부참조','확인'].map(h => (
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
                          <td style={{ padding:'5px 12px', color:textS }}>
                            {row.external_source || row.external_patient_id || row.external_chart_no || '—'}
                          </td>
                          <td style={{ padding:'5px 12px', color:row._warnings?.length ? '#B45309' : textS }}>
                            {row._warnings?.length ? row._warnings.join(' / ') : '—'}
                          </td>
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
                  {validRows.length}개 행 가져오기{duplicateRows.length ? ` · 중복 ${duplicateRows.length}건 제외` : ''} →
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
                  { label:'중복 스킵',    value: summary.duplicates || 0,                         color: '#0F4C75' },
                  { label:'실패',         value: summary.failed     || 0,                         color: summary.failed ? '#EF4444' : '#6B7280' },
                  { label:'전체',         value: summary.total      || 0,                         color: TEAL },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign:'center', padding:'10px 0', borderRadius:10, background: darkMode?'#1C1C1F':'#F9FAFB' }}>
                    <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
                    <div style={{ fontSize:10, color:textS, marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>

              <CopyBackPanel
                validRows={validRows}
                results={results}
                darkMode={darkMode}
                border={border}
                textP={textP}
                textS={textS}
              />

              {(summary.failed || 0) > 0 && (
                <div style={{ padding:'14px 20px', borderBottom:`1px solid ${border}`, background:darkMode?'#1C1C1F':'#FFF7ED', display:'grid', gap:10, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div>
                      <p style={{ fontSize:12, fontWeight:900, color:'#9A3412' }}>실패 행 수정</p>
                      <p style={{ fontSize:10.5, color:'#9A3412', marginTop:2 }}>
                        이름, 방문일, 연락처처럼 막힌 값을 바로 고친 뒤 실패 행만 다시 처리할 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={retryFailedRows}
                      style={{ padding:'7px 11px', borderRadius:9, border:`1px solid ${TEAL}45`, background:'#FFFFFF', color:TEAL, fontSize:11, fontWeight:850, cursor:'pointer', fontFamily:SANS }}
                    >
                      실패 행만 다시 처리
                    </button>
                  </div>
                  <div style={{ display:'grid', gap:8, maxHeight:190, overflowY:'auto' }}>
                    {failedRowEdits.map((row, index) => {
                      const result = results[index] || {};
                      if (result.status !== 'failed') return null;
                      return (
                        <div key={`${row._rowNum || index}-${index}`} style={{ display:'grid', gridTemplateColumns:'1fr 130px 1fr 1.3fr', gap:8, alignItems:'center' }}>
                          <input
                            value={row.name || ''}
                            onChange={(e) => updateFailedRowEdit(index, 'name', e.target.value)}
                            placeholder="이름"
                            style={{ height:34, borderRadius:9, border:`1px solid ${border}`, background:'#FFFFFF', color:textP, padding:'0 9px', fontSize:11, fontFamily:SANS }}
                          />
                          <input
                            value={row.visit_date || ''}
                            onChange={(e) => updateFailedRowEdit(index, 'visit_date', e.target.value)}
                            placeholder="YYYY-MM-DD"
                            style={{ height:34, borderRadius:9, border:`1px solid ${border}`, background:'#FFFFFF', color:textP, padding:'0 9px', fontSize:11, fontFamily:SANS }}
                          />
                          <input
                            value={row.phone || row.email || row.external_patient_id || ''}
                            onChange={(e) => updateFailedRowEdit(index, 'phone', e.target.value)}
                            placeholder="연락처/외부 ID"
                            style={{ height:34, borderRadius:9, border:`1px solid ${border}`, background:'#FFFFFF', color:textP, padding:'0 9px', fontSize:11, fontFamily:SANS }}
                          />
                          <div style={{ fontSize:10.5, color:'#B45309', lineHeight:1.35 }}>
                            {result.error_message || '실패 사유 확인 필요'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results table */}
              <div style={{ flex:1, overflowY:'auto', background:tblBg }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background: darkMode?'#2D2D31':'#F3F4F6', position:'sticky', top:0 }}>
                      {['이름','방문일','시술 매칭','상태','링크','오류'].map(h => (
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
                          <td style={{ padding:'5px 12px', color:textS, fontSize:10 }}>
                            {res.procedure_match_status === 'matched'
                              ? (res.procedure_match_name || 'matched')
                              : res.procedure_match_status === 'ambiguous'
                                ? 'ambiguous'
                                : res.procedure_match_status === 'partial'
                                  ? 'partial'
                                  : row.procedure
                                    ? 'unmatched'
                                    : '—'}
                          </td>
                          <td style={{ padding:'5px 12px' }}><StatusChip status={res.status} /></td>
                          <td style={{ padding:'5px 12px' }}>
                            {res.portal_url
                              ? <a href={res.portal_url} target="_blank" rel="noreferrer" style={{ color:TEAL, fontSize:10, fontWeight:600 }}>링크 ↗</a>
                              : <span style={{ color:textS }}>—</span>
                            }
                          </td>
                          <td style={{ padding:'5px 12px', color:'#DC2626', fontSize:10 }}>{res.error_message || res.procedure_match_error || ''}</td>
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
                <div style={{ display:'flex', gap:8 }}>
                  {(summary.failed || 0) > 0 && (
                    <>
                      <button
                        onClick={() => downloadFailedRowsCSV(validRows, results)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:`1px solid #FCA5A5`, background:'#FEF2F2', color:'#991B1B', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:SANS }}
                      >
                        <Download size={13} /> 실패 행 CSV
                      </button>
                      <button
                        onClick={retryFailedRows}
                        style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${TEAL}45`, background:'#EFF6FF', color:TEAL, fontSize:12, fontWeight:850, cursor:'pointer', fontFamily:SANS }}
                      >
                        실패 행만 다시 처리
                      </button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    style={{ padding:'8px 22px', borderRadius:9, border:'none', background:TEAL, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:SANS }}
                  >
                    완료
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
