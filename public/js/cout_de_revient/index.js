// public/js/cout_de_revient/index.js
import { loadConfig, applyConfig } from '/js/config/index.js';
import { renderServicesAdmin } from './admin/servicesTable.js';
import { renderAllNumbers } from './recap.js';
import { initTransportAdmin } from '/js/cout_de_revient/admin/transport.js';

let listenersBound = false;

// petit debounce pour éviter de sur-rendre en rafale
function debounce(fn, ms = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const reRenderAll = debounce(() => {
  try { renderServicesAdmin(); } catch (e) { console.warn('[CR] renderServicesAdmin:', e); }
  try { renderAllNumbers();    } catch (e) { console.warn('[CR] renderAllNumbers:', e); }
}, 50);

const reRenderNumbers = debounce(() => {
  try { renderAllNumbers(); } catch (e) { console.warn('[CR] renderAllNumbers:', e); }
}, 50);

export function initCR() {
  // 1) Applique la configuration actuelle au runtime (labels, PV, CR, transport…)
  try { applyConfig(loadConfig()); } catch (e) { console.warn('[CR] applyConfig/loadConfig:', e); }

  // 2) Premier rendu : tableau admin + récap CR
  try { renderServicesAdmin(); } catch (e) { console.warn('[CR] renderServicesAdmin init:', e); }
  try { renderAllNumbers();    } catch (e) { console.warn('[CR] renderAllNumbers init:', e); }

  // 3) Initialisation de l’admin transport (adresse de référence + autocomplete + sauvegarde)
  try { initTransportAdmin(); } catch (e) { console.warn('[CR] initTransportAdmin:', e); }

  // 4) Écoute des événements globaux (une seule fois)
  if (!listenersBound) {
    listenersBound = true;

    // Quand le catalogue / prix / coûts changent depuis l’admin
    window.addEventListener('admin:services-updated',  reRenderAll,     { passive: true });
    window.addEventListener('admin:config-updated',    reRenderAll,     { passive: true });

    // Quand les paramètres transport changent (baseAddress, etc.)
    window.addEventListener('admin:transport-updated', reRenderNumbers, { passive: true });

    // Quand le devis change (surface, prestations cochées, PV, transport calculé côté devis…)
    window.addEventListener('devis:changed', reRenderNumbers, { passive: true });
    window.addEventListener('devis:reset',   reRenderAll,     { passive: true });
  }
}

export default initCR;
