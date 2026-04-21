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
} from 'lucide-react';

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
  },
  en: {
    greeting:       (name) => `Hello, ${name} 👋`,
    greetingGeneric:'Hello 👋',
    journey:        'My Journey',
    forms:          'Forms',
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
  },
  ja: {
    greeting:       (name) => `こんにちは、${name}様 👋`,
    greetingGeneric:'こんにちは 👋',
    journey:        'ご来院の流れ',
    forms:          '書類記入',
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
  },
  zh: {
    greeting:       (name) => `您好，${name} 👋`,
    greetingGeneric:'您好 👋',
    journey:        '就诊流程',
    forms:          '填写表格',
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
  },
};

// fallback to 'en' for unknown langs
function tx(lang, key, ...args) {
  const dict = I18N[lang] || I18N.en;
  const val  = dict[key] ?? I18N.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
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
// Journey Tab
// ═══════════════════════════════════════════════════════════════
function JourneyTab({ patient, visit, clinic, lang, onGoToForms, formsStatus }) {
  const stage       = visit?.stage || 'booked';
  const stageIdx    = STAGES.indexOf(stage);
  const patientName = patient?.name || '';
  const procName    = (lang !== 'ko' && visit?.procedures?.name_en)
    ? visit.procedures.name_en
    : visit?.procedures?.name_ko || null;
  const visitDate   = visit?.visit_date;

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

// ═══════════════════════════════════════════════════════════════
// MyTikiPortal — root component
// ═══════════════════════════════════════════════════════════════
export default function MyTikiPortal() {
  const { token } = useParams();

  // ── State ─────────────────────────────────────────────────────
  const [phase,   setPhase]   = useState('loading'); // loading | error | ready
  const [errType, setErrType] = useState(null);      // invalid | expired | revoked | generic
  const [lang,    setLang]    = useState('ko');
  const [patient, setPatient] = useState(null);
  const [visit,   setVisit]   = useState(null);
  const [clinic,  setClinic]  = useState(null);
  const [forms,   setForms]   = useState([]);
  const [tab,     setTab]     = useState('journey'); // journey | forms

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

      // Fetch forms in parallel (don't block portal render on form error)
      const formsRes = await api.get('/api/patient/forms');
      if (formsRes.ok) {
        setForms(formsRes.data?.forms || []);
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
            onGoToForms={() => setTab('forms')}
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
