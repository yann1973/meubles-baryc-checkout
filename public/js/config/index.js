// public/js/config/index.js
import { applyConfig as applyConfigImpl } from './apply.js';

const KEY = 'baryc_admin_config';

const DEFAULTS = {
  transport: {
    baseAddress: '13 Rue du Cabotage, 56700 Hennebont, France',
    kmRate: 3,
  },
  // Tu peux étendre ici: services, costs, pricing, etc.
};

/* ----------------- Utils ----------------- */
function isPlainObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

// Merge profond (les tableaux du patch remplacent, ne concatènent pas)
function deepMerge(a, b) {
  if (!isPlainObject(a)) a = {};
  if (!isPlainObject(b)) return a;
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (Array.isArray(v)) {
      out[k] = v.slice();
    } else if (isPlainObject(v) && isPlainObject(a[k])) {
      out[k] = deepMerge(a[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function shallowPick(obj, keys) {
  const out = {};
  keys.forEach(k => { out[k] = obj?.[k]; });
  return out;
}

function shallowEqual(a, b) {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/* ----------------- Core API ----------------- */
export function loadConfig() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    raw = {};
  }

  const merged = deepMerge(DEFAULTS, raw);

  // Normalisations minimales
  const tr = merged.transport || (merged.transport = {});
  tr.kmRate = typeof tr.kmRate === 'number' ? tr.kmRate : DEFAULTS.transport.kmRate;
  tr.baseAddress = (tr.baseAddress || DEFAULTS.transport.baseAddress).trim();

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
 * Met à jour la config :
 * - accepte un patch objet, ou une fonction updaters (cfgCourante) => nouvelleCfg
 * - merge profond
 * - persiste + applique
 * - émet:
 *    - "admin:config-updated" (always)
 *    - "admin:transport-updated" si transport a changé (baseAddress/kmRate)
 */
export function updateConfig(patchOrUpdater) {
  const current = loadConfig();
  const beforeTransport = shallowPick(current.transport || {}, ['baseAddress', 'kmRate']);

  const next =
    typeof patchOrUpdater === 'function'
      ? (patchOrUpdater(current) || current)
      : deepMerge(current, patchOrUpdater || {});

  saveConfig(next);
  applyConfig(next);

  // Events
  try {
    window.dispatchEvent(new CustomEvent('admin:config-updated', { detail: next }));
  } catch {}

  const afterTransport = shallowPick(next.transport || {}, ['baseAddress', 'kmRate']);
  if (!shallowEqual(beforeTransport, afterTransport)) {
    try {
      window.dispatchEvent(new CustomEvent('admin:transport-updated', { detail: afterTransport }));
    } catch {}
  }

  return next;
}

/** Réinitialise la configuration aux valeurs par défaut. */
export function resetConfig() {
  saveConfig({});
  const cfg = loadConfig();
  applyConfig(cfg);
  try {
    window.dispatchEvent(new CustomEvent('admin:config-updated', { detail: cfg }));
    window.dispatchEvent(new CustomEvent('admin:transport-updated', { detail: cfg.transport }));
  } catch {}
  return cfg;
}

// (optionnel) export des defaults pour introspection
export const DEFAULT_CONFIG = DEFAULTS;
