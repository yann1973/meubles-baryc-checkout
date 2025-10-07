// public/js/devis/ui/index.js
import { buildServicesM2 } from './buildServices.js';
import { recompute } from './recompute.js';
import { EVENTS } from '/js/common/events.js';

export function initDevis() {
  buildServicesM2();
  recompute();

  // Rebuild/refresh when admin edits services/PV
  window.addEventListener(EVENTS.ADMIN_SERVICES_UPDATED, () => { buildServicesM2(); recompute(); });
  window.addEventListener(EVENTS.ADMIN_PRICING_UPDATED,  () => { buildServicesM2(); recompute(); });
}
