// public/js/config/storage.js
export const STORAGE_KEY = 'baryc_admin_config';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('[config] save failed:', e);
  }
}
