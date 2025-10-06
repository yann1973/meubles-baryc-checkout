// public/js/config.js
// Config "admin" côté front : prestations dynamiques, PV €/m², coûts €/m²,
// adresse de référence & barème km. Stockée en localStorage, appliquée à PRICING.

import { PRICING } from '/js/devis/constants.js';

export const LS_KEY = 'admin_config_v2';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

// Construit une base à partir du PRICING actuel
function defaultsFromPricing() {
  // ordre + libellés (PRICING.meta.services si dispo, sinon clés de servicesTTC)
  const services = Array.isArray(PRICING.meta?.services)
    ? PRICING.meta.services.map(s => ({
        key: s.key,
        label: s.label || s.key,
        pvTTC: num(PRICING.servicesTTC?.[s.key]),
      }))
    : Object.keys(PRICING.servicesTTC || {}).map(k => ({
        key: k,
        label: (PRICING.labels?.[k] || k),
        pvTTC: num(PRICING.servicesTTC[k]),
      }));

  return {
    services,                                     // [{key,label,pvTTC}]
    costsM2: clone(PRICING.costs?.servicesM2) || {}, // {key: €/m²}
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

    // merge minimal avec defaults
    const base = defaultsFromPricing();
    const map = new Map((cfg.services || []).map(s => [s.key, s]));
    const services = (base.services || []).map(s => {
      const m = map.get(s.key);
      return {
        key: s.key,
        label: m?.label ?? s.label ?? s.key,
        pvTTC: num(m?.pvTTC ?? s.pvTTC),
      };
    });

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

export function applyConfig(cfg) {
  // 1) Prestations & PV TTC /m²
  PRICING.meta = PRICING.meta || {};
  PRICING.meta.services = (cfg.services || []).map(({ key, label }) => ({ key, label }));

  PRICING.servicesTTC = {};
  for (const s of (cfg.services || [])) {
    PRICING.servicesTTC[s.key] = num(s.pvTTC);
  }

  // 2) Coûts de revient €/m²
  PRICING.costs = PRICING.costs || {};
  PRICING.costs.servicesM2 = { ...(PRICING.costs.servicesM2 || {}), ...(cfg.costsM2 || {}) };

  // 3) Transport
  PRICING.transport = PRICING.transport || {};
  PRICING.transport.baseAddress = cfg.transport?.baseAddress || '';
  PRICING.transport.kmRate = num(cfg.transport?.kmRate);

  // 4) notifier l’app
  try { window.dispatchEvent(new CustomEvent('admin:services-updated',  { detail: { cfg } })); } catch {}
  try { window.dispatchEvent(new CustomEvent('admin:pricing-updated',   { detail: { cfg } })); } catch {}
  try { window.dispatchEvent(new CustomEvent('admin:transport-updated', { detail: { cfg } })); } catch {}
}

export function updateConfig(mutator) {
  const cfg = loadConfig();
  mutator(cfg);
  saveConfig(cfg);
  applyConfig(cfg);
}

export function exportConfig() {
  const cfg = loadConfig();
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `config-meubles-baryc-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importConfig(file) {
  const txt = await file.text();
  const cfg = JSON.parse(txt);
  saveConfig(cfg);
  applyConfig(cfg);
}
