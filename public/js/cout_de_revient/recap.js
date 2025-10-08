// public/js/cout_de_revient/recap.js
import { computePricing } from '/js/devis/pricing.js';
import { PRICING } from '/js/devis/constants.js';
import { state } from '/js/state.js';
import { euro, formatHours } from '/js/common/dom.js';

const TARGET_RATE = 50; // objectif 50 €/h HT

function clearNode(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

function renderServiceCosts(surface) {
  const tbody = document.getElementById('cr-services-costs-body');
  const totalCell = document.getElementById('cr-services-total');
  if (!tbody || !totalCell) return;

  clearNode(tbody);

  const list = Array.isArray(PRICING.meta?.services)
    ? PRICING.meta.services
    : Object.keys(PRICING.servicesTTC || {}).map(k => ({ key: k, label: k }));

  let totalCR = 0;
  const surf = Number(surface) || 0;

  if (list.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-0 hover:bg-neutral-50/60';
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'py-3 text-neutral-500';
    td.textContent = 'Aucune prestation.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    totalCell.textContent = euro(0);
    return;
  }

  list.forEach(({ key, label }) => {
    const crM2 = Number(PRICING.costs?.servicesM2?.[key] ?? 0);
    const selected = !!state.services?.[key];
    const costItem = crM2 * surf * (selected ? 1 : 0);
    if (Number.isFinite(costItem)) totalCR += costItem;

    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-0 hover:bg-neutral-50/60';

    const tdLabel = document.createElement('td');
    tdLabel.className = 'py-2 pr-3';
    tdLabel.textContent = label || key;

    const tdCr = document.createElement('td');
    tdCr.className = 'py-2 pr-3 text-right tabular-nums';
    tdCr.textContent = euro(crM2);

    const tdSurf = document.createElement('td');
    tdSurf.className = 'py-2 pr-3 text-right';
    tdSurf.textContent = `${surf.toFixed(2)} m²`;

    const tdCost = document.createElement('td');
    tdCost.className = 'py-2 pr-3 text-right font-medium tabular-nums';
    tdCost.textContent = euro(costItem);

    const tdApplied = document.createElement('td');
    tdApplied.className = 'py-2 text-right';
    if (selected) {
      const badge = document.createElement('span');
      badge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700';
      badge.textContent = 'Appliquée';
      tdApplied.appendChild(badge);
    } else {
      const dash = document.createElement('span');
      dash.className = 'text-neutral-400';
      dash.textContent = '—';
      tdApplied.appendChild(dash);
    }

    tr.append(tdLabel, tdCr, tdSurf, tdCost, tdApplied);
    tbody.appendChild(tr);
  });

  totalCell.textContent = euro(totalCR);
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

  // Résumés (structure dans le partial HTML)
  set('cr-surface', surface ? `${surface.toFixed(2)} m²` : '— m²');
  set('cr-m2',      `${euro(crM2)} /m²`);
  set('cr-meuble',  euro(crMeuble));
  set('pv-m2-ht',   surface ? `${euro(pvM2HT)} /m²` : '— €/m²');
  set('pv-m2-ttc',  surface ? `${euro(pvM2TTC)} /m²` : '— €/m²');
  set('pv-total-ht',  euro(totalHT));
  set('pv-total-ttc', euro(totalTTC));
  set('rentabilite',   Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %');
  set('cr-tmax',       formatHours(tmax));

  // Remplissage du tableau (tbody + total)
  renderServiceCosts(surface);
}
