import { useState } from 'react';
import { CheckCircle2, Clock, Circle, GripVertical, Send, Loader2, X, MessageSquare, Phone, Edit3 } from 'lucide-react';
import ChannelBadge from '../chat/ChannelBadge';

const STAGES = [
  { id: 'inquiry',    label: '신규 문의',  headerColor: 'bg-sky-500',      cardBorder: 'border-sky-100',  countBg: 'bg-sky-100 text-sky-700' },
  { id: 'consulting', label: '상담 중',    headerColor: 'bg-amber-500',    cardBorder: 'border-amber-100',countBg: 'bg-amber-100 text-amber-700' },
  { id: 'booked',     label: '예약 확정',  headerColor: 'bg-violet-500',   cardBorder: 'border-violet-100',countBg: 'bg-violet-100 text-violet-700' },
  { id: 'treated',    label: '시술 완료',  headerColor: 'bg-emerald-500',  cardBorder: 'border-emerald-100',countBg: 'bg-emerald-100 text-emerald-700' },
  { id: 'aftercare',  label: 'D+N 케어 중',headerColor: 'bg-navy-600',    cardBorder: 'border-navy-100', countBg: 'bg-navy-100 text-navy-700' },
];

function DayBadge({ status, day }) {
  if (status === 'sent') return (
    <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-600">
      <CheckCircle2 size={9} fill="currentColor" /> D+{day}
    </span>
  );
  if (status === 'scheduled') return (
    <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-600">
      <Clock size={9} /> D+{day}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-medium text-slate-400">
      <Circle size={9} /> D+{day}
    </span>
  );
}

