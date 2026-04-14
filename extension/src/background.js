/**
 * TikiChat Shadow AI — MV3 Background Service Worker
 *
 * 역할:
 * 1. 설치 시 사이드패널 동작을 "액션 클릭 시 열기"로 설정
 * 2. Alt+C (_execute_action 커맨드) → 사이드패널 자동 열기/닫기
 *
 * 주의: MV3 Service Worker는 이벤트 리스너만 등록하고 유휴 상태에서 종료됨.
 */

// ── 설치 시 초기화 ─────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // 사이드패널: 아이콘 클릭 시 자동 열기/닫기 설정
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.error('[TikiChat] sidePanel 설정 실패:', err));

  console.log('[TikiChat] Shadow AI Extension 설치 완료');
});

// ── 아이콘 클릭 핸들러 (setPanelBehavior로 대부분 처리되지만 fallback) ────────
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
    .catch(() => {/* 이미 열려 있거나 권한 없는 탭 */});
});
