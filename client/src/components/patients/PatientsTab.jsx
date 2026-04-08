import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Upload, X, ChevronDown, ChevronLeft, ChevronRight,
  Edit3, Save, Phone, MessageSquare, Calendar, DollarSign,
  Trash2, Check, AlertCircle, FileText, RefreshCw, Download,
  Crown, Star, Award, Send, Filter, Camera, Clock, Bot,
  Users, ZoomIn, MoreHorizontal, Bookmark, Sparkles,
  MessageCircle, Activity, Image as ImageIcon, Sliders
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ReservationModal from './ReservationModal';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_PATIENTS = [
  { id:'p001',name:'田中 ゆき',nameEn:'Yuki Tanaka',flag:'🇯🇵',country:'일본',lang:'JA',gender:'F',age:28,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-05',nextBooking:'2026-04-20',status:'consulting',totalSpent:1250000,phone:'+81-90-xxxx-1234',email:'yuki.t@email.jp',note:'통증에 매우 예민함. 일본어만 가능. 항상 오전 예약 선호.',tags:['VIP','노쇼경고'],timeline:[{date:'2026-04-05',type:'chat',text:'보톡스 관련 문의',channel:'instagram',aiReply:true,needsReview:false},{date:'2026-03-10',type:'visit',text:'리쥬란 힐러 시술 완료',amount:680000,doctor:'김원장'},{date:'2026-02-15',type:'visit',text:'보톡스 이마 시술',amount:350000,doctor:'이원장'}]},
  { id:'p002',name:'佐藤 花子',nameEn:'Hanako Sato',flag:'🇯🇵',country:'일본',lang:'JA',gender:'F',age:35,channel:'instagram',procedure:'리쥬란 힐러',lastVisit:'2026-04-01',nextBooking:'2026-04-15',status:'booked',totalSpent:5200000,phone:'+81-90-xxxx-5678',email:'hanako.s@email.jp',note:'재방문 고객. SNS 후기 게시 동의. 팔로워 2만명.',tags:['인플루언서'],timeline:[{date:'2026-04-01',type:'booking',text:'4/15 리쥬란 예약 확정',channel:'instagram',aiReply:false,needsReview:false},{date:'2026-03-01',type:'visit',text:'쁘띠 필러 시술 완료',amount:950000,doctor:'김원장'}]},
  { id:'p003',name:'山田 太郎',nameEn:'Taro Yamada',flag:'🇯🇵',country:'일본',lang:'JA',gender:'M',age:42,channel:'instagram',procedure:'실리프팅',lastVisit:'2026-03-15',nextBooking:null,status:'done',totalSpent:10800000,phone:'+81-90-xxxx-9012',email:'taro.y@email.jp',note:'토요일 예약만 가능. 영어 약간 가능.',tags:[],timeline:[{date:'2026-03-15',type:'visit',text:'실리프팅 + 보톡스 패키지',amount:2800000,doctor:'박원장'}]},
  { id:'p004',name:'Sarah Johnson',nameEn:'Sarah Johnson',flag:'🇺🇸',country:'미국',lang:'EN',gender:'F',age:31,channel:'whatsapp',procedure:'히알루론산 필러',lastVisit:'2026-04-03',nextBooking:'2026-04-18',status:'booked',totalSpent:1900000,phone:'+1-310-xxx-1234',email:'sarah.j@email.com',note:'인스타 인플루언서 @sarahj (팔로워 12만). 결과 공유 동의.',tags:['인플루언서','SNS허락'],timeline:[{date:'2026-04-03',type:'booking',text:'4/18 필러 시술 예약',channel:'whatsapp',aiReply:true,needsReview:false}]},
  { id:'p005',name:'Michael Chen',nameEn:'Michael Chen',flag:'🇺🇸',country:'미국',lang:'EN',gender:'M',age:38,channel:'whatsapp',procedure:'보톡스 + 필러',lastVisit:'2026-03-28',nextBooking:null,status:'care',totalSpent:5750000,phone:'+1-213-xxx-5678',email:'michael.c@email.com',note:'USD 카드 결제 선호.',tags:[],timeline:[{date:'2026-03-28',type:'visit',text:'보톡스+필러 콤보 시술',amount:1850000,doctor:'김원장'}]},
  { id:'p006',name:'李 梅',nameEn:'Mei Li',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'F',age:29,channel:'instagram',procedure:'레이저 토닝',lastVisit:'2026-04-06',nextBooking:'2026-04-20',status:'consulting',totalSpent:450000,phone:'+86-138-xxxx-1234',email:'mei.li@email.cn',note:'위챗 문의 선호.',tags:['신규'],timeline:[{date:'2026-04-06',type:'chat',text:'레이저 토닝 가격 문의',channel:'instagram',aiReply:true,needsReview:true}]},
  { id:'p007',name:'王 芳',nameEn:'Fang Wang',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'F',age:33,channel:'instagram',procedure:'보톡스',lastVisit:'2026-03-20',nextBooking:null,status:'done',totalSpent:980000,phone:'+86-139-xxxx-5678',email:'fang.w@email.cn',note:'중국어 전담 코디 배정 필요.',tags:[],timeline:[{date:'2026-03-20',type:'visit',text:'보톡스 시술 완료',amount:350000,doctor:'이원장'}]},
  { id:'p008',name:'张 伟',nameEn:'Wei Zhang',flag:'🇨🇳',country:'중국',lang:'ZH',gender:'M',age:45,channel:'kakaotalk',procedure:'써마지 FLX',lastVisit:'2026-04-02',nextBooking:'2026-07-01',status:'care',totalSpent:12500000,phone:'+86-150-xxxx-9012',email:'wei.z@email.cn',note:'하이엔드 고객. 매 6개월 방문.',tags:[],timeline:[{date:'2026-04-02',type:'visit',text:'써마지 FLX 전체 시술',amount:4500000,doctor:'박원장'}]},
  { id:'p009',name:'Nguyen Thi Lan',nameEn:'Nguyen Thi Lan',flag:'🇻🇳',country:'베트남',lang:'VI',gender:'F',age:26,channel:'instagram',procedure:'리쥬란',lastVisit:'2026-04-04',nextBooking:'2026-04-18',status:'booked',totalSpent:320000,phone:'+84-9x-xxxx-1234',email:'lan.n@email.vn',note:'SNS 광고 유입. 첫 방문 할인 적용.',tags:['신규'],timeline:[{date:'2026-04-04',type:'booking',text:'리쥬란 예약 확정',channel:'instagram',aiReply:false,needsReview:false}]},
  { id:'p010',name:'Tran Minh Duc',nameEn:'Tran Minh Duc',flag:'🇻🇳',country:'베트남',lang:'VI',gender:'M',age:32,channel:'whatsapp',procedure:'탈모 치료',lastVisit:'2026-03-25',nextBooking:null,status:'care',totalSpent:1100000,phone:'+84-9x-xxxx-5678',email:'duc.t@email.vn',note:'탈모 치료 진행 중. 3개월 코스.',tags:[],timeline:[{date:'2026-03-25',type:'visit',text:'탈모 치료 2회차',amount:380000,doctor:'최원장'}]},
  { id:'p011',name:'Somchai Jaidee',nameEn:'Somchai Jaidee',flag:'🇹🇭',country:'태국',lang:'TH',gender:'M',age:39,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-01',nextBooking:'2026-07-01',status:'done',totalSpent:680000,phone:'+66-8x-xxxx-1234',email:'somchai@email.th',note:'방콕 왕복 포함 패키지 문의.',tags:[],timeline:[{date:'2026-04-01',type:'visit',text:'보톡스 사각턱 시술',amount:480000,doctor:'이원장'}]},
  { id:'p012',name:'Nattaya Srisuk',nameEn:'Nattaya Srisuk',flag:'🇹🇭',country:'태국',lang:'TH',gender:'F',age:27,channel:'instagram',procedure:'필러 + 보톡스',lastVisit:'2026-03-18',nextBooking:null,status:'consulting',totalSpent:250000,phone:'+66-8x-xxxx-5678',email:'nattaya@email.th',note:'태국어 상담 가능. AI 번역 활용.',tags:['신규'],timeline:[{date:'2026-03-18',type:'chat',text:'필러 상담 문의',channel:'instagram',aiReply:true,needsReview:false}]},
  { id:'p013',name:'Sakura Kim',nameEn:'Sakura Kim',flag:'🇰🇷',country:'한국',lang:'KO',gender:'F',age:24,channel:'kakaotalk',procedure:'스킨부스터',lastVisit:'2026-04-07',nextBooking:'2026-04-21',status:'booked',totalSpent:560000,phone:'010-xxxx-1234',email:'sakura.k@email.kr',note:'카카오 문의 고객. 자주 문의함.',tags:[],timeline:[{date:'2026-04-07',type:'booking',text:'스킨부스터 예약',channel:'kakaotalk',aiReply:false,needsReview:true}]},
  { id:'p014',name:'Park Jimin',nameEn:'Park Jimin',flag:'🇰🇷',country:'한국',lang:'KO',gender:'M',age:30,channel:'kakaotalk',procedure:'남성 관리 패키지',lastVisit:'2026-03-30',nextBooking:null,status:'done',totalSpent:3500000,phone:'010-xxxx-5678',email:'jimin.p@email.kr',note:'남성 패키지 맞춤 상담 필요.',tags:[],timeline:[{date:'2026-03-30',type:'visit',text:'남성 관리 패키지 시술',amount:1350000,doctor:'박원장'}]},
  { id:'p015',name:'Ahmed Al-Rashidi',nameEn:'Ahmed Al-Rashidi',flag:'🇸🇦',country:'사우디',lang:'AR',gender:'M',age:35,channel:'whatsapp',procedure:'안면 성형 상담',lastVisit:'2026-04-07',nextBooking:'2026-05-15',status:'booked',totalSpent:0,phone:'+966-5x-xxxx-1234',email:'ahmed.r@email.sa',note:'라마단 이후 방문 예약. 아랍어만 가능.',tags:['신규'],timeline:[{date:'2026-04-07',type:'chat',text:'안면 성형 초기 상담',channel:'whatsapp',aiReply:true,needsReview:true}]},
  { id:'p016',name:'Fatima Al-Amri',nameEn:'Fatima Al-Amri',flag:'🇦🇪',country:'UAE',lang:'AR',gender:'F',age:28,channel:'whatsapp',procedure:'히알루론산 필러',lastVisit:'2026-04-05',nextBooking:'2026-04-25',status:'consulting',totalSpent:1100000,phone:'+971-5x-xxxx-5678',email:'fatima.a@email.ae',note:'여성 의사 응대 요청.',tags:[],timeline:[{date:'2026-04-05',type:'chat',text:'필러 관련 문의',channel:'whatsapp',aiReply:false,needsReview:false}]},
  { id:'p017',name:'Olga Petrova',nameEn:'Olga Petrova',flag:'🇷🇺',country:'러시아',lang:'RU',gender:'F',age:34,channel:'whatsapp',procedure:'레이저 토닝',lastVisit:'2026-02-15',nextBooking:null,status:'done',totalSpent:870000,phone:'+7-9xx-xxx-1234',email:'olga.p@email.ru',note:'AI 러시아어 번역 만족도 높음.',tags:[],timeline:[{date:'2026-02-15',type:'visit',text:'레이저 토닝 3회차 완료',amount:520000,doctor:'최원장'}]},
  { id:'p018',name:'Ivan Volkov',nameEn:'Ivan Volkov',flag:'🇷🇺',country:'러시아',lang:'RU',gender:'M',age:41,channel:'whatsapp',procedure:'탈모 치료',lastVisit:'2025-12-20',nextBooking:null,status:'dormant',totalSpent:620000,phone:'+7-9xx-xxx-5678',email:'ivan.v@email.ru',note:'장기 미방문. 재유입 캠페인 대상.',tags:['휴면'],timeline:[{date:'2025-12-20',type:'visit',text:'탈모 치료 2회차',amount:380000,doctor:'최원장'}]},
  { id:'p019',name:'Sophie Dubois',nameEn:'Sophie Dubois',flag:'🇫🇷',country:'프랑스',lang:'FR',gender:'F',age:42,channel:'instagram',procedure:'보톡스',lastVisit:'2026-04-01',nextBooking:null,status:'care',totalSpent:750000,phone:'+33-6-xx-xx-1234',email:'sophie.d@email.fr',note:'파리 귀국 후 D+7 애프터케어 진행 중.',tags:[],timeline:[{date:'2026-04-01',type:'visit',text:'보톡스 이마+미간 시술',amount:480000,doctor:'이원장'}]},
  { id:'p020',name:'James Wilson',nameEn:'James Wilson',flag:'🇦🇺',country:'호주',lang:'EN',gender:'M',age:48,channel:'whatsapp',procedure:'남성 안티에이징 패키지',lastVisit:'2026-04-06',nextBooking:'2026-10-01',status:'booked',totalSpent:11200000,phone:'+61-4xx-xxx-123',email:'james.w@email.au',note:'시드니 사업가. 연 2회 방문. 최고 등급 VIP.',tags:[],timeline:[{date:'2026-04-06',type:'visit',text:'안티에이징 풀 패키지',amount:4200000,doctor:'박원장'}]},
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

// VIP Tier System
const VIP_TIERS = {
  platinum: { label:'PLATINUM', min:10000000, icon:'💎', color:'bg-indigo-100 text-indigo-700 border-indigo-200', ring:'ring-indigo-300', dot:'bg-indigo-500' },
  gold:     { label:'GOLD',     min:5000000,  icon:'👑', color:'bg-amber-100 text-amber-700 border-amber-200',   ring:'ring-amber-300',  dot:'bg-amber-500' },
  silver:   { label:'SILVER',   min:3000000,  icon:'⭐', color:'bg-slate-200 text-slate-600 border-slate-300',   ring:'ring-slate-300',  dot:'bg-slate-400' },
  bronze:   { label:'BRONZE',   min:1000000,  icon:'🥉', color:'bg-orange-100 text-orange-700 border-orange-200',ring:'ring-orange-300', dot:'bg-orange-400' },
};
function getVipTier(spent) {
  if (spent >= VIP_TIERS.platinum.min) return 'platinum';
  if (spent >= VIP_TIERS.gold.min)     return 'gold';
  if (spent >= VIP_TIERS.silver.min)   return 'silver';
  if (spent >= VIP_TIERS.bronze.min)   return 'bronze';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = n => n > 0 ? `₩${(n/10000).toFixed(0)}만` : '—';
const fmtFull = n => n > 0 ? `₩${n.toLocaleString()}` : '—';
function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7)   return `${diff}일 전`;
  if (diff < 30)  return `${Math.floor(diff/7)}주 전`;
  if (diff < 365) return `${Math.floor(diff/30)}개월 전`;
  return `${Math.floor(diff/365)}년 전`;
}
function isUnresponded(p) {
  if (!['consulting','care'].includes(p.status)) return false;
  const diffHours = (Date.now() - new Date(p.lastVisit)) / 3600000;
  return diffHours > 24;
}

// CSV utilities
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
      tags: [], timeline: [],
    };
  });
}
function exportToCSV(patients, filename = 'tikichat_patients.csv') {
  const headers = ['이름','영문명','국가','언어','성별','나이','연락처','이메일','채널','시술','상태','누적결제','최근방문','다음예약','메모'];
  const rows = patients.map(p => [
    p.name, p.nameEn, p.country, p.lang, p.gender, p.age,
    p.phone, p.email, p.channel, p.procedure, STATUS[p.status]?.label || p.status,
    p.totalSpent, p.lastVisit, p.nextBooking || '', `"${(p.note||'').replace(/"/g,'""')}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// URL param sync (no react-router dependency)
function useUrlFilters() {
  const getFromUrl = () => {
    try {
      const p = new URLSearchParams(window.location.search);
      return {
        search:    p.get('q')   || '',
        filterChannel: p.get('channel') || '전체',
        filterStatus:  p.get('status')  || '전체',
        filterVip:     p.get('vip')     || '전체',
        filterLang:    p.get('lang')    || '전체',
        filterUnresponded: p.get('unresponded') === '1',
        sortBy:    p.get('sort') || 'lastVisit',
      };
    } catch { return { search:'', filterChannel:'전체', filterStatus:'전체', filterVip:'전체', filterLang:'전체', filterUnresponded:false, sortBy:'lastVisit' }; }
  };
  const init = getFromUrl();
  const [search,    setSearch]    = useState(init.search);
  const [filterChannel, setFilterChannel] = useState(init.filterChannel);
  const [filterStatus,  setFilterStatus]  = useState(init.filterStatus);
  const [filterVip,     setFilterVip]     = useState(init.filterVip);
  const [filterLang,    setFilterLang]    = useState(init.filterLang);
  const [filterUnresponded, setFilterUnresponded] = useState(init.filterUnresponded);
  const [sortBy,    setSortBy]    = useState(init.sortBy);

  useEffect(() => {
    const p = new URLSearchParams();
    if (search)              p.set('q', search);
    if (filterChannel !== '전체') p.set('channel', filterChannel);
    if (filterStatus  !== '전체') p.set('status',  filterStatus);
    if (filterVip     !== '전체') p.set('vip',     filterVip);
    if (filterLang    !== '전체') p.set('lang',    filterLang);
    if (filterUnresponded)   p.set('unresponded', '1');
    if (sortBy !== 'lastVisit') p.set('sort', sortBy);
    const qs = p.toString();
    try { window.history.replaceState(null,'', qs ? `?${qs}` : window.location.pathname); } catch {}
  }, [search, filterChannel, filterStatus, filterVip, filterLang, filterUnresponded, sortBy]);

  return { search, setSearch, filterChannel, setFilterChannel, filterStatus, setFilterStatus,
           filterVip, setFilterVip, filterLang, setFilterLang,
           filterUnresponded, setFilterUnresponded, sortBy, setSortBy };
}

// Saved filter presets (localStorage)
function useSavedFilters() {
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tikichat_filter_presets') || '[]'); } catch { return []; }
  });
  const save = (name, config) => {
    const next = [...presets.filter(p => p.name !== name), { name, config, savedAt: new Date().toISOString() }];
    setPresets(next);
    try { localStorage.setItem('tikichat_filter_presets', JSON.stringify(next)); } catch {}
  };
  const remove = (name) => {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    try { localStorage.setItem('tikichat_filter_presets', JSON.stringify(next)); } catch {}
  };
  return { presets, save, remove };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Upload Modal
// ─────────────────────────────────────────────────────────────────────────────
function CSVUploadModal({ onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const handleFile = (f) => {
    setFile(f); setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        if (!parsed.length) { setError('파싱된 데이터가 없습니다.'); return; }
        setPreview(parsed.slice(0,5));
      } catch { setError('CSV 파싱 실패. 형식을 확인하세요.'); }
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
          <div><h3 className="text-sm font-semibold text-slate-800">CSV 환자 데이터 업로드</h3><p className="text-[11px] text-slate-500 mt-0.5">대량 환자 데이터를 한 번에 등록합니다</p></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={14} className="text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 flex items-center gap-3">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <div className="flex-1"><p className="text-xs font-semibold text-blue-700">CSV 템플릿 형식</p><p className="text-[10px] text-blue-500 mt-0.5">name, country, phone, procedure, channel, status, total_spent, email, note</p></div>
            <button onClick={() => {
              const csv = 'name,name_en,country,lang,gender,age,phone,email,channel,procedure,status,total_spent,note\n田中ゆき,Yuki Tanaka,일본,JA,F,28,+81-90-0000-0000,sample@email.com,instagram,보톡스,consulting,0,메모';
              const blob = new Blob([csv],{type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='tikichat_template.csv'; a.click();
            }} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700">템플릿 다운</button>
          </div>
          <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) handleFile(f);}}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file?'border-blue-400 bg-blue-50':'border-slate-300 hover:border-blue-300 hover:bg-slate-50'}`}>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e=>{if(e.target.files[0]) handleFile(e.target.files[0]);}} />
            {file ? <div className="flex flex-col items-center gap-2"><Check size={24} className="text-blue-500" /><p className="text-sm font-semibold text-blue-700">{file.name}</p><p className="text-[11px] text-blue-500">{preview.length}+ 행 미리보기</p></div>
                  : <div className="flex flex-col items-center gap-2"><Upload size={24} className="text-slate-400" /><p className="text-sm font-medium text-slate-600">CSV 파일을 드래그하거나 클릭</p><p className="text-[11px] text-slate-400">.csv, .txt 지원</p></div>}
          </div>
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3"><AlertCircle size={14} className="text-red-500" /><p className="text-xs text-red-600">{error}</p></div>}
          {preview.length > 0 && (
            <div><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">미리보기 (상위 5행)</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr>{['이름','국가','채널','시술','상태'].map(h=><th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-500">{h}</th>)}</tr></thead>
                  <tbody>{preview.map((p,i)=><tr key={i} className="border-b border-slate-100 last:border-0"><td className="px-2 py-1.5 font-medium">{p.name}</td><td className="px-2 py-1.5">{p.flag} {p.country}</td><td className="px-2 py-1.5">{p.channel}</td><td className="px-2 py-1.5">{p.procedure}</td><td className="px-2 py-1.5">{p.status}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">취소</button>
          <button onClick={handleImport} disabled={!file||!!error||importing} className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 text-white disabled:opacity-50 flex items-center gap-2">
            {importing ? <span className="animate-spin">⏳</span> : <Upload size={12} />}{importing?'가져오는 중...':'가져오기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Form Modal
// ─────────────────────────────────────────────────────────────────────────────
function PatientFormModal({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || {
    name:'', nameEn:'', country:'일본', lang:'JA', gender:'F', age:'',
    channel:'instagram', procedure:'보톡스', phone:'', email:'',
    status:'consulting', totalSpent:'', note:'', tags:[],
  });
  const [errors, setErrors] = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = '이름을 입력하세요';
    if (!form.phone.trim()) e.phone = '연락처를 입력하세요';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSave = () => {
    if (!validate()) return;
    const tier = getVipTier(parseInt(form.totalSpent)||0);
    const autoTags = [...form.tags.filter(t=>t!=='VIP')];
    if (tier === 'platinum' || tier === 'gold') autoTags.unshift('VIP');
    onSave({ ...form, id: initial?.id || `p${Date.now()}`, flag: COUNTRY_FLAGS[form.country]||'🌏', age: parseInt(form.age)||0, totalSpent: parseInt(form.totalSpent)||0, lastVisit: initial?.lastVisit||new Date().toISOString().slice(0,10), nextBooking: initial?.nextBooking||null, timeline: initial?.timeline||[{date:new Date().toISOString().slice(0,10),type:'chat',text:'환자 등록',channel:'kakaotalk',aiReply:false,needsReview:false}], tags: autoTags });
    onClose();
  };
  const Field = ({label, error, children}) => (
    <div><label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>{children}{error&&<p className="text-[10px] text-red-500 mt-1">{error}</p>}</div>
  );
  const inp = "w-full px-3 py-2.5 text-sm rounded-lg border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div><h3 className="text-sm font-semibold text-slate-800">{isEdit?'환자 정보 수정':'신규 환자 등록'}</h3><p className="text-[11px] text-slate-500 mt-0.5">{isEdit?'정보를 수정하고 저장하세요':'새 환자를 등록합니다'}</p></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100"><X size={14}/></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름 *" error={errors.name}><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="田中 ゆき" className={`${inp} ${errors.name?'border-red-300':'border-slate-200'}`}/></Field>
            <Field label="영문명"><input value={form.nameEn} onChange={e=>set('nameEn',e.target.value)} placeholder="Yuki Tanaka" className={`${inp} border-slate-200`}/></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="국가"><select value={form.country} onChange={e=>set('country',e.target.value)} className={`${inp} border-slate-200`}>{Object.keys(COUNTRY_FLAGS).map(c=><option key={c} value={c}>{COUNTRY_FLAGS[c]} {c}</option>)}</select></Field>
            <Field label="성별"><select value={form.gender} onChange={e=>set('gender',e.target.value)} className={`${inp} border-slate-200`}><option value="F">여성</option><option value="M">남성</option></select></Field>
            <Field label="나이"><input type="number" value={form.age} onChange={e=>set('age',e.target.value)} placeholder="28" className={`${inp} border-slate-200`}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="연락처 *" error={errors.phone}><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+81-90-1234-5678" className={`${inp} ${errors.phone?'border-red-300':'border-slate-200'}`}/></Field>
            <Field label="이메일"><input value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@domain.com" className={`${inp} border-slate-200`}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="유입 채널"><select value={form.channel} onChange={e=>set('channel',e.target.value)} className={`${inp} border-slate-200`}>{Object.entries(CHANNELS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></Field>
            <Field label="관심 시술"><select value={form.procedure} onChange={e=>set('procedure',e.target.value)} className={`${inp} border-slate-200`}>{PROCEDURES_LIST.map(p=><option key={p} value={p}>{p}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="상태"><select value={form.status} onChange={e=>set('status',e.target.value)} className={`${inp} border-slate-200`}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="누적 결제 (₩)"><input type="number" value={form.totalSpent} onChange={e=>set('totalSpent',e.target.value)} placeholder="0" className={`${inp} border-slate-200`}/></Field>
          </div>
          <Field label="태그">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_TAGS.map(tag=>{const active=form.tags.includes(tag); return <button key={tag} type="button" onClick={()=>set('tags',active?form.tags.filter(t=>t!==tag):[...form.tags,tag])} className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${active?TAG_COLORS[tag]:'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}>#{tag}</button>;})}
            </div>
          </Field>
          <Field label="핵심 메모"><textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={3} placeholder="통증 예민, 수면 마취 선호, 재방문 의향 등..." className={`${inp} border-slate-200 resize-none`}/></Field>
        </div>
        <div className="px-6 pb-5 flex gap-2.5 justify-end shrink-0 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">취소</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 flex items-center gap-2 shadow-lg">
            <Save size={12}/>{isEdit?'수정 저장':'등록 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Before/After Comparison Slider
// ─────────────────────────────────────────────────────────────────────────────
function BeforeAfterSlider({ beforeSrc, afterSrc, onClose }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"><X size={16}/></button>
        <div className="relative overflow-hidden rounded-2xl select-none" style={{aspectRatio:'4/3'}}>
          <img src={afterSrc}  alt="After"  className="absolute inset-0 w-full h-full object-cover"/>
          <div className="absolute inset-0 overflow-hidden" style={{width:`${pos}%`}}>
            <img src={beforeSrc} alt="Before" className="absolute inset-0 h-full object-cover" style={{width:`${10000/pos}%`,maxWidth:'none'}}/>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{left:`${pos}%`,transform:'translateX(-50%)'}}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center gap-0.5 cursor-col-resize">
              <ChevronLeft size={10} className="text-slate-600"/><ChevronRight size={10} className="text-slate-600"/>
            </div>
          </div>
          <input type="range" min={1} max={99} value={pos} onChange={e=>setPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-10"/>
          <span className="absolute top-3 left-3 text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">BEFORE</span>
          <span className="absolute top-3 right-3 text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">AFTER</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer Tab 1: Omnichannel Timeline
// ─────────────────────────────────────────────────────────────────────────────
function OmnichannelTab({ patient }) {
  const msgs = (patient.timeline || []).filter(t => ['chat','booking'].includes(t.type));
  if (!msgs.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <MessageCircle size={32} className="mb-3 opacity-30"/>
      <p className="text-sm font-medium">대화 기록이 없습니다</p>
      <p className="text-xs mt-1">채팅이 연동되면 여기에 표시됩니다</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {msgs.map((item, i) => {
        const ch = CHANNELS[item.channel] || { icon:'💬', label: item.channel, color:'text-slate-600', bg:'bg-slate-50' };
        return (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-3.5 hover:border-blue-100 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.icon} {ch.label}</span>
                {item.aiReply && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-1"><Bot size={9}/> AI 답변</span>}
                {item.needsReview && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">⚑ 확인 필요</span>}
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{relativeTime(item.date)}</span>
            </div>
            <p className="text-xs text-slate-700">{item.text}</p>
            <p className="text-[10px] text-slate-400 mt-1">{item.date}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer Tab 2: Clinical History
// ─────────────────────────────────────────────────────────────────────────────
function ClinicalTab({ patient }) {
  const [expanded, setExpanded] = useState(null);
  const visits = (patient.timeline || []).filter(t => t.type === 'visit');
  if (!visits.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Activity size={32} className="mb-3 opacity-30"/>
      <p className="text-sm font-medium">시술 이력이 없습니다</p>
    </div>
  );
  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent"/>
      <div className="space-y-3 pl-10">
        {visits.map((item, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center text-[10px] shadow-sm">✅</div>
            <button onClick={()=>setExpanded(expanded===i?null:i)} className="w-full text-left">
              <div className={`bg-white rounded-xl border transition-all ${expanded===i?'border-blue-200 shadow-md':'border-slate-100 hover:border-blue-100'} p-3.5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.amount && <span className="text-xs font-bold text-blue-700">{fmt(item.amount)}</span>}
                    <ChevronDown size={12} className={`text-slate-400 transition-transform ${expanded===i?'rotate-180':''}`}/>
                  </div>
                </div>
                {expanded===i && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2.5"><p className="text-[10px] text-blue-500">결제 금액</p><p className="text-sm font-bold text-blue-800">{item.amount ? fmtFull(item.amount) : '—'}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[10px] text-slate-500">담당 의사</p><p className="text-sm font-bold text-slate-800">{item.doctor || '미지정'}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2.5 col-span-2"><p className="text-[10px] text-slate-500">시술 메모</p><p className="text-xs text-slate-700 mt-0.5">{patient.note || '시술 상세 메모 없음'}</p></div>
                  </div>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-600 font-medium">총 시술 횟수</span>
          <span className="text-lg font-extrabold text-blue-800">{visits.length}회</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-blue-600 font-medium">누적 결제</span>
          <span className="text-sm font-bold text-blue-700">{fmtFull(patient.totalSpent)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer Tab 3: Media Gallery
// ─────────────────────────────────────────────────────────────────────────────
function MediaGalleryTab({ patient }) {
  const [comparing, setComparing] = useState(null);
  // Mock photo pairs — in production, fetch from patient_photos table
  const mockPhotos = patient.totalSpent > 500000 ? [
    { id:1, label:'보톡스 이마', date:patient.lastVisit,
      before:`https://placehold.co/400x300/e0e7ff/6366f1?text=BEFORE+1`,
      after: `https://placehold.co/400x300/dbeafe/3b82f6?text=AFTER+1` },
    { id:2, label:'필러 시술', date:patient.lastVisit,
      before:`https://placehold.co/400x300/fce7f3/ec4899?text=BEFORE+2`,
      after: `https://placehold.co/400x300/d1fae5/10b981?text=AFTER+2` },
  ] : [];

  if (!mockPhotos.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Camera size={32} className="mb-3 opacity-30"/>
      <p className="text-sm font-medium">등록된 사진이 없습니다</p>
      <p className="text-xs mt-1 text-center px-6">시술 전·후 사진을 등록하면<br/>여기에 비교 갤러리가 표시됩니다</p>
      <button className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
        <Camera size={12}/> 사진 추가
      </button>
    </div>
  );
  return (
    <div className="space-y-4">
      {mockPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-50">
            <div><p className="text-xs font-semibold text-slate-800">{photo.label}</p><p className="text-[10px] text-slate-400">{photo.date}</p></div>
            <div className="flex gap-1.5">
              <button onClick={()=>setComparing(photo)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-semibold hover:bg-blue-100"><Sliders size={10}/> 비교</button>
              <a href={photo.after} download className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-semibold hover:bg-slate-100"><Download size={10}/></a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0">
            <div className="relative"><img src={photo.before} alt="Before" className="w-full aspect-[4/3] object-cover"/><span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">BEFORE</span></div>
            <div className="relative"><img src={photo.after}  alt="After"  className="w-full aspect-[4/3] object-cover"/><span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">AFTER</span></div>
          </div>
        </div>
      ))}
      {comparing && <BeforeAfterSlider beforeSrc={comparing.before} afterSrc={comparing.after} onClose={()=>setComparing(null)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient 360° Side Drawer
// ─────────────────────────────────────────────────────────────────────────────
function PatientDrawer({ patient, onClose, onEdit, onDelete, onBooking }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('timeline');
  const [coreNote, setCoreNote] = useState(patient.note || '');
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync note when patient changes (drawer auto-switch)
  useEffect(() => { setCoreNote(patient.note || ''); setEditingNote(false); }, [patient.id]);

  // "상담 바로가기" — close drawer then navigate to chat tab with patient context
  const handleGoToChat = () => {
    onClose();
    // Small delay so the drawer close animation plays first
    setTimeout(() => {
      navigate(
        `/app?tab=chat&pid=${encodeURIComponent(patient.id)}&pname=${encodeURIComponent(patient.nameEn || patient.name)}&pflag=${encodeURIComponent(patient.flag)}`
      );
    }, 180);
  };

  const st   = STATUS[patient.status] || STATUS.consulting;
  const ch   = CHANNELS[patient.channel] || { label: patient.channel, icon:'💬', color:'text-slate-600', bg:'bg-slate-50' };
  const tier = getVipTier(patient.totalSpent);
  const vip  = tier ? VIP_TIERS[tier] : null;

  const TABS = [
    { id:'timeline', label:'대화 기록', icon: <MessageCircle size={12}/> },
    { id:'clinical', label:'진료 이력', icon: <Activity size={12}/> },
    { id:'gallery',  label:'BEFORE·AFTER', icon: <Camera size={12}/> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/25 z-30 backdrop-blur-[2px]" onClick={onClose}/>
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full z-40 flex flex-col bg-white border-l border-slate-200 shadow-2xl"
        style={{width:'clamp(360px, 65vw, 900px)', animation:'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)'}}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3.5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border-2 ${vip ? VIP_TIERS[tier].ring : 'border-slate-200'} bg-gradient-to-br from-blue-50 to-indigo-50`}>
                {patient.flag}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
                  {vip && <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider ${vip.color}`}>{vip.icon} {vip.label}</span>}
                </div>
                <p className="text-xs text-slate-500">{patient.nameEn}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{patient.country} · {patient.age}세 · {patient.gender==='F'?'여':'남'} · {patient.lang}</p>
              </div>
            </div>
            {/* Utility buttons only — action buttons moved to Fixed Action Bar */}
            <div className="flex items-center gap-1">
              <button onClick={()=>onEdit(patient)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-blue-600 text-slate-400 transition-colors" title="환자 정보 수정"><Edit3 size={13}/></button>
              <button onClick={()=>setConfirmDelete(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors" title="삭제"><Trash2 size={13}/></button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400" title="닫기"><X size={14}/></button>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.icon} {ch.label}</span>
            {patient.tags.filter(t=>t!=='VIP').map(tag=>(
              <span key={tag} className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${TAG_COLORS[tag]||'bg-slate-100 text-slate-600'}`}>#{tag}</span>
            ))}
            {isUnresponded(patient) && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">⚠ 미응대</span>}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100 text-center">
              <p className="text-[9px] text-blue-500 font-medium">누적 결제</p>
              <p className="text-sm font-extrabold text-blue-800">{fmt(patient.totalSpent)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
              <p className="text-[9px] text-slate-500 font-medium">최근 방문</p>
              <p className="text-sm font-extrabold text-slate-700">{relativeTime(patient.lastVisit)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
              <p className="text-[9px] text-slate-500 font-medium">다음 예약</p>
              <p className="text-xs font-bold text-slate-700">{patient.nextBooking||'—'}</p>
            </div>
          </div>

          {/* Core memo */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1"><Bookmark size={9}/> 핵심 메모</span>
              <button onClick={()=>{ if(editingNote){ /* TODO: save to DB */ } setEditingNote(v=>!v); }}
                className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 hover:text-amber-800">
                {editingNote?<><Check size={9}/>완료</>:<><Edit3 size={9}/>편집</>}
              </button>
            </div>
            {editingNote
              ? <textarea value={coreNote} onChange={e=>setCoreNote(e.target.value)} rows={2} className="w-full text-xs text-slate-700 bg-white border border-amber-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"/>
              : <p className="text-xs text-slate-700 leading-relaxed">{coreNote || '메모 없음 — 편집을 클릭해 추가하세요'}</p>
            }
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 bg-white">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px ${tab===t.id?'border-blue-600 text-blue-700':'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'timeline' && <OmnichannelTab patient={patient}/>}
          {tab === 'clinical' && <ClinicalTab patient={patient}/>}
          {tab === 'gallery'  && <MediaGalleryTab patient={patient}/>}
        </div>

        {/* ── Fixed Action Bar ────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 bg-white grid grid-cols-2 gap-3">
          {/* Primary: 상담 바로가기 */}
          <button onClick={handleGoToChat}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-[0.97]">
            <MessageCircle size={14}/>
            상담 바로가기
          </button>
          {/* Secondary: 예약 잡기 */}
          <button onClick={() => { onClose(); setTimeout(() => onBooking?.(patient), 180); }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-[0.97]">
            <Calendar size={14}/>
            예약 잡기
          </button>
        </div>

        {/* Delete confirm overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500"/></div>
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

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton, Error, MapDbRow
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[140, 90, 80, 80, 90, 80].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 bg-slate-200 rounded-full animate-pulse" style={{width:w}}/>
          {i === 0 && <div className="h-2.5 bg-slate-100 rounded-full animate-pulse mt-1.5" style={{width:80}}/>}
        </td>
      ))}
    </tr>
  );
}
function ErrorAlert({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl max-w-md">
        <AlertCircle size={18} className="text-red-500 shrink-0"/>
        <div><p className="text-sm font-semibold text-red-700">데이터를 불러오지 못했습니다</p><p className="text-xs text-red-500 mt-0.5">{message}</p></div>
      </div>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
        <RefreshCw size={12}/> 다시 시도
      </button>
    </div>
  );
}
function mapDbRow(row) {
  return {
    id:          row.id          ?? `p-${Date.now()}`,
    name:        row.name        ?? row.name_ko ?? '',
    nameEn:      row.name_en     ?? row.name    ?? '',
    flag:        row.flag        ?? (COUNTRY_FLAGS[row.country] ?? '🌏'),
    country:     row.country     ?? '기타',
    lang:        (row.lang       ?? 'EN').toUpperCase(),
    gender:      (row.gender     ?? 'F').toUpperCase(),
    age:         row.age         ?? 0,
    channel:     row.channel     ?? 'whatsapp',
    procedure:   row.procedure   ?? row.procedure_name ?? '기타',
    lastVisit:   row.last_visit  ?? row.created_at?.slice(0,10) ?? '',
    nextBooking: row.next_booking ?? null,
    status:      row.status      ?? 'consulting',
    totalSpent:  row.total_spent ?? 0,
    phone:       row.phone       ?? '',
    email:       row.email       ?? '',
    note:        row.note        ?? row.notes ?? '',
    tags:        Array.isArray(row.tags) ? row.tags : (row.tags ? [row.tags] : []),
    timeline:    Array.isArray(row.timeline) ? row.timeline : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Actions Bar
// ─────────────────────────────────────────────────────────────────────────────
function BulkActionsBar({ selectedIds, patients, onClear, onExport }) {
  const count = selectedIds.size;
  if (!count) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl animate-[slideUp_0.2s_ease-out]">
      <span className="text-sm font-semibold">{count}명 선택됨</span>
      <div className="w-px h-5 bg-slate-700"/>
      <button onClick={()=>{
        const selected = patients.filter(p=>selectedIds.has(p.id));
        const phones = selected.map(p=>p.phone).filter(Boolean).join(', ');
        alert(`일괄 문자 전송 대상:\n${phones}\n\n(실제 전송 기능은 메시징 백엔드와 연동 필요)`);
      }} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition-colors">
        <Send size={11}/> 일괄 문자 보내기
      </button>
      <button onClick={()=>{
        const selected = patients.filter(p=>selectedIds.has(p.id));
        exportToCSV(selected, `tikichat_selected_${Date.now()}.csv`);
      }} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold transition-colors">
        <Download size={11}/> CSV 내보내기
      </button>
      <button onClick={onClear} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
        <X size={14}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PatientsTab
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientsTab({ darkMode }) {
  const [urlParams]         = useSearchParams();
  const [patients,  setPatients]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dbError,   setDbError]   = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showCSVModal,     setShowCSVModal]     = useState(false);
  const [showRegisterModal,setShowRegisterModal]= useState(false);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilterPresets, setShowFilterPresets] = useState(false);
  const [savePresetName,    setSavePresetName]    = useState('');
  // ReservationModal state
  const [reservationPatient, setReservationPatient] = useState(null);

  const { search, setSearch, filterChannel, setFilterChannel, filterStatus, setFilterStatus,
          filterVip, setFilterVip, filterLang, setFilterLang,
          filterUnresponded, setFilterUnresponded, sortBy, setSortBy } = useUrlFilters();
  const { presets, save: savePreset, remove: removePreset } = useSavedFilters();

  // ── Supabase fetch ──────────────────────────────────────────────────────────
  const fetchPatients = async () => {
    setLoading(true); setDbError(null);
    try {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data && data.length > 0 ? data.map(mapDbRow) : INITIAL_PATIENTS);
    } catch (err) {
      console.error('[Supabase] patients fetch error:', err);
      setDbError(err.message ?? '알 수 없는 오류');
      setPatients(INITIAL_PATIENTS);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchPatients(); }, []);

  // ── Auto-open drawer when returning from chat (URL: ?openPid=xxx) ──────────
  // patients.length > 0 조건으로 DB 로드 완료 후 실행 보장
  useEffect(() => {
    const openPid = urlParams.get('openPid');
    if (!openPid || patients.length === 0) return;
    const match = patients.find(p => p.id === openPid);
    if (match) {
      setSelectedPatient(match);
      // URL에서 openPid 제거 (재로드 시 중복 오픈 방지)
      // — history.replaceState로 React Router 상태를 건드리지 않고 조용히 제거
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('openPid');
        window.history.replaceState(null, '', url.toString());
      } catch { /* ignore */ }
    }
  }, [patients]); // patients가 로드될 때마다 체크 (urlParams 의존 제거로 중복 실행 방지)

  // ── Filtered & sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const langs = ['JA','EN','ZH','KO','VI','TH','AR','RU','FR'];
    return patients
      .filter(p => {
        const q = search.toLowerCase();
        const matchSearch  = !q || p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.procedure.toLowerCase().includes(q) || p.phone.includes(q) || p.note.toLowerCase().includes(q);
        const matchChannel = filterChannel === '전체' || p.channel === filterChannel;
        const matchStatus  = filterStatus  === '전체' || p.status  === filterStatus;
        const matchVip     = filterVip     === '전체' || getVipTier(p.totalSpent) === filterVip;
        const matchLang    = filterLang    === '전체' || p.lang === filterLang;
        const matchUnresp  = !filterUnresponded || isUnresponded(p);
        return matchSearch && matchChannel && matchStatus && matchVip && matchLang && matchUnresp;
      })
      .sort((a,b) => {
        if (sortBy === 'spent')     return b.totalSpent - a.totalSpent;
        if (sortBy === 'name')      return a.nameEn.localeCompare(b.nameEn);
        if (sortBy === 'unresponded') {
          return (isUnresponded(b)?1:0) - (isUnresponded(a)?1:0);
        }
        return b.lastVisit.localeCompare(a.lastVisit);
      });
  }, [patients, search, filterChannel, filterStatus, filterVip, filterLang, filterUnresponded, sortBy]);

  const totalSpent  = patients.reduce((s,p)=>s+p.totalSpent,0);
  const activeCount = patients.filter(p=>['consulting','booked','care'].includes(p.status)).length;
  const unresp      = patients.filter(isUnresponded).length;
  const platinums   = patients.filter(p=>getVipTier(p.totalSpent)==='platinum').length;

  const langs = useMemo(() => ['전체',...new Set(patients.map(p=>p.lang))], [patients]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleImportCSV = async (newPatients) => {
    setPatients(prev => [...newPatients, ...prev]);
    try {
      const rows = newPatients.map(p => ({
        name:p.name,name_en:p.nameEn,flag:p.flag,country:p.country,lang:p.lang,
        gender:p.gender,age:p.age,channel:p.channel,procedure:p.procedure,
        last_visit:p.lastVisit,next_booking:p.nextBooking,status:p.status,
        total_spent:p.totalSpent,phone:p.phone,email:p.email,note:p.note,tags:p.tags,
      }));
      await supabase.from('patients').insert(rows);
    } catch (err) { console.warn('[Supabase] CSV import error:', err.message); }
  };

  const handleSavePatient = async (data) => {
    setPatients(prev => {
      const idx = prev.findIndex(p=>p.id===data.id);
      return idx >= 0 ? prev.map(p=>p.id===data.id?data:p) : [data,...prev];
    });
    const row = { name:data.name,name_en:data.nameEn,flag:data.flag,country:data.country,lang:data.lang,gender:data.gender,age:data.age,channel:data.channel,procedure:data.procedure,last_visit:data.lastVisit||null,next_booking:data.nextBooking||null,status:data.status,total_spent:data.totalSpent||0,phone:data.phone,email:data.email,note:data.note,tags:data.tags||[] };
    try {
      if (/^[0-9a-f-]{36}$/.test(data.id)) {
        const { error } = await supabase.from('patients').update(row).eq('id',data.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from('patients').insert(row).select().single();
        if (error) throw error;
        if (ins) setPatients(prev=>prev.map(p=>p.id===data.id?mapDbRow(ins):p));
      }
    } catch (err) { console.warn('[Supabase] save error:', err.message); }
  };

  const handleDeletePatient = async (id) => {
    setPatients(prev=>prev.filter(p=>p.id!==id));
    setSelectedIds(prev=>{ const n=new Set(prev); n.delete(id); return n; });
    try {
      if (/^[0-9a-f-]{36}$/.test(id)) await supabase.from('patients').delete().eq('id',id);
    } catch (err) { console.warn('[Supabase] delete error:', err.message); }
  };

  const handleEdit = (p) => { setSelectedPatient(null); setEditingPatient(p); };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p=>p.id)));
  };

  const applyPreset = (config) => {
    setSearch(config.search||''); setFilterChannel(config.filterChannel||'전체');
    setFilterStatus(config.filterStatus||'전체'); setFilterVip(config.filterVip||'전체');
    setFilterLang(config.filterLang||'전체'); setFilterUnresponded(!!config.filterUnresponded);
    setSortBy(config.sortBy||'lastVisit'); setShowFilterPresets(false);
  };

  const activeFilterCount = [
    filterChannel!=='전체', filterStatus!=='전체', filterVip!=='전체',
    filterLang!=='전체', filterUnresponded
  ].filter(Boolean).length;

  // ── Style tokens ────────────────────────────────────────────────────────────
  const bg      = darkMode ? 'bg-zinc-950' : 'bg-[#F8F9FA]';
  const cardBg  = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const inputBg = darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200';
  const headText= darkMode ? 'text-zinc-100' : 'text-slate-900';
  const subText = darkMode ? 'text-zinc-500' : 'text-slate-400';
  const rowHover= darkMode ? 'hover:bg-zinc-800/60' : 'hover:bg-blue-50/50 hover:border-blue-50';
  const thStyle = darkMode ? 'border-zinc-800 bg-zinc-800/60 text-zinc-400' : 'border-slate-100 bg-slate-50 text-slate-500';

  return (
    <div className={`flex-1 flex flex-col ${bg} overflow-hidden`}>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className={`px-6 pt-5 pb-4 border-b ${cardBg} shrink-0`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-extrabold ${headText}`}>환자 관리</h1>
              {loading ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><RefreshCw size={9} className="animate-spin"/> DB 로딩 중</span>
              ) : dbError ? (
                <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><AlertCircle size={9}/> DB 오류</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><Check size={9}/> Supabase 연결됨</span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${subText}`}>전체 {patients.length}명 · 검색결과 {filtered.length}명</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>exportToCSV(filtered)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${darkMode?'border-zinc-700 text-zinc-300 hover:bg-zinc-800':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Download size={13}/> 내보내기
            </button>
            <button onClick={()=>setShowCSVModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${darkMode?'border-zinc-700 text-zinc-300 hover:bg-zinc-800':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Upload size={13}/> CSV 업로드
            </button>
            <button onClick={()=>setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-lg">
              <Plus size={13}/> 환자 등록
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:'전체 환자',  value:`${patients.length}명`,   icon:'👥', c:'text-slate-700',   bg:'bg-white',      border:'border-slate-100' },
            { label:'활성 환자',  value:`${activeCount}명`,        icon:'🟢', c:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-100' },
            { label:'💎 PLATINUM', value:`${platinums}명`,          icon:'💎', c:'text-indigo-700',  bg:'bg-indigo-50',  border:'border-indigo-100' },
            { label:'미응대',      value:`${unresp}명`,             icon:'⚠',  c:'text-orange-700',  bg:'bg-orange-50',  border:'border-orange-100' },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border ${s.border} shadow-sm`}>
              <div className="flex items-center gap-1.5 mb-1"><span className="text-sm">{s.icon}</span><span className="text-[10px] text-slate-500">{s.label}</span></div>
              <p className={`text-xl font-extrabold ${s.c}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Smart Filters ──────────────────────────────────────────── */}
        <div className="space-y-2">
          {/* Search + preset toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${subText}`}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름, 시술, 연락처, 메모 검색..."
                className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-300 ${inputBg}`}/>
              {search && <button onClick={()=>setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X size={11} className={subText}/></button>}
            </div>
            <button onClick={()=>setShowFilterPresets(v=>!v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${showFilterPresets||activeFilterCount>0?'border-blue-300 bg-blue-50 text-blue-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Filter size={12}/> 필터 {activeFilterCount>0&&<span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* VIP filter */}
            <div className="relative">
              <select value={filterVip} onChange={e=>setFilterVip(e.target.value)}
                className={`pl-2.5 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none font-medium ${filterVip!=='전체'?'border-amber-300 bg-amber-50 text-amber-700':''+inputBg}`}>
                <option value="전체">💎 VIP 전체</option>
                {Object.entries(VIP_TIERS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`}/>
            </div>
            {/* Language filter */}
            <div className="relative">
              <select value={filterLang} onChange={e=>setFilterLang(e.target.value)}
                className={`pl-2.5 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none appearance-none ${filterLang!=='전체'?'border-violet-300 bg-violet-50 text-violet-700':''+inputBg}`}>
                <option value="전체">🌐 언어 전체</option>
                {langs.filter(l=>l!=='전체').map(l=><option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`}/>
            </div>
            {/* Channel filter */}
            <div className="relative">
              <select value={filterChannel} onChange={e=>setFilterChannel(e.target.value)}
                className={`pl-2.5 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none appearance-none ${filterChannel!=='전체'?'border-pink-300 bg-pink-50 text-pink-700':''+inputBg}`}>
                <option value="전체">📱 채널 전체</option>
                {Object.entries(CHANNELS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`}/>
            </div>
            {/* Status filter */}
            <div className="relative">
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                className={`pl-2.5 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none appearance-none ${filterStatus!=='전체'?'border-emerald-300 bg-emerald-50 text-emerald-700':''+inputBg}`}>
                <option value="전체">🔖 상태 전체</option>
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`}/>
            </div>
            {/* Unresponded toggle */}
            <button onClick={()=>setFilterUnresponded(v=>!v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${filterUnresponded?'border-orange-300 bg-orange-50 text-orange-700':'border-slate-200 text-slate-500 hover:border-orange-200 hover:text-orange-600'}`}>
              ⚠ 미응대
            </button>
            {/* Sort */}
            <div className="relative ml-auto">
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                className={`pl-2.5 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none appearance-none ${inputBg}`}>
                <option value="lastVisit">최근 방문순</option>
                <option value="spent">결제 금액순</option>
                <option value="name">이름순</option>
                <option value="unresponded">미응대 우선</option>
              </select>
              <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`}/>
            </div>
            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <button onClick={()=>{ setFilterChannel('전체'); setFilterStatus('전체'); setFilterVip('전체'); setFilterLang('전체'); setFilterUnresponded(false); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
                <X size={10}/> 초기화
              </button>
            )}
          </div>

          {/* Saved filter presets panel */}
          {showFilterPresets && (
            <div className={`rounded-xl border p-3.5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-600">저장된 필터 세트</span>
                <div className="flex gap-2">
                  <input value={savePresetName} onChange={e=>setSavePresetName(e.target.value)} placeholder="세트 이름 입력..."
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-300 w-36"/>
                  <button onClick={()=>{ if(savePresetName.trim()){ savePreset(savePresetName.trim(), {search,filterChannel,filterStatus,filterVip,filterLang,filterUnresponded,sortBy}); setSavePresetName(''); } }}
                    disabled={!savePresetName.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40">저장</button>
                </div>
              </div>
              {presets.length === 0
                ? <p className="text-xs text-slate-400 text-center py-2">저장된 필터 세트 없음 — 위에서 세트를 저장하세요</p>
                : <div className="flex flex-wrap gap-2">
                    {presets.map(p=>(
                      <div key={p.name} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                        <button onClick={()=>applyPreset(p.config)} className="text-xs font-semibold text-slate-700 hover:text-blue-700">{p.name}</button>
                        <button onClick={()=>removePreset(p.name)} className="ml-1 text-slate-400 hover:text-red-500"><X size={9}/></button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Patient Table ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b text-[11px] font-semibold uppercase tracking-wide ${thStyle}`}>
                <th className="px-4 py-3 text-center w-10">
                  <button onClick={toggleSelectAll} className="hover:opacity-70">
                    {selectedIds.size > 0 && selectedIds.size === filtered.length
                      ? <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center"><Check size={9} className="text-white"/></div>
                      : <div className={`w-4 h-4 rounded border-2 ${selectedIds.size>0?'border-blue-400 bg-blue-50':'border-slate-300'}`}/>
                    }
                  </button>
                </th>
                <th className="px-4 py-3 text-left">환자</th>
                <th className="px-4 py-3 text-left">채널</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">시술</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">결제액</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">마지막 연락</th>
                <th className="px-4 py-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_,i)=><SkeletonRow key={i}/>)
              ) : dbError ? (
                <tr><td colSpan={8}><ErrorAlert message={dbError} onRetry={fetchPatients}/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Search size={24} className="mb-2 opacity-30"/>
                    <p className="text-sm">검색 결과가 없습니다</p>
                    <p className="text-xs mt-1">필터를 변경하거나 검색어를 다시 확인하세요</p>
                  </div>
                </td></tr>
              ) : null}

              {!loading && !dbError && filtered.map(p => {
                const st   = STATUS[p.status] || STATUS.consulting;
                const ch   = CHANNELS[p.channel] || { icon:'💬', label:p.channel, color:'text-slate-600', bg:'bg-slate-50' };
                const tier = getVipTier(p.totalSpent);
                const vip  = tier ? VIP_TIERS[tier] : null;
                const isSelected = selectedIds.has(p.id);
                const unresponded = isUnresponded(p);
                return (
                  <tr key={p.id}
                    className={`border-b transition-all cursor-pointer group ${darkMode?'border-zinc-800':'border-slate-50'} ${rowHover} ${isSelected?(darkMode?'bg-blue-950/40':'bg-blue-50/70'):''}`}
                    onClick={()=>setSelectedPatient(p)}>
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center" onClick={e=>toggleSelect(p.id,e)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected?'border-blue-600 bg-blue-600':'border-slate-300 group-hover:border-blue-400'}`}>
                        {isSelected && <Check size={9} className="text-white"/>}
                      </div>
                    </td>
                    {/* Patient */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.flag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${darkMode?'text-zinc-200':'text-slate-800'}`}>{p.name}</p>
                            {vip && <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border tracking-wide shrink-0 ${vip.color}`}>{vip.icon} {vip.label}</span>}
                            {unresponded && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 shrink-0">미응대</span>}
                          </div>
                          <p className={`text-[10px] truncate ${subText}`}>{p.nameEn} · {p.age}세</p>
                          {p.note && <p className={`text-[10px] truncate max-w-[160px] ${subText} opacity-70`}>{p.note.slice(0,28)}{p.note.length>28?'…':''}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Channel */}
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.icon} {ch.label}</span>
                    </td>
                    {/* Procedure */}
                    <td className={`px-4 py-3.5 hidden lg:table-cell text-xs ${darkMode?'text-zinc-300':'text-slate-700'}`}>{p.procedure}</td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                    </td>
                    {/* Spent */}
                    <td className={`px-4 py-3.5 text-right hidden md:table-cell text-xs font-bold ${vip?'text-blue-700':'text-slate-600'}`}>{fmt(p.totalSpent)}</td>
                    {/* Last contact */}
                    <td className={`px-4 py-3.5 hidden xl:table-cell text-[10px] ${subText}`}>
                      <div className="flex items-center gap-1"><Clock size={9}/>{relativeTime(p.lastVisit)}</div>
                    </td>
                    {/* Actions — visible on hover */}
                    <td className="px-4 py-3.5 text-center" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button title="메시지 보내기"
                          className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${darkMode?'hover:bg-zinc-700 text-zinc-500 hover:text-blue-400':'hover:bg-blue-50 text-slate-400 hover:text-blue-600'}`}>
                          <Send size={11}/>
                        </button>
                        <button onClick={()=>handleEdit(p)} title="수정"
                          className={`p-1.5 rounded-lg transition-all ${darkMode?'hover:bg-zinc-700 text-zinc-500':'hover:bg-slate-100 text-slate-400'}`}>
                          <Edit3 size={11}/>
                        </button>
                        <button onClick={()=>handleDeletePatient(p.id)} title="삭제"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && !dbError && filtered.length === 0 && patients.length > 0 && (
                <tr><td colSpan={8} className={`text-center py-12 text-xs ${subText}`}>검색 결과가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Patient Drawer ──────────────────────────────────────────────────── */}
      {selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          onClose={()=>setSelectedPatient(null)}
          onEdit={handleEdit}
          onDelete={handleDeletePatient}
          onBooking={(p) => setReservationPatient(p)}
        />
      )}

      {/* ── Bulk Actions Bar ────────────────────────────────────────────────── */}
      <BulkActionsBar
        selectedIds={selectedIds}
        patients={patients}
        onClear={()=>setSelectedIds(new Set())}
        onExport={()=>exportToCSV(patients.filter(p=>selectedIds.has(p.id)))}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCSVModal && <CSVUploadModal onClose={()=>setShowCSVModal(false)} onImport={handleImportCSV}/>}
      {(showRegisterModal||editingPatient) && (
        <PatientFormModal
          initial={editingPatient}
          onClose={()=>{ setShowRegisterModal(false); setEditingPatient(null); }}
          onSave={handleSavePatient}
        />
      )}
      {reservationPatient && (
        <ReservationModal
          patient={reservationPatient}
          onClose={()=>setReservationPatient(null)}
          onConfirm={(booking) => {
            console.log('[Reservation] confirmed:', booking);
            // TODO: save to Supabase appointments table
            setReservationPatient(null);
            // Optimistic update: set nextBooking on patient
            setPatients(prev => prev.map(p =>
              p.id === booking.patientId ? { ...p, nextBooking: booking.date, status: 'booked' } : p
            ));
          }}
        />
      )}
    </div>
  );
}
