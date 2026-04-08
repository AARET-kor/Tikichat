import { useRef, useState } from 'react';
import {
  User, Phone, Globe, Clock, Sparkles, Calendar,
  MessageSquare, Camera, FileText, CheckCircle2, AlertTriangle,
  Star, Stethoscope, ImagePlus, Edit3, Save, X, Upload, Trash2, ZoomIn
} from 'lucide-react';
import { TAG_PRESETS } from '../../data/mockData';
import ChannelBadge from './ChannelBadge';

function PatientTag({ tagKey }) {
  const tag = TAG_PRESETS[tagKey];
  if (!tag) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tag.color}`}>
      {tag.label}
    </span>
  );
}

const TIMELINE_CONFIG = {
  inquiry:   { icon: MessageSquare, color: 'text-sky-500',     bg: 'bg-sky-50',    dot: 'bg-sky-400'    },
  treatment: { icon: Sparkles,      color: 'text-violet-500',  bg: 'bg-violet-50', dot: 'bg-violet-400' },
  visit:     { icon: User,          color: 'text-emerald-500', bg: 'bg-emerald-50',dot: 'bg-emerald-400'},
  booking:   { icon: Calendar,      color: 'text-amber-500',   bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  noshow:    { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50',    dot: 'bg-red-400'    },
};

function TimelineItem({ item, isLast }) {
  const cfg = TIMELINE_CONFIG[item.type] || TIMELINE_CONFIG.inquiry;
  const Icon = cfg.icon;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center`}>
          <Icon size={11} className={cfg.color} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-[10px] text-slate-400 font-medium">{item.date}</p>
        <p className="text-xs text-slate-700 leading-snug mt-0.5">{item.desc}</p>
      </div>
    </div>
  );
}

