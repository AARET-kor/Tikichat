/**
 * client/src/components/mytiki/QuickVisitCreate.jsx
 * ─────────────────────────────────────────────────────────────
 * Quick Visit Create modal — integrates IntakeParser → API creation flow.
 *
 * Steps:
 *   parse    → IntakeParser (staff pastes booking note, confirms)
 *   creating → sequential API calls (patient → visit → link)
 *   done     → show patient name + My Tiki URL with copy button
 *   error    → error message + retry button
 *
 * Props:
 *   clinicId   — from AuthContext
 *   darkMode   — bool
 *   onClose()  — dismiss (no creation)
 *   initialText — optional text from TikiPaste handoff
 *   onCreated(normalizedVisit) — refresh parent after success
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Check, Copy, Link2, AlertTriangle, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import IntakeParser from '../shared/IntakeParser';

const TEAL = '#4E8FA0';
const SANS = "'Pretendard Variable', 'Inter', system-ui, sans-serif";

// ── Auth headers helper ────────────────────────────────────────────────────────
async function getAuthHeaders() {
  const { data: { session: sb } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (sb?.access_token) headers['Authorization'] = `Bearer ${sb.access_token}`;
  return headers;
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ step }) {
  const steps = ['parse', 'creating', 'done'];
  const idx   = steps.indexOf(step);
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <div
          key={s}
          style={{
            width:  i === idx ? 16 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= idx ? TEAL : '#D1D5DB',
            transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  );
}

// ── QuickVisitCreate ───────────────────────────────────────────────────────────
export default function QuickVisitCreate({ clinicId, darkMode, initialText = '', onClose, onCreated }) {
  const [step,      setStep]      = useState('parse');   // parse | creating | done | error
  const [errMsg,    setErrMsg]    = useState('');
  const [result,    setResult]    = useState(null);      // { patientName, url, visitId }
  const [copied,    setCopied]    = useState(false);
  const [savedPatient, setSavedPatient] = useState(null);   // store for retry
  const [savedVisit,   setSavedVisit]   = useState(null);
  const [procedureOptions, setProcedureOptions] = useState([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [parserAuthHeaders, setParserAuthHeaders] = useState({ 'Content-Type': 'application/json' });
  const [parserAuthReady, setParserAuthReady] = useState(false);
  const [parserAuthError, setParserAuthError] = useState('');

  // ── Theme ──────────────────────────────────────────────────────────────────
  const overlay   = darkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const panelBg   = darkMode ? '#18181B' : '#FFFFFF';
  const headerBg  = darkMode ? '#27272A' : '#F9FAFB';
  const border    = darkMode ? '#3F3F46' : '#E5E7EB';
  const textP     = darkMode ? '#F4F4F5' : '#111827';
  const textS     = darkMode ? '#A1A1AA' : '#6B7280';

  useEffect(() => {
    let active = true;
    async function loadHeaders() {
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) throw new Error('staff session required');
        if (active) {
          setParserAuthHeaders(headers);
          setParserAuthReady(true);
          setParserAuthError('');
        }
      } catch {
        if (active) {
          setParserAuthHeaders({ 'Content-Type': 'application/json' });
          setParserAuthReady(false);
          setParserAuthError('로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.');
        }
      }
    }
    async function loadProcedures() {
      if (!clinicId) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/clinic-procedures?clinic_id=${encodeURIComponent(clinicId)}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (active) setProcedureOptions(data.procedures || []);
      } catch {
        if (active) setProcedureOptions([]);
      }
    }
    loadHeaders();
    loadProcedures();
    return () => { active = false; };
  }, [clinicId]);

  // ── Creation flow ──────────────────────────────────────────────────────────
  const create = useCallback(async (patient, visit) => {
    setSavedPatient(patient);
    setSavedVisit(visit);
    setStep('creating');
    setErrMsg('');

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.');
      }

      // Step 1: Create patient
      const patRes = await fetch('/api/patients', {
        method:  'POST',
        headers,
        body: JSON.stringify({
          patient: {
            name:         patient.name,
            birth_year:   patient.birth_year || null,
            gender:       patient.gender     || null,
            nationality:  patient.nationality || null,
            lang:         patient.lang       || null,
            channel_refs: patient.channel_refs || {},
            flag:         langToFlag(patient.lang, patient.nationality),
            notes:        visit.internal_notes || null,
            tags:         [],
          },
        }),
      });
      const patData = await patRes.json();
      if (!patRes.ok) throw new Error(patData.error || `환자 생성 실패 (${patRes.status})`);

      const patientId = patData.id;

      // Step 2: Create visit
      const visRes = await fetch('/api/my-tiki/visits', {
        method:  'POST',
        headers,
        body: JSON.stringify({
          patientId,
          procedureId: visit.procedure_id || null,
          visitDate:  visit.visit_date    || null,
          notes:      visit.internal_notes || null,
        }),
      });
      const visData = await visRes.json();
      if (!visRes.ok) throw new Error(visData.error || `방문 생성 실패 (${visRes.status})`);

      const visitId = visData.id;

      // Step 3: Generate My Tiki link
      const lnkRes = await fetch('/api/my-tiki/links', {
        method:  'POST',
        headers,
        body: JSON.stringify({
          visitId,
          patientLang: patient.lang || 'ko',
        }),
      });
      const lnkData = await lnkRes.json();
      if (!lnkRes.ok) throw new Error(lnkData.error || `링크 발급 실패 (${lnkRes.status})`);

      setResult({
        patientName: patient.name,
        patientFlag: langToFlag(patient.lang, patient.nationality),
        patientId,
        visitId,
        url: lnkData.url,
        expiresAt: lnkData.expires_at,
      });
      setStep('done');

      // Notify parent — pass a minimal normalized visit for list refresh
      if (onCreated) {
        onCreated({
          id:               visitId,
          patient_id:       patientId,
          procedure_id:     visit.procedure_id || null,
          patients: {
            name:  patient.name,
            flag:  langToFlag(patient.lang, patient.nationality),
            lang:  patient.lang || 'ko',
          },
          procedures:       visit.procedure_id
            ? procedureOptions.find((procedure) => procedure.id === visit.procedure_id) || null
            : null,
          visit_date:       visit.visit_date || null,
          stage:            'booked',
          link_status:      'active',
          link: {
            id:              lnkData.link_id,
            status:          'active',
            expires_at:      lnkData.expires_at,
            first_opened_at: null,
          },
          intake_done:      false,
          consent_done:     false,
          followup_done:    false,
          unreviewed_forms: 0,
        });
      }
    } catch (err) {
      setErrMsg(err.message);
      setStep('error');
    }
  }, [onCreated, procedureOptions]);

  function retry() {
    if (savedPatient && savedVisit) {
      create(savedPatient, { ...savedVisit, procedure_id: selectedProcedureId || null });
    } else {
      setSelectedProcedureId('');
      setStep('parse');
    }
  }

  function copyUrl() {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: overlay,
        backdropFilter: 'blur(4px)',
        fontFamily: SANS,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 560,
          maxHeight: 'calc(100dvh - 32px)',
          borderRadius: 20,
          background: panelBg,
          border: `1px solid ${border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            background: headerBg,
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={14} color={TEAL} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: textP }}>
              새 환자 + 방문 등록
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StepDots step={step === 'error' ? 'creating' : step} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: textS, display: 'flex', padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Step: parse */}
          {step === 'parse' && !parserAuthReady && (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14, padding: 36,
              textAlign: 'center',
            }}>
              {parserAuthError ? (
                <AlertTriangle size={30} color="#FA573E" strokeWidth={2.2} />
              ) : (
                <Loader2 size={30} color={TEAL} style={{ animation: 'spin 1s linear infinite' }} />
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: textP, marginBottom: 6 }}>
                  {parserAuthError ? '세션 확인이 필요합니다' : '로그인 세션 확인 중'}
                </p>
                <p style={{ fontSize: 12, color: textS, lineHeight: 1.6, margin: 0 }}>
                  {parserAuthError || 'Tiki Brief 분석을 안전하게 실행하기 위해 직원 세션을 확인하고 있습니다.'}
                </p>
              </div>
            </div>
          )}

          {step === 'parse' && parserAuthReady && (
            <IntakeParser
              authHeaders={parserAuthHeaders}
              initialText={initialText}
              procedureOptions={procedureOptions}
              selectedProcedureId={selectedProcedureId}
              onProcedureChange={setSelectedProcedureId}
              onConfirm={(patient, visit) => create(patient, { ...visit, procedure_id: selectedProcedureId || null })}
              onCancel={onClose}
              darkMode={darkMode}
              mode="full"
            />
          )}

          {/* Step: creating */}
          {step === 'creating' && (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40,
            }}>
              <Loader2 size={36} color={TEAL} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: textP, marginBottom: 6 }}>
                  환자 + 방문 생성 중…
                </p>
                <p style={{ fontSize: 12, color: textS }}>
                  My Tiki 링크를 발급하고 있습니다
                </p>
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && result && (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32,
            }}>
              {/* Success icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${TEAL}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={26} color={TEAL} strokeWidth={2.5} />
              </div>

              {/* Patient + visit info */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: textP, marginBottom: 4 }}>
                  {result.patientFlag} {result.patientName}
                </p>
                <p style={{ fontSize: 12, color: textS }}>
                  환자 등록 · 방문 생성 · My Tiki 링크 발급 완료
                </p>
              </div>

              {/* Link display */}
              <div style={{
                width: '100%', borderRadius: 12,
                border: `1.5px solid ${border}`,
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: darkMode ? '#27272A' : '#F9FAFB',
                  borderBottom: `1px solid ${border}`,
                }}>
                  <Link2 size={12} color={TEAL} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: textS }}>
                    My Tiki 링크
                  </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <p style={{
                    fontSize: 11, fontFamily: 'monospace', color: textS,
                    wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 10,
                  }}>
                    {result.url}
                  </p>
                  <button
                    onClick={copyUrl}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: copied ? '#16A34A' : TEAL,
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', transition: 'background 0.15s',
                      fontFamily: SANS,
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? '복사됨!' : '링크 복사'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: textS }}>
                유효 기간: 90일 · 환자에게 직접 공유하세요
              </p>

              <button
                onClick={onClose}
                style={{
                  padding: '10px 28px', borderRadius: 10,
                  border: `1.5px solid ${border}`,
                  background: 'transparent', color: textS,
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: SANS,
                }}
              >
                닫기
              </button>
            </div>
          )}

          {/* Step: error */}
          {step === 'error' && (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={24} color="#EF4444" strokeWidth={2} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: textP, marginBottom: 6 }}>
                  생성 실패
                </p>
                <p style={{ fontSize: 12, color: '#EF4444', maxWidth: 320, lineHeight: 1.6 }}>
                  {errMsg}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep('parse')}
                  style={{
                    padding: '9px 18px', borderRadius: 10,
                    border: `1.5px solid ${border}`,
                    background: 'transparent', color: textS,
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: SANS,
                  }}
                >
                  처음으로
                </button>
                <button
                  onClick={retry}
                  style={{
                    padding: '9px 22px', borderRadius: 10, border: 'none',
                    background: TEAL, color: '#fff',
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: SANS,
                    boxShadow: `0 2px 8px ${TEAL}40`,
                  }}
                >
                  재시도
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function langToFlag(lang, nationality) {
  if (nationality) {
    const n = nationality.toLowerCase();
    if (n.includes('중국') || n.includes('china') || n.includes('chinese')) return '🇨🇳';
    if (n.includes('일본') || n.includes('japan') || n.includes('japanese')) return '🇯🇵';
    if (n.includes('베트남') || n.includes('vietnam')) return '🇻🇳';
    if (n.includes('태국') || n.includes('thailand') || n.includes('thai')) return '🇹🇭';
    if (n.includes('러시아') || n.includes('russia')) return '🇷🇺';
    if (n.includes('아랍') || n.includes('arab') || n.includes('saudi')) return '🇸🇦';
    if (n.includes('미국') || n.includes('america') || n.includes('american')) return '🇺🇸';
    if (n.includes('한국') || n.includes('korea') || n.includes('korean')) return '🇰🇷';
  }
  const langMap = { zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', en: '🇺🇸', vi: '🇻🇳', th: '🇹🇭', ar: '🇸🇦', ru: '🇷🇺' };
  return langMap[lang] || '🌏';
}
