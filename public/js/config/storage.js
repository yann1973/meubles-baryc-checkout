// public/js/config/storage.js
import { PRICING } from '/js/devis/constants.js';

export const LS_KEY = 'admin_config_v2';
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

function defaultsFromPricing() {
  const services = Array.isArray(PRICING.meta?.services)
    ? PRICING.meta.services.map(s => ({
        key: s.key, label: s.label || s.key, pvTTC: num(PRICING.servicesTTC?.[s.key])
      }))
    : Object.keys(PRICING.servicesTTC || {}).map(k => ({
        key: k, label: k, pvTTC: num(PRICING.servicesTTC[k])
      }));

  return {
    services,
    costsM2: clone(PRICING.costs?.servicesM2) || {},
    transport: {
      baseAddress: PRICING.transport?.baseAddress || '',
      kmRate: num(PRICING.transport?.kmRate),
    },
  };
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultsFromPricing();
    const cfg = JSON.parse(raw);
    const base = defaultsFromPricing();

    const map = new Map((cfg.services || []).map(s => [s.key, s]));
    const services = (base.services || []).map(s => ({
      key: s.key,
      label: map.get(s.key)?.label ?? s.label ?? s.key,
      pvTTC: num(map.get(s.key)?.pvTTC ?? s.pvTTC),
    }));

    return {
      services,
      costsM2: { ...(base.costsM2 || {}), ...(cfg.costsM2 || {}) },
      transport: {
        baseAddress: cfg.transport?.baseAddress ?? base.transport.baseAddress,
        kmRate: num(cfg.transport?.kmRate ?? base.transport.kmRate),
      },
    };
  } catch {
    return defaultsFromPricing();
  }
}

export function saveConfig(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch {}
}

export function exportConfig() {
  const blob = new Blob([JSON.stringify(loadConfig(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `config-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importConfig(file) {
  const cfg = JSON.parse(await file.text());
  saveConfig(cfg);
  return cfg;
}
