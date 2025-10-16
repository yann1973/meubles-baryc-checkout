// public/js/config/apply.js
import { loadConfig, saveConfig } from './storage.js';
import { PRICING } from '/js/devis/constants.js';

// Applique la config au runtime (prix, prestations, transport) + events de synchro
export function applyConfig(cfg = {}) {
  if (!cfg || typeof cfg !== 'object') return;

  // Prestations (catalogue affiché dans Devis + CR)
  if (Array.isArray(cfg.services)) {
    PRICING.meta = PRICING.meta || {};
    PRICING.meta.services = cfg.services.map(s => ({
      key: s.key,
      label: s.label ?? s.key
    }));
    // pour info (utile au CR)
    window.dispatchEvent(new Event('admin:services-updated'));
  }

  // Prix de vente au m² (utilisés par computePricing et l’UI Devis)
  if (cfg.servicesTTC && typeof cfg.servicesTTC === 'object') {
    PRICING.servicesTTC = { ...(PRICING.servicesTTC || {}), ...cfg.servicesTTC };
    window.dispatchEvent(new Event('admin:services-updated'));
  }

  // Coûts de revient au m² (utilisés dans l’onglet CR)
  if (cfg.costs?.servicesM2 && typeof cfg.costs.servicesM2 === 'object') {
    PRICING.costs = PRICING.costs || {};
    PRICING.costs.servicesM2 = {
      ...(PRICING.costs.servicesM2 || {}),
      ...cfg.costs.servicesM2
    };
    window.dispatchEvent(new Event('admin:services-updated'));
  }

  // Transport: adresse de référence + barème
  if (cfg.transport && typeof cfg.transport === 'object') {
    PRICING.transport = { ...(PRICING.transport || {}), ...cfg.transport };
    window.dispatchEvent(new Event('admin:transport-updated'));
  }
}

// Merge + persistance + application immédiate
export function updateConfig(patch = {}) {
  const cur = loadConfig();
  const next = deepMerge(cur, patch);
  saveConfig(next);
  applyConfig(next);
  return next;
}

// petit merge récursif
function deepMerge(a, b) {
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v)
        ? deepMerge(a?.[k] || {}, v)
        : v;
  }
  return out;
}