// ── Patient Detail Modal ──────────────────────────────────────────────────────
function PatientDetailModal({ ac, onClose }) {
  const [messageD1, setMessageD1] = useState(ac.d1?.message || 'D+1 안녕하세요! 시술 후 하루가 지났네요 😊\n회복은 잘 되고 계신가요? 불편하신 점이 있으시면 편하게 알려주세요!');
  const [messageD3, setMessageD3] = useState(ac.d3?.message || 'D+3 안녕하세요! 시술 후 3일이 지났습니다.\n부기나 멍은 자연스럽게 회복 중이실 거예요 ✨\n궁금하신 점 있으시면 연락 주세요!');
  const [messageD7, setMessageD7] = useState(ac.d7?.message || 'D+7 안녕하세요! 시술 효과가 안정화될 시기입니다 🌟\n만족스러우신가요? 재방문 시 특별 혜택을 드립니다!');
  const [editingDay, setEditingDay] = useState(null);
  const [sending, setSending] = useState(null);

  const days = [
    { key: 'd1', day: 1, status: ac.d1?.status, msg: messageD1, setMsg: setMessageD1 },
    { key: 'd3', day: 3, status: ac.d3?.status, msg: messageD3, setMsg: setMessageD3 },
    { key: 'd7', day: 7, status: ac.d7?.status, msg: messageD7, setMsg: setMessageD7 },
  ];

  const handleSend = async (day) => {
    setSending(day);
    await new Promise(r => setTimeout(r, 1200));
    setSending(null);
  };

  const statusBg = (s) =>
    s === 'sent'      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    s === 'scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200 border-dashed';
  const statusIcon = (s) =>
    s === 'sent'      ? <CheckCircle2 size={11} fill="currentColor" /> :
    s === 'scheduled' ? <Clock size={11} /> :
                        <Circle size={11} />;
  const statusLabel = (s) =>
    s === 'sent' ? '발송 완료' : s === 'scheduled' ? '발송 대기' : '미설정';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-2xl ${ac.patient.color} flex items-center justify-center text-sm font-bold`}>
              {ac.patient.initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <ChannelBadge channel={ac.channel} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{ac.patient.name}</h3>
              <span className="text-base">{ac.patient.flag}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{ac.patient.langName} · {ac.procedure}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">시술일: {ac.treatmentDate}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Day messages */}
        <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto scrollbar-thin">
          {days.map(({ key, day, status, msg, setMsg }) => (
            <div key={key} className="rounded-xl border border-slate-100 overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">D+{day}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBg(status)}`}>
                    {statusIcon(status)} {statusLabel(status)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {status !== 'sent' && (
                    <button
                      onClick={() => setEditingDay(editingDay === key ? null : key)}
                      className="flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <Edit3 size={10} /> {editingDay === key ? '완료' : '수정'}
                    </button>
                  )}
                  {status === 'pending' && (
                    <button
                      onClick={() => handleSend(day)}
                      disabled={sending === day}
                      className="flex items-center gap-1 text-[10px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                    >
                      {sending === day ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} 지금 발송
                    </button>
                  )}
                </div>
              </div>
              {/* Message */}
              <div className="px-4 py-3">
                {editingDay === key ? (
                  <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
                    className="w-full text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" />
                ) : (
                  <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">{msg}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <MessageSquare size={12} /> 채팅으로 이동
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Phone size={12} /> 통화
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-500 hover:to-fuchsia-400 transition-all">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientCard({ ac, stageId, onDragStart, isDragging }) {
  const [isSending, setIsSending] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const handleSendNow = async (e) => {
    e.stopPropagation();
    setIsSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSending(false);
  };

  const nextPendingDay = ac.d1.status === 'pending' ? 1 : ac.d3.status === 'pending' ? 3 : ac.d7.status === 'pending' ? 7 : null;

  return (
    <>
    {showDetail && <PatientDetailModal ac={ac} onClose={() => setShowDetail(false)} />}
    <div
      draggable
      onDragStart={() => onDragStart(ac)}
      onClick={() => setShowDetail(true)}
      className={`
        bg-white rounded-xl border ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
        shadow-sm hover:shadow-md transition-all cursor-pointer active:cursor-grabbing
        select-none
      `}
    >
      {/* Card header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-2.5">
          <div className="relative shrink-0 mt-0.5">
            <div className={`w-8 h-8 rounded-full ${ac.patient.color} flex items-center justify-center text-xs font-semibold`}>
              {ac.patient.initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <ChannelBadge channel={ac.channel} size="sm" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-800 truncate">{ac.patient.name}</span>
              <span className="text-xs shrink-0">{ac.patient.flag}</span>
            </div>
            <span className="text-[10px] text-slate-500">{ac.patient.langName}</span>
          </div>
          <GripVertical size={12} className="text-slate-300 shrink-0 mt-1" />
        </div>
      </div>

      {/* Procedure tag */}
      <div className="px-3 pb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-navy-50 text-navy-700 text-[10px] font-medium border border-navy-100">
          {ac.procedure}
        </span>
        {ac.treatmentDate && (
          <span className="text-[9px] text-slate-400 ml-1.5">{ac.treatmentDate.slice(5)}</span>
        )}
      </div>

      {/* D+N status row */}
      {stageId === 'aftercare' && (
        <div className="px-3 pb-2.5 flex items-center gap-2.5">
          <DayBadge status={ac.d1.status} day={1} />
          <DayBadge status={ac.d3.status} day={3} />
          <DayBadge status={ac.d7.status} day={7} />
          {nextPendingDay && (
            <button
              onClick={handleSendNow}
              disabled={isSending}
              className="ml-auto flex items-center gap-1 text-[9px] font-medium text-navy-600 hover:text-navy-800 transition-colors"
            >
              {isSending ? <Loader2 size={9} className="animate-spin" /> : <Send size={9} />}
              D+{nextPendingDay} 발송
            </button>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function KanbanColumn({ stage, cards, onDragStart, onDragOver, onDrop, dragOverStage, draggingCard }) {
  const isOver = dragOverStage === stage.id;

  return (
    <div
      className="flex flex-col flex-1 min-w-0"
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id); }}
      onDrop={() => onDrop(stage.id)}
    >
      {/* Column header */}
      <div className="mb-3">
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${stage.headerColor}`}>
          <span className="text-xs font-semibold text-white">{stage.label}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white`}>
            {cards.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`
          flex-1 flex flex-col gap-2.5 p-2 rounded-xl min-h-[120px] transition-colors
          ${isOver ? 'bg-navy-50 ring-2 ring-navy-300 ring-dashed' : 'bg-slate-100/60'}
        `}
      >
        {cards.map(ac => (
          <PatientCard
            key={ac.id}
            ac={ac}
            stageId={stage.id}
            onDragStart={onDragStart}
            isDragging={draggingCard?.id === ac.id}
          />
        ))}

        {cards.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-16 text-slate-400">
            <span className="text-[11px]">환자 카드를 드래그하세요</span>
          </div>
        )}

        {isOver && (
          <div className="flex items-center justify-center h-12 border-2 border-dashed border-navy-300 rounded-xl">
            <span className="text-[11px] text-navy-500 font-medium">여기에 놓기</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ patients: initialPatients }) {
  const [patients, setPatients] = useState(initialPatients);
  const [draggingCard, setDraggingCard] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const handleDragStart = (ac) => setDraggingCard(ac);

  const handleDragOver = (stageId) => setDragOverStage(stageId);

  const handleDrop = (stageId) => {
    if (!draggingCard || draggingCard.kanbanStage === stageId) {
      setDraggingCard(null);
      setDragOverStage(null);
      return;
    }

    setPatients(prev =>
      prev.map(p => p.id === draggingCard.id
        ? { ...p, kanbanStage: stageId }
        : p
      )
    );

    setDraggingCard(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggingCard(null);
    setDragOverStage(null);
  };

  return (
    <div
      className="flex gap-3 h-full p-4 overflow-x-auto"
      onDragEnd={handleDragEnd}
    >
      {STAGES.map(stage => {
        const cards = patients.filter(p => p.kanbanStage === stage.id);
        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            cards={cards}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverStage={dragOverStage}
            draggingCard={draggingCard}
          />
        );
      })}
    </div>
  );
}
