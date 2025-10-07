// public/js/config/apply.js
import { PRICING } from '/js/devis/constants.js';
import { loadConfig, saveConfig } from './storage.js';
import { EVENTS, emit } from '/js/common/events.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function applyConfig(cfg) {
  // 1) Prestations + PV TTC /m²
  PRICING.meta = PRICING.meta || {};
  PRICING.meta.services = (cfg.services || []).map(({ key, label }) => ({ key, label }));
  PRICING.servicesTTC = {};
  for (const s of (cfg.services || [])) PRICING.servicesTTC[s.key] = num(s.pvTTC);

  // 2) Coûts €/m²
  PRICING.costs = PRICING.costs || {};
  PRICING.costs.servicesM2 = { ...(PRICING.costs.servicesM2 || {}), ...(cfg.costsM2 || {}) };

  // 3) Transport
  PRICING.transport = PRICING.transport || {};
  PRICING.transport.baseAddress = cfg.transport?.baseAddress || '';
  PRICING.transport.kmRate = num(cfg.transport?.kmRate);

  // 4) Events (UI live)
  emit(EVENTS.ADMIN_SERVICES_UPDATED,  { cfg });
  emit(EVENTS.ADMIN_PRICING_UPDATED,   { cfg });
  emit(EVENTS.ADMIN_TRANSPORT_UPDATED, { cfg });
}

export function updateConfig(mutator) {
  const cfg = loadConfig();
  mutator(cfg);
  saveConfig(cfg);
  applyConfig(cfg);
}
