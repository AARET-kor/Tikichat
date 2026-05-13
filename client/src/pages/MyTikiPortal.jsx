/**
 * client/src/pages/MyTikiPortal.jsx
 * ─────────────────────────────────────────────────────────────
 * My Tiki — patient-facing portal (Phase 3a)
 *
 * Entry: /t/:token  (magic link from staff)
 * Auth:  token → X-Patient-Token header on every API call
 *
 * Tabs:
 *   Journey — visit stage progress + procedure + upcoming step CTA
 *   Forms   — available form templates → render fields → submit
 *
 * Phase 3a scope: Journey + Forms only.
 * Ask / Escalation / Aftercare → Phase 3b+.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2, MapPin, ChevronRight, ChevronLeft,
  FileText, Loader2, AlertTriangle, ClipboardCheck,
  Navigation, MessageCircle, Send, UserRound, ShieldAlert, Stethoscope,
} from 'lucide-react';
import { buildPatientTodayTasks } from '../lib/opsLite';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  appBg:     '#EDF1F5',
  surface:   '#FFFFFF',
  surfaceSoft: '#EDF1F5',
  warm:      '#EDF1F5',
  mocha:     '#0145F2',
  mochaDark: '#10367D',
  mochaSoft: '#BBE1FA',
  mochaPale: '#E6F0FF',
  teal:      '#0145F2',
  tealPale:  '#E6F0FF',
  tealDark:  '#10367D',
  text:      '#1B262C',
  textSub:   '#40515D',
  textMt:    '#6B7C88',
  border:    '#D6E1EA',
  borderStrong: '#BBE1FA',
  success:   '#3B6500',
  successPale: '#ECFFD1',
  warn:      '#9A4F00',
  warnPale:  '#FFF0DE',
  error:     '#B42318',
  errorPale: '#FFE6E1',
  stage: {
    done:    '#3B6500',
    current: '#0145F2',
    future:  '#BBE1FA',
  },
};

const SANS = "'Pretendard Variable', 'Inter', -apple-system, sans-serif";

const CARD_SHADOW = '0 14px 38px rgba(16, 54, 125, 0.08)';

function PatientCard({ children, tone = 'default', style = {} }) {
  const toneStyle = {
    default: { background: C.surface, borderColor: C.border },
    warm: { background: C.warm, borderColor: C.border },
    brand: { background: C.mochaPale, borderColor: C.mochaSoft },
    success: { background: C.successPale, borderColor: 'rgba(185, 250, 72, 0.9)' },
    warning: { background: C.warnPale, borderColor: 'rgba(255, 173, 92, 0.55)' },
    danger: { background: C.errorPale, borderColor: 'rgba(250, 87, 62, 0.38)' },
  }[tone] || {};

  return (
    <section
      style={{
        borderRadius: 26,
        border: `1px solid ${toneStyle.borderColor}`,
        background: toneStyle.background,
        boxShadow: tone === 'default' ? CARD_SHADOW : 'none',
        padding: 22,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function PatientButton({ children, variant = 'primary', style = {}, ...props }) {
  const base = {
    width: '100%',
    minHeight: 56,
    borderRadius: 18,
    border: '1px solid transparent',
    padding: '0 20px',
    fontSize: 16,
    fontWeight: 850,
    cursor: props.disabled ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: SANS,
  };
  const variants = {
    primary: { background: C.mocha, color: '#fff', boxShadow: '0 14px 28px rgba(1, 69, 242, 0.22)' },
    secondary: { background: C.surface, color: C.text, borderColor: C.border },
    quiet: { background: C.warm, color: C.textSub, borderColor: C.border },
    danger: { background: C.errorPale, color: C.error, borderColor: 'rgba(250, 87, 62, 0.38)' },
  };

  return (
    <button {...props} style={{ ...base, ...variants[variant], opacity: props.disabled ? 0.65 : 1, ...style }}>
      {children}
    </button>
  );
}

function PatientBadge({ children, tone = 'brand', style = {} }) {
  const tones = {
    brand: { color: C.mochaDark, background: C.mochaPale, borderColor: C.mochaSoft },
    success: { color: C.success, background: C.successPale, borderColor: 'rgba(185, 250, 72, 0.9)' },
    warning: { color: C.warn, background: C.warnPale, borderColor: 'rgba(255, 173, 92, 0.55)' },
    danger: { color: C.error, background: C.errorPale, borderColor: 'rgba(250, 87, 62, 0.38)' },
    neutral: { color: C.textSub, background: C.warm, borderColor: C.border },
  }[tone] || {};
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '7px 10px',
        border: `1px solid ${tones.borderColor}`,
        color: tones.color,
        background: tones.background,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SectionKicker({ children }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 900, color: C.mochaDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
      {children}
    </p>
  );
}

// ── i18n strings ──────────────────────────────────────────────
const I18N = {
  ko: {
    greeting:       (name) => `안녕하세요, ${name}님 👋`,
    greetingGeneric:'안녕하세요 👋',
    journey:        '방문 여정',
    forms:          '서류 작성',
    ask:            'Ask TikiBell',
    aftercare:      '애프터케어',
    procedure:      '예정 시술',
    noProcedure:    '시술 정보 없음',
    visitDate:      '방문 예정일',
    noVisitDate:    '날짜 미정',
    nextStep:       '다음 단계',
    allDone:        '모든 서류가 완료되었습니다 ✓',
    fillIntake:     '방문 전 문진표를 작성해 주세요',
    fillConsent:    '동의서를 작성해 주세요',
    goToForms:      '서류 작성하기',
    noForms:        '현재 작성할 서류가 없습니다',
    formsPending:   '작성 필요',
    formsDone:      '완료',
    required:       '필수',
    submit:         '제출하기',
    submitting:     '제출 중…',
    submitSuccess:  '제출 완료',
    submitSuccessMsg: (title) => `${title} 제출이 완료되었습니다.`,
    backToList:     '목록으로',
    requiredError:  '필수 항목을 모두 작성해 주세요',
    signConfirm:    '서명 확인 (탭하여 서명)',
    signed:         '서명 완료 ✓',
    stage: {
      booked:    '예약 확정',
      pre_visit: '방문 준비',
      treatment: '시술',
      post_care: '애프터케어',
      followup:  '팔로업',
      closed:    '완료',
    },
    errorInvalid:   '유효하지 않은 링크입니다.',
    errorExpired:   '이 링크가 만료되었습니다.',
    errorRevoked:   '이 링크는 더 이상 사용할 수 없습니다.',
    errorGeneric:   '링크를 불러올 수 없습니다.',
    retryBtn:       '다시 시도',
    contactStaff:   '문의사항이 있으시면 병원으로 연락해 주세요.',
    loadingPortal:  '포털을 불러오는 중…',
    duplicateForm:  '이미 제출된 서류입니다.',
    arrivalCard:    '오늘 내원하셨나요?',
    arrivalSub:     '버튼을 탭하면 코디네이터에게 도착 알림이 전송됩니다',
    arrivalBtn:     '저 왔어요!',
    arrivalSending: '전송 중…',
    arrivedTitle:   '도착 알림을 보냈습니다 ✓',
    arrivedSub:     '코디네이터가 곧 안내해 드릴 것입니다',
    showFrontDesk:  '프런트 데스크에 아래 화면을 보여주세요',
    arrivalFallback:'버튼이 잘 되지 않으면 아래 문구를 바로 보여주세요',
    phrase:         '저 왔어요. 예약했어요.',
    askTitle:       'Ask TikiBell',
    askSubtitle:    'TikiBell이 현재 방문 단계에 맞는 간단한 질문을 도와드리고, 확인이 필요한 내용은 병원으로 연결합니다.',
    quickQuestions: '빠른 질문',
    recentMessages: '최근 대화',
    escalation:     '직접 확인 요청',
    escalationHelp: '간단한 질문은 위에서 먼저 물어보고, 직원 확인이 꼭 필요할 때만 호출해 주세요.',
    escalationConfirmTitle: '직원을 호출할까요?',
    escalationConfirmBody:  (label) => `${label} 요청을 병원에 보냅니다. 잘못 누른 것이 아니라면 아래 버튼을 눌러 호출해 주세요.`,
    escalationConfirmCancel:'취소',
    escalationConfirmSubmit:'네, 호출할게요',
    askCoordinator: '코디네이터에게 문의',
    askNurse:       '간호팀에 문의',
    doctorConfirm:  '의료진 확인 필요',
    escalationStatus: '요청 진행 상태',
    askPlaceholder: '현재 방문 단계에서 궁금한 점을 입력해 주세요',
    send:           '보내기',
    askEmpty:       '아직 TikiBell에게 보낸 질문이 없습니다. 위의 빠른 질문으로 시작해 보세요.',
    askLoading:     'TikiBell을 불러오는 중…',
    aftercareTitle: '회복 체크',
    aftercareSubtitle: '현재 회복 단계에 맞는 안내와 체크 항목을 확인해 주세요.',
    aftercareLoading:'애프터케어를 불러오는 중…',
    aftercareEmpty:  '현재 예정된 애프터케어 항목이 없습니다.',
    aftercareDue:    '지금 확인 필요',
    aftercareDone:   '완료됨',
    aftercareRespond:'응답 제출',
    aftercareAck:    '병원 확인 상태',
    rebookCta:       '후속 예약 안내 보기',
    askStageSummary: {
      booked:    '예약이 확정된 상태입니다. 방문 준비와 체크인 절차를 먼저 안내해 드릴 수 있습니다.',
      pre_visit: '방문 전 단계입니다. 서류, 동의서, 방문 준비 관련 질문을 먼저 도와드립니다.',
      arrived:   '도착 확인이 된 상태입니다. 대기 위치, 다음 단계, 남은 준비 사항을 안내합니다.',
      treatment: '현재 방문이 진행 중입니다. 간단한 진행 질문만 안내하고, 민감한 내용은 병원 확인으로 넘깁니다.',
      post_care: '애프터케어 단계입니다. 승인된 aftercare 안내 범위에서만 답변합니다.',
      followup:  '팔로업 단계입니다. 후속 안내와 병원 확인 요청을 도와드립니다.',
      closed:    '방문은 완료되었지만, 필요한 경우 후속 문의나 확인 요청을 남길 수 있습니다.',
    },
  },
  en: {
    greeting:       (name) => `Hello, ${name} 👋`,
    greetingGeneric:'Hello 👋',
    journey:        'My Journey',
    forms:          'Forms',
    ask:            'Ask TikiBell',
    aftercare:      'Aftercare',
    procedure:      'Procedure',
    noProcedure:    'No procedure assigned',
    visitDate:      'Visit Date',
    noVisitDate:    'TBD',
    nextStep:       'Next Step',
    allDone:        'All forms completed ✓',
    fillIntake:     'Please complete your intake form before your visit',
    fillConsent:    'Please complete your consent form',
    goToForms:      'Go to Forms',
    noForms:        'No forms available at this time',
    formsPending:   'Pending',
    formsDone:      'Done',
    required:       'Required',
    submit:         'Submit',
    submitting:     'Submitting…',
    submitSuccess:  'Submitted',
    submitSuccessMsg: (title) => `${title} has been submitted successfully.`,
    backToList:     'Back to list',
    requiredError:  'Please complete all required fields',
    signConfirm:    'Tap to sign',
    signed:         'Signed ✓',
    stage: {
      booked:    'Booking Confirmed',
      pre_visit: 'Pre-Visit',
      treatment: 'Treatment',
      post_care: 'Aftercare',
      followup:  'Follow-Up',
      closed:    'Complete',
    },
    errorInvalid:   'This link is not valid.',
    errorExpired:   'This link has expired.',
    errorRevoked:   'This link is no longer active.',
    errorGeneric:   'Unable to load your portal.',
    retryBtn:       'Try again',
    contactStaff:   'Please contact the clinic if you need assistance.',
    loadingPortal:  'Loading your portal…',
    duplicateForm:  'This form has already been submitted.',
    arrivalCard:    'Have you arrived today?',
    arrivalSub:     'Tap the button to notify the coordinator of your arrival',
    arrivalBtn:     "I'm here!",
    arrivalSending: 'Notifying…',
    arrivedTitle:   'Arrival confirmed ✓',
    arrivedSub:     'The coordinator will be with you shortly',
    showFrontDesk:  'Show this screen to the front desk',
    arrivalFallback:'If the button does not work, show the phrase below right away',
    phrase:         "I'm here for my appointment.",
    askTitle:       'Ask TikiBell',
    askSubtitle:    'TikiBell helps with simple questions for this visit stage and hands sensitive items to the clinic.',
    quickQuestions: 'Quick Questions',
    recentMessages: 'Recent Messages',
    escalation:     'Request Human Help',
    escalationHelp: 'Ask simple questions above first. Request staff help only when clinic confirmation is needed.',
    escalationConfirmTitle: 'Request staff help?',
    escalationConfirmBody:  (label) => `This will send a ${label} request to the clinic. If this was intentional, confirm below.`,
    escalationConfirmCancel:'Cancel',
    escalationConfirmSubmit:'Yes, request help',
    askCoordinator: 'Ask coordinator',
    askNurse:       'Ask nurse',
    doctorConfirm:  'Doctor confirmation needed',
    escalationStatus: 'Request Status',
    askPlaceholder: 'Type a question about this visit stage',
    send:           'Send',
    askEmpty:       'No questions for TikiBell yet. Start with one of the quick prompts above.',
    askLoading:     'Loading TikiBell…',
    aftercareTitle: 'Recovery Check',
    aftercareSubtitle: 'See the guidance and check-in steps for your current recovery stage.',
    aftercareLoading:'Loading aftercare…',
    aftercareEmpty:  'There are no scheduled aftercare items right now.',
    aftercareDue:    'Due now',
    aftercareDone:   'Completed',
    aftercareRespond:'Submit check-in',
    aftercareAck:    'Clinic review status',
    rebookCta:       'See follow-up booking guidance',
    askStageSummary: {
      booked:    'Your booking is confirmed. We can help first with preparation and check-in steps.',
      pre_visit: 'This is the pre-visit stage. Ask first about forms, consent, and visit preparation.',
      arrived:   'Your arrival is recorded. We can help with waiting, next steps, and pending items.',
      treatment: 'Your visit is in progress. Simple workflow questions are fine here, but sensitive issues should be confirmed by the clinic.',
      post_care: 'This is the aftercare stage. Answers stay within approved aftercare guidance only.',
      followup:  'This is the follow-up stage. We can help with follow-up guidance and clinic confirmation requests.',
      closed:    'The visit is complete, but you can still request follow-up guidance or clinic confirmation here.',
    },
  },
  ja: {
    greeting:       (name) => `こんにちは、${name}様 👋`,
    greetingGeneric:'こんにちは 👋',
    journey:        'ご来院の流れ',
    forms:          '書類記入',
    ask:            'Ask TikiBell',
    aftercare:      'アフターケア',
    procedure:      '施術内容',
    noProcedure:    '施術情報なし',
    visitDate:      'ご来院予定日',
    noVisitDate:    '未定',
    nextStep:       '次のステップ',
    allDone:        'すべての書類が完了しました ✓',
    fillIntake:     'ご来院前に問診票をご記入ください',
    fillConsent:    '同意書をご記入ください',
    goToForms:      '書類を記入する',
    noForms:        '現在記入する書類はありません',
    formsPending:   '未記入',
    formsDone:      '完了',
    required:       '必須',
    submit:         '提出する',
    submitting:     '提出中…',
    submitSuccess:  '提出完了',
    submitSuccessMsg: (title) => `${title}の提出が完了しました。`,
    backToList:     '一覧に戻る',
    requiredError:  '必須項目をすべて入力してください',
    signConfirm:    'タップしてサイン',
    signed:         'サイン済み ✓',
    stage: {
      booked:    '予約確定',
      pre_visit: '来院前',
      treatment: '施術中',
      post_care: 'アフターケア',
      followup:  'フォローアップ',
      closed:    '完了',
    },
    errorInvalid:   'このリンクは無効です。',
    errorExpired:   'このリンクの有効期限が切れています。',
    errorRevoked:   'このリンクはご利用いただけません。',
    errorGeneric:   'ポータルを読み込めませんでした。',
    retryBtn:       '再試行',
    contactStaff:   'ご不明な点はクリニックまでご連絡ください。',
    loadingPortal:  'ポータルを読み込んでいます…',
    duplicateForm:  'この書類はすでに提出済みです。',
    arrivalCard:    '本日ご来院されましたか？',
    arrivalSub:     'ボタンをタップすると、担当者に到着通知が送られます',
    arrivalBtn:     '来ました！',
    arrivalSending: '送信中…',
    arrivedTitle:   '到着通知を送りました ✓',
    arrivedSub:     'スタッフがすぐにご案内いたします',
    showFrontDesk:  '受付に以下の画面をお見せください',
    arrivalFallback:'ボタンがうまく動かない場合は、下の文をそのままお見せください',
    phrase:         '予約の時間に来ました。',
    askTitle:       'Ask TikiBell',
    askSubtitle:    'TikiBellが現在の来院段階に合った簡単な質問をサポートし、確認が必要な内容はクリニックへつなぎます。',
    quickQuestions: 'クイック質問',
    recentMessages: '最近のやり取り',
    escalation:     'スタッフ確認を依頼',
    escalationHelp: '簡単な質問は上で先に確認し、クリニックの確認が必要な場合だけスタッフを呼び出してください。',
    escalationConfirmTitle: 'スタッフを呼び出しますか？',
    escalationConfirmBody:  (label) => `${label}の依頼をクリニックに送信します。意図した操作であれば、下のボタンで確定してください。`,
    escalationConfirmCancel:'キャンセル',
    escalationConfirmSubmit:'はい、依頼します',
    askCoordinator: 'コーディネーターに確認',
    askNurse:       '看護チームに確認',
    doctorConfirm:  '医師確認が必要',
    escalationStatus: 'リクエスト状況',
    askPlaceholder: 'この来院段階について質問を入力してください',
    send:           '送信',
    askEmpty:       'まだTikiBellへの質問はありません。上のクイック質問から始めてください。',
    askLoading:     'TikiBellを読み込み中…',
    aftercareTitle: '回復チェック',
    aftercareSubtitle: '現在の回復段階に合わせた案内と確認項目をご確認ください。',
    aftercareLoading:'アフターケアを読み込み中…',
    aftercareEmpty:  '現在予定されているアフターケア項目はありません。',
    aftercareDue:    '今すぐ確認',
    aftercareDone:   '完了',
    aftercareRespond:'送信する',
    aftercareAck:    'クリニック確認状況',
    rebookCta:       '次回予約案内を見る',
    askStageSummary: {
      booked:    '予約が確定しています。まずは来院準備とチェックイン案内をお手伝いします。',
      pre_visit: '来院前の段階です。書類、同意書、来院準備に関する質問を優先してご案内します。',
      arrived:   '到着が確認されています。待機場所、次の流れ、残りの準備をご案内します。',
      treatment: '現在ご来院対応中です。簡単な進行質問は回答できますが、判断が必要な内容はクリニック確認をご案内します。',
      post_care: 'アフターケア段階です。承認済みアフターケア案内の範囲でのみ回答します。',
      followup:  'フォローアップ段階です。フォローアップ案内と確認依頼をお手伝いします。',
      closed:    '来院は完了していますが、必要に応じて追加確認を依頼できます。',
    },
  },
  zh: {
    greeting:       (name) => `您好，${name} 👋`,
    greetingGeneric:'您好 👋',
    journey:        '就诊流程',
    forms:          '填写表格',
    ask:            'Ask TikiBell',
    aftercare:      '术后护理',
    procedure:      '手术项目',
    noProcedure:    '暂无手术信息',
    visitDate:      '预约日期',
    noVisitDate:    '待定',
    nextStep:       '下一步',
    allDone:        '所有表格已完成 ✓',
    fillIntake:     '请在就诊前填写问诊表',
    fillConsent:    '请填写知情同意书',
    goToForms:      '前往填写表格',
    noForms:        '目前没有需要填写的表格',
    formsPending:   '待填写',
    formsDone:      '已完成',
    required:       '必填',
    submit:         '提交',
    submitting:     '提交中…',
    submitSuccess:  '提交成功',
    submitSuccessMsg: (title) => `${title} 已成功提交。`,
    backToList:     '返回列表',
    requiredError:  '请填写所有必填项',
    signConfirm:    '点击签名',
    signed:         '已签名 ✓',
    stage: {
      booked:    '预约确认',
      pre_visit: '访问前',
      treatment: '治疗中',
      post_care: '术后护理',
      followup:  '随访',
      closed:    '完成',
    },
    errorInvalid:   '此链接无效。',
    errorExpired:   '此链接已过期。',
    errorRevoked:   '此链接已停用。',
    errorGeneric:   '无法加载您的页面。',
    retryBtn:       '重试',
    contactStaff:   '如有疑问，请联系诊所。',
    loadingPortal:  '正在加载…',
    duplicateForm:  '此表格已提交。',
    arrivalCard:    '您今天来了吗？',
    arrivalSub:     '点击按钮，通知工作人员您已到达',
    arrivalBtn:     '我到了！',
    arrivalSending: '发送中…',
    arrivedTitle:   '已发送到达通知 ✓',
    arrivedSub:     '工作人员将很快为您服务',
    showFrontDesk:  '请将以下内容展示给前台',
    arrivalFallback:'如果按钮无法使用，请直接向前台出示下面的话',
    phrase:         '我来了，我有预约。',
    askTitle:       'Ask TikiBell',
    askSubtitle:    'TikiBell 会帮助处理当前就诊阶段的简单问题，需要确认的内容会转交给诊所。',
    quickQuestions: '快捷问题',
    recentMessages: '最近消息',
    escalation:     '请求人工协助',
    escalationHelp: '请先在上方咨询简单问题。只有需要诊所确认时，再请求人工协助。',
    escalationConfirmTitle: '要请求人工协助吗？',
    escalationConfirmBody:  (label) => `这会向诊所发送“${label}”请求。如果不是误触，请点击下方按钮确认。`,
    escalationConfirmCancel:'取消',
    escalationConfirmSubmit:'确认请求协助',
    askCoordinator: '联系协调员',
    askNurse:       '联系护士',
    doctorConfirm:  '需要医生确认',
    escalationStatus: '请求状态',
    askPlaceholder: '输入一个与当前就诊阶段相关的问题',
    send:           '发送',
    askEmpty:       '还没有向 TikiBell 提问。请先点击上方快捷问题开始。',
    askLoading:     '正在加载 TikiBell…',
    aftercareTitle: '恢复检查',
    aftercareSubtitle: '查看与当前恢复阶段对应的护理说明和检查项。',
    aftercareLoading:'正在加载术后护理…',
    aftercareEmpty:  '当前没有计划中的术后护理项目。',
    aftercareDue:    '现在需要确认',
    aftercareDone:   '已完成',
    aftercareRespond:'提交检查',
    aftercareAck:    '诊所审核状态',
    rebookCta:       '查看复诊预约建议',
    askStageSummary: {
      booked:    '您的预约已确认。我们会先帮助您了解来院准备和报到流程。',
      pre_visit: '当前为来院前阶段。可优先咨询表格、同意书和来院准备事项。',
      arrived:   '已记录您到达诊所。可咨询等待地点、下一步流程和待完成事项。',
      treatment: '当前就诊正在进行中。这里只回答简单流程问题，敏感问题将建议由诊所确认。',
      post_care: '当前为术后护理阶段。回答仅限于已批准的护理指导范围。',
      followup:  '当前为随访阶段。可咨询随访说明并请求诊所确认。',
      closed:    '本次就诊已完成，但您仍可在这里请求后续说明或诊所确认。',
    },
  },
};

// fallback to 'en' for unknown langs
function tx(lang, key, ...args) {
  const dict = I18N[lang] || I18N.en;
  const val  = dict[key] ?? I18N.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

function askStageSummary(lang, stage) {
  const dict = I18N[lang] || I18N.en;
  return dict.askStageSummary?.[stage] || I18N.en.askStageSummary?.[stage] || '';
}

function askPromptText(lang, prompt) {
  const id = prompt?.id;
  const map = {
    prepare_for_visit: {
      ko: '무엇을 준비해야 하나요?',
      en: 'What should I prepare?',
      ja: '何を準備すればいいですか？',
      zh: '我需要准备什么？',
    },
    complete_forms: {
      ko: '서류는 어디서 작성하나요?',
      en: 'Where do I complete forms?',
      ja: '書類はどこで記入しますか？',
      zh: '我在哪里填写表格？',
    },
    sign_consent: {
      ko: '동의서는 언제 작성하나요?',
      en: 'When do I sign consent?',
      ja: '同意書はいつ記入しますか？',
      zh: '我什么时候签同意书？',
    },
    check_in_day_of_visit: {
      ko: '당일 체크인은 어떻게 하나요?',
      en: 'How do I check in on the day?',
      ja: '当日のチェックインはどうすればいいですか？',
      zh: '就诊当天如何报到？',
    },
    where_to_wait: {
      ko: '어디에서 기다리면 되나요?',
      en: 'Where should I wait?',
      ja: 'どこで待てばいいですか？',
      zh: '我应该在哪里等候？',
    },
    next_step: {
      ko: '다음 단계는 무엇인가요?',
      en: 'What is the next step?',
      ja: '次のステップは何ですか？',
      zh: '下一步是什么？',
    },
    how_long: {
      ko: '얼마나 걸리나요?',
      en: 'How long will it take?',
      ja: 'どのくらいかかりますか？',
      zh: '大概需要多久？',
    },
    forms_complete: {
      ko: '서류 작성이 완료되었나요?',
      en: 'Are my forms complete?',
      ja: '書類は完了していますか？',
      zh: '我的表格都完成了吗？',
    },
    normal_discomfort: {
      ko: '이 불편감은 정상인가요?',
      en: 'Is this discomfort normal?',
      ja: 'この違和感は通常ですか？',
      zh: '这种不适正常吗？',
    },
    swelling_duration: {
      ko: '붓기는 얼마나 가나요?',
      en: 'How long will swelling last?',
      ja: '腫れはどれくらい続きますか？',
      zh: '肿胀会持续多久？',
    },
    precautions: {
      ko: '주의사항은 무엇인가요?',
      en: 'What precautions should I follow?',
      ja: 'どんな注意事項がありますか？',
      zh: '我需要注意什么？',
    },
    when_to_contact: {
      ko: '언제 병원에 연락해야 하나요?',
      en: 'When should I contact the clinic?',
      ja: 'いつクリニックに連絡すべきですか？',
      zh: '我什么时候需要联系诊所？',
    },
    doctor_confirmation: {
      ko: '의료진 확인이 필요해요.',
      en: 'I need doctor confirmation.',
      ja: '医師の確認が必要です。',
      zh: '我需要医生确认。',
    },
  };

  const defaultEn = map[id]?.en || '';
  if (prompt?.text && prompt.text !== defaultEn) return prompt.text;
  return map[id]?.[lang] || defaultEn || prompt?.text || '';
}

function askEscalationLabel(lang, option) {
  const defaultMap = {
    coordinator: {
      ko: '코디네이터에게 문의',
      en: 'Ask coordinator',
      ja: 'コーディネーターに確認',
      zh: '联系协调员',
    },
    nurse: {
      ko: '간호팀에 문의',
      en: 'Ask nurse',
      ja: '看護チームに確認',
      zh: '联系护士',
    },
    doctor_confirmation: {
      ko: '의료진 확인 필요',
      en: 'Doctor confirmation needed',
      ja: '医師確認が必要',
      zh: '需要医生确认',
    },
  };

  const defaultEn = defaultMap[option?.id]?.en || '';
  if (option?.label && option.label !== defaultEn) return option.label;
  return defaultMap[option?.id]?.[lang] || defaultEn || option?.label || '';
}

// localized form title
function formTitle(form, lang) {
  if (lang === 'en' && form.title_en) return form.title_en;
  return form.title_ko;
}

// localized field label
function fieldLabel(field, lang) {
  return field[`label_${lang}`] || field.label_ko || field.id;
}

// option label
function optionLabel(opt, lang) {
  return opt[`label_${lang}`] || opt.label_ko || opt.value;
}

// ── Stage ordering ────────────────────────────────────────────
const STAGES = ['booked', 'pre_visit', 'treatment', 'post_care', 'followup', 'closed'];

const TIKIBELL_ASSETS = {
  main: '/assets/tikibell/tikibell-main.png',
  document: '/assets/tikibell/tikibell-document.png',
  numbing: '/assets/tikibell/tikibell-numbing.png',
  aftercare: '/assets/tikibell/tikibell-aftercare.png',
  sparkle: '/assets/tikibell/tikibell-sparkle.png',
  hero: '/assets/tikibell/tikibell-hero.mp4',
};

function tikibellGuideCopy(lang, mode) {
  const copy = {
    main: {
      ko: ['TikiBell이 함께 안내해요', '오늘 해야 할 일과 다음 단계를 차분히 알려드릴게요.'],
      en: ['TikiBell is here to guide you', 'I will help you see what to do next today.'],
      ja: ['TikiBellがご案内します', '今日やることと次の流れをわかりやすくお伝えします。'],
      zh: ['TikiBell 会陪您完成流程', '我会帮您确认今天要做的事和下一步。'],
    },
    document: {
      ko: ['서류 작성 단계예요', '문진표와 동의서를 먼저 작성하면 내원 흐름이 더 빨라집니다.'],
      en: ['It is time to complete forms', 'Please finish your intake and consent forms first.'],
      ja: ['書類記入の段階です', '問診票と同意書を先に記入すると流れがスムーズです。'],
      zh: ['现在需要填写资料', '请先填写问诊表和同意书，流程会更顺利。'],
    },
    numbing: {
      ko: ['마취크림 후 대기 단계예요', '직원이 안내할 때까지 편하게 기다리시면 됩니다.'],
      en: ['You may be waiting after numbing cream', 'Please wait comfortably until staff guide you.'],
      ja: ['麻酔クリーム後の待機段階です', 'スタッフの案内まで楽にお待ちください。'],
      zh: ['现在可能是敷麻药等待阶段', '请放松等待工作人员引导。'],
    },
    aftercare: {
      ko: ['애프터케어 단계예요', '회복 상태와 주의사항을 확인하고, 이상 신호가 있으면 병원에 전달할게요.'],
      en: ['This is your aftercare stage', 'Check your recovery guidance, and I can flag concerns for the clinic.'],
      ja: ['アフターケアの段階です', '回復状態と注意事項を確認し、気になる症状はクリニックへつなぎます。'],
      zh: ['现在是术后护理阶段', '请确认恢复说明。如有异常信号，我会转交给诊所。'],
    },
  };
  return copy[mode]?.[lang] || copy[mode]?.en || copy.main.en;
}

function getTikibellGuideMode({ visit, formsStatus, aftercareState }) {
  const dueAftercare = (aftercareState?.due_items || []).length > 0 || aftercareState?.acknowledgement;
  if (dueAftercare || ['post_care', 'followup', 'closed'].includes(visit?.stage)) return 'aftercare';
  if ((formsStatus?.hasIntake && !visit?.intake_done) || (formsStatus?.hasConsent && !visit?.consent_done)) return 'document';
  if (visit?.stage === 'treatment') return 'numbing';
  return 'main';
}

function TikibellStageGuide({ lang, visit, formsStatus, aftercareState }) {
  const mode = getTikibellGuideMode({ visit, formsStatus, aftercareState });
  const [title, body] = tikibellGuideCopy(lang, mode);
  return (
    <PatientCard tone="brand" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      overflow: 'hidden',
      position: 'relative',
      padding: '16px 18px',
    }}>
      <img
        src={TIKIBELL_ASSETS[mode]}
        alt=""
        style={{
          width: 92,
          height: 92,
          objectFit: 'contain',
          flexShrink: 0,
          filter: mode === 'main' ? 'saturate(0.95)' : 'none',
          animation: 'tikibellFloat 4.5s ease-in-out infinite',
        }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 18, fontWeight: 950, color: C.text, letterSpacing: '-0.04em', lineHeight: 1.2 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.textSub, lineHeight: 1.55, marginTop: 6, wordBreak: 'keep-all' }}>
          {body}
        </p>
      </div>
      <style>{`
        @keyframes tikibellFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
      `}</style>
    </PatientCard>
  );
}

function TikibellSparkleOverlay({ sparkleKey }) {
  if (!sparkleKey) return null;
  return (
    <div
      key={sparkleKey}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        animation: 'tikibellOverlay 1s ease-out forwards',
      }}
      aria-hidden="true"
    >
      <div style={{
        position: 'relative',
        width: 180,
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'tikibellPop 1s cubic-bezier(.2,.9,.2,1) forwards',
      }}>
        <span style={{ position: 'absolute', inset: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.72)', filter: 'blur(10px)' }} />
        <span style={{ position: 'absolute', top: 20, right: 22, color: '#F9D75C', fontSize: 22, animation: 'tikibellStar 1s ease-out forwards' }}>✦</span>
        <span style={{ position: 'absolute', left: 16, bottom: 34, color: '#F9D75C', fontSize: 18, animation: 'tikibellStar 1s ease-out forwards' }}>✦</span>
        <img src={TIKIBELL_ASSETS.sparkle} alt="" style={{ position: 'relative', width: 150, height: 150, objectFit: 'contain' }} />
      </div>
      <style>{`
        @keyframes tikibellOverlay {
          0% { opacity: 0; }
          16% { opacity: 1; }
          82% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes tikibellPop {
          0% { transform: scale(.78) translateY(10px); }
          22% { transform: scale(1.04) translateY(0); }
          70% { transform: scale(1) translateY(-4px); }
          100% { transform: scale(.92) translateY(-10px); }
        }
        @keyframes tikibellStar {
          0% { transform: scale(.2) rotate(0); opacity: 0; }
          35% { transform: scale(1.2) rotate(22deg); opacity: 1; }
          100% { transform: scale(.65) rotate(70deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── API helper: all patient API calls carry X-Patient-Token ──
function patientApi(token) {
  const headers = { 'Content-Type': 'application/json', 'X-Patient-Token': token };
  return {
    get: (path) => fetch(path, { headers }).then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d }))),
    post: (path, body) => fetch(path, { method: 'POST', headers, body: JSON.stringify(body) })
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d }))),
  };
}

// ═══════════════════════════════════════════════════════════════
// Error screen
// ═══════════════════════════════════════════════════════════════
function ErrorScreen({ type, lang }) {
  const msgKey = type === 'expired' ? 'errorExpired'
               : type === 'revoked' ? 'errorRevoked'
               : type === 'invalid' ? 'errorInvalid'
               : 'errorGeneric';

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.appBg, fontFamily: SANS, padding: '32px 24px', textAlign: 'center',
    }}>
      <PatientCard tone={type === 'expired' ? 'warning' : 'danger'} style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 22,
          background: C.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 22px',
          border: `1px solid ${type === 'expired' ? 'rgba(255, 173, 92, 0.55)' : 'rgba(250, 87, 62, 0.38)'}`,
        }}>
          <AlertTriangle size={28} color={type === 'expired' ? C.warn : C.error} strokeWidth={2} />
        </div>
        <p style={{ fontSize: 23, lineHeight: 1.25, fontWeight: 900, letterSpacing: '-0.045em', color: C.text, marginBottom: 10 }}>
          {tx(lang, msgKey)}
        </p>
        <p style={{ fontSize: 16, color: C.textSub, lineHeight: 1.65, wordBreak: 'keep-all' }}>
          {tx(lang, 'contactStaff')}
        </p>
      </PatientCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Loading screen
// ═══════════════════════════════════════════════════════════════
function LoadingScreen({ lang = 'ko' }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.appBg, fontFamily: SANS, gap: 16,
    }}>
      <Loader2 size={32} color={C.teal} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 13, color: C.textSub }}>{tx(lang, 'loadingPortal')}</p>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Arrival Card (Phase 5)
// Shows when visit_date === today and patient hasn't arrived yet.
// After tap: sends POST /api/patient/arrive and shows translation strip.
// ═══════════════════════════════════════════════════════════════

// Multilingual check-in phrases (all 4 in one card for staff)
const ARRIVAL_PHRASES = [
  { flag: '🇰🇷', lang: 'ko', text: '저 왔어요. 예약했어요.' },
  { flag: '🇺🇸', lang: 'en', text: "I'm here for my appointment." },
  { flag: '🇯🇵', lang: 'ja', text: '予約の時間に来ました。' },
  { flag: '🇨🇳', lang: 'zh', text: '我来了，我有预约。' },
];

function ArrivalCard({ lang, token, arrivedAt, onArrived, onCelebrate = null }) {
  const [phase, setPhase] = useState('idle'); // idle | sending | done | error
  const api = patientApi(token);

  // If already arrived (from server), jump straight to done display
  const effectivelyArrived = arrivedAt || phase === 'done';

  async function handleArrive() {
    if (phase === 'sending') return;
    setPhase('sending');
    try {
      const resp = await api.post('/api/patient/arrive', {});
      if (resp.ok || resp.status === 409) {
        const ts = resp.data?.patient_arrived_at || new Date().toISOString();
        setPhase('done');
        onArrived(ts);
        onCelebrate?.();
      } else {
        setPhase('error');
      }
    } catch {
      setPhase('error');
    }
  }

  // ── Arrived: show translation strip ──────────────────────────
  if (effectivelyArrived) {
    return (
      <PatientCard tone="success" style={{ margin: '0 0 4px', overflow: 'hidden', padding: 0 }}>
        {/* Confirmed banner */}
        <div style={{
          padding: '18px 20px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 18, flexShrink: 0,
            background: C.surface,
            border: '1px solid rgba(185, 250, 72, 0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={25} color={C.success} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, color: C.success, lineHeight: 1.2 }}>
              {tx(lang, 'arrivedTitle')}
            </p>
            <p style={{ fontSize: 14, color: C.textSub, marginTop: 4, lineHeight: 1.45 }}>
              {tx(lang, 'arrivedSub')}
            </p>
          </div>
        </div>

        {/* Translation strip — show to front desk */}
        <div style={{
          margin: '0 14px 14px',
          borderRadius: 18,
          background: C.surface,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 14px',
            background: C.mocha,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Navigation size={11} color="#fff" strokeWidth={2.5} />
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>
              {tx(lang, 'showFrontDesk')}
            </p>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ARRIVAL_PHRASES.map(({ flag, lang: pLang, text }) => (
              <div key={pLang} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{flag}</span>
              <p style={{
                  fontSize: pLang === lang ? 17 : 14,
                  fontWeight: pLang === lang ? 850 : 600,
                  color: pLang === lang ? C.text : C.textSub,
                  lineHeight: 1.45,
                }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PatientCard>
    );
  }

  // ── Not yet arrived: show "I'm here" button ───────────────────
  return (
    <PatientCard tone="brand" style={{ margin: '0 0 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 18, flexShrink: 0,
          background: C.surface,
          border: `1px solid ${C.mochaSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Navigation size={23} color={C.mocha} strokeWidth={2.2} />
        </div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 900, color: C.mochaDark, lineHeight: 1.2, letterSpacing: '-0.025em' }}>
            {tx(lang, 'arrivalCard')}
          </p>
          <p style={{ fontSize: 14, color: C.textSub, marginTop: 4, lineHeight: 1.55 }}>
            {tx(lang, 'arrivalSub')}
          </p>
        </div>
      </div>

      <PatientButton
        onClick={handleArrive}
        disabled={phase === 'sending'}
      >
        {phase === 'sending' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
        {tx(lang, phase === 'sending' ? 'arrivalSending' : 'arrivalBtn')}
      </PatientButton>

      {phase === 'error' && (
        <p style={{ fontSize: 12, color: C.error, textAlign: 'center' }}>
          {tx(lang, 'errorGeneric')}
        </p>
      )}

      <div style={{
        borderRadius: 18,
        background: C.surface,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 14px',
          background: C.warm,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Navigation size={11} color={C.mochaDark} strokeWidth={2.5} />
          <p style={{ fontSize: 11, fontWeight: 800, color: C.mochaDark }}>
            {tx(lang, 'arrivalFallback')}
          </p>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ARRIVAL_PHRASES.map(({ flag, lang: pLang, text }) => (
            <div key={pLang} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{flag}</span>
              <p style={{
                fontSize: pLang === lang ? 16 : 13,
                fontWeight: pLang === lang ? 850 : 600,
                color: pLang === lang ? C.text : C.textSub,
                lineHeight: 1.4,
              }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PatientCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// Journey Tab
// ═══════════════════════════════════════════════════════════════
function JourneyTab({ patient, visit, clinic, lang, onGoToForms, onGoToAftercare, formsStatus, aftercareState, clinicRuleConfig, arrivedAt, onArrived, token, onCelebrate = null }) {
  const stage       = visit?.stage || 'booked';
  const stageIdx    = STAGES.indexOf(stage);
  const patientName = patient?.name || '';
  const procName    = (lang !== 'ko' && visit?.procedures?.name_en)
    ? visit.procedures.name_en
    : visit?.procedures?.name_ko || null;
  const visitDate   = visit?.visit_date;

  // Show ArrivalCard only when visit_date is today (local calendar day)
  const isToday = (() => {
    if (!visitDate) return false;
    const vd   = new Date(visitDate);
    const now  = new Date();
    return vd.getFullYear() === now.getFullYear()
        && vd.getMonth()    === now.getMonth()
        && vd.getDate()     === now.getDate();
  })();
  const showArrival = isToday && visit;
  const todayTasks = buildPatientTodayTasks({
    visit: {
      ...visit,
      patient_arrived_at: arrivedAt || visit?.patient_arrived_at || null,
    },
    formsStatus,
    aftercareState,
    clinicRuleConfig,
  });

  function taskCopy(taskKey) {
    if (taskKey === 'arrival') {
      return {
        title: lang === 'ko' ? '오늘 첫 단계' : lang === 'ja' ? '本日の最初のステップ' : lang === 'zh' ? '今天的第一步' : 'Today’s first step',
        body: tx(lang, 'arrivalCard'),
        cta: tx(lang, 'arrivalBtn'),
        action: null,
      };
    }
    if (taskKey === 'intake_form') {
      return {
        title: tx(lang, 'nextStep'),
        body: tx(lang, 'fillIntake'),
        cta: tx(lang, 'goToForms'),
        action: onGoToForms,
      };
    }
    if (taskKey === 'consent_form') {
      return {
        title: tx(lang, 'nextStep'),
        body: tx(lang, 'fillConsent'),
        cta: tx(lang, 'goToForms'),
        action: onGoToForms,
      };
    }
    if (taskKey === 'aftercare_due') {
      return {
        title: tx(lang, 'aftercareDue'),
        body: lang === 'ko'
          ? '회복 체크 항목이 도착했습니다. 지금 응답을 제출해 주세요.'
          : lang === 'ja'
            ? '回復チェック項目が届いています。今すぐ回答してください。'
            : lang === 'zh'
              ? '恢复检查项目已到达。请现在提交回答。'
              : 'A recovery check is due now. Please submit your check-in.',
        cta: tx(lang, 'aftercareRespond'),
        action: onGoToAftercare,
      };
    }
    if (taskKey === 'aftercare_ack') {
      return {
        title: tx(lang, 'aftercareAck'),
        body: aftercareState?.acknowledgement || '',
        cta: tx(lang, 'aftercare'),
        action: onGoToAftercare,
      };
    }
    if (taskKey === 'aftercare_return') {
      return {
        title: tx(lang, 'aftercareAck'),
        body: lang === 'ko'
          ? '회복 상태가 안정적으로 확인되었습니다. 다음 예약 또는 후속 방문 안내를 확인해 보세요.'
          : lang === 'ja'
            ? '回復が安定していることを確認しました。次回予約や再訪案内を確認してください。'
            : lang === 'zh'
              ? '恢复状态看起来稳定。请查看下一次预约或复诊建议。'
              : 'Your recovery looks stable. You can review follow-up or return booking guidance now.',
        cta: tx(lang, 'rebookCta'),
        action: onGoToAftercare,
      };
    }
    return {
      title: lang === 'ko' ? '오늘 상태' : lang === 'ja' ? '本日の状態' : lang === 'zh' ? '今日状态' : 'Today',
      body: tx(lang, 'allDone'),
      cta: null,
      action: null,
    };
  }

  // Next-step call to action
  let ctaMsg = null;
  let ctaAction = null;
  if (visit) {
    if (!visit.intake_done && formsStatus.hasIntake) {
      ctaMsg    = tx(lang, 'fillIntake');
      ctaAction = onGoToForms;
    } else if (!visit.consent_done && formsStatus.hasConsent) {
      ctaMsg    = tx(lang, 'fillConsent');
      ctaAction = onGoToForms;
    } else if (formsStatus.hasAny) {
      ctaMsg = tx(lang, 'allDone');
    }
  }

  return (
    <div style={{ padding: '24px 20px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Arrival Card (today only) */}
      {showArrival && (
        <ArrivalCard
          lang={lang}
          token={token}
          arrivedAt={arrivedAt}
          onArrived={onArrived}
          onCelebrate={onCelebrate}
        />
      )}

      <TikibellStageGuide
        lang={lang}
        visit={visit}
        formsStatus={formsStatus}
        aftercareState={aftercareState}
      />

      {/* Today / next actions */}
      <PatientCard style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <SectionKicker>
            {lang === 'ko' ? 'Today' : lang === 'ja' ? 'Today' : lang === 'zh' ? 'Today' : 'Today'}
          </SectionKicker>
          <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', color: C.text, lineHeight: 1.2 }}>
            {lang === 'ko' ? '오늘 / 다음 액션' : lang === 'ja' ? '今日 / 次のアクション' : lang === 'zh' ? '今天 / 下一步' : 'Today / Next Actions'}
          </p>
        </div>
        {todayTasks.map((task) => {
          const copy = taskCopy(task.key);
          return (
            <div
              key={task.key}
              style={{
                borderRadius: 18,
                border: `1px solid ${task.tone === 'calm' ? C.success + '25' : task.tone === 'watch' ? C.warn + '30' : C.teal + '20'}`,
                background: task.tone === 'calm' ? C.successPale : task.tone === 'watch' ? C.warnPale : C.tealPale,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 900, color: task.tone === 'calm' ? C.success : task.tone === 'watch' ? C.warn : C.mochaDark, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {copy.title}
                </p>
                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.58, fontWeight: 650 }}>
                  {copy.body}
                </p>
              </div>
              {copy.action && (
                <PatientButton
                  onClick={copy.action}
                  style={{ flexShrink: 0, width: 'auto', minHeight: 42, borderRadius: 14, padding: '0 14px', fontSize: 13 }}
                >
                  {copy.cta}
                </PatientButton>
              )}
            </div>
          );
        })}
      </PatientCard>

      {/* Greeting */}
      <div>
        <p style={{ fontSize: 30, fontWeight: 950, letterSpacing: '-0.055em', color: C.text, lineHeight: 1.13, wordBreak: 'keep-all' }}>
          {patientName ? tx(lang, 'greeting', patientName) : tx(lang, 'greetingGeneric')}
        </p>
        {clinic?.clinic_name && (
          <p style={{ fontSize: 15, fontWeight: 750, color: C.textSub, marginTop: 8, lineHeight: 1.45 }}>
            {clinic.clinic_name}
          </p>
        )}
      </div>

      {/* Procedure + date card */}
      {visit && (
        <PatientCard>
          <div style={{ marginBottom: procName ? 14 : 0 }}>
            <SectionKicker>
              {tx(lang, 'procedure')}
            </SectionKicker>
            <p style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1.3, letterSpacing: '-0.035em' }}>
              {procName || tx(lang, 'noProcedure')}
            </p>
          </div>
          {visitDate && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <SectionKicker>
                {tx(lang, 'visitDate')}
              </SectionKicker>
              <p style={{ fontSize: 17, fontWeight: 850, color: C.text }}>
                {visitDate}
              </p>
            </div>
          )}
        </PatientCard>
      )}

      {/* Stage progress */}
      {visit && (
        <PatientCard>
          <SectionKicker>
            {tx(lang, 'journey')}
          </SectionKicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STAGES.map((s, i) => {
              const isDone    = i < stageIdx;
              const isCurrent = i === stageIdx;
              const isFuture  = i > stageIdx;
              const isLast    = i === STAGES.length - 1;

              return (
                <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Track */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: isFuture ? 'transparent' : (isDone ? C.success : C.mocha),
                      border: isFuture ? `2px solid ${C.stage.future}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(isDone || (!isCurrent && !isFuture)) && !isCurrent && (
                        <CheckCircle2 size={20} color={C.teal} strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
                      )}
                      {isCurrent && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                      )}
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 2, height: 28, marginTop: 2,
                        background: isDone ? C.success : C.border,
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <div style={{ paddingBottom: isLast ? 0 : 28, paddingTop: 1 }}>
                    <p style={{
                      fontSize: isCurrent ? 16 : 15,
                      fontWeight: isCurrent ? 900 : isDone ? 750 : 650,
                      color: isCurrent ? C.mochaDark : isDone ? C.text : C.textMt,
                      lineHeight: 1.2,
                    }}>
                      {tx(lang, 'stage')[s] || s}
                    </p>
                    {isCurrent && (
                      <p style={{ fontSize: 12, color: C.mochaDark, marginTop: 4, fontWeight: 800 }}>
                        ← {lang === 'ko' ? '현재 단계' : lang === 'ja' ? '現在' : lang === 'zh' ? '当前阶段' : 'Current'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PatientCard>
      )}

      {/* Next-step CTA */}
      {ctaMsg && (
        <PatientCard tone={ctaAction ? 'brand' : 'success'} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <p style={{ fontSize: 16, fontWeight: 850, color: ctaAction ? C.mochaDark : C.success, flex: 1, lineHeight: 1.5 }}>
            {ctaMsg}
          </p>
          {ctaAction && (
            <PatientButton
              onClick={ctaAction}
              style={{ flexShrink: 0, width: 'auto', minHeight: 44, borderRadius: 14, padding: '0 14px', fontSize: 13 }}
            >
              {tx(lang, 'goToForms')}
              <ChevronRight size={13} />
            </PatientButton>
          )}
        </PatientCard>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Form field renderers
// ═══════════════════════════════════════════════════════════════
function TextField({ field, value, onChange, lang, error }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(field.id, e.target.value)}
      placeholder={lang === 'ko' ? '입력해 주세요' : lang === 'ja' ? 'ご記入ください' : lang === 'zh' ? '请填写' : 'Enter here'}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 10,
        border: `1.5px solid ${error ? C.error : C.border}`,
        fontSize: 16, color: C.text, background: C.surface,
        outline: 'none', boxSizing: 'border-box',
      }}
    />
  );
}

function TextareaField({ field, value, onChange, lang, error }) {
  return (
    <textarea
      rows={4}
      value={value || ''}
      onChange={e => onChange(field.id, e.target.value)}
      placeholder={lang === 'ko' ? '내용을 입력해 주세요' : lang === 'ja' ? 'ご記入ください' : lang === 'zh' ? '请填写' : 'Enter details here'}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 10,
        border: `1.5px solid ${error ? C.error : C.border}`,
        fontSize: 16, color: C.text, background: C.surface,
        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        fontFamily: SANS, lineHeight: 1.6,
      }}
    />
  );
}

function RadioField({ field, value, onChange, lang, error }) {
  const options = field.options || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => {
        const checked = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(field.id, opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '15px 16px', borderRadius: 16, cursor: 'pointer',
              border: `1.5px solid ${checked ? C.teal : error ? C.error : C.border}`,
              background: checked ? C.tealPale : C.surface,
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${checked ? C.teal : C.border}`,
              background: checked ? C.teal : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {checked && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <span style={{ fontSize: 16, color: C.text, fontWeight: checked ? 850 : 650, lineHeight: 1.45 }}>
              {optionLabel(opt, lang)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CheckboxField({ field, value, onChange, lang, error }) {
  const options = field.options || [];

  // Single boolean checkbox (no options)
  if (options.length === 0) {
    const checked = !!value;
    return (
      <button
        type="button"
        onClick={() => onChange(field.id, !checked)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '15px 16px', borderRadius: 16, cursor: 'pointer',
          border: `1.5px solid ${checked ? C.teal : error ? C.error : C.border}`,
          background: checked ? C.tealPale : C.surface,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${checked ? C.teal : C.border}`,
          background: checked ? C.teal : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <CheckCircle2 size={14} color="#fff" strokeWidth={3} />}
        </div>
        <span style={{ fontSize: 16, color: C.text, fontWeight: checked ? 850 : 650 }}>
          {lang === 'ko' ? '예' : lang === 'ja' ? 'はい' : lang === 'zh' ? '是' : 'Yes'}
        </span>
      </button>
    );
  }

  // Multi-select checkboxes
  const selected = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => {
        const checked = selected.includes(opt.value);
        const next    = checked
          ? selected.filter(v => v !== opt.value)
          : [...selected, opt.value];
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(field.id, next)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '15px 16px', borderRadius: 16, cursor: 'pointer',
              border: `1.5px solid ${checked ? C.teal : error ? C.error : C.border}`,
              background: checked ? C.tealPale : C.surface,
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              border: `2px solid ${checked ? C.teal : C.border}`,
              background: checked ? C.teal : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {checked && <CheckCircle2 size={14} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 16, color: C.text, fontWeight: checked ? 850 : 650, lineHeight: 1.45 }}>
              {optionLabel(opt, lang)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DateField({ field, value, onChange, error }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(field.id, e.target.value)}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 16,
        border: `1.5px solid ${error ? C.error : C.border}`,
        fontSize: 16, color: C.text, background: C.surface,
        outline: 'none', boxSizing: 'border-box',
      }}
    />
  );
}

