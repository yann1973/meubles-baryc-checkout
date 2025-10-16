// public/js/config/index.js
import { applyConfig as applyConfigImpl } from './apply.js';

const KEY = 'baryc_admin_config';

const DEFAULTS = {
  transport: {
    baseAddress: '13 Rue du Cabotage, 56700 Hennebont, France',
    kmRate: 3,
  },
  // Tu peux étendre : services, costs, pricing…
};

// ---- helpers ----
function isPlainObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function deepMerge(a, b) {
  if (!isPlainObject(a)) a = {};
  if (!isPlainObject(b)) return a;

  const out = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (isPlainObject(v) && isPlainObject(a[k])) {
      out[k] = deepMerge(a[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---- API ----
export function loadConfig() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    raw = {};
  }

  const merged = deepMerge(DEFAULTS, raw);

  // Normalisations minimales
  merged.transport.kmRate =
    typeof merged.transport.kmRate === 'number' ? merged.transport.kmRate : DEFAULTS.transport.kmRate;
  merged.transport.baseAddress =
    (merged.transport.baseAddress || DEFAULTS.transport.baseAddress).trim();

  return merged;
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg || {}));
  } catch (e) {
    console.warn('[config] saveConfig failed:', e);
  }
}

export function applyConfig(cfg) {
  try {
    if (typeof applyConfigImpl === 'function') applyConfigImpl(cfg);
  } catch (e) {
    console.warn('[config] applyConfig failed:', e);
  }
}

/**
 * Met à jour la config de façon atomique :
 * - accepte un patch objet, ou une fonction (cfgCourante) => nouvelleCfg
 * - merge profond pour conserver les sous-objets existants
 * - persiste, applique, et émet un event global
 */
export function updateConfig(patchOrUpdater) {
  const current = loadConfig();
  const next =
    typeof patchOrUpdater === 'function'
      ? patchOrUpdater(current) || current
      : deepMerge(current, patchOrUpdater || {});

  saveConfig(next);
  applyConfig(next);

  // Notifie le reste de l'app (Devis, Maps, etc.)
  try {
    window.dispatchEvent(new CustomEvent('admin:config-updated', { detail: next }));
  } catch {}

  return next;
}

//test
// (optionnel) expose les defaults si utile ailleurs
export const DEFAULT_CONFIG = DEFAULTS;
export const DEFAULT_CONFIG1 = DEFAULTS1;