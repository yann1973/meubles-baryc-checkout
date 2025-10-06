// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { PRICING } from '../devis/constants.js';
import { computePricing } from '../devis/pricing.js';

const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

// Mêmes clés/ordre que Devis
const ORDER = ['poncage','aerogommage','peinture1','peinture2','teinte','vernis','consommables'];
const LABELS = {
  poncage: 'Ponçage de finition',
  aerogommage: 'Aérogommage',
  peinture1: 'Peinture 1 couleur',
  peinture2: 'Peinture 2 couleurs',
  teinte: 'Teinte',
  vernis: 'Vernis',
  consommables: 'Consommables',
};

/**
 * Retourne le coût de revient (€/m²) pour une prestation.
 * Priorité:
 *  1) PRICING.costs.servicesM2[key] (coût direct saisi)
 *  2) approximation à partir du prix de vente (PRICING.servicesTTC[key]) et d’une marge:
 *     - marge HT si PRICING.margin.htRate est défini
 *     - sinon marge TTC si PRICING.margin.ttcRate
 *     CR = PV * (1 - marge)
 *  3) sinon null (inconnu)
 */
function getServiceCostM2(key) {
  const direct = PRICING?.costs?.servicesM2?.[key];
  if (Number.isFinite(direct)) return Math.max(0, Number(direct));

  const pvService = PRICING?.servicesTTC?.[key]; // €/m² vendu (côté Devis)
  if (!Number.isFinite(pvService)) return null;

  const mHT  = PRICING?.margin?.htRate;
  const mTTC = PRICING?.margin?.ttcRate;
  if (Number.isFinite(mHT))  return pvService * (1 - Math.max(0, Math.min(1, mHT)));
  if (Number.isFinite(mTTC)) return pvService * (1 - Math.max(0, Math.min(1, mTTC)));

  // pas de marge dispo → on ne peut pas estimer
  return null;
}

function renderCR() {
  const pricing = computePricing();
  if (!pricing) return;

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht || pricing?.goods?.ht || 0);
  const totalTTC  = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);
  const pvM2HT    = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC   = surface > 0 ? totalTTC / surface : 0;

  // ——— Per-prestation
  const list = document.getElementById('cr-services-list');
  if (list) list.innerHTML = '';

  let crM2Total = 0;
  let anyUnknown = false;

  ORDER.forEach((key) => {
    const selected = !!state?.services?.[key];
    const costM2 = getServiceCostM2(key);             // peut être null
    const effectiveM2 = selected && Number.isFinite(costM2) ? costM2 : 0;
    crM2Total += effectiveM2;

    const costMeuble = effectiveM2 * surface;         // €/meuble pour cette prestation

    const row = document.createElement('div');
    row.className = `flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${
      selected ? 'border-neutral-200 bg-white' : 'border-neutral-200/60 bg-neutral-50 text-neutral-500'
    }`;

    // libellé + statut
    const left = document.createElement('div');
    left.className = 'flex items-center gap-2';
    const dot = document.createElement('span');
    dot.className = `inline-block h-2.5 w-2.5 rounded-full ${selected ? 'bg-emerald-500' : 'bg-neutral-300'}`;
    const label = document.createElement('span');
    label.textContent = LABELS[key] || key;
    left.append(dot, label);

    // chiffres
    const right = document.createElement('div');
    right.className = 'text-right text-sm';
    const l1 = document.createElement('div');
    const l2 = document.createElement('div');

    if (Number.isFinite(costM2)) {
      l1.textContent = `${euro(costM2)} /m²`;
      l2.textContent = `${euro(costMeuble)} /meuble`;
    } else {
      l1.textContent = '— €/m²';
      l2.textContent = '— € /meuble';
      anyUnknown = true;
    }

    right.append(l1, l2);
    row.append(left, right);
    list?.appendChild(row);
  });

  // ——— Totaux & recap
  const crM2     = crM2Total;               // somme des coûts €/m² des prestations cochées
  const crMeuble = crM2 * surface;          // coût total du meuble

  const elSurface   = document.getElementById('cr-surface');
  const elCrM2      = document.getElementById('cr-m2');
  const elCrMeuble  = document.getElementById('cr-meuble');
  const elPvM2HT    = document.getElementById('pv-m2-ht');
  const elPvM2TTC   = document.getElementById('pv-m2-ttc');
  const elPvTotalHT = document.getElementById('pv-total-ht');
  const elPvTotalTTC= document.getElementById('pv-total-ttc');
  const elRent      = document.getElementById('rentabilite');
  const elHint      = document.getElementById('cr-hint');

  if (elSurface)    elSurface.textContent   = surface ? `${surface.toFixed(2)} m²` : '— m²';
  if (elCrM2)       elCrM2.textContent      = Number.isFinite(crM2)     ? `${euro(crM2)} /m²` : '— €/m²';
  if (elCrMeuble)   elCrMeuble.textContent  = Number.isFinite(crMeuble) ? euro(crMeuble)      : '— €';

  if (elPvM2HT)     elPvM2HT.textContent    = surface ? `${euro(pvM2HT)} /m²`  : '— €/m²';
  if (elPvM2TTC)    elPvM2TTC.textContent   = surface ? `${euro(pvM2TTC)} /m²` : '— €/m²';
  if (elPvTotalHT)  elPvTotalHT.textContent = euro(totalHT);
  if (elPvTotalTTC) elPvTotalTTC.textContent= euro(totalTTC);

  // Rentabilité sur HT : (PV_HT - CR) / PV_HT
  const rent = totalHT > 0 ? ((totalHT - crMeuble) / totalHT) * 100 : NaN;
  if (elRent) elRent.textContent = Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %';

  if (elHint) elHint.classList.toggle('hidden', !anyUnknown);
}

// Init + synchro en temps réel
let bound = false;
export function initCR() {
  renderCR();

  if (!bound) {
    bound = true;
    // Toute modification du devis déclenche un rerender du CR
    window.addEventListener('devis:changed', renderCR);
    window.addEventListener('devis:reset', renderCR);

    // Sécurité : quand on revient sur #cr
    window.addEventListener('hashchange', () => {
      if ((location.hash || '#devis').slice(1) === 'cr') renderCR();
    });
  }
}
