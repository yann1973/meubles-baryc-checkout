// public/js/devis/recap/totals.js
import { euro } from '/js/common/dom.js';
import { state } from '/js/state.js';

const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
const setAll = (selector, txt) => { document.querySelectorAll(selector).forEach(el => { el.textContent = txt; }); };
const show = (id, visible) => { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !visible); };

// helpers pour le bloc Transport du bas de page (data-attrs)
const setDetail = (key, txt) => {
  document.querySelectorAll(`[data-t-detail="${key}"]`).forEach(el => { el.textContent = txt; });
};
const showDetailLine = (key, visible) => {
  document.querySelectorAll(`[data-t-detail-line="${key}"]`).forEach(el => { el.classList.toggle('hidden', !visible); });
};


export function renderTotals(pricing = {}) {
  const totals    = pricing?.totals    || {};
  const goods     = pricing?.goods     || {};
  const transport = pricing?.transport || {};

  const surface = Number(pricing?.totalSurface ?? 0) || 0;
  const goodsHT  = Number(goods?.ht  ?? totals?.ht  ?? 0) || 0;
  const goodsTVA = Number(goods?.tva ?? totals?.tva ?? 0) || 0;
  const goodsTTC = Number(goods?.ttc ?? totals?.ttc ?? 0) || 0;
  const transportTTC = Number(transport?.ttc ?? 0) || 0;
  const grandTTC = goodsTTC + transportTTC;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setAll = (sel, v) => document.querySelectorAll(sel).forEach(el => el.textContent = v);

  // Surface
  const surfTxt = `${surface.toFixed(2)} m²`;
  set('totalSurface', surfTxt);
  set('surfaceDisplay', surfTxt);
  setAll('[data-surface]', surfTxt);

  // Totaux (nouveaux IDs sidebar)
  set('prixHT',  euro(goodsHT));
  set('prixTVA', euro(goodsTVA));
  set('prixTransport', euro(transportTTC));
  set('prixTTC', euro(grandTTC));

  // Compat anciens IDs
  set('totalHT',  euro(goodsHT));
  set('totalTVA', euro(goodsTVA));
  set('totalTTC', euro(goodsTTC));
  set('goodsHT',  euro(goodsHT));
  set('goodsTTC', euro(goodsTTC));
  set('transportCost', euro(transportTTC));

  // -------- DÉTAIL TRANSPORT (comme “avant”) --------
  // Sidebar (IDs déjà présents dans ton partial)
  set('transportTarifInfo', transport?.info || '');
  set('recapTransportDetail', transport?.detail || '');

  // Section Transport (si tu as ces IDs dans le partial de la carte Transport)
  const box = document.getElementById('transportDetailsBox');
  const infoEl = document.getElementById('transportInfo');
  const brkEl  = document.getElementById('transportBreakdown');

  if (box && (transport?.info || transport?.detail)) {
    box.classList.remove('hidden');
    if (infoEl) infoEl.textContent = transport.info || '';
    if (brkEl)  brkEl.textContent  = transport.detail || '';
  } else if (box) {
    box.classList.add('hidden');
    if (infoEl) infoEl.textContent = '';
    if (brkEl)  brkEl.textContent  = '';
  }

  // Promo/maj affichée si tu l’utilises encore
  if (typeof transport?.promoRate === 'number') {
    const promoTxt = transport.promoRate ? `${Math.round(transport.promoRate * 100)} %` : '0 %';
    set('promoRate', promoTxt);
    setAll('[data-transport="promoRate"]', promoTxt);
  }
}
























export function clearRecap() {
  const zero = (id) => { const el = document.getElementById(id); if (el) el.textContent = euro(0); };
  const text = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  text('totalSurface','0,00 m²');
  text('surfaceDisplay','0,00 m²');
  setAll('[data-surface]', '0,00 m²');

  zero('prixHT'); zero('prixTVA'); zero('prixTransport'); zero('prixTTC');
  text('transportTarifInfo', '');

  set('recapTransportPickKm','—');
  set('recapTransportDelKm','—');
  set('recapTransportTotalKm','—');
  set('recapTransportAtelier','—');
  set('recapTransportPickup','—');
  set('recapTransportDelivery','—');
  show('recapTransportDeliveryLine', false);

  setDetail('pickKm','—');
  setDetail('delKm','—');
  setDetail('totalKm','—');
  setDetail('atelier','—');
  setDetail('pickup','—');
  setDetail('delivery','—');
  showDetailLine('delivery', false);

  // compat anciens
  zero('totalHT'); zero('totalTVA'); zero('totalTTC'); zero('goodsHT'); zero('goodsTTC');
  zero('transportCost'); zero('transportSurcharge'); text('promoRate','');
  setAll('[data-total="ht"]',  euro(0));
  setAll('[data-total="tva"]', euro(0));
  setAll('[data-total="ttc"]', euro(0));
  setAll('[data-transport="promoRate"]', '');
}
