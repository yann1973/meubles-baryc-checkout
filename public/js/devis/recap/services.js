// public/js/devis/recap/services.js
import { PRICING } from '/js/devis/constants.js';
import { euro } from '/js/common/dom.js';

/**
 * Affiche la liste des prestations sélectionnées avec leur PV/m².
 * Cherche d'abord #recapServices, sinon [data-recap="services"].
 * @param {Object} state - state global (doit contenir state.services)
 */
export function renderRecapServices(state = {}) {
  const container =
    document.getElementById('recapServices') ||
    document.querySelector('[data-recap="services"]');

  if (!container) return;

  const selectedKeys = Object.keys(state.services || {}).filter(k => state.services[k]);

  if (selectedKeys.length === 0) {
    container.innerHTML = `<p class="text-sm text-neutral-500">Aucune prestation sélectionnée.</p>`;
    return;
  }

  const labelsMap = new Map(
    (PRICING.meta?.services || []).map(s => [s.key, s.label || s.key])
  );

  const html = selectedKeys.map(key => {
    const label = labelsMap.get(key) || key;
    const pv    = Number(PRICING.servicesTTC?.[key] ?? 0);
    return `
      <div class="flex items-center justify-between py-1">
        <span>${label}</span>
        <span class="text-neutral-700">${euro(pv)}/m²</span>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}
