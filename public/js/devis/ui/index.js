// public/js/devis/ui/index.js
import { buildServicesM2 } from './buildServices.js';
import { recompute } from './recompute.js';
import { EVENTS } from '/js/common/events.js';

export function initDevis() {
  // build + 1er calcul
  buildServicesM2();
  recompute();

  // ⬇︎ sync live quand le catalogue change (ajout, suppression, libellé, PV)
  const rebuild = () => { buildServicesM2(); recompute(); };
  window.addEventListener(EVENTS.ADMIN_SERVICES_UPDATED,  rebuild);
  window.addEventListener(EVENTS.ADMIN_PRICING_UPDATED,   rebuild);
  // (Transport n’affecte pas la liste, mais le total oui ; recompute suffit)
  window.addEventListener(EVENTS.ADMIN_TRANSPORT_UPDATED, () => recompute());
}
