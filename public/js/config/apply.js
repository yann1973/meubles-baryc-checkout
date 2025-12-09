// public/js/config/apply.js
import { PRICING } from '/js/devis/constants.js';

/* ---------------- Helpers de normalisation ---------------- */

function isPlainObject(o) {
  return o && typeof o === 'object' && !Array.isArray(o);
}

// Convertit cfg.services en tableau [{key,label}]
function toServicesArray(cfg) {
  const s = cfg?.services;
  if (Array.isArray(s)) {
    // ancien format : [{ key, label }]
    return s
      .filter(x => x && typeof x.key === 'string')
      .map(x => ({ key: x.key, label: x.label || x.key }));
  }
  if (isPlainObject(s) && isPlainObject(s.catalog)) {
    // nouveau format : { catalog: { key: { label?, pvM2?, crM2? } } }
    return Object.entries(s.catalog).map(([key, v]) => ({
      key,
      label: (v && v.label) ? String(v.label) : key,
    }));
  }
  return [];
}

// Construit un map de PV/m² TTC à partir de cfg.servicesTTC et/ou services.catalog.pvM2
function buildServicesTTC(cfg, prev = {}) {
  const out = { ...(prev || {}) };

  // 1) bloc explicite
  if (isPlainObject(cfg?.servicesTTC)) {
    Object.entries(cfg.servicesTTC).forEach(([k, v]) => {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    });
  }

  // 2) valeurs dans catalog
  const cat = cfg?.services?.catalog;
  if (isPlainObject(cat)) {
    Object.entries(cat).forEach(([key, v]) => {
      const n = Number(v?.pvM2 ?? v?.priceTTC ?? v?.ttc);
      if (Number.isFinite(n)) out[key] = n;
    });
  }
  return out;
}

// Construit un map de coûts de revient €/m² à partir de cfg.costs.servicesM2 et/ou services.catalog.crM2
function buildCostsM2(cfg, prev = {}) {
  const out = { ...(prev || {}) };

  // 1) bloc explicite
  if (isPlainObject(cfg?.costs?.servicesM2)) {
    Object.entries(cfg.costs.servicesM2).forEach(([k, v]) => {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    });
  }

  // 2) valeurs dans catalog
  const cat = cfg?.services?.catalog;
  if (isPlainObject(cat)) {
    Object.entries(cat).forEach(([key, v]) => {
      const n = Number(v?.crM2 ?? v?.costM2);
      if (Number.isFinite(n)) out[key] = n;
    });
  }
  return out;
}

/* ---------------- Application de la config → PRICING ---------------- */

export function applyConfig(cfg = {}) {
  try {
    // Assure la structure PRICING
    if (!isPlainObject(PRICING.meta)) PRICING.meta = {};
    if (!isPlainObject(PRICING.costs)) PRICING.costs = {};
    if (!isPlainObject(PRICING.costs.servicesM2)) PRICING.costs.servicesM2 = {};
    if (!isPlainObject(PRICING.servicesTTC)) PRICING.servicesTTC = {};
    if (!isPlainObject(PRICING.transport)) PRICING.transport = {};

    // 1) Prestations (labels + ordre d’affichage)
    const servicesArr = toServicesArray(cfg);
    PRICING.meta.services = servicesArr;

    // 2) Prix de vente TTC/m²
    PRICING.servicesTTC = buildServicesTTC(cfg, PRICING.servicesTTC);

    // 3) Coûts de revient €/m²
    PRICING.costs.servicesM2 = buildCostsM2(cfg, PRICING.costs.servicesM2);

    // 4) Transport (adresse de référence, barème, etc.)
    if (isPlainObject(cfg.transport)) {
      PRICING.transport = {
        ...PRICING.transport,
        ...cfg.transport,
      };
    }
    // Defaults utiles si absents
    if (!PRICING.transport.baseAddress) {
      PRICING.transport.baseAddress = '13 Rue du Cabotage, 56700 Hennebont, France';
    }
    if (typeof PRICING.transport.kmRate !== 'number') {
      PRICING.transport.kmRate = 3;
    }

    // 5) Événements de synchro (UI devis, CR, maps…)
    try {
      window.dispatchEvent(new CustomEvent('admin:services-updated', {
        detail: {
          services: PRICING.meta.services,
          servicesTTC: PRICING.servicesTTC,
          costsM2: PRICING.costs.servicesM2,
        }
      }));
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent('admin:transport-updated', {
        detail: { ...PRICING.transport }
      }));
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent('admin:config-updated', {
        detail: { ...cfg }
      }));
    } catch {}
  } catch (e) {
    console.warn('[config/apply] failed:', e);
  }
}
