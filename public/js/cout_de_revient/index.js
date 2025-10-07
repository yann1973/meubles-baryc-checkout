// public/js/cout_de_revient/index.js
import { loadConfig, applyConfig } from '/js/config/index.js';
import { EVENTS } from '/js/common/events.js';
import { renderServicesAdmin } from './admin/servicesTable.js';
import { renderAllNumbers } from './recap.js';

export function initCR() {
  applyConfig(loadConfig());   // applique la conf actuelle

  renderServicesAdmin();       // table éditable
  renderAllNumbers();          // "Mes coûts de revient" (CR/meuble, CR/m², PV, rentabilité, tmax…)

  // si la config change (import JSON, autre onglet, etc.) → on se met à jour
window.addEventListener('admin:services-updated',  () => { renderServicesAdmin(); renderAllNumbers(); });
window.addEventListener('admin:pricing-updated',   () => { renderServicesAdmin(); renderAllNumbers(); });
window.addEventListener('admin:transport-updated', renderAllNumbers);
window.addEventListener('devis:changed',           renderAllNumbers);
window.addEventListener('devis:reset',             renderAllNumbers);
}
