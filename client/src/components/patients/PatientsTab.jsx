import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Plus, Upload, X, ChevronDown,
  Edit3, Save, Phone, MessageSquare,
  Calendar, DollarSign, Trash2, Check, AlertCircle, FileText,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Dummy Patient Data ─────────────────────────────────────────────────────────
const INITIAL_PATIENTS = [
  { id:'p001',name:'田中 ゆき',nameEn:'Yuki Tanaka',flag:'🇯🇵',country:'일본',lang:'JA',gender:'F',age:28,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-05',nextBooking:'2026-04-20',status:'consulting',totalSpent:1250000,phone:'+81-90-xxxx-1234',email:'yuki.t@email.jp',note:'통증에 매우 예민함. 일본어만 가능. 항상 오전 예약 선호.',tags:['VIP','노쇼경고'],timeline:[{date:'2026-04-05',type:'chat',text:'보톡스 관련 문의',icon:'💬'},{date:'2026-03-10',type:'visit',text:'리쥬란 힐러 시술 완료',icon:'✅'},{date:'2026-02-15',type:'visit',text:'첫 방문 — 보톡스 이마 시술',icon:'🏥'}]},
  { id:'p002',name:'佐藤 花子',nameEn:'Hanako Sato',flag:'🇯🇵',country:'일본',lang:'JA',gender:'F',age:35,channel:'instagram',procedure:'리쥬란 힐러',lastVisit:'2026-04-01',nextBooking:'2026-04-15',status:'booked',totalSpent:2100000,phone:'+81-90-xxxx-5678',email:'hanako.s@email.jp',note:'재방문 고객. SNS 후기 게시 동의. 팔로워 2만명.',tags:['VIP','인플루언서'],timeline:[{date:'2026-04-01',type:'booking',text:'4/15 리쥬란 예약 확정',icon:'📅'},{date:'2026-03-01',type:'visit',text:'쁘띠 필러 시술 완료',icon:'✅'}]},
  { id:'p003',name:'山田 太郎',nameEn:'Taro Yamada',flag:'🇯🇵',country:'일본',lang:'JA',gender:'M',age:42,channel:'instagram',procedure:'실리프팅',lastVisit:'2026-03-15',nextBooking:null,status:'done',totalSpent:3800000,phone:'+81-90-xxxx-9012',email:'taro.y@email.jp',note:'토요일 예약만 가능. 영어 약간 가능.',tags:['VIP'],timeline:[{date:'2026-03-15',type:'visit',text:'실리프팅 + 보톡스 패키지 시술',icon:'✅'}]},
  { id:'p004',name:'Sarah Johnson',nameEn:'Sarah Johnson',flag:'🇺🇸',country:'미국',lang:'EN',gender:'F',age:31,channel:'whatsapp',procedure:'히알루론산 필러',lastVisit:'2026-04-03',nextBooking:'2026-04-18',status:'booked',totalSpent:1900000,phone:'+1-310-xxx-1234',email:'sarah.j@email.com',note:'인스타 인플루언서 @sarahj (팔로워 12만). 결과 공유 동의.',tags:['인플루언서','SNS허락'],timeline:[{date:'2026-04-03',type:'booking',text:'4/18 필러 시술 예약',icon:'📅'}]},
  { id:'p005',name:'Michael Chen',nameEn:'Michael Chen',flag:'🇺🇸',country:'미국',lang:'EN',gender:'M',age:38,channel:'whatsapp',procedure:'보톡스 + 필러',lastVisit:'2026-03-28',nextBooking:null,status:'care',totalSpent:2750000,phone:'+1-213-xxx-5678',email:'michael.c@email.com',note:'USD 카드 결제 선호.',tags:['VIP'],timeline:[{date:'2026-03-28',type:'visit',text:'보톡스+필러 콤보 시술',icon:'✅'}]},
  { id:'p006',name:'李 梅',nameEn:'Mei Li',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'F',age:29,channel:'instagram',procedure:'레이저 토닝',lastVisit:'2026-04-06',nextBooking:'2026-04-20',status:'consulting',totalSpent:450000,phone:'+86-138-xxxx-1234',email:'mei.li@email.cn',note:'위챗 문의 선호.',tags:['신규'],timeline:[{date:'2026-04-06',type:'chat',text:'레이저 토닝 가격 문의',icon:'💬'}]},
  { id:'p007',name:'王 芳',nameEn:'Fang Wang',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'F',age:33,channel:'instagram',procedure:'보톡스',lastVisit:'2026-03-20',nextBooking:null,status:'done',totalSpent:980000,phone:'+86-139-xxxx-5678',email:'fang.w@email.cn',note:'중국어 전담 코디 배정 필요.',tags:[],timeline:[{date:'2026-03-20',type:'visit',text:'보톡스 시술 완료',icon:'✅'}]},
  { id:'p008',name:'张 伟',nameEn:'Wei Zhang',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'M',age:45,channel:'kakaotalk',procedure:'써마지 FLX',lastVisit:'2026-04-02',nextBooking:'2026-07-01',status:'care',totalSpent:4500000,phone:'+86-150-xxxx-9012',email:'wei.z@email.cn',note:'하이엔드 고객. 매 6개월 방문.',tags:['VIP'],timeline:[{date:'2026-04-02',type:'visit',text:'써마지 FLX 전체 시술',icon:'✅'}]},
  { id:'p009',name:'Nguyen Thi Lan',nameEn:'Nguyen Thi Lan',flag:'🇻🇳',country:'베트남',lang:'VI',gender:'F',age:26,channel:'instagram',procedure:'리쥬란',lastVisit:'2026-04-04',nextBooking:'2026-04-18',status:'booked',totalSpent:320000,phone:'+84-9x-xxxx-1234',email:'lan.n@email.vn',note:'SNS 광고 유입. 첫 방문 할인 적용.',tags:['신규'],timeline:[{date:'2026-04-04',type:'booking',text:'리쥬란 예약 확정',icon:'📅'}]},
  { id:'p010',name:'Tran Minh Duc',nameEn:'Tran Minh Duc',flag:'🇻🇳',country:'베트남',lang:'VI',gender:'M',age:32,channel:'whatsapp',procedure:'탈모 치료',lastVisit:'2026-03-25',nextBooking:null,status:'care',totalSpent:1100000,phone:'+84-9x-xxxx-5678',email:'duc.t@email.vn',note:'탈모 치료 진행 중. 3개월 코스.',tags:[],timeline:[{date:'2026-03-25',type:'visit',text:'탈모 치료 2회차',icon:'✅'}]},
  { id:'p011',name:'Somchai Jaidee',nameEn:'Somchai Jaidee',flag:'🇹🇭',country:'태국',lang:'TH',gender:'M',age:39,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-01',nextBooking:'2026-07-01',status:'done',totalSpent:680000,phone:'+66-8x-xxxx-1234',email:'somchai@email.th',note:'방콕 왕복 포함 패키지 문의.',tags:[],timeline:[{date:'2026-04-01',type:'visit',text:'보톡스 사각턱 시술',icon:'✅'}]},
  { id:'p012',name:'Nattaya Srisuk',nameEn:'Nattaya Srisuk',flag:'🇹🇭',country:'태국',lang:'TH',gender:'F',age:27,channel:'instagram',procedure:'필러 + 보톡스',lastVisit:'2026-03-18',nextBooking:null,status:'consulting',totalSpent:250000,phone:'+66-8x-xxxx-5678',email:'nattaya@email.th',note:'태국어 상담 가능. AI 번역 활용.',tags:['신규'],timeline:[{date:'2026-03-18',type:'chat',text:'필러 상담 문의',icon:'💬'}]},
  { id:'p013',name:'Sakura Kim',nameEn:'Sakura Kim',flag:'🇰🇷',country:'한국',lang:'KO',gender:'F',age:24,channel:'kakaotalk',procedure:'스킨부스터',lastVisit:'2026-04-07',nextBooking:'2026-04-21',status:'booked',totalSpent:560000,phone:'010-xxxx-1234',email:'sakura.k@email.kr',note:'카카오 문의 고객. 자주 문의함.',tags:[],timeline:[{date:'2026-04-07',type:'booking',text:'스킨부스터 예약',icon:'📅'}]},
  { id:'p014',name:'Park Jimin',nameEn:'Park Jimin',flag:'🇰🇷',country:'한국',lang:'KO',gender:'M',age:30,channel:'kakaotalk',procedure:'남성 관리 패키지',lastVisit:'2026-03-30',nextBooking:null,status:'done',totalSpent:1350000,phone:'010-xxxx-5678',email:'jimin.p@email.kr',note:'남성 패키지 맞춤 상담 필요.',tags:[],timeline:[{date:'2026-03-30',type:'visit',text:'남성 관리 패키지 시술',icon:'✅'}]},
  { id:'p015',name:'Ahmed Al-Rashidi',nameEn:'Ahmed Al-Rashidi',flag:'🇸🇦',country:'사우디',lang:'AR',gender:'M',age:35,channel:'whatsapp',procedure:'안면 성형 상담',lastVisit:'2026-04-07',nextBooking:'2026-05-15',status:'booked',totalSpent:0,phone:'+966-5x-xxxx-1234',email:'ahmed.r@email.sa',note:'라마단 이후 방문 예약. 아랍어만 가능.',tags:['신규'],timeline:[{date:'2026-04-07',type:'chat',text:'안면 성형 초기 상담',icon:'💬'}]},
  { id:'p016',name:'Fatima Al-Amri',nameEn:'Fatima Al-Amri',flag:'🇦🇪',country:'UAE',lang:'AR',gender:'F',age:28,channel:'whatsapp',procedure:'히알루론산 필러',lastVisit:'2026-04-05',nextBooking:'2026-04-25',status:'consulting',totalSpent:1100000,phone:'+971-5x-xxxx-5678',email:'fatima.a@email.ae',note:'여성 의사 응대 요청.',tags:[],timeline:[{date:'2026-04-05',type:'chat',text:'필러 관련 문의',icon:'💬'}]},
  { id:'p017',name:'Olga Petrova',nameEn:'Olga Petrova',flag:'🇷🇺',country:'러시아',lang:'RU',gender:'F',age:34,channel:'whatsapp',procedure:'레이저 토닝',lastVisit:'2026-02-15',nextBooking:null,status:'done',totalSpent:870000,phone:'+7-9xx-xxx-1234',email:'olga.p@email.ru',note:'AI 러시아어 번역 만족도 높음.',tags:[],timeline:[{date:'2026-02-15',type:'visit',text:'레이저 토닝 3회차 완료',icon:'✅'}]},
  { id:'p018',name:'Ivan Volkov',nameEn:'Ivan Volkov',flag:'🇷🇺',country:'러시아',lang:'RU',gender:'M',age:41,channel:'whatsapp',procedure:'탈모 치료',lastVisit:'2025-12-20',nextBooking:null,status:'dormant',totalSpent:620000,phone:'+7-9xx-xxx-5678',email:'ivan.v@email.ru',note:'장기 미방문. 재유입 캠페인 대상.',tags:['휴면'],timeline:[{date:'2025-12-20',type:'visit',text:'탈모 치료 2회차',icon:'✅'}]},
  { id:'p019',name:'Sophie Dubois',nameEn:'Sophie Dubois',flag:'🇫🇷',country:'프랑스',lang:'FR',gender:'F',age:42,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-01',nextBooking:null,status:'care',totalSpent:750000,phone:'+33-6-xx-xx-1234',email:'sophie.d@email.fr',note:'파리 귀국 후 D+7 애프터케어 진행 중.',tags:[],timeline:[{date:'2026-04-01',type:'visit',text:'보톡스 이마+미간 시술',icon:'✅'}]},
  { id:'p020',name:'James Wilson',nameEn:'James Wilson',flag:'🇦🇺',country:'호주',lang:'EN',gender:'M',age:48,channel:'whatsapp',procedure:'남성 안티에이징 패키지',lastVisit:'2026-04-06',nextBooking:'2026-10-01',status:'booked',totalSpent:4200000,phone:'+61-4xx-xxx-123',email:'james.w@email.au',note:'시드니 사업가. 연 2회 방문. 최고 등급 VIP.',tags:['VIP'],timeline:[{date:'2026-04-06',type:'visit',text:'안티에이징 풀 패키지 시술',icon:'✅'}]},
];

const STATUS = {
  consulting: { label: '상담 중',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  booked:     { label: '예약확정', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  done:       { label: '시술완료', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  care:       { label: '케어중',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  dormant:    { label: '휴면',     color: 'bg-slate-100 text-slate-500 border-slate-200' },
};
const CHANNELS = {
  instagram: { label:'Instagram', color:'text-pink-600', bg:'bg-pink-50', icon:'📸' },
  whatsapp:  { label:'WhatsApp',  color:'text-emerald-600', bg:'bg-emerald-50', icon:'💬' },
  kakaotalk: { label:'KakaoTalk', color:'text-amber-600', bg:'bg-amber-50', icon:'💛' },
};
const TAG_COLORS = {
  'VIP':'bg-amber-100 text-amber-700 border-amber-200',
  '인플루언서':'bg-pink-100 text-pink-700 border-pink-200',
  'SNS허락':'bg-sky-100 text-sky-700 border-sky-200',
  '휴면':'bg-slate-100 text-slate-500 border-slate-200',
  '신규':'bg-violet-100 text-violet-700 border-violet-200',
  '노쇼경고':'bg-red-100 text-red-700 border-red-200',
};
const ALL_TAGS = Object.keys(TAG_COLORS);
const COUNTRY_FLAGS = {
  '일본':'🇯🇵','중국':'🇨🇳','미국':'🇺🇸','사우디':'🇸🇦','UAE':'🇦🇪',
  '태국':'🇹🇭','베트남':'🇻🇳','러시아':'🇷🇺','프랑스':'🇫🇷','호주':'🇦🇺','한국':'🇰🇷',
};
const PROCEDURES_LIST = ['보톡스','필러','리쥬란','울쎄라','써마지','레이저 토닝','스킨부스터','실리프팅','탈모 치료','기타'];

const fmt = n => n > 0 ? `₩${(n/10000).toFixed(0)}만` : '—';
const fmtFull = n => n > 0 ? `₩${n.toLocaleString()}` : '—';

// ── CSV Parser (no external lib needed) ─────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''));
  return lines.slice(1).map((line, i) => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ''; });
    return {
      id: `csv-${Date.now()}-${i}`,
      name: row['name'] || row['이름'] || '이름 없음',
      nameEn: row['name_en'] || row['영문명'] || row['name'] || '',
      flag: COUNTRY_FLAGS[row['country'] || row['국가']] || '🌏',
      country: row['country'] || row['국가'] || '기타',
      lang: (row['lang'] || row['언어'] || 'EN').toUpperCase(),
      gender: (row['gender'] || row['성별'] || 'F').toUpperCase(),
      age: parseInt(row['age'] || row['나이']) || 0,
      channel: row['channel'] || row['채널'] || 'whatsapp',
      procedure: row['procedure'] || row['시술'] || '기타',
      lastVisit: row['last_visit'] || row['최근방문'] || new Date().toISOString().slice(0,10),
      nextBooking: row['next_booking'] || row['다음예약'] || null,
      status: row['status'] || row['상태'] || 'consulting',
      totalSpent: parseInt(row['total_spent'] || row['결제금액']) || 0,
      phone: row['phone'] || row['연락처'] || '',
      email: row['email'] || row['이메일'] || '',
      note: row['note'] || row['메모'] || '',
      tags: [],
      timeline: [],
    };
  });
}

// ── CSV Upload Modal ─────────────────────────────────────────────────────────
function CSVUploadModal({ onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        if (parsed.length === 0) { setError('파싱된 데이터가 없습니다. CSV 형식을 확인하세요.'); return; }
        setPreview(parsed.slice(0, 5));
      } catch {
        setError('CSV 파일 파싱 실패. 형식을 확인하세요.');
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const all = parseCSV(e.target.result);
      setTimeout(() => { onImport(all); onClose(); setImporting(false); }, 800);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">CSV 환자 데이터 업로드</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">대량 환자 데이터를 한 번에 등록합니다</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={14} className="text-slate-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Template download */}
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-3 flex items-center gap-3">
            <FileText size={18} className="text-purple-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-700">CSV 템플릿 형식</p>
              <p className="text-[10px] text-purple-500 mt-0.5">name, country, phone, procedure, channel, status, total_spent, email, note</p>
            </div>
            <button
              onClick={() => {
                const csv = 'name,name_en,country,lang,gender,age,phone,email,channel,procedure,status,total_spent,note\n田中ゆき,Yuki Tanaka,일본,JA,F,28,+81-90-0000-0000,sample@email.com,instagram,보톡스,consulting,0,메모';
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tikichat_patient_template.csv'; a.click();
              }}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-purple-600 text-white hover:bg-purple-700"
            >템플릿 다운</button>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-300 hover:bg-slate-50'}`}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <Check size={24} className="text-purple-500" />
                <p className="text-sm font-semibold text-purple-700">{file.name}</p>
                <p className="text-[11px] text-purple-500">{preview.length > 0 ? `${preview.length}+ 행 미리보기 가능` : '파싱 중...'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-600">CSV 파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-[11px] text-slate-400">.csv, .txt 지원</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">미리보기 (상위 5행)</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['이름','국가','채널','시술','상태'].map(h=><th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((p,i)=>(
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5 font-medium">{p.name}</td>
                        <td className="px-2 py-1.5">{p.flag} {p.country}</td>
                        <td className="px-2 py-1.5">{p.channel}</td>
                        <td className="px-2 py-1.5">{p.procedure}</td>
                        <td className="px-2 py-1.5">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">취소</button>
          <button onClick={handleImport} disabled={!file || !!error || importing}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {importing ? <span className="animate-spin">⏳</span> : <Upload size={12} />}
            {importing ? '가져오는 중...' : '가져오기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Register / Edit Patient Modal ────────────────────────────────────────────
function PatientFormModal({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || {
    name:'', nameEn:'', country:'일본', lang:'JA', gender:'F', age:'',
    channel:'instagram', procedure:'보톡스', phone:'', email:'',
    status:'consulting', totalSpent:'', note:'', tags:[],
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = '이름을 입력하세요';
    if (!form.phone.trim()) e.phone = '연락처를 입력하세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const flag = COUNTRY_FLAGS[form.country] || '🌏';
    onSave({
      ...form,
      id: initial?.id || `p${Date.now()}`,
      flag,
      age: parseInt(form.age) || 0,
      totalSpent: parseInt(form.totalSpent) || 0,
      lastVisit: initial?.lastVisit || new Date().toISOString().slice(0,10),
      nextBooking: initial?.nextBooking || null,
      timeline: initial?.timeline || [{ date: new Date().toISOString().slice(0,10), type:'chat', text:'환자 등록', icon:'📋' }],
    });
    onClose();
  };

  const Field = ({ label, error, children }) => (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
  const inp = "w-full px-3 py-2.5 text-sm rounded-lg border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent";
  const errInp = "border-red-300 focus:ring-red-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{isEdit ? '환자 정보 수정' : '신규 환자 등록'}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{isEdit ? '정보를 수정하고 저장하세요' : '새 환자를 등록합니다'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={14} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름 *" error={errors.name}>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="田中 ゆき" className={`${inp} ${errors.name ? errInp : 'border-slate-200'}`} />
            </Field>
            <Field label="영문명">
              <input value={form.nameEn} onChange={e=>set('nameEn',e.target.value)} placeholder="Yuki Tanaka" className={`${inp} border-slate-200`} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="국가">
              <select value={form.country} onChange={e=>set('country',e.target.value)} className={`${inp} border-slate-200`}>
                {Object.keys(COUNTRY_FLAGS).map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]} {c}</option>)}
              </select>
            </Field>
            <Field label="성별">
              <select value={form.gender} onChange={e=>set('gender',e.target.value)} className={`${inp} border-slate-200`}>
                <option value="F">여성</option><option value="M">남성</option>
              </select>
            </Field>
            <Field label="나이">
              <input type="number" value={form.age} onChange={e=>set('age',e.target.value)} placeholder="28" className={`${inp} border-slate-200`} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="연락처 *" error={errors.phone}>
              <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+81-90-1234-5678" className={`${inp} ${errors.phone ? errInp : 'border-slate-200'}`} />
            </Field>
            <Field label="이메일">
              <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@domain.com" className={`${inp} border-slate-200`} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="유입 채널">
              <select value={form.channel} onChange={e=>set('channel',e.target.value)} className={`${inp} border-slate-200`}>
                {Object.entries(CHANNELS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </Field>
            <Field label="관심 시술">
              <select value={form.procedure} onChange={e=>set('procedure',e.target.value)} className={`${inp} border-slate-200`}>
                {PROCEDURES_LIST.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="상태">
              <select value={form.status} onChange={e=>set('status',e.target.value)} className={`${inp} border-slate-200`}>
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="누적 결제 (₩)">
              <input type="number" value={form.totalSpent} onChange={e=>set('totalSpent',e.target.value)} placeholder="0" className={`${inp} border-slate-200`} />
            </Field>
          </div>

          <Field label="태그">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_TAGS.map(tag => {
                const active = form.tags.includes(tag);
                return (
                  <button key={tag} type="button"
                    onClick={() => set('tags', active ? form.tags.filter(t=>t!==tag) : [...form.tags, tag])}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${active ? TAG_COLORS[tag] : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  >#{tag}</button>
                );
              })}
            </div>
          </Field>

          <Field label="메모">
            <textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={3} placeholder="환자 특이사항 메모..." className={`${inp} border-slate-200 resize-none`} />
          </Field>
        </div>

        <div className="px-6 pb-5 flex gap-2.5 justify-end shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">취소</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 flex items-center gap-2 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Save size={12} /> {isEdit ? '수정 저장' : '등록 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Drawer ────────────────────────────────────────────────────────────
function PatientDrawer({ patient, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('info');
  const [note, setNote] = useState(patient.note);
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!patient) return null;
  const st = STATUS[patient.status];
  const ch = CHANNELS[patient.channel] || { label: patient.channel, icon:'💬', color:'text-slate-600', bg:'bg-slate-50' };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col animate-[slideInRight_0.2s_ease-out]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 border border-purple-200 flex items-center justify-center text-xl">
                {patient.flag}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
                <p className="text-xs text-slate-500">{patient.nameEn}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{patient.country} · {patient.age}세 · {patient.gender === 'F' ? '여' : '남'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(patient)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-purple-50 hover:text-purple-600 text-slate-400 transition-colors" title="수정">
                <Edit3 size={13} />
              </button>
              <button onClick={() => setConfirmDelete(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors" title="삭제">
                <Trash2 size={13} />
              </button>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.icon} {ch.label}</span>
            {patient.tags.map(tag=>(
              <span key={tag} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TAG_COLORS[tag]||'bg-slate-100 text-slate-600'}`}>#{tag}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 shrink-0">
          {[{id:'info',label:'기본 정보'},{id:'timeline',label:'시술 이력'},{id:'note',label:'메모'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${tab===t.id?'border-purple-500 text-purple-700':'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] text-purple-500 font-medium mb-0.5">누적 결제액</p>
                  <p className="text-lg font-extrabold text-purple-700">{fmt(patient.totalSpent)}</p>
                  <p className="text-[10px] text-purple-400">{fmtFull(patient.totalSpent)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium mb-0.5">최근 시술</p>
                  <p className="text-sm font-bold text-slate-800">{patient.procedure}</p>
                  <p className="text-[10px] text-slate-400">{patient.lastVisit}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="flex items-center gap-3 px-4 py-3"><Phone size={14} className="text-slate-400 shrink-0" /><div><p className="text-[10px] text-slate-400">연락처</p><p className="text-xs font-medium">{patient.phone}</p></div></div>
                <div className="flex items-center gap-3 px-4 py-3"><MessageSquare size={14} className="text-slate-400 shrink-0" /><div><p className="text-[10px] text-slate-400">이메일</p><p className="text-xs font-medium">{patient.email || '—'}</p></div></div>
                <div className="flex items-center gap-3 px-4 py-3"><Calendar size={14} className="text-slate-400 shrink-0" /><div><p className="text-[10px] text-slate-400">다음 예약</p><p className="text-xs font-medium">{patient.nextBooking||'예약 없음'}</p></div></div>
                <div className="flex items-center gap-3 px-4 py-3"><DollarSign size={14} className="text-slate-400 shrink-0" /><div><p className="text-[10px] text-slate-400">총 결제</p><p className="text-xs font-medium">{fmtFull(patient.totalSpent)}</p></div></div>
              </div>
            </div>
          )}

          {tab === 'timeline' && (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4 pl-8">
                {patient.timeline.length === 0 && <p className="text-xs text-slate-400">이력 없음</p>}
                {patient.timeline.map((item,i)=>(
                  <div key={i} className="relative">
                    <div className="absolute -left-[22px] w-5 h-5 rounded-full bg-white border-2 border-purple-300 flex items-center justify-center text-[10px]">{item.icon}</div>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 hover:border-purple-200 transition-colors">
                      <p className="text-[10px] text-slate-400 mb-0.5">{item.date}</p>
                      <p className="text-xs font-medium text-slate-700">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'note' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">직원 메모</p>
                <button onClick={()=>setEditingNote(v=>!v)} className="flex items-center gap-1 text-[11px] text-purple-600 font-medium">
                  {editingNote?<><Save size={11}/>저장</>:<><Edit3 size={11}/>편집</>}
                </button>
              </div>
              {editingNote ? (
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={6}
                  className="w-full text-sm text-slate-700 bg-white border border-purple-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200" />
              ) : (
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-3.5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note||'메모 없음'}</p>
                </div>
              )}
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.map(tag=>(
                    <span key={tag} className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${patient.tags.includes(tag)?TAG_COLORS[tag]:'bg-slate-50 text-slate-400 border-slate-200 opacity-60'}`}>#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 shrink-0">
          <button onClick={()=>onEdit(patient)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-xs font-semibold hover:from-purple-500 hover:to-fuchsia-400 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Edit3 size={12}/> 정보 수정
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
            <Calendar size={12}/> 예약 잡기
          </button>
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-l-2xl">
            <div className="text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">환자를 삭제하시겠습니까?</h3>
              <p className="text-xs text-slate-500 mb-5">{patient.name}의 데이터가 영구 삭제됩니다.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={()=>setConfirmDelete(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">취소</button>
                <button onClick={()=>{onDelete(patient.id);onClose();}} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600">삭제 확인</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[140, 90, 80, 80, 90, 80].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className={`h-3 bg-slate-200 rounded-full animate-pulse`} style={{ width: w }} />
          {i === 0 && <div className="h-2.5 bg-slate-100 rounded-full animate-pulse mt-1.5" style={{ width: 80 }} />}
        </td>
      ))}
    </tr>
  );
}

// ── Error Alert ───────────────────────────────────────────────────────────────
function ErrorAlert({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl max-w-md">
        <AlertCircle size={18} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">데이터를 불러오지 못했습니다</p>
          <p className="text-xs text-red-500 mt-0.5">{message}</p>
        </div>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 transition-all">
        <RefreshCw size={12} /> 다시 시도
      </button>
    </div>
  );
}

// ── DB row → app 객체 변환 ────────────────────────────────────────────────────
function mapDbRow(row) {
  return {
    id:          row.id           ?? `p-${Date.now()}`,
    name:        row.name         ?? row.name_ko ?? '',
    nameEn:      row.name_en      ?? row.name    ?? '',
    flag:        row.flag         ?? (COUNTRY_FLAGS[row.country] ?? '🌏'),
    country:     row.country      ?? '기타',
    lang:        (row.lang        ?? 'EN').toUpperCase(),
    gender:      (row.gender      ?? 'F').toUpperCase(),
    age:         row.age          ?? 0,
    channel:     row.channel      ?? 'whatsapp',
    procedure:   row.procedure    ?? row.procedure_name ?? '기타',
    lastVisit:   row.last_visit   ?? row.created_at?.slice(0,10) ?? '',
    nextBooking: row.next_booking ?? null,
    status:      row.status       ?? 'consulting',
    totalSpent:  row.total_spent  ?? 0,
    phone:       row.phone        ?? '',
    email:       row.email        ?? '',
    note:        row.note         ?? row.notes ?? '',
    tags:        Array.isArray(row.tags) ? row.tags : (row.tags ? [row.tags] : []),
    timeline:    Array.isArray(row.timeline) ? row.timeline : [],
  };
}

// ── Main PatientsTab ──────────────────────────────────────────────────────────
export default function PatientsTab({ darkMode }) {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [loading,  setLoading]  = useState(true);
  const [dbError,  setDbError]  = useState(null);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('전체');
  const [filterChannel, setFilterChannel] = useState('전체');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // ── Supabase fetch ──────────────────────────────────────────────────────────
  const fetchPatients = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setPatients(data.map(mapDbRow));
      } else {
        // DB가 비어있으면 더미 데이터 유지 (개발 편의)
        setPatients(INITIAL_PATIENTS);
      }
    } catch (err) {
      console.error('[Supabase] patients fetch error:', err);
      setDbError(err.message ?? '알 수 없는 오류');
      // 에러 시에도 더미 데이터로 폴백
      setPatients(INITIAL_PATIENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = useMemo(() => patients
    .filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.procedure.toLowerCase().includes(q) || p.phone.includes(q);
      const matchCountry = filterCountry === '전체' || p.country === filterCountry;
      const matchChannel = filterChannel === '전체' || p.channel === filterChannel;
      const matchStatus  = filterStatus  === '전체' || p.status  === filterStatus;
      return matchSearch && matchCountry && matchChannel && matchStatus;
    })
    .sort((a,b) => {
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'name') return a.nameEn.localeCompare(b.nameEn);
      return b.lastVisit.localeCompare(a.lastVisit);
    }), [patients, search, filterCountry, filterChannel, filterStatus, sortBy]);

  const totalSpent = patients.reduce((s,p)=>s+p.totalSpent, 0);
  const activeCount = patients.filter(p=>['consulting','booked','care'].includes(p.status)).length;
  const newThisMonth = patients.filter(p=>p.tags.includes('신규')).length;

  const countries = ['전체', ...new Set(patients.map(p=>p.country))];
  const channels  = ['전체', ...Object.keys(CHANNELS)];
  const statuses  = ['전체', ...Object.keys(STATUS)];

  const handleImportCSV = async (newPatients) => {
    // 로컬 상태 즉시 반영
    setPatients(prev => [...newPatients, ...prev]);
    // Supabase에 bulk upsert (실패해도 로컬은 유지)
    try {
      const rows = newPatients.map(p => ({
        name: p.name, name_en: p.nameEn, flag: p.flag,
        country: p.country, lang: p.lang, gender: p.gender, age: p.age,
        channel: p.channel, procedure: p.procedure, last_visit: p.lastVisit,
        next_booking: p.nextBooking, status: p.status, total_spent: p.totalSpent,
        phone: p.phone, email: p.email, note: p.note, tags: p.tags,
      }));
      await supabase.from('patients').insert(rows);
    } catch (err) {
      console.warn('[Supabase] CSV import error (local only):', err.message);
    }
  };

  const handleSavePatient = async (data) => {
    // 로컬 즉시 반영
    setPatients(prev => {
      const idx = prev.findIndex(p=>p.id===data.id);
      if (idx >= 0) return prev.map(p=>p.id===data.id ? data : p);
      return [data, ...prev];
    });
    // Supabase upsert
    try {
      const row = {
        name: data.name, name_en: data.nameEn, flag: data.flag,
        country: data.country, lang: data.lang, gender: data.gender, age: data.age,
        channel: data.channel, procedure: data.procedure, last_visit: data.lastVisit,
        next_booking: data.nextBooking, status: data.status, total_spent: data.totalSpent,
        phone: data.phone, email: data.email, note: data.note, tags: data.tags,
      };
      // 기존 id가 UUID 형식이면 update, 아니면(더미/신규) insert
      const isUUID = /^[0-9a-f-]{36}$/.test(data.id);
      if (isUUID) {
        await supabase.from('patients').update(row).eq('id', data.id);
      } else {
        await supabase.from('patients').insert(row);
      }
    } catch (err) {
      console.warn('[Supabase] save error (local only):', err.message);
    }
  };

  const handleDeletePatient = async (id) => {
    setPatients(prev=>prev.filter(p=>p.id!==id));
    try {
      const isUUID = /^[0-9a-f-]{36}$/.test(id);
      if (isUUID) await supabase.from('patients').delete().eq('id', id);
    } catch (err) {
      console.warn('[Supabase] delete error (local only):', err.message);
    }
  };

  const handleEdit = (p) => {
    setSelectedPatient(null);
    setEditingPatient(p);
  };

  const bg = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const inputBg = darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200';
  const headText = darkMode ? 'text-zinc-100' : 'text-slate-900';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-400';

  return (
    <div className={`flex-1 flex flex-col ${bg} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 pt-5 pb-4 border-b ${cardBg} shrink-0`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-extrabold ${headText}`}>환자 관리</h1>
              {loading ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <RefreshCw size={9} className="animate-spin" /> DB 로딩 중
                </span>
              ) : dbError ? (
                <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <AlertCircle size={9} /> DB 오류 (로컬 데이터)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Check size={9} /> Supabase 연결됨
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${subText}`}>전체 {patients.length}명 등록됨</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowCSVModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold hover:border-purple-200 transition-all ${darkMode?'border-zinc-700 text-zinc-300 hover:bg-zinc-800':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Upload size={13}/> CSV 업로드
            </button>
            <button onClick={()=>setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Plus size={13}/> 환자 등록
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:'전체 환자', value:`${patients.length}명`, icon:'👥', color:'text-slate-700', bg:'bg-slate-50' },
            { label:'활성 환자', value:`${activeCount}명`, icon:'🟢', color:'text-emerald-700', bg:'bg-emerald-50' },
            { label:'신규 태그', value:`${newThisMonth}명`, icon:'✨', color:'text-purple-700', bg:'bg-purple-50' },
            { label:'누적 결제', value:`₩${(totalSpent/100000000).toFixed(1)}억`, icon:'💰', color:'text-amber-700', bg:'bg-amber-50' },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-white`}>
              <div className="flex items-center gap-1.5 mb-1"><span className="text-sm">{s.icon}</span><span className="text-[10px] text-slate-500">{s.label}</span></div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${subText}`} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름, 시술, 연락처 검색..."
              className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-300 ${inputBg}`} />
          </div>
          {[
            { val:filterCountry, set:setFilterCountry, opts:countries, label:'국가' },
            { val:filterChannel, set:setFilterChannel, opts:channels,  label:'채널' },
            { val:filterStatus,  set:setFilterStatus,  opts:statuses,  label:'상태' },
          ].map(({val,set,opts,label})=>(
            <div key={label} className="relative">
              <select value={val} onChange={e=>set(e.target.value)}
                className={`pl-2.5 pr-7 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-300 appearance-none ${inputBg}`}>
                {opts.map(o=><option key={o} value={o}>{STATUS[o]?.label||CHANNELS[o]?.label||o}</option>)}
              </select>
              <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`} />
            </div>
          ))}
          <div className="relative">
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              className={`pl-2.5 pr-7 py-2 text-xs rounded-lg border focus:outline-none appearance-none ${inputBg}`}>
              <option value="lastVisit">최근 방문순</option>
              <option value="spent">결제 금액순</option>
              <option value="name">이름순</option>
            </select>
            <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b text-[11px] font-semibold uppercase tracking-wide ${darkMode?'border-zinc-800 bg-zinc-800/50 text-zinc-400':'border-slate-100 bg-slate-50 text-slate-500'}`}>
                <th className="px-5 py-3 text-left">환자</th>
                <th className="px-4 py-3 text-left">채널</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">시술</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">결제액</th>
                <th className="px-4 py-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : dbError ? (
                <tr><td colSpan={6}><ErrorAlert message={dbError} onRetry={fetchPatients} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <p className="text-sm">검색 결과가 없습니다</p>
                  </div>
                </td></tr>
              ) : null}
              {!loading && !dbError && filtered.map(p => {
                const st = STATUS[p.status]||STATUS.consulting;
                const ch = CHANNELS[p.channel]||{icon:'💬',label:p.channel,color:'text-slate-600',bg:'bg-slate-50'};
                return (
                  <tr key={p.id}
                    className={`border-b transition-colors cursor-pointer ${darkMode?'border-zinc-800 hover:bg-zinc-800/50':'border-slate-50 hover:bg-purple-50/40 hover:border-purple-100'}`}
                    onClick={()=>setSelectedPatient(p)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.flag}</span>
                        <div>
                          <p className={`text-xs font-semibold ${darkMode?'text-zinc-200':'text-slate-800'}`}>{p.name}</p>
                          <p className={`text-[10px] ${subText}`}>{p.nameEn} · {p.age}세</p>
                        </div>
                        {p.tags.includes('VIP') && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">VIP</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.icon} {ch.label}</span>
                    </td>
                    <td className={`px-4 py-3.5 hidden lg:table-cell text-xs ${darkMode?'text-zinc-300':'text-slate-700'}`}>{p.procedure}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-right hidden md:table-cell text-xs font-semibold ${darkMode?'text-zinc-300':'text-slate-700'}`}>{fmt(p.totalSpent)}</td>
                    <td className="px-4 py-3.5 text-center" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>handleEdit(p)} className={`p-1.5 rounded-lg transition-colors mr-1 ${darkMode?'hover:bg-zinc-700 text-zinc-500':'hover:bg-slate-100 text-slate-400'}`}><Edit3 size={12}/></button>
                      <button onClick={()=>{handleDeletePatient(p.id)}} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className={`text-center py-12 text-xs ${subText}`}>검색 결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedPatient && (
        <PatientDrawer patient={selectedPatient} onClose={()=>setSelectedPatient(null)} onEdit={handleEdit} onDelete={handleDeletePatient} />
      )}

      {/* Modals */}
      {showCSVModal && <CSVUploadModal onClose={()=>setShowCSVModal(false)} onImport={handleImportCSV} />}
      {(showRegisterModal || editingPatient) && (
        <PatientFormModal
          initial={editingPatient}
          onClose={()=>{setShowRegisterModal(false);setEditingPatient(null);}}
          onSave={handleSavePatient}
        />
      )}
    </div>
  );
}
