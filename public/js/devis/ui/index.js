// public/js/devis/ui/index.js
import { buildServicesM2 } from './buildServices.js';
import { recompute } from './recompute.js';
import { EVENTS } from '/js/common/events.js';
import { upsertServices } from '/js/config/index.js';


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
  syncServicesFromDevis();
}

// Récupère les prestations réellement rendues dans la grille #servicesM2
function collectDisplayedServices() {
  const nodes = document.querySelectorAll('#servicesM2 input[type="checkbox"][data-key]');
  const out = [];
  nodes.forEach((inp) => {
    const key = inp.getAttribute('data-key') || '';
    if (!key) return;

    // On essaye de récupérer un label lisible depuis l'UI
    let label =
      inp.getAttribute('data-label') ||
      inp.getAttribute('aria-label') ||
      (inp.closest('label') ? inp.closest('label').textContent.trim() : '') ||
      key;

    // Nettoyage basique du label (évite prix / unités accrochés si présents visuellement)
    label = label.replace(/\s*\(\s*[\d.,]+\s*€.*?\)\s*$/i, '').trim();

    out.push({ key, label });
  });
  return out;
}

// Ajoute automatiquement ces prestations au catalogue Admin/CR
function syncServicesFromDevis() {
  const list = collectDisplayedServices();
  if (list.length > 0) {
    upsertServices(list);
  }
}

