/**
 * chrome.storage.local 래퍼
 * - 웹앱의 sessionStorage 역할을 대체
 * - Promise 기반 API
 * - Extension 환경 외에서도 안전하게 작동하도록 폴백 포함
 */

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export async function storageGet(key) {
  if (!isExtension) {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  }
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? null);
    });
  });
}

export async function storageSet(key, value) {
  if (!isExtension) {
    sessionStorage.setItem(key, JSON.stringify(value));
    return;
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export async function storageRemove(key) {
  if (!isExtension) {
    sessionStorage.removeItem(key);
    return;
  }
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}
