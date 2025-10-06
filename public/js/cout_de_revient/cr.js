// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { PRICING } from '../devis/constants.js';
import { computePricing } from '../devis/pricing.js';

const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(Number(n) || 0);

/**
 * Déduit le coût de revient / m² à partir de:
 *  - PRICING.costs.m2  (si défini ⇒ direct)
 *  - sinon, si PRICING.margin.ttcRate est défini (ex: 0.3), on approxime:
 *      cr_m2 = pv_m2_ttc * (1 - marginRate)
 *  - sinon: null (affiche un hint pour config)
 */
function deriveCoutRevientM2({ pvM2TTC }) {
  // 1) le plus propre: tu définis PRICING.costs.m2 dans constants.js
  const direct = PRICING?.costs?.m2;
  if (Number.isFinite(direct) && direct >= 0) return direct;

  // 2) approximation à partir de la marge TTC si fournie
  const marginRate = PRICING?.margin?.ttcRate;
  if (Number.isFinite(marginRate)) {
    const r = Math.max(0, Math.min(1, Number(marginRate)));
    return (Number(pvM2TTC) || 0) * (1 - r);
  }

  // 3) pas de donnée exploitable
  return null;
}

function renderCR() {
  const elSurface       = document.getElementById('cr-surface');
  const elPvM2TTC       = document.getElementById('cr-pv-m2-ttc');
  const elPvM2HT        = document.getElementById('cr-pv-m2-ht');
  const elCRm2          = document.getElementById('cr-cr-m2');
  const elCRmeuble      = document.getElementById('cr-cr-meuble');
  const elPvTotalTTC    = document.getElementById('cr-pv-total-ttc');
  const elPvTotalHT     = document.getElementById('cr-pv-total-ht');
  const elHint          = document.getElementById('cr-hint');

  const pricing = computePricing();
  if (!pricing) return;

  const surface = Number(pricing.totalSurface || 0);
  const totalHT = Number(pricing?.totals?.ht || pricing?.goods?.ht || 0);
  const totalTTC = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);

  // Prix vendu / m²
  const pvM2HT  = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC = surface > 0 ? totalTTC / surface : 0;

  // Coût de revient / m² (voir deriveCoutRevientM2)
  const crM2 = deriveCoutRevientM2({ pvM2TTC });
  const crMeuble = Number.isFinite(crM2) ? crM2 * surface : null;

  // Render
  if (elSurface)    elSurface.textContent    = surface ? `${surface.toFixed(2)} m²` : '— m²';
  if (elPvM2TTC)    elPvM2TTC.textContent    = surface ? `${euro(pvM2TTC)} /m²` : '— €/m²';
  if (elPvM2HT)     elPvM2HT.textContent     = surface ? `${euro(pvM2HT)} /m²`  : '— €/m²';
  if (elPvTotalTTC) elPvTotalTTC.textContent = euro(totalTTC);
  if (elPvTotalHT)  elPvTotalHT.textContent  = euro(totalHT);

  if (Number.isFinite(crM2)) {
    if (elCRm2)     elCRm2.textContent     = `${euro(crM2)} /m²`;
    if (elCRmeuble) elCRmeuble.textContent = euro(crMeuble);
    if (elHint)     elHint.hidden = true;
  } else {
    if (elCRm2)     elCRm2.textContent     = '— €/m²';
    if (elCRmeuble) elCRmeuble.textContent = '— €';
    if (elHint)     elHint.hidden = false;
  }
}

let bound = false;
export function initCR() {
  renderCR();

  if (!bound) {
    bound = true;
    // Se met à jour si le devis change / reset
    window.addEventListener('devis:changed', renderCR);
    window.addEventListener('devis:reset', renderCR);

    // Sécurité: si certains champs changent sans émettre d'événement global,
    // on re-render quand l’utilisateur revient sur #cr
    window.addEventListener('hashchange', () => {
      if ((location.hash || '#devis').slice(1) === 'cr') renderCR();
    });
  }
}
