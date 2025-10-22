// public/js/devis/recap/totals.js
import { euro } from '/js/common/dom.js';
import { state } from '/js/state.js';

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderTotals(pricing = {}) {
  const totals    = pricing?.totals    || {};
  const goods     = pricing?.goods     || {};
  const transport = pricing?.transport || {};

  const surface    = Number(pricing?.totalSurface ?? 0) || 0;
  const goodsHT    = Number(goods?.ht  ?? totals?.ht  ?? 0) || 0;
  const goodsTVA   = Number(goods?.tva ?? totals?.tva ?? 0) || 0;
  const goodsTTC   = Number(goods?.ttc ?? totals?.ttc ?? 0) || 0;
  const transportTTC = Number(transport?.ttc ?? transport?.totalTTC ?? 0) || 0;
  const grandTTC   = goodsTTC + transportTTC;

  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setAll = (selector, txt) => { document.querySelectorAll(selector).forEach(el => { el.textContent = txt; }); };

  // Surface
  const surfTxt = `${surface.toFixed(2)} m²`;
  set('totalSurface',  surfTxt);
  set('surfaceDisplay',surfTxt);
  setAll('[data-surface]', surfTxt);

  // Totaux
  set('prixHT',  euro(goodsHT));
  set('prixTVA', euro(goodsTVA));
  set('prixTTC', euro(grandTTC));

  // Transport TTC
  set('prixTransport', euro(transportTTC));

  // Info barème (si fournie ailleurs)
  const info = transport?.info || transport?.label || state?.transport?.info || '';
  set('transportTarifInfo', info);

  // Détail explicite (2 A/R)
  const detailEl = document.getElementById('recapTransportDetail');
  if (detailEl) {
    const d = state?.transport?.detailParts;
    if (d) {
      detailEl.innerHTML = `
        <div class="text-xs text-neutral-700 space-y-1">
          <div><span class="font-medium">Récupération A/R</span> : ${d.pickARKm.toFixed(1)} km</div>
          <div><span class="font-medium">Livraison A/R</span> : ${d.delARKm.toFixed(1)} km</div>
          <div><span class="font-medium">Total</span> : ${d.totalKm.toFixed(1)} km</div>
          <div class="text-[11px] text-neutral-500 pt-1">
            <div>Atelier : ${esc(d.base)}</div>
            <div>Récupération : ${esc(d.pickup || '')}</div>
            ${d.delivery && d.delivery !== d.pickup ? `<div>Livraison : ${esc(d.delivery)}</div>` : ''}
          </div>
        </div>`;
    } else {
      detailEl.textContent = transport?.detail || state?.transport?.detail || '';
    }
  }

  // Compat anciens IDs
  set('totalHT',  euro(goodsHT));
  set('totalTVA', euro(goodsTVA));
  set('totalTTC', euro(goodsTTC));
  set('goodsHT',  euro(goodsHT));
  set('goodsTTC', euro(goodsTTC));
  set('transportCost', euro(transportTTC));

  setAll('[data-total="ht"]',  euro(goodsHT));
  setAll('[data-total="tva"]', euro(goodsTVA));
  setAll('[data-total="ttc"]', euro(goodsTTC));

  if (typeof transport?.promoRate === 'number') {
    const promoTxt = transport.promoRate ? `${Math.round(transport.promoRate * 100)} %` : '0 %';
    set('promoRate', promoTxt);
    setAll('[data-transport="promoRate"]', promoTxt);
  }
  if (typeof transport?.surcharge === 'number') {
    set('transportSurcharge', euro(Number(transport.surcharge || 0)));
  }
}

export function clearRecap() {
  const zero  = (id) => { const el = document.getElementById(id); if (el) el.textContent = euro(0); };
  const text  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setAll = (sel, v) => { document.querySelectorAll(sel).forEach(el => { el.textContent = v; }); };

  text('totalSurface', '0,00 m²');
  text('surfaceDisplay', '0,00 m²');
  setAll('[data-surface]', '0,00 m²');

  zero('prixHT'); zero('prixTVA'); zero('prixTransport'); zero('prixTTC');
  text('transportTarifInfo', '');
  const detailEl = document.getElementById('recapTransportDetail');
  if (detailEl) detailEl.innerHTML = '';

  zero('totalHT'); zero('totalTVA'); zero('totalTTC'); zero('goodsHT'); zero('goodsTTC');
  zero('transportCost'); zero('transportSurcharge'); text('promoRate', '');

  setAll('[data-total="ht"]',  euro(0));
  setAll('[data-total="tva"]', euro(0));
  setAll('[data-total="ttc"]', euro(0));
  setAll('[data-transport="promoRate"]', '');
}