// ── Before/After Gallery with real upload ────────────────────────────────────
function GallerySection({ gallery: initGallery }) {
  const [gallery, setGallery] = useState(initGallery);
  const [lightbox, setLightbox] = useState(null); // { url, label }
  const [uploadType, setUploadType] = useState('after'); // 'before' | 'after'
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newItem = {
      id: `g${Date.now()}`,
      type: uploadType,
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.'),
      url,
      label: `${uploadType === 'before' ? 'Before' : 'After'} ${new Date().toLocaleDateString('ko', { month: 'short', day: 'numeric' })}`,
    };
    setGallery(prev => [...prev, newItem]);
    e.target.value = '';
  };

  const handleDelete = (id) => {
    setGallery(prev => prev.filter(g => g.id !== id));
  };

  const placeholderColors = [
    'from-rose-100 to-pink-100', 'from-sky-100 to-blue-100',
    'from-violet-100 to-purple-100', 'from-amber-100 to-orange-100',
  ];

  return (
    <div>
      {/* Type selector + upload */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex bg-slate-100 rounded-lg p-0.5 flex-1">
          {['before', 'after'].map(t => (
            <button key={t} onClick={() => setUploadType(t)}
              className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${uploadType === t ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400'}`}>
              {t === 'before' ? 'BEFORE' : 'AFTER'}
            </button>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 text-[10px] font-semibold hover:bg-purple-100 transition-colors"
        >
          <Upload size={10} /> 업로드
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {gallery.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
          <Camera size={20} className="text-slate-300 mx-auto mb-1.5" />
          <p className="text-[10px] text-slate-400">사진을 업로드해 주세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {gallery.map((item, i) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-100">
              {item.url ? (
                <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${placeholderColors[i % 4]} flex flex-col items-center justify-center`}>
                  <Camera size={14} className="text-slate-400 mb-1" />
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => setLightbox(item)} className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                  <ZoomIn size={10} className="text-slate-700" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                  <Trash2 size={10} className="text-red-500" />
                </button>
              </div>
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <span className={`text-[7px] text-white font-semibold ${item.type === 'before' ? '' : ''}`}>
                  {item.type === 'before' ? '🔵 B' : '🟣 A'} {item.label?.split(' ').slice(-1)}
                </span>
              </div>
            </div>
          ))}

          {/* Upload shortcut cell */}
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 flex flex-col items-center justify-center transition-all gap-1"
          >
            <ImagePlus size={14} className="text-slate-400" />
            <span className="text-[9px] text-slate-400">추가</span>
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1 text-xs">
              <X size={14} /> 닫기
            </button>
            {lightbox.url ? (
              <img src={lightbox.url} alt={lightbox.label} className="w-full rounded-xl shadow-2xl" />
            ) : (
              <div className="aspect-square bg-slate-800 rounded-xl flex items-center justify-center">
                <Camera size={40} className="text-slate-600" />
              </div>
            )}
            <p className="text-white/60 text-xs text-center mt-2">{lightbox.label} · {lightbox.date}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AftercareBadgeSmall({ status, day }) {
  if (status === 'sent') return (
    <div className="flex flex-col items-center gap-0.5">
      <CheckCircle2 size={14} className="text-emerald-500" fill="currentColor" />
      <span className="text-[9px] text-emerald-600 font-medium">D+{day}</span>
    </div>
  );
  if (status === 'scheduled') return (
    <div className="flex flex-col items-center gap-0.5">
      <Clock size={14} className="text-amber-500" />
      <span className="text-[9px] text-amber-600 font-medium">D+{day}</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300" />
      <span className="text-[9px] text-slate-400">D+{day}</span>
    </div>
  );
}

export default function PatientContextPanel({ conv, darkMode }) {
  const { patient, channel, timeline = [], gallery = [], notes = '', aftercareSummary } = conv;
  const [noteText, setNoteText] = useState(notes);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(notes);

  const handleSaveNote = () => {
    setSavedNote(noteText);
    setIsEditingNote(false);
  };

  const panelBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const sectionBorder = darkMode ? 'border-zinc-800' : 'border-slate-100';
  const headingColor = darkMode ? 'text-zinc-500' : 'text-slate-500';
  const textColor = darkMode ? 'text-zinc-200' : 'text-slate-800';
  const subColor = darkMode ? 'text-zinc-500' : 'text-slate-500';

  return (
    <div className={`w-64 flex flex-col ${panelBg} border-l overflow-y-auto scrollbar-thin shrink-0`}>

      {/* Profile */}
      <div className={`px-4 pt-5 pb-4 border-b ${sectionBorder}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-2xl ${patient.color} flex items-center justify-center text-base font-bold`}>
              {patient.initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <ChannelBadge channel={channel} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`text-sm font-semibold leading-tight ${textColor}`}>{patient.name}</h3>
              <span className="text-base leading-none">{patient.flag}</span>
            </div>
            <p className={`text-[11px] mt-0.5 ${subColor}`}>{patient.langName}</p>
            <div className={`flex items-center gap-3 mt-1.5 text-[11px] ${subColor}`}>
              <span className="flex items-center gap-1">
                <Star size={10} className="text-amber-400" fill="currentColor" />
                방문 {patient.visitCount}회
              </span>
              {patient.phone && (
                <span className="flex items-center gap-1 truncate">
                  <Phone size={10} /> {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        {patient.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.tags.map(t => <PatientTag key={t} tagKey={t} />)}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className={`px-4 py-3 border-b ${sectionBorder}`}>
        <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${headingColor}`}>
          <Clock size={11} /> 타임라인
        </h4>
        {timeline.length === 0 ? (
          <p className={`text-xs ${subColor}`}>기록 없음</p>
        ) : (
          timeline.map((item, i) => (
            <TimelineItem key={i} item={item} isLast={i === timeline.length - 1} />
          ))
        )}
      </div>

      {/* Before/After */}
      <div className={`px-4 py-3 border-b ${sectionBorder}`}>
        <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${headingColor}`}>
          <Camera size={11} /> Before / After
        </h4>
        <GallerySection gallery={gallery} />
      </div>

      {/* Notes */}
      <div className={`px-4 py-3 border-b ${sectionBorder}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${headingColor}`}>
            <FileText size={11} /> 메모
          </h4>
          <button
            onClick={() => isEditingNote ? handleSaveNote() : setIsEditingNote(true)}
            className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-medium transition-colors"
          >
            {isEditingNote ? <><Save size={10} /> 저장</> : <><Edit3 size={10} /> 수정</>}
          </button>
        </div>
        {isEditingNote ? (
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={3}
            className={`w-full text-xs rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 leading-relaxed border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          />
        ) : (
          <p className={`text-xs leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
            {savedNote || <span className={`italic ${subColor}`}>메모 없음</span>}
          </p>
        )}
      </div>

      {/* Aftercare status */}
      {aftercareSummary && (
        <div className="px-4 py-3">
          <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${headingColor}`}>
            <Stethoscope size={11} /> 애프터케어
          </h4>
          <div className={`flex items-center justify-around rounded-xl py-2.5 px-2 ${darkMode ? 'bg-zinc-800' : 'bg-slate-50'}`}>
            <AftercareBadgeSmall status={aftercareSummary.d1} day={1} />
            <div className={`w-px h-6 ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`} />
            <AftercareBadgeSmall status={aftercareSummary.d3} day={3} />
            <div className={`w-px h-6 ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`} />
            <AftercareBadgeSmall status={aftercareSummary.d7} day={7} />
          </div>
        </div>
      )}
    </div>
  );
}
