// public/js/common/events.js
export const EVENTS = {
  DEVIS_CHANGED: 'devis:changed',
  DEVIS_RESET:   'devis:reset',
  ADMIN_SERVICES_UPDATED:  'admin:services-updated',
  ADMIN_PRICING_UPDATED:   'admin:pricing-updated',
  ADMIN_TRANSPORT_UPDATED: 'admin:transport-updated',
};

export function emit(name, detail) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}
