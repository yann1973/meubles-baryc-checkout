// public/js/devis/recap/services.js
import { PRICING } from '/js/devis/constants.js';
import { euro } from '/js/common/dom.js';

/**
 * Affiche la liste des prestations sélectionnées avec :
 *  - Total (PV × surface) en gras
 *  - PV au m² en petit sous-titre
 *
 * @param {Object} state   - état global (doit contenir state.services)
 * @param {Object} pricing - objet retourné par computePricing() (utilisé pour totalSurface)
 */
export function renderRecapServices(state = {}, pricing = null) {
  const container =
    document.getElementById('recapServices') ||
    document.querySelector('[data-recap="services"]');

  if (!container) return;

  const services = state?.services || {};
  const selectedKeys = Object.keys(services).filter((k) => services[k]);

  // Surface issue du pricing
  const surface = Number(pricing?.totalSurface ?? 0) || 0;

  // Map libellés (si PRICING.meta.services existe)
  const labelOf = (key) => {
    const meta = PRICING?.meta?.services;
    if (Array.isArray(meta)) {
      const found = meta.find((s) => s.key === key);
      if (found?.label) return found.label;
    }
    return key;
  };

  if (selectedKeys.length === 0) {
    container.innerHTML = `<p class="text-sm text-neutral-500">Aucune prestation sélectionnée.</p>`;
    return;
  }

  const rows = selectedKeys.map((key) => {
    const pvM2 = Number(PRICING?.servicesTTC?.[key] ?? 0);
    const total = pvM2 * surface; // total pour cette prestation

    const label = labelOf(key);
    return `
      <div class="flex items-center justify-between py-1">
        <div>${label}</div>
        <div class="text-right">
          <div class="font-medium tabular-nums">${euro(total)}</div>
          <div class="text-xs text-neutral-500">${euro(pvM2)}/m²</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}
