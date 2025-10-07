// public/js/cout_de_revient/index.js
import { loadConfig, applyConfig, exportConfig, importConfig } from '/js/config/index.js';
import { EVENTS } from '/js/common/events.js';
import { renderServicesAdmin } from './admin/servicesTable.js';
import { renderAllNumbers } from './recap.js';

export function initCR() {
  // applique la config (prestations/PV/coûts/transport) dès l’ouverture
  applyConfig(loadConfig());

  renderServicesAdmin();
  renderAllNumbers();

  // import/export
  const btnExp = document.getElementById('adm-export');
  if (btnExp && !btnExp.__bound) {
    btnExp.__bound = true;
    btnExp.addEventListener('click', exportConfig);
  }
  const inpImp = document.getElementById('adm-import');
  if (inpImp && !inpImp.__bound) {
    inpImp.__bound = true;
    inpImp.addEventListener('change', async () => {
      const f = inpImp.files?.[0]; if (!f) return;
      const cfg = await importConfig(f);
      applyConfig(cfg);
      renderServicesAdmin();
      renderAllNumbers();
      inpImp.value = '';
    });
  }

  // sync live depuis le Devis & l’Admin
  window.addEventListener(EVENTS.DEVIS_CHANGED,           renderAllNumbers);
  window.addEventListener(EVENTS.DEVIS_RESET,             renderAllNumbers);
  window.addEventListener(EVENTS.ADMIN_SERVICES_UPDATED,  renderAllNumbers);
  window.addEventListener(EVENTS.ADMIN_PRICING_UPDATED,   renderAllNumbers);
  window.addEventListener(EVENTS.ADMIN_TRANSPORT_UPDATED, renderAllNumbers);
}

// (ré-export utile si d’autres modules veulent rafraîchir)
export { renderAllNumbers } from './recap.js';
