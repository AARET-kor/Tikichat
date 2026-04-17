import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://app.tikichat.xyz';
const STORAGE_KEY = 'tikidoc_current_patient';

export function usePatient(clinicId) {
  const [currentPatient, setCurrentPatientState] = useState(null);
  const [searchResults, setSearchResults]         = useState([]);
  const [searching, setSearching]                 = useState(false);
  const [creating, setCreating]                   = useState(false);
  const [parsing, setParsing]                     = useState(false);

  // 세션 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCurrentPatientState(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const setCurrentPatient = useCallback((patient) => {
    setCurrentPatientState(patient);
    if (patient) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patient));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 환자 검색
  const searchPatients = useCallback(async (q) => {
    if (!clinicId || !q?.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/patients/search?clinicId=${encodeURIComponent(clinicId)}&q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      setSearchResults(data.patients || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [clinicId]);

  // 환자 생성
  const createPatient = useCallback(async (fields) => {
    if (!clinicId) return null;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, patient: fields }),
      });
      const data = await res.json();
      if (data.id) {
        const newPatient = { id: data.id, ...fields };
        setCurrentPatient(newPatient);
        return newPatient;
      }
      return null;
    } catch {
      return null;
    } finally {
      setCreating(false);
    }
  }, [clinicId, setCurrentPatient]);

  // Magic Paste AI 파싱
  const parsePatientText = useCallback(async (text) => {
    if (!text?.trim()) return null;
    setParsing(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, clinicId }),
      });
      const data = await res.json();
      return data.parsed || null;
    } catch {
      return null;
    } finally {
      setParsing(false);
    }
  }, [clinicId]);

  // Context 저장
  const saveContext = useCallback(async (context) => {
    if (!currentPatient?.id || !clinicId) return;
    try {
      await fetch(`${API_BASE}/api/save-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: currentPatient.id, clinicId, context }),
      });
    } catch { /* silent */ }
  }, [currentPatient, clinicId]);

  return {
    currentPatient, setCurrentPatient,
    searchResults, searching, searchPatients,
    creating, createPatient,
    parsing, parsePatientText,
    saveContext,
  };
}
