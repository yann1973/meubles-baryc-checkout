// public/js/devis/recap/services.js
import { PRICING } from '/js/devis/constants.js';
import { euro } from '/js/common/dom.js';
import { computePricing as _computePricing } from '/js/devis/pricing.js';

/**
 * Rendu du récap des prestations sélectionnées côté Devis.
 * - Affiche le PV €/m² ET le total par prestation (PV×surface)
 * - Utilise la surface du devis (pricing.totalSurface)
 * @param {Object} state    - state global (doit contenir state.services)
 * @param {Object?} pricing - résultat de computePricing() (optionnel)
 */
export function renderRecapServices(state = {}, pricing = null) {
  const container =
    document.getElementById('recapServices') ||
    document.querySelector('[data-recap="services"]');
  if (!container) return;

  // Surface : on préfère l'objet pricing si fourni, sinon on tente un compute local
  let surface = Number(pricing?.totalSurface ?? 0);
  if (!Number.isFinite(surface) || surface <= 0) {
    try {
      const p = _computePricing?.();
      if (p && Number.isFinite(p.totalSurface)) surface = Number(p.totalSurface);
    } catch {}
  }
  if (!Number.isFinite(surface)) surface = 0;

  // Liste des prestations cochées
  const selectedKeys = Object.keys(state.services || {}).filter(k => state.services[k]);

  // Map des libellés
  const labelOf = (key) => {
    const arr = PRICING.meta?.services || [];
    const found = arr.find(s => s.key === key);
    return found?.label || key;
  };

  // Reset conteneur
  while (container.firstChild) container.removeChild(container.firstChild);

  if (selectedKeys.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-sm text-neutral-500';
    p.textContent = 'Aucune prestation sélectionnée.';
    container.appendChild(p);
    return;
  }

  // Une ligne par prestation sélectionnée
  selectedKeys.forEach((key) => {
    const pvM2 = Number(PRICING.servicesTTC?.[key] ?? 0);
    const total = pvM2 * surface;

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between py-1';

    const left = document.createElement('div');
    left.textContent = labelOf(key);

    const right = document.createElement('div');
    right.className = 'text-right';

    const totalEl = document.createElement('div');
    totalEl.className = 'font-medium';
    totalEl.textContent = euro(total);

    const pvEl = document.createElement('div');
    pvEl.className = 'text-xs text-neutral-500';
    pvEl.textContent = `${euro(pvM2)}/m²`;

    right.appendChild(totalEl);
    right.appendChild(pvEl);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}
