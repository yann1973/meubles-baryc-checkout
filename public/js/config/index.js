// public/js/config/index.js

// On centralise ici :
// - loadConfig()  -> lit localStorage + applique des valeurs par défaut
// - saveConfig()  -> écrit dans localStorage
// - applyConfig() -> délègue à ./apply.js pour propager la config dans l'app (PRICING, etc.)

import { applyConfig as applyConfigImpl } from './apply.js';

const KEY = 'baryc_admin_config';

// Valeurs par défaut si rien n'est en storage
const DEFAULTS = {
  transport: {
    // Adresse de référence atelier
    baseAddress: '13 Rue du Cabotage, 56700 Hennebont, France',
    // Barème €/km (TTC)
    kmRate: 3,
  },
  // tu peux étendre ici au besoin :
  // services: {},
  // costs: {},
  // pricing: {},
};

export function loadConfig() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    raw = {};
  }

  // merge léger (on ne fait pas un deep-merge complet volontairement)
  return {
    ...DEFAULTS,
    ...raw,
    transport: {
      ...DEFAULTS.transport,
      ...(raw.transport || {}),
      // garde des types sûrs
      kmRate:
        typeof raw.transport?.kmRate === 'number'
          ? raw.transport.kmRate
          : DEFAULTS.transport.kmRate,
      baseAddress:
        (raw.transport?.baseAddress || DEFAULTS.transport.baseAddress).trim(),
    },
  };
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg || {}));
  } catch (e) {
    console.warn('[config] saveConfig failed:', e);
  }
}

/**
 * Applique la config au runtime (PRICING, etc.) en déléguant à ./apply.js.
 * Tu peux appeler cette fonction après un save pour pousser les changements en direct.
 */
export function applyConfig(cfg) {
  try {
    applyConfigImpl && applyConfigImpl(cfg);
  } catch (e) {
    console.warn('[config] applyConfig failed:', e);
  }
}
