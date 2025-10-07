// public/js/cout_de_revient/recap.js
import { computePricing } from '/js/devis/pricing.js';
import { PRICING } from '/js/devis/constants.js';
import { state } from '/js/state.js';
import { euro, formatHours } from '/js/common/dom.js';

const TARGET_RATE = 50;

export function renderAllNumbers() {
  const pricing = computePricing(); if (!pricing) return;

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht  || pricing?.goods?.ht  || 0);
  const totalTTC  = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);
  const pvM2HT    = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC   = surface > 0 ? totalTTC / surface : 0;

  let crM2 = 0;
  (PRICING.meta?.services || []).forEach(s => {
    const k = s.key;
    const selected = !!state.services?.[k];
    const c = Number(PRICING.costs?.servicesM2?.[k]);
    if (selected && Number.isFinite(c)) crM2 += c;
  });
  const crMeuble = crM2 * surface;
  const rent = totalHT > 0 ? ((totalHT - crMeuble) / totalHT) * 100 : NaN;
  const tmax = TARGET_RATE > 0 ? (totalHT - crMeuble) / TARGET_RATE : 0;

  const set = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };
  set('cr-surface', surface ? `${surface.toFixed(2)} m²` : '— m²');
  set('cr-m2', `${euro(crM2)} /m²`);
  set('cr-meuble', euro(crMeuble));
  set('pv-m2-ht', surface ? `${euro(pvM2HT)} /m²` : '— €/m²');
  set('pv-m2-ttc', surface ? `${euro(pvM2TTC)} /m²` : '— €/m²');
  set('pv-total-ht', euro(totalHT));
  set('pv-total-ttc', euro(totalTTC));
  set('rentabilite', Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %');
  set('cr-tmax', formatHours(tmax));
}