function SignatureField({ field, value, onChange, lang, error }) {
  const signed = !!value;
  return (
    <button
      type="button"
      onClick={() => onChange(field.id, signed ? null : new Date().toISOString())}
      style={{
        width: '100%', padding: '28px 20px', borderRadius: 18, cursor: 'pointer',
        border: `1.5px dashed ${signed ? C.teal : error ? C.error : C.border}`,
        background: signed ? C.tealPale : C.surface,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}
    >
      {signed
        ? <CheckCircle2 size={28} color={C.teal} />
        : <FileText size={28} color={C.textMt} strokeWidth={1.5} />
      }
      <span style={{ fontSize: 14, fontWeight: 600, color: signed ? C.teal : C.textSub }}>
        {tx(lang, signed ? 'signed' : 'signConfirm')}
      </span>
      {signed && (
        <span style={{ fontSize: 11, color: C.textMt }}>
          {new Date(value).toLocaleString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US')}
        </span>
      )}
    </button>
  );
}

function FormField({ field, value, onChange, lang, errors }) {
  const error  = errors[field.id];
  const label  = fieldLabel(field, lang);
  const req    = field.required;

  const fieldEl = (() => {
    switch (field.type) {
      case 'text':      return <TextField      field={field} value={value} onChange={onChange} lang={lang} error={error} />;
      case 'textarea':  return <TextareaField  field={field} value={value} onChange={onChange} lang={lang} error={error} />;
      case 'radio':     return <RadioField     field={field} value={value} onChange={onChange} lang={lang} error={error} />;
      case 'checkbox':  return <CheckboxField  field={field} value={value} onChange={onChange} lang={lang} error={error} />;
      case 'date':      return <DateField      field={field} value={value} onChange={onChange} error={error} />;
      case 'signature': return <SignatureField field={field} value={value} onChange={onChange} lang={lang} error={error} />;
      default:          return <TextField      field={field} value={value} onChange={onChange} lang={lang} error={error} />;
    }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 16, fontWeight: 850, color: C.text, lineHeight: 1.35 }}>{label}</label>
        {req && (
          <PatientBadge tone="brand" style={{ fontSize: 10, padding: '5px 7px' }}>{tx(lang, 'required')}</PatientBadge>
        )}
      </div>
      {fieldEl}
      {error && (
        <p style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{error}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Form Detail — renders a single form's fields and submits
// ═══════════════════════════════════════════════════════════════
function FormDetail({ form, lang, token, onBack, onSubmitted }) {
  const [answers,     setAnswers]     = useState({});
  const [errors,      setErrors]      = useState({});
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error | duplicate
  const [errorMsg,    setErrorMsg]    = useState('');
  const api = patientApi(token);

  function setAnswer(id, val) {
    setAnswers(prev => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
  }

  function validate() {
    const errs = {};
    for (const field of (form.fields || [])) {
      if (!field.required) continue;
      const val = answers[field.id];
      const empty =
        val === undefined || val === null || val === '' ||
        (Array.isArray(val) && val.length === 0);
      if (empty) errs[field.id] = tx(lang, 'required');
    }
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitState('submitting');
    setErrorMsg('');
    try {
      const resp = await api.post('/api/patient/form-submit', {
        templateId: form.id,
        formType:   form.form_type,
        data:       answers,
      });
      if (resp.status === 409) {
        setSubmitState('duplicate');
        return;
      }
      if (!resp.ok) throw new Error(resp.data?.error || `HTTP ${resp.status}`);
      setSubmitState('success');
      onSubmitted(form.form_type);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitState('error');
    }
  }

  const title = formTitle(form, lang);

  // Success state
  if (submitState === 'success' || submitState === 'duplicate') {
    return (
      <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: C.successPale,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={32} color={C.success} />
        </div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {tx(lang, 'submitSuccess')}
          </p>
          <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
            {submitState === 'duplicate'
              ? tx(lang, 'duplicateForm')
              : tx(lang, 'submitSuccessMsg', title)
            }
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: C.teal, color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            boxShadow: `0 2px 10px ${C.teal}40`,
          }}
        >
          {tx(lang, 'backToList')}
        </button>
      </div>
    );
  }

  const fields = form.fields || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Sticky form header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px',
        backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textSub, display: 'flex' }}
        >
          <ChevronLeft size={22} />
        </button>
        <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.035em', color: C.text, flex: 1, lineHeight: 1.25 }}>{title}</p>
      </div>

      {/* Fields */}
      <div style={{ padding: '22px 20px 112px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {fields.length === 0 ? (
          <p style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginTop: 40 }}>
            {tx(lang, 'noForms')}
          </p>
        ) : (
          fields.map(field => (
            <FormField
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={setAnswer}
              lang={lang}
              errors={errors}
            />
          ))
        )}
      </div>

      {/* Submit bar (fixed at bottom) */}
      {fields.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(255,255,255,0.94)', borderTop: `1px solid ${C.border}`,
          padding: '16px 20px',
          maxWidth: 480, margin: '0 auto',
          backdropFilter: 'blur(18px)',
        }}>
          {submitState === 'error' && (
            <p style={{ fontSize: 12, color: C.error, marginBottom: 8, textAlign: 'center' }}>
              {errorMsg}
            </p>
          )}
          {Object.keys(errors).length > 0 && (
            <p style={{ fontSize: 12, color: C.error, marginBottom: 8, textAlign: 'center' }}>
              {tx(lang, 'requiredError')}
            </p>
          )}
          <PatientButton
            onClick={handleSubmit}
            disabled={submitState === 'submitting'}
          >
            {submitState === 'submitting' && (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {tx(lang, submitState === 'submitting' ? 'submitting' : 'submit')}
          </PatientButton>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Forms Tab — list of available forms
// ═══════════════════════════════════════════════════════════════
function FormsTab({ forms, lang, token, onFormSubmitted, onCelebrate = null }) {
  const [openForm, setOpenForm] = useState(null); // form object

  function handleSubmitted(formType) {
    onFormSubmitted(formType);
    onCelebrate?.();
    setOpenForm(null);
  }

  if (openForm) {
    return (
      <FormDetail
        form={openForm}
        lang={lang}
        token={token}
        onBack={() => setOpenForm(null)}
        onSubmitted={handleSubmitted}
      />
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', gap: 16, textAlign: 'center',
      }}>
        <ClipboardCheck size={40} color={C.textMt} strokeWidth={1.2} />
        <p style={{ fontSize: 14, color: C.textSub }}>{tx(lang, 'noForms')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '22px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PatientCard tone="brand" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
          <img
            src={TIKIBELL_ASSETS.document}
            alt=""
            style={{ width: 82, height: 82, objectFit: 'contain', flexShrink: 0, animation: 'tikibellFloat 4.5s ease-in-out infinite' }}
          />
          <div>
            <p style={{ fontSize: 18, fontWeight: 950, color: C.text, letterSpacing: '-0.04em', lineHeight: 1.25 }}>
              {tikibellGuideCopy(lang, 'document')[0]}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textSub, lineHeight: 1.55, marginTop: 6 }}>
              {tikibellGuideCopy(lang, 'document')[1]}
            </p>
          </div>
        </PatientCard>

        {forms.map(form => {
          const title   = formTitle(form, lang);
          const done    = form.submitted;
          return (
            <button
              key={form.id}
              type="button"
              disabled={done}
              onClick={() => {
                if (done) return;
                onCelebrate?.();
                setOpenForm(form);
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                padding: '20px', borderRadius: 24, cursor: done ? 'default' : 'pointer',
                border: `1.5px solid ${done ? 'rgba(185, 250, 72, 0.9)' : C.border}`,
                background: done ? C.successPale : C.surface,
                boxShadow: done ? 'none' : CARD_SHADOW,
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: 18, flexShrink: 0,
                background: done ? C.successPale : C.mochaPale,
                border: `1px solid ${done ? 'rgba(185, 250, 72, 0.9)' : C.mochaSoft}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <CheckCircle2 size={22} color={C.success} />
                  : <FileText size={22} color={C.mocha} strokeWidth={1.8} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.035em', color: done ? C.textSub : C.text, marginBottom: 5, lineHeight: 1.25 }}>
                  {title}
                </p>
                <p style={{ fontSize: 14, color: done ? C.success : C.textMt, fontWeight: done ? 850 : 700 }}>
                  {done
                    ? tx(lang, 'formsDone')
                    : `${(form.fields || []).length > 0 ? (form.fields || []).length : '?'} ${lang === 'ko' ? '개 항목' : lang === 'ja' ? '項目' : lang === 'zh' ? '个问题' : 'questions'}`
                  }
                </p>
              </div>
              {!done && <ChevronRight size={18} color={C.textMt} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AftercareTab({ lang, token, onStateChange = null, onCelebrate = null }) {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});

  const loadAftercare = useCallback(async () => {
    setPhase('loading');
    try {
      const api = patientApi(token);
      const res = await api.get('/api/patient/aftercare');
      if (!res.ok) throw new Error(res.data?.error || 'aftercare_load_failed');
      setData(res.data);
      onStateChange?.(res.data);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [token]);

  useEffect(() => {
    loadAftercare();
  }, [loadAftercare]);

  async function submitResponse(eventId) {
    const payload = answers[eventId] || {};
    setSubmitting(true);
    try {
      const api = patientApi(token);
      const res = await api.post('/api/patient/aftercare/respond', {
        eventId,
        payload,
      });
      if (!res.ok) throw new Error(res.data?.error || 'aftercare_submit_failed');
      setData(res.data.state);
      onStateChange?.(res.data.state);
      onCelebrate?.();
    } catch {
      // quiet for portal simplicity
    } finally {
      setSubmitting(false);
    }
  }

  function setEventField(eventId, key, value) {
    setAnswers((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        [key]: value,
      },
    }));
  }

  if (phase === 'loading') {
    return <div style={{ padding: '22px 20px 90px', color: C.textSub }}>{tx(lang, 'aftercareLoading')}</div>;
  }

  if (phase === 'error' || !data) {
    return <div style={{ padding: '22px 20px 90px', color: C.error }}>Unable to load aftercare.</div>;
  }

  return (
    <div style={{ padding: '22px 20px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PatientCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={TIKIBELL_ASSETS.aftercare}
            alt=""
            style={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0, animation: 'tikibellFloat 4.5s ease-in-out infinite' }}
          />
          <div>
            <SectionKicker>TikiBell</SectionKicker>
            <p style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-0.045em', color: C.text, lineHeight: 1.2 }}>{tx(lang, 'aftercareTitle')}</p>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.65, marginTop: 8, fontWeight: 650 }}>{tx(lang, 'aftercareSubtitle')}</p>
          </div>
        </div>
        {data.acknowledgement && (
          <div style={{ marginTop: 12, padding: '12px 13px', borderRadius: 14, background: C.warnPale, border: `1px solid ${C.warn}25`, fontSize: 12, color: C.warn, lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 4 }}>{tx(lang, 'aftercareAck')}</div>
            {data.acknowledgement}
          </div>
        )}
      </PatientCard>

      {(data.due_items || []).length === 0 && (data.completed_items || []).length === 0 ? (
        <PatientCard style={{ color: C.textSub, fontSize: 15, lineHeight: 1.6 }}>
          {tx(lang, 'aftercareEmpty')}
        </PatientCard>
      ) : null}

      {(data.due_items || []).map((event) => {
        const step = event.aftercare_steps || {};
        const current = answers[event.id] || {};
        return (
          <PatientCard key={event.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.035em', color: C.text }}>{step.step_key || tx(lang, 'aftercareDue')}</p>
                <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.65, marginTop: 7, fontWeight: 650 }}>
                  {step.content_template}
                </p>
              </div>
              <PatientBadge tone="brand">{tx(lang, 'aftercareDue')}</PatientBadge>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <label style={{ fontSize: 15, fontWeight: 750, color: C.text }}>
                Pain level (0-10)
                <input type="range" min="0" max="10" value={current.pain_level ?? 0} onChange={(e) => setEventField(event.id, 'pain_level', Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={{ fontSize: 15, fontWeight: 750, color: C.text }}>
                Swelling
                <select value={current.swelling_level || 'mild'} onChange={(e) => setEventField(event.id, 'swelling_level', e.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </label>
              <label style={{ fontSize: 15, fontWeight: 750, color: C.text }}>
                Anxiety / distress
                <select value={current.anxiety_level || 'low'} onChange={(e) => setEventField(event.id, 'anxiety_level', e.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 750, color: C.text }}>
                <input type="checkbox" checked={!!current.bleeding} onChange={(e) => setEventField(event.id, 'bleeding', e.target.checked)} />
                Bleeding
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 750, color: C.text }}>
                <input type="checkbox" checked={!!current.worsening} onChange={(e) => setEventField(event.id, 'worsening', e.target.checked)} />
                Symptoms feel worse
              </label>
              <label style={{ fontSize: 15, fontWeight: 750, color: C.text }}>
                Notes
                <textarea value={current.free_text || ''} onChange={(e) => setEventField(event.id, 'free_text', e.target.value)} rows={3} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', resize: 'vertical' }} />
              </label>
              <label style={{ fontSize: 15, fontWeight: 750, color: C.text }}>
                Satisfaction
                <select value={current.satisfaction_score || 5} onChange={(e) => setEventField(event.id, 'satisfaction_score', Number(e.target.value))} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  {[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </label>
            </div>

            <PatientButton
              onClick={() => submitResponse(event.id)}
              disabled={submitting}
              style={{ marginTop: 16 }}
            >
              {submitting ? tx(lang, 'submitting') : tx(lang, 'aftercareRespond')}
            </PatientButton>
          </PatientCard>
        );
      })}

      {(data.completed_items || []).length > 0 && (
        <PatientCard>
          <p style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 12 }}>{tx(lang, 'aftercareDone')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.completed_items.map((event) => (
              <div key={event.id} style={{ borderRadius: 14, background: C.successPale, padding: '12px 13px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.success }}>{event.aftercare_steps?.step_key || tx(lang, 'aftercareDone')}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>{event.risk_level} · {event.next_action_status || 'continue_plan'}</div>
              </div>
            ))}
          </div>
        </PatientCard>
      )}

      {data.safe_for_return && (
        <PatientButton>
          {tx(lang, 'rebookCta')}
        </PatientButton>
      )}
    </div>
  );
}

function AskTab({ lang, token, onCelebrate = null }) {
  const [phase, setPhase] = useState('loading');
  const [askData, setAskData] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(null);
  const [confirmEscalation, setConfirmEscalation] = useState(null);
  const [showHero, setShowHero] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('tikibellHeroSeen') !== '1';
  });

  function dismissHero() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tikibellHeroSeen', '1');
    }
    setShowHero(false);
  }

  const loadAsk = useCallback(async () => {
    setPhase('loading');
    try {
      const api = patientApi(token);
      const res = await api.get('/api/patient/ask');
      if (!res.ok) throw new Error(res.data?.error || 'ask_load_failed');
      setAskData(res.data);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [token]);

  useEffect(() => {
    loadAsk();
  }, [loadAsk]);

  async function sendMessage(text, messageType = 'free_text') {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const api = patientApi(token);
      const res = await api.post('/api/patient/ask/messages', {
        text: trimmed,
        messageType,
      });
      if (!res.ok) throw new Error(res.data?.error || 'send_failed');

      setAskData(prev => prev ? ({
        ...prev,
        messages: [
          ...(prev.messages || []),
          res.data.patient_message,
          res.data.assistant_message,
        ],
      }) : prev);
      setInput('');
      onCelebrate?.();
    } catch {
      // keep simple for now — no toast system in portal
    } finally {
      setSending(false);
    }
  }

  async function requestEscalation(requestType) {
    if (escalating) return;
    setEscalating(requestType);
    try {
      const api = patientApi(token);
      const reasonMap = {
        coordinator: 'manual_patient_request',
        nurse: 'aftercare_concern',
        doctor_confirmation: 'doctor_required',
      };
      const res = await api.post('/api/patient/ask/escalations', {
        requestType,
        reasonCategory: reasonMap[requestType] || 'manual_patient_request',
      });
      if (!res.ok) throw new Error(res.data?.error || 'escalation_failed');

      setAskData(prev => prev ? ({
        ...prev,
        openEscalation: res.data.request,
        messages: [
          ...(prev.messages || []),
          res.data.acknowledgement,
        ],
      }) : prev);
      onCelebrate?.();
    } catch {
      // intentionally quiet in phase 6
    } finally {
      setEscalating(null);
      setConfirmEscalation(null);
    }
  }

  if (phase === 'loading') {
    return (
      <div style={{ padding: '22px 20px 90px', color: C.textSub }}>
        {tx(lang, 'askLoading')}
      </div>
    );
  }

  if (phase === 'error' || !askData) {
    return (
      <div style={{ padding: '22px 20px 90px', color: C.error }}>
        Unable to load Ask.
      </div>
    );
  }

  return (
    <div style={{ padding: '22px 20px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {showHero && (
        <PatientCard style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <video
            src={TIKIBELL_ASSETS.hero}
            autoPlay
            muted
            playsInline
            onEnded={dismissHero}
            style={{
              display: 'block',
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              background: C.mochaPale,
            }}
          />
          <button
            type="button"
            onClick={dismissHero}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.86)',
              color: C.textSub,
              fontSize: 12,
              fontWeight: 850,
              padding: '7px 10px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            {lang === 'ko' ? '넘기기' : lang === 'ja' ? 'スキップ' : lang === 'zh' ? '跳过' : 'Skip'}
          </button>
        </PatientCard>
      )}

      <PatientCard tone="brand">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 62, height: 62, borderRadius: 22,
            background: C.surface,
            border: `1px solid ${C.mochaSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            <img
              src={TIKIBELL_ASSETS.main}
              alt=""
              style={{
                width: 58,
                height: 58,
                objectFit: 'contain',
                filter: 'grayscale(1) saturate(0.15) opacity(0.74)',
                transform: 'translateY(3px)',
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-0.045em', color: C.text }}>{tx(lang, 'askTitle')}</p>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.65, marginTop: 7, fontWeight: 650 }}>
              {tx(lang, 'askSubtitle')}
            </p>
            <p style={{ fontSize: 13, color: C.mochaDark, lineHeight: 1.58, marginTop: 8, fontWeight: 850 }}>
              {tikibellGuideCopy(lang, 'main')[1]}
            </p>
            <p style={{ fontSize: 14, color: C.mochaDark, lineHeight: 1.62, marginTop: 12, fontWeight: 800 }}>
              {askStageSummary(lang, askData.currentStage)}
            </p>
          </div>
        </div>
      </PatientCard>

      <PatientCard>
        <p style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 12 }}>
          {tx(lang, 'quickQuestions')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(askData.quickPrompts || []).map(prompt => (
            <button
              key={prompt.id}
              onClick={() => sendMessage(askPromptText(lang, prompt), 'quick_prompt')}
              style={{
                padding: '12px 12px',
                borderRadius: 18,
                border: `1px solid ${C.border}`,
                background: C.warm,
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 750,
                color: C.text,
                lineHeight: 1.5,
                cursor: 'pointer',
              }}
            >
              {askPromptText(lang, prompt)}
            </button>
          ))}
        </div>
      </PatientCard>

      <PatientCard>
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tx(lang, 'askPlaceholder')}
            rows={2}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: SANS,
              fontSize: 16,
              lineHeight: 1.55,
              color: C.text,
              background: 'transparent',
              padding: '8px 6px',
            }}
          />
          <button
            onClick={() => sendMessage(input, 'free_text')}
            disabled={sending || !input.trim()}
            style={{
              width: 50,
              height: 50,
              borderRadius: 18,
              border: 'none',
              background: sending || !input.trim() ? '#D5D9DD' : C.teal,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: sending || !input.trim() ? 'default' : 'pointer',
              flexShrink: 0,
              boxShadow: sending || !input.trim() ? 'none' : `0 10px 22px ${C.teal}26`,
            }}
            aria-label={tx(lang, 'send')}
          >
            {sending
              ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={17} />}
          </button>
        </div>
      </PatientCard>

      <PatientCard>
        <p style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 12 }}>
          {tx(lang, 'recentMessages')}
        </p>
        {(askData.messages || []).length === 0 ? (
          <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.6 }}>
            {tx(lang, 'askEmpty')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {askData.messages.map(msg => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isAssistant ? 'stretch' : 'flex-end',
                    display: 'flex',
                    gap: 8,
                    flexDirection: isAssistant ? 'row' : 'row-reverse',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 10,
                    background: isAssistant ? C.tealPale : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isAssistant
                      ? <MessageCircle size={14} color={C.tealDark} />
                      : <UserRound size={14} color={C.textSub} />}
                  </div>
                  <div style={{
                    maxWidth: '82%',
                    background: isAssistant ? '#F8FBFC' : '#F7F7F6',
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    padding: '11px 12px',
                  }}>
                    <p style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PatientCard>

      <PatientCard>
        <p style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 12 }}>
          {tx(lang, 'escalation')}
        </p>
        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginBottom: 12, fontWeight: 650 }}>
          {tx(lang, 'escalationHelp')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(askData.escalationOptions || []).map(option => {
            const Icon = option.id === 'doctor_confirmation' ? Stethoscope : ShieldAlert;
            const label = askEscalationLabel(lang, option);
            return (
              <button
                key={option.id}
                onClick={() => setConfirmEscalation({ id: option.id, label })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 18,
                  border: `1px solid ${C.border}`,
                  background: C.warm,
                  cursor: 'pointer',
                  color: C.text,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                <Icon size={16} color={C.warn} />
                <span>{label}</span>
                {escalating === option.id && (
                  <Loader2 size={14} color={C.textSub} style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />
                )}
              </button>
            );
          })}
        </div>
        {askData.openEscalation?.patient_visible_status_text && (
          <div style={{
            marginTop: 12,
            padding: '12px 13px',
            borderRadius: 14,
            background: C.warnPale,
            border: `1px solid ${C.warn}25`,
            fontSize: 12,
            color: C.warn,
            lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 4, letterSpacing: '0.03em' }}>
              {tx(lang, 'escalationStatus')}
            </div>
          {askData.openEscalation.patient_visible_status_text}
          </div>
        )}
      </PatientCard>

      {confirmEscalation && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15, 23, 42, 0.34)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setConfirmEscalation(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 28,
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 18,
                background: C.warnPale,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ShieldAlert size={22} color={C.warn} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 950, color: C.text, letterSpacing: '-0.04em', lineHeight: 1.2 }}>
                  {tx(lang, 'escalationConfirmTitle')}
                </p>
                <p style={{ marginTop: 8, fontSize: 14, fontWeight: 650, lineHeight: 1.6, color: C.textSub }}>
                  {tx(lang, 'escalationConfirmBody', confirmEscalation.label)}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setConfirmEscalation(null)}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  color: C.textSub,
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                {tx(lang, 'escalationConfirmCancel')}
              </button>
              <button
                type="button"
                onClick={() => requestEscalation(confirmEscalation.id)}
                disabled={!!escalating}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  border: 'none',
                  background: C.teal,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 950,
                  cursor: escalating ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: `0 12px 26px ${C.teal}28`,
                  opacity: escalating ? 0.75 : 1,
                }}
              >
                {escalating && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {tx(lang, 'escalationConfirmSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MyTikiPortal — root component
// ═══════════════════════════════════════════════════════════════
export default function MyTikiPortal() {
  const { token } = useParams();

  // ── State ─────────────────────────────────────────────────────
  const [phase,     setPhase]     = useState('loading'); // loading | error | ready
  const [errType,   setErrType]   = useState(null);      // invalid | expired | revoked | generic
  const [lang,      setLang]      = useState('ko');
  const [patient,   setPatient]   = useState(null);
  const [visit,     setVisit]     = useState(null);
  const [clinic,    setClinic]    = useState(null);
  const [clinicRuleConfig, setClinicRuleConfig] = useState(null);
  const [forms,     setForms]     = useState([]);
  const [aftercarePreview, setAftercarePreview] = useState(null);
  const [tab,       setTab]       = useState('journey'); // journey | forms | ask | aftercare
  const [arrivedAt, setArrivedAt] = useState(null);     // patient_arrived_at ISO string or null
  const [sparkleKey, setSparkleKey] = useState(0);

  const triggerTikibellSparkle = useCallback(() => {
    setSparkleKey((prev) => prev + 1);
  }, []);

  const goToFormsWithTikibell = useCallback(() => {
    triggerTikibellSparkle();
    setTab('forms');
  }, [triggerTikibellSparkle]);

  const goToAftercareWithTikibell = useCallback(() => {
    triggerTikibellSparkle();
    setTab('aftercare');
  }, [triggerTikibellSparkle]);

  // ── Bootstrap — fetch patient context + forms ─────────────────
  const api = patientApi(token);

  const bootstrap = useCallback(async () => {
    setPhase('loading');
    try {
      const meRes = await api.get('/api/patient/me');

      if (!meRes.ok) {
        if (meRes.status === 403) {
          const msg = meRes.data?.error || '';
          setErrType(msg.includes('revoked') ? 'revoked' : 'expired');
        } else {
          setErrType('invalid');
        }
        setPhase('error');
        return;
      }

      const detectedLang = meRes.data?.patient_lang || meRes.data?.patient?.lang || 'ko';
      setLang(detectedLang);
      setPatient(meRes.data?.patient || null);
      setVisit(meRes.data?.visit   || null);
      setClinic(meRes.data?.clinic  || null);
      setClinicRuleConfig(meRes.data?.clinic_rule_config || null);
      setArrivedAt(meRes.data?.visit?.patient_arrived_at || null);

      // Fetch forms in parallel (don't block portal render on form error)
      const formsRes = await api.get('/api/patient/forms');
      if (formsRes.ok) {
        setForms(formsRes.data?.forms || []);
      }

      const aftercareRes = await api.get('/api/patient/aftercare');
      if (aftercareRes.ok) {
        setAftercarePreview(aftercareRes.data || null);
      } else {
        setAftercarePreview(null);
      }

      setPhase('ready');
    } catch {
      setErrType('generic');
      setPhase('error');
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ── Optimistic form submission update ─────────────────────────
  function handleFormSubmitted(formType) {
    setForms(prev => prev.map(f =>
      f.form_type === formType
        ? { ...f, submitted: true, submitted_at: new Date().toISOString() }
        : f
    ));
    // Also update visit flags locally for Journey CTA
    if (formType === 'intake')   setVisit(prev => prev ? { ...prev, intake_done:   true } : prev);
    if (formType === 'consent')  setVisit(prev => prev ? { ...prev, consent_done:  true } : prev);
    if (formType === 'followup') setVisit(prev => prev ? { ...prev, followup_done: true } : prev);
  }

  // ── formsStatus helper for Journey CTA ────────────────────────
  const formsStatus = {
    hasIntake:  forms.some(f => f.form_type === 'intake'),
    hasConsent: forms.some(f => f.form_type === 'consent'),
    hasAny:     forms.length > 0,
    pendingCount: forms.filter(f => !f.submitted).length,
  };

  // ── Pending forms badge ────────────────────────────────────────
  const pendingCount = formsStatus.pendingCount;

  // ── Render ────────────────────────────────────────────────────
  if (phase === 'loading') return <LoadingScreen lang={lang} />;
  if (phase === 'error')   return <ErrorScreen type={errType} lang={lang} />;

  return (
    <div style={{
      fontFamily: SANS,
      minHeight: '100dvh',
      maxWidth: 480,
      margin: '0 auto',
      background: C.appBg,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '0 0 0 1px rgba(231,221,215,0.6)',
    }}>
      <style>{`
        @keyframes tikibellFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.94)',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px 15px',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30,
        backdropFilter: 'blur(18px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 16,
              background: C.mocha,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 24px rgba(1,69,242,0.22)',
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>T</span>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 950, color: C.text, lineHeight: 1.1, letterSpacing: '-0.04em' }}>
                {clinic?.clinic_short_name || clinic?.clinic_name || 'My Tiki'}
              </p>
              {patient?.name && (
                <p style={{ fontSize: 13, fontWeight: 750, color: C.textSub, lineHeight: 1.1, marginTop: 4 }}>
                  {patient.flag || ''} {patient.name}
                </p>
              )}
            </div>
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            style={{
              minWidth: 104,
              height: 38,
              borderRadius: 999,
              border: `1px solid ${C.border}`,
              background: C.warm,
              color: C.textSub,
              fontSize: 13,
              fontWeight: 850,
              padding: '0 10px',
              outline: 'none',
            }}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        {tab === 'journey' && (
          <JourneyTab
            patient={patient}
            visit={visit}
            clinic={clinic}
            lang={lang}
            formsStatus={formsStatus}
            clinicRuleConfig={clinicRuleConfig}
            onGoToForms={goToFormsWithTikibell}
            onGoToAftercare={goToAftercareWithTikibell}
            aftercareState={aftercarePreview}
            arrivedAt={arrivedAt}
            onArrived={setArrivedAt}
            token={token}
            onCelebrate={triggerTikibellSparkle}
          />
        )}
        {tab === 'forms' && (
          <FormsTab
            forms={forms}
            lang={lang}
            token={token}
            onFormSubmitted={handleFormSubmitted}
            onCelebrate={triggerTikibellSparkle}
          />
        )}
        {tab === 'ask' && (
          <AskTab
            lang={lang}
            token={token}
            onCelebrate={triggerTikibellSparkle}
          />
        )}
        {tab === 'aftercare' && (
          <AftercareTab
            lang={lang}
            token={token}
            onStateChange={setAftercarePreview}
            onCelebrate={triggerTikibellSparkle}
          />
        )}
      </div>

      <TikibellSparkleOverlay sparkleKey={sparkleKey} />

      {/* ── Bottom tab bar ───────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.94)',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'blur(18px)',
      }}>
        {[
          { id: 'journey', icon: MapPin,          labelKey: 'journey' },
          { id: 'forms',   icon: FileText,        labelKey: 'forms',  badge: pendingCount },
          { id: 'ask',     icon: MessageCircle,   labelKey: 'ask' },
          { id: 'aftercare', icon: ClipboardCheck, labelKey: 'aftercare' },
        ].map(({ id, icon: Icon, labelKey, badge }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '11px 8px 13px',
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? C.mocha : C.textMt}
                />
                {badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    width: 16, height: 16, borderRadius: '50%',
                    background: C.error, color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #fff',
                  }}>
                    {badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 900 : 750, color: active ? C.mochaDark : C.textMt, lineHeight: 1.15, maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx(lang, labelKey)}
              </span>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                  background: C.mocha, borderRadius: '0 0 2px 2px',
                }} />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
