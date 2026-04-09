import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Trash2, FileText, File, FileSpreadsheet,
  Loader2, Check, AlertCircle, Brain, X, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── 파일 유형별 아이콘·색상 ──────────────────────────────────────────────────
const FILE_CONFIG = {
  pdf:  { icon: FileText,        color: 'text-red-500',    bg: 'bg-red-50',    label: 'PDF',  darkBg: 'bg-red-900/20',  darkColor: 'text-red-400' },
  docx: { icon: File,            color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOCX', darkBg: 'bg-blue-900/20', darkColor: 'text-blue-400' },
  txt:  { icon: FileText,        color: 'text-slate-500',  bg: 'bg-slate-50',  label: 'TXT',  darkBg: 'bg-zinc-800',    darkColor: 'text-zinc-400' },
  csv:  { icon: FileSpreadsheet, color: 'text-emerald-500',bg: 'bg-emerald-50',label: 'CSV',  darkBg: 'bg-emerald-900/20', darkColor: 'text-emerald-400' },
};
const defaultFileConfig = FILE_CONFIG.txt;

function getFileConf(type) { return FILE_CONFIG[type] || defaultFileConfig; }

function formatBytes(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FileRow
// ─────────────────────────────────────────────────────────────────────────────
function FileRow({ file, darkMode, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const fc = getFileConf(file.file_type);
  const IconComp = fc.icon;

  const handleDelete = async () => {
    if (!window.confirm(`"${file.file_name}" 을(를) 삭제하시겠습니까?\n관련 청크 ${file.chunks}개가 모두 삭제됩니다.`)) return;
    setDeleting(true);
    await onDelete(file.file_name);
    setDeleting(false);
  };

  const row  = darkMode ? 'border-zinc-700 hover:bg-zinc-800/60' : 'border-slate-100 hover:bg-slate-50';
  const text = darkMode ? 'text-zinc-200' : 'text-slate-700';
  const mute = darkMode ? 'text-zinc-500' : 'text-slate-400';

  return (
    <tr className={`border-b last:border-0 transition-colors ${row}`}>
      {/* 파일 타입 + 이름 */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? fc.darkBg : fc.bg}`}>
            <IconComp size={13} className={darkMode ? fc.darkColor : fc.color} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold truncate max-w-[220px] ${text}`}>{file.file_name}</p>
            <p className={`text-[10px] ${mute}`}>{formatBytes(file.file_size)}</p>
          </div>
        </div>
      </td>

      {/* 청크 수 */}
      <td className="px-4 py-3.5 text-center">
        <span className={`text-xs font-medium ${text}`}>{file.chunks}개</span>
      </td>

      {/* 임베딩 상태 */}
      <td className="px-4 py-3.5 text-center">
        {file.embedded ? (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            darkMode ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Check size={9} /> 벡터 완료
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            darkMode ? 'bg-amber-900/20 border-amber-700/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            키워드 전용
          </span>
        )}
      </td>

      {/* 업로드 날짜 */}
      <td className={`px-4 py-3.5 text-xs ${mute}`}>{formatDate(file.created_at)}</td>

      {/* 삭제 버튼 */}
      <td className="px-4 py-3.5 text-center">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode
              ? 'text-zinc-600 hover:text-red-400 hover:bg-red-900/30'
              : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
          }`}
          title="삭제"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadItem — 진행 중인 업로드 한 줄
// ─────────────────────────────────────────────────────────────────────────────
function UploadItem({ item, darkMode }) {
  const fc = getFileConf(item.type);
  const IconComp = fc.icon;
  const text = darkMode ? 'text-zinc-300' : 'text-slate-700';
  const mute = darkMode ? 'text-zinc-500' : 'text-slate-400';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? fc.darkBg : fc.bg}`}>
        <IconComp size={13} className={darkMode ? fc.darkColor : fc.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${text}`}>{item.name}</p>
        {item.status === 'uploading' && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`flex-1 h-1 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <span className={`text-[10px] shrink-0 ${mute}`}>{item.progress}%</span>
          </div>
        )}
        {item.status === 'done' && (
          <p className="text-[10px] text-emerald-500 mt-0.5">
            ✓ {item.chunks}개 청크 저장 완료{item.embedded ? ' · 벡터 인덱싱 완료' : ' · 키워드 전용'}
          </p>
        )}
        {item.status === 'error' && (
          <p className="text-[10px] text-red-400 mt-0.5">✕ {item.error}</p>
        )}
      </div>
      {item.status === 'uploading' && <Loader2 size={14} className="shrink-0 animate-spin text-purple-500" />}
      {item.status === 'done'     && <Check size={14} className="shrink-0 text-emerald-500" />}
      {item.status === 'error'    && <AlertCircle size={14} className="shrink-0 text-red-400" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSection — main
// ─────────────────────────────────────────────────────────────────────────────
export default function KnowledgeSection({ darkMode }) {
  const { clinicId } = useAuth();

  const [files,       setFiles]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError,   setListError]   = useState(null);
  const [uploads,     setUploads]     = useState([]); // { id, name, type, status, progress, chunks, embedded, error }
  const [isDragging,  setIsDragging]  = useState(false);
  const fileInputRef = useRef(null);

  // ── 파일 목록 로드 ──────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    if (!clinicId) return;
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch(`/api/knowledge/files?clinic_id=${clinicId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // ── 파일 업로드 ────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file) => {
    const id   = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext  = file.name.toLowerCase().split('.').pop();
    const item = { id, name: file.name, type: ext, status: 'uploading', progress: 10, chunks: 0, embedded: false, error: '' };

    setUploads(prev => [item, ...prev]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('clinic_id', clinicId || '');

    // XHR로 진행률 추적
    await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 70) + 10; // 10~80%
          setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && data.ok) {
            setUploads(prev => prev.map(u =>
              u.id === id ? { ...u, status: 'done', progress: 100, chunks: data.chunks, embedded: data.embedded } : u
            ));
            fetchFiles(); // 목록 갱신
          } else {
            throw new Error(data.error || '업로드 실패');
          }
        } catch (e) {
          setUploads(prev => prev.map(u =>
            u.id === id ? { ...u, status: 'error', error: e.message } : u
          ));
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        setUploads(prev => prev.map(u =>
          u.id === id ? { ...u, status: 'error', error: '네트워크 오류' } : u
        ));
        resolve();
      });

      // 서버 처리 중 progress 애니메이션 (80→95%)
      let pseudo = 80;
      const ticker = setInterval(() => {
        if (pseudo < 95) {
          pseudo++;
          setUploads(prev => prev.map(u => u.id === id && u.status === 'uploading' ? { ...u, progress: pseudo } : u));
        } else {
          clearInterval(ticker);
        }
      }, 300);

      xhr.open('POST', '/api/knowledge/upload');
      xhr.send(formData);
    });
  }, [clinicId, fetchFiles]);

  // ── 파일 삭제 ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (fileName) => {
    try {
      const res = await fetch('/api/knowledge/files', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clinic_id: clinicId, file_name: fileName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFiles(prev => prev.filter(f => f.file_name !== fileName));
    } catch (err) {
      alert(`삭제 실패: ${err.message}`);
    }
  }, [clinicId]);

  // ── 드래그 & 드롭 ────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(f => {
      if (/\.(pdf|docx|txt|csv)$/i.test(f.name)) uploadFile(f);
    });
  }, [uploadFile]);

  const handleFileInput = (e) => {
    Array.from(e.target.files).forEach(f => uploadFile(f));
    e.target.value = '';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────────────────
  const card  = darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200';
  const text  = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const mute  = darkMode ? 'text-zinc-500' : 'text-slate-400';
  const th    = darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-50 text-slate-500';

  const doneUploads    = uploads.filter(u => u.status === 'done');
  const pendingUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'error');

  return (
    <div className="space-y-6">

      {/* ── 헤더 설명 ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${text}`}>AI 지식 베이스</h3>
            <p className={`text-xs mt-1 leading-relaxed ${mute}`}>
              PDF·DOCX·TXT·CSV 파일을 업로드하면 AI가 내용을 학습해 환자 문의에 더 정확하게 답변합니다.
              <br />
              파일은 청크로 분할되어 병원 고유 ID로 격리 저장됩니다.
            </p>
          </div>
        </div>

        {/* OpenAI 안내 */}
        <div className={`mt-4 flex items-start gap-2 px-3.5 py-2.5 rounded-xl border text-xs ${
          darkMode ? 'bg-amber-900/20 border-amber-800/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>
            <strong>OPENAI_API_KEY</strong>가 서버에 설정되어 있으면 벡터 임베딩(의미 검색)이 활성화됩니다.
            키가 없어도 키워드 검색으로 동작합니다.
          </span>
        </div>
      </div>

      {/* ── Dropzone ─────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? darkMode
              ? 'border-purple-500 bg-purple-900/20'
              : 'border-purple-400 bg-purple-50'
            : darkMode
              ? 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
              : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
          isDragging
            ? 'bg-purple-100 text-purple-600'
            : darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-400'
        }`}>
          <Upload size={22} strokeWidth={1.5} />
        </div>

        <p className={`text-sm font-semibold ${isDragging ? (darkMode ? 'text-purple-400' : 'text-purple-600') : text}`}>
          {isDragging ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭해서 업로드'}
        </p>
        <p className={`text-xs mt-1 ${mute}`}>PDF · DOCX · TXT · CSV · 최대 20MB · 여러 파일 동시 업로드 가능</p>

        {/* File type badges */}
        <div className="flex justify-center gap-2 mt-3">
          {['PDF', 'DOCX', 'TXT', 'CSV'].map(t => (
            <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── 업로드 진행 목록 ──────────────────────────────────────────── */}
      {pendingUploads.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${mute}`}>처리 중</p>
          {pendingUploads.map(u => <UploadItem key={u.id} item={u} darkMode={darkMode} />)}
        </div>
      )}

      {/* ── 완료된 업로드 (새로 추가된 것) ────────────────────────────── */}
      {doneUploads.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${mute}`}>방금 추가됨</p>
          {doneUploads.map(u => <UploadItem key={u.id} item={u} darkMode={darkMode} />)}
        </div>
      )}

      {/* ── 저장된 파일 목록 ──────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-bold ${text}`}>저장된 지식 베이스</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {files.length}개 파일
            </span>
          </div>
          <button
            onClick={fetchFiles}
            disabled={loadingList}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="새로고침"
          >
            <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 size={16} className={`animate-spin ${mute}`} />
            <span className={`text-xs ${mute}`}>불러오는 중...</span>
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-xs text-red-400">{listError}</p>
            <button onClick={fetchFiles} className="text-xs text-purple-400 hover:underline">다시 시도</button>
          </div>
        ) : files.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 gap-2 ${mute}`}>
            <Brain size={28} strokeWidth={1.2} />
            <p className="text-xs">아직 업로드된 파일이 없습니다</p>
            <p className="text-[11px]">위 영역에서 파일을 업로드하면 AI가 즉시 학습합니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-[10px] uppercase tracking-wide font-semibold border-b ${th} ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`}>
                  <th className="px-4 py-3 text-left">파일</th>
                  <th className="px-4 py-3 text-center">청크</th>
                  <th className="px-4 py-3 text-center">임베딩</th>
                  <th className="px-4 py-3 text-left">업로드 시각</th>
                  <th className="px-4 py-3 text-center">삭제</th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <FileRow
                    key={f.file_name}
                    file={f}
                    darkMode={darkMode}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 이용 안내 ─────────────────────────────────────────────────── */}
      <div className={`rounded-xl border px-5 py-4 space-y-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${mute}`}>이용 가이드</p>
        <ul className={`text-xs space-y-1.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
          <li className="flex gap-2"><span className="text-purple-500 shrink-0">•</span>시술 설명서, 원내 가이드라인, FAQ 문서를 업로드하세요</li>
          <li className="flex gap-2"><span className="text-purple-500 shrink-0">•</span>같은 파일을 재업로드하면 기존 내용을 자동으로 덮어씁니다</li>
          <li className="flex gap-2"><span className="text-purple-500 shrink-0">•</span>삭제 시 해당 파일의 모든 청크와 벡터가 함께 삭제됩니다</li>
          <li className="flex gap-2"><span className="text-purple-500 shrink-0">•</span>업로드 후 AI 상담 답변에 즉시 반영됩니다 (재시작 불필요)</li>
        </ul>
      </div>

    </div>
  );
}
