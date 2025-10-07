// public/js/cout_de_revient/recap.js
import { computePricing } from '/js/devis/pricing.js';
import { PRICING } from '/js/devis/constants.js';
import { state } from '/js/state.js';
import { euro, formatHours } from '/js/common/dom.js';

const TARGET_RATE = 50; // objectif 50 €/h HT

// --- trouve ou crée le conteneur du tableau des coûts par prestation
function getServiceCostsHost() {
  let host =
    document.getElementById('cr-services-costs') ||
    document.querySelector('[data-cr="services-costs"]');
  if (host) return host;

  // si pas présent, on l'ajoute automatiquement sous le bloc résumé
  const parent =
    document.getElementById('cr-summary') ||
    document.querySelector('[data-cr="summary"]') ||
    document.getElementById('view') ||
    document.body;

  host = document.createElement('div');
  host.id = 'cr-services-costs';
  host.className = 'mt-4';
  parent.appendChild(host);
  return host;
}

// --- rend le tableau "Coût par prestation" en fonction de la surface
function renderServiceCosts(surface) {
  const host = getServiceCostsHost();
  if (!host) return;

  const list = Array.isArray(PRICING.meta?.services)
    ? PRICING.meta.services
    : Object.keys(PRICING.servicesTTC || {}).map(k => ({ key: k, label: k }));

  const rows = list.map(({ key, label }) => {
    const crM2 = Number(PRICING.costs?.servicesM2?.[key] ?? 0);
    const selected = !!state.services?.[key];
    const costItem = crM2 * (Number(surface) || 0) * (selected ? 1 : 0); // coût réel pour ce devis
    return `
      <tr class="border-b last:border-0">
        <td class="py-1 pr-3">${label || key}</td>
        <td class="py-1 pr-3 text-right">${euro(crM2)}</td>
        <td class="py-1 pr-3 text-right">${(Number(surface)||0).toFixed(2)} m²</td>
        <td class="py-1 pr-3 text-right font-medium">${euro(costItem)}</td>
        <td class="py-1 text-right">${selected ? '✅' : ''}</td>
      </tr>
    `;
  }).join('');

  // total CR (services) pour ce devis (somme des lignes sélectionnées)
  let totalCR = 0;
  (PRICING.meta?.services || []).forEach(s => {
    const k = s.key;
    if (state.services?.[k]) {
      const c = Number(PRICING.costs?.servicesM2?.[k]);
      if (Number.isFinite(c)) totalCR += c * (Number(surface) || 0);
    }
  });

  host.innerHTML = `
    <div class="rounded-xl border border-neutral-200 bg-white p-3">
      <div class="text-sm font-medium mb-2">Coût par prestation (en fonction de la surface)</div>
      <table class="w-full text-sm">
        <thead class="text-neutral-500">
          <tr>
            <th class="text-left  font-medium py-1 pr-3">Prestation</th>
            <th class="text-right font-medium py-1 pr-3">CR €/m²</th>
            <th class="text-right font-medium py-1 pr-3">Surface</th>
            <th class="text-right font-medium py-1 pr-3">Coût par meuble</th>
            <th class="text-right font-medium py-1">Appliqué</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" class="py-2 text-neutral-500">Aucune prestation.</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <td class="py-2 pr-3 text-right text-neutral-600" colspan="3">Total CR (prestations) :</td>
            <td class="py-2 pr-3 text-right font-semibold">${euro(totalCR)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

export function renderAllNumbers() {
  const pricing = computePricing() || {};

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht  ?? pricing?.goods?.ht  ?? 0);
  const totalTTC  = Number(pricing?.totals?.ttc ?? pricing?.goods?.ttc ?? 0);
  const pvM2HT    = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC   = surface > 0 ? totalTTC / surface : 0;

  let crM2 = 0;
  (PRICING.meta?.services || []).forEach(s => {
    const k = s.key;
    if (state.services?.[k]) {
      const c = Number(PRICING.costs?.servicesM2?.[k]);
      if (Number.isFinite(c)) crM2 += c;
    }
  });
  const crMeuble = crM2 * surface;
  const rent     = totalHT > 0 ? ((totalHT - crMeuble) / totalHT) * 100 : NaN;
  const tmax     = TARGET_RATE > 0 ? (totalHT - crMeuble) / TARGET_RATE : 0;

  const set = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };

  set('cr-surface', surface ? `${surface.toFixed(2)} m²` : '— m²');
  set('cr-m2',      `${euro(crM2)} /m²`);
  set('cr-meuble',  euro(crMeuble));
  set('pv-m2-ht',   surface ? `${euro(pvM2HT)} /m²` : '— €/m²');
  set('pv-m2-ttc',  surface ? `${euro(pvM2TTC)} /m²` : '— €/m²');
  set('pv-total-ht',  euro(totalHT));
  set('pv-total-ttc', euro(totalTTC));
  set('rentabilite',   Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %');
  set('cr-tmax',       formatHours(tmax));

  // ⬇️ tableau des coûts par prestation basé sur la surface et la sélection actuelle
  renderServiceCosts(surface);
}
