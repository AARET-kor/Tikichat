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
  bg:        '#F8F6F3',
  surface:   '#FFFFFF',
  teal:      '#4E8FA0',
  tealPale:  '#EDF4F6',
  tealDark:  '#3A7080',
  text:      '#1A1A1A',
  textSub:   '#6B7280',
  textMt:    '#9CA3AF',
  border:    '#E5E7EB',
  success:   '#16A34A',
  successPale: '#F0FDF4',
  warn:      '#D97706',
  warnPale:  '#FFFBEB',
  error:     '#DC2626',
  errorPale: '#FEF2F2',
  stage: {
    done:    '#4E8FA0',
    current: '#4E8FA0',
    future:  '#D1D5DB',
  },
};

const SANS = "'Pretendard Variable', 'Inter', -apple-system, sans-serif";

// ── i18n strings ──────────────────────────────────────────────
const I18N = {
  ko: {
    greeting:       (name) => `안녕하세요, ${name}님 👋`,
    greetingGeneric:'안녕하세요 👋',
    journey:        '방문 여정',
    forms:          '서류 작성',
    ask:            'Ask TikiBell',
    aftercare:      '사후 체크',
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
      post_care: '사후 관리',
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
    aftercareLoading:'사후 체크를 불러오는 중…',
    aftercareEmpty:  '현재 예정된 사후 체크 항목이 없습니다.',
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
      post_care: '사후 관리 단계입니다. 승인된 aftercare 안내 범위에서만 답변합니다.',
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
      background: C.bg, fontFamily: SANS, padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: type === 'expired' ? C.warnPale : C.errorPale,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <AlertTriangle size={24} color={type === 'expired' ? C.warn : C.error} strokeWidth={1.8} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        {tx(lang, msgKey)}
      </p>
      <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
        {tx(lang, 'contactStaff')}
      </p>
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
      background: C.bg, fontFamily: SANS, gap: 16,
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

function ArrivalCard({ lang, token, arrivedAt, onArrived }) {
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
      <div style={{
        margin: '0 0 4px',
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${C.success}30`,
        background: C.successPale,
      }}>
        {/* Confirmed banner */}
        <div style={{
          padding: '16px 20px 12px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: C.success + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={22} color={C.success} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.success, lineHeight: 1.2 }}>
              {tx(lang, 'arrivedTitle')}
            </p>
            <p style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              {tx(lang, 'arrivedSub')}
            </p>
          </div>
        </div>

        {/* Translation strip — show to front desk */}
        <div style={{
          margin: '0 12px 12px',
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 14px',
            background: C.teal,
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
                  fontSize: pLang === lang ? 16 : 13,
                  fontWeight: pLang === lang ? 700 : 400,
                  color: pLang === lang ? C.text : C.textSub,
                  lineHeight: 1.4,
                }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not yet arrived: show "I'm here" button ───────────────────
  return (
    <div style={{
      margin: '0 0 4px',
      borderRadius: 18,
      background: C.tealPale,
      border: `1px solid ${C.teal}25`,
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: C.teal + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Navigation size={20} color={C.teal} strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.tealDark, lineHeight: 1.2 }}>
            {tx(lang, 'arrivalCard')}
          </p>
          <p style={{ fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.4 }}>
            {tx(lang, 'arrivalSub')}
          </p>
        </div>
      </div>

      <button
        onClick={handleArrive}
        disabled={phase === 'sending'}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
          background: phase === 'sending' ? C.teal + '80' : C.teal,
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: phase === 'sending' ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 2px 12px ${C.teal}40`,
          transition: 'opacity 0.2s',
        }}
      >
        {phase === 'sending' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
        {tx(lang, phase === 'sending' ? 'arrivalSending' : 'arrivalBtn')}
      </button>

      {phase === 'error' && (
        <p style={{ fontSize: 12, color: C.error, textAlign: 'center' }}>
          {tx(lang, 'errorGeneric')}
        </p>
      )}

      <div style={{
        borderRadius: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 14px',
          background: '#F6F7F8',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Navigation size={11} color={C.tealDark} strokeWidth={2.5} />
          <p style={{ fontSize: 11, fontWeight: 700, color: C.tealDark }}>
            {tx(lang, 'arrivalFallback')}
          </p>
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ARRIVAL_PHRASES.map(({ flag, lang: pLang, text }) => (
            <div key={pLang} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{flag}</span>
              <p style={{
                fontSize: pLang === lang ? 15 : 12.5,
                fontWeight: pLang === lang ? 700 : 400,
                color: pLang === lang ? C.text : C.textSub,
                lineHeight: 1.4,
              }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Journey Tab
// ═══════════════════════════════════════════════════════════════
function JourneyTab({ patient, visit, clinic, lang, onGoToForms, onGoToAftercare, formsStatus, aftercareState, clinicRuleConfig, arrivedAt, onArrived, token }) {
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
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Arrival Card (today only) */}
      {showArrival && (
        <ArrivalCard
          lang={lang}
          token={token}
          arrivedAt={arrivedAt}
          onArrived={onArrived}
        />
      )}

      {/* Today / next actions */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: '18px 18px',
        border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {lang === 'ko' ? 'Today' : lang === 'ja' ? 'Today' : lang === 'zh' ? 'Today' : 'Today'}
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {lang === 'ko' ? '오늘 / 다음 액션' : lang === 'ja' ? '今日 / 次のアクション' : lang === 'zh' ? '今天 / 下一步' : 'Today / Next Actions'}
          </p>
        </div>
        {todayTasks.map((task) => {
          const copy = taskCopy(task.key);
          return (
            <div
              key={task.key}
              style={{
                borderRadius: 14,
                border: `1px solid ${task.tone === 'calm' ? C.success + '25' : task.tone === 'watch' ? C.warn + '30' : C.teal + '20'}`,
                background: task.tone === 'calm' ? C.successPale : task.tone === 'watch' ? C.warnPale : C.tealPale,
                padding: '14px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: task.tone === 'calm' ? C.success : task.tone === 'watch' ? C.warn : C.tealDark, marginBottom: 4 }}>
                  {copy.title}
                </p>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>
                  {copy.body}
                </p>
              </div>
              {copy.action && (
                <button
                  onClick={copy.action}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: C.teal,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copy.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Greeting */}
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
          {patientName ? tx(lang, 'greeting', patientName) : tx(lang, 'greetingGeneric')}
        </p>
        {clinic?.clinic_name && (
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            {clinic.clinic_name}
          </p>
        )}
      </div>

      {/* Procedure + date card */}
      {visit && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: '18px 20px',
          border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ marginBottom: procName ? 14 : 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {tx(lang, 'procedure')}
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
              {procName || tx(lang, 'noProcedure')}
            </p>
          </div>
          {visitDate && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {tx(lang, 'visitDate')}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                {visitDate}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stage progress */}
      {visit && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: '20px',
          border: `1px solid ${C.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.textMt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 18 }}>
            {tx(lang, 'journey')}
          </p>
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
                      background: isFuture ? 'transparent' : C.teal,
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
                        background: isDone ? C.teal : C.border,
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <div style={{ paddingBottom: isLast ? 0 : 28, paddingTop: 1 }}>
                    <p style={{
                      fontSize: isCurrent ? 14 : 13,
                      fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                      color: isCurrent ? C.teal : isDone ? C.text : C.textMt,
                      lineHeight: 1.2,
                    }}>
                      {tx(lang, 'stage')[s] || s}
                    </p>
                    {isCurrent && (
                      <p style={{ fontSize: 11, color: C.teal, marginTop: 2, fontWeight: 500 }}>
                        ← {lang === 'ko' ? '현재 단계' : lang === 'ja' ? '現在' : lang === 'zh' ? '当前阶段' : 'Current'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next-step CTA */}
      {ctaMsg && (
        <div style={{
          background: ctaAction ? C.tealPale : C.successPale,
          border: `1px solid ${ctaAction ? C.teal + '30' : C.success + '30'}`,
          borderRadius: 14, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: ctaAction ? C.tealDark : C.success, flex: 1, lineHeight: 1.4 }}>
            {ctaMsg}
          </p>
          {ctaAction && (
            <button
              onClick={ctaAction}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: C.teal, color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: `0 2px 8px ${C.teal}40`,
              }}
            >
              {tx(lang, 'goToForms')}
              <ChevronRight size={13} />
            </button>
          )}
        </div>
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
        fontSize: 15, color: C.text, background: C.surface,
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
        fontSize: 15, color: C.text, background: C.surface,
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
              padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
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
            <span style={{ fontSize: 15, color: C.text, fontWeight: checked ? 600 : 400 }}>
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
          padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
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
        <span style={{ fontSize: 15, color: C.text, fontWeight: checked ? 600 : 400 }}>
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
              padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
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
            <span style={{ fontSize: 15, color: C.text, fontWeight: checked ? 600 : 400 }}>
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
        width: '100%', padding: '12px 14px', borderRadius: 10,
        border: `1.5px solid ${error ? C.error : C.border}`,
        fontSize: 15, color: C.text, background: C.surface,
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
        width: '100%', padding: '24px 20px', borderRadius: 12, cursor: 'pointer',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</label>
        {req && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.teal,
            background: C.tealPale, borderRadius: 4, padding: '1px 5px',
          }}>
            {tx(lang, 'required')}
          </span>
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
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textSub, display: 'flex' }}
        >
          <ChevronLeft size={22} />
        </button>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{title}</p>
      </div>

      {/* Fields */}
      <div style={{ padding: '20px 20px 100px', display: 'flex', flexDirection: 'column', gap: 22 }}>
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
          background: C.surface, borderTop: `1px solid ${C.border}`,
          padding: '16px 20px',
          maxWidth: 480, margin: '0 auto',
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
          <button
            onClick={handleSubmit}
            disabled={submitState === 'submitting'}
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none',
              background: submitState === 'submitting' ? C.teal + '80' : C.teal,
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitState === 'submitting' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 2px 12px ${C.teal}40`,
            }}
          >
            {submitState === 'submitting' && (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {tx(lang, submitState === 'submitting' ? 'submitting' : 'submit')}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Forms Tab — list of available forms
// ═══════════════════════════════════════════════════════════════
function FormsTab({ forms, lang, token, onFormSubmitted }) {
  const [openForm, setOpenForm] = useState(null); // form object

  function handleSubmitted(formType) {
    onFormSubmitted(formType);
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
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {forms.map(form => {
          const title   = formTitle(form, lang);
          const done    = form.submitted;
          return (
            <button
              key={form.id}
              type="button"
              disabled={done}
              onClick={() => !done && setOpenForm(form)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 18px', borderRadius: 16, cursor: done ? 'default' : 'pointer',
                border: `1.5px solid ${done ? C.teal + '40' : C.border}`,
                background: done ? C.successPale : C.surface,
                boxShadow: done ? 'none' : '0 1px 8px rgba(0,0,0,0.05)',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: done ? C.teal + '15' : C.tealPale,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <CheckCircle2 size={22} color={C.success} />
                  : <FileText size={22} color={C.teal} strokeWidth={1.8} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: done ? C.textSub : C.text, marginBottom: 3 }}>
                  {title}
                </p>
                <p style={{ fontSize: 12, color: done ? C.success : C.textMt, fontWeight: done ? 600 : 400 }}>
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

function AftercareTab({ lang, token, onStateChange = null }) {
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
    <div style={{ padding: '18px 16px 92px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{tx(lang, 'aftercareTitle')}</p>
        <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginTop: 4 }}>{tx(lang, 'aftercareSubtitle')}</p>
        {data.acknowledgement && (
          <div style={{ marginTop: 12, padding: '12px 13px', borderRadius: 14, background: C.warnPale, border: `1px solid ${C.warn}25`, fontSize: 12, color: C.warn, lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 4 }}>{tx(lang, 'aftercareAck')}</div>
            {data.acknowledgement}
          </div>
        )}
      </div>

      {(data.due_items || []).length === 0 && (data.completed_items || []).length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, color: C.textSub, fontSize: 13 }}>
          {tx(lang, 'aftercareEmpty')}
        </div>
      ) : null}

      {(data.due_items || []).map((event) => {
        const step = event.aftercare_steps || {};
        const current = answers[event.id] || {};
        return (
          <div key={event.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{step.step_key || tx(lang, 'aftercareDue')}</p>
                <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginTop: 4 }}>
                  {step.content_template}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.tealDark, background: C.tealPale, borderRadius: 999, padding: '6px 10px' }}>
                {tx(lang, 'aftercareDue')}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <label style={{ fontSize: 12, color: C.text }}>
                Pain level (0-10)
                <input type="range" min="0" max="10" value={current.pain_level ?? 0} onChange={(e) => setEventField(event.id, 'pain_level', Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={{ fontSize: 12, color: C.text }}>
                Swelling
                <select value={current.swelling_level || 'mild'} onChange={(e) => setEventField(event.id, 'swelling_level', e.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: C.text }}>
                Anxiety / distress
                <select value={current.anxiety_level || 'low'} onChange={(e) => setEventField(event.id, 'anxiety_level', e.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text }}>
                <input type="checkbox" checked={!!current.bleeding} onChange={(e) => setEventField(event.id, 'bleeding', e.target.checked)} />
                Bleeding
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text }}>
                <input type="checkbox" checked={!!current.worsening} onChange={(e) => setEventField(event.id, 'worsening', e.target.checked)} />
                Symptoms feel worse
              </label>
              <label style={{ fontSize: 12, color: C.text }}>
                Notes
                <textarea value={current.free_text || ''} onChange={(e) => setEventField(event.id, 'free_text', e.target.value)} rows={3} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', resize: 'vertical' }} />
              </label>
              <label style={{ fontSize: 12, color: C.text }}>
                Satisfaction
                <select value={current.satisfaction_score || 5} onChange={(e) => setEventField(event.id, 'satisfaction_score', Number(e.target.value))} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff' }}>
                  {[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </label>
            </div>

            <button
              onClick={() => submitResponse(event.id)}
              disabled={submitting}
              style={{
                width: '100%',
                marginTop: 14,
                padding: '13px 18px',
                borderRadius: 14,
                border: 'none',
                background: C.teal,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? tx(lang, 'submitting') : tx(lang, 'aftercareRespond')}
            </button>
          </div>
        );
      })}

      {(data.completed_items || []).length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>{tx(lang, 'aftercareDone')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.completed_items.map((event) => (
              <div key={event.id} style={{ borderRadius: 14, background: C.successPale, padding: '12px 13px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.success }}>{event.aftercare_steps?.step_key || tx(lang, 'aftercareDone')}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: C.textSub }}>{event.risk_level} · {event.next_action_status || 'continue_plan'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.safe_for_return && (
        <button
          style={{
            padding: '14px 18px',
            borderRadius: 16,
            border: 'none',
            background: C.teal,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: `0 2px 12px ${C.teal}35`,
          }}
        >
          {tx(lang, 'rebookCta')}
        </button>
      )}
    </div>
  );
}

function AskTab({ lang, token }) {
  const [phase, setPhase] = useState('loading');
  const [askData, setAskData] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(null);

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
    } catch {
      // intentionally quiet in phase 6
    } finally {
      setEscalating(null);
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
    <div style={{ padding: '18px 16px 92px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: C.tealPale,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageCircle size={20} color={C.tealDark} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{tx(lang, 'askTitle')}</p>
            <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginTop: 4 }}>
              {tx(lang, 'askSubtitle')}
            </p>
            <p style={{ fontSize: 12, color: C.tealDark, lineHeight: 1.55, marginTop: 10, fontWeight: 600 }}>
              {askStageSummary(lang, askData.currentStage)}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 16,
      }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          {tx(lang, 'quickQuestions')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(askData.quickPrompts || []).map(prompt => (
            <button
              key={prompt.id}
              onClick={() => sendMessage(askPromptText(lang, prompt), 'quick_prompt')}
              style={{
                padding: '12px 12px',
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: '#FBFBFA',
                textAlign: 'left',
                fontSize: 12,
                color: C.text,
                lineHeight: 1.45,
                cursor: 'pointer',
              }}
            >
              {askPromptText(lang, prompt)}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 16,
      }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          {tx(lang, 'escalation')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(askData.escalationOptions || []).map(option => {
            const Icon = option.id === 'doctor_confirmation' ? Stethoscope : ShieldAlert;
            return (
              <button
                key={option.id}
                onClick={() => requestEscalation(option.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  background: '#FFFDFC',
                  cursor: 'pointer',
                  color: C.text,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Icon size={16} color={C.warn} />
                <span>{askEscalationLabel(lang, option)}</span>
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
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 16,
      }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          {tx(lang, 'recentMessages')}
        </p>
        {(askData.messages || []).length === 0 ? (
          <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>
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
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        background: `linear-gradient(180deg, rgba(248,246,243,0) 0%, ${C.bg} 18%, ${C.bg} 100%)`,
        paddingTop: 8,
      }}>
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
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
              fontSize: 13,
              lineHeight: 1.45,
              color: C.text,
              background: 'transparent',
              padding: '8px 6px',
            }}
          />
          <button
            onClick={() => sendMessage(input, 'free_text')}
            disabled={sending || !input.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: 'none',
              background: sending || !input.trim() ? '#D5D9DD' : C.teal,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: sending || !input.trim() ? 'default' : 'pointer',
              flexShrink: 0,
            }}
            aria-label={tx(lang, 'send')}
          >
            {sending
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={16} />}
          </button>
        </div>
      </div>
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
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px 14px',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: C.teal,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>T</span>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
                {clinic?.clinic_short_name || clinic?.clinic_name || 'My Tiki'}
              </p>
              {patient?.name && (
                <p style={{ fontSize: 11, color: C.textSub, lineHeight: 1.1 }}>
                  {patient.flag || ''} {patient.name}
                </p>
              )}
            </div>
          </div>
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
            onGoToForms={() => setTab('forms')}
            onGoToAftercare={() => setTab('aftercare')}
            aftercareState={aftercarePreview}
            arrivedAt={arrivedAt}
            onArrived={setArrivedAt}
            token={token}
          />
        )}
        {tab === 'forms' && (
          <FormsTab
            forms={forms}
            lang={lang}
            token={token}
            onFormSubmitted={handleFormSubmitted}
          />
        )}
        {tab === 'ask' && (
          <AskTab
            lang={lang}
            token={token}
          />
        )}
        {tab === 'aftercare' && (
          <AftercareTab
            lang={lang}
            token={token}
            onStateChange={setAftercarePreview}
          />
        )}
      </div>

      {/* ── Bottom tab bar ───────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
                gap: 4, padding: '10px 8px 12px',
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? C.teal : C.textMt}
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
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.teal : C.textMt }}>
                {tx(lang, labelKey)}
              </span>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                  background: C.teal, borderRadius: '0 0 2px 2px',
                }} />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
