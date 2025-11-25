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

  const surface      = Number(pricing?.totalSurface ?? 0) || 0;
  const goodsHT      = Number(goods?.ht  ?? totals?.ht  ?? 0) || 0;
  const goodsTVA     = Number(goods?.tva ?? totals?.tva ?? 0) || 0;
  const goodsTTC     = Number(goods?.ttc ?? totals?.ttc ?? 0) || 0;
  const transportTTC = Number(transport?.ttc ?? transport?.totalTTC ?? 0) || 0;
  const grandTTC     = goodsTTC + transportTTC;

  // Surface (IDs + data-attrs)
  const surfTxt = `${surface.toFixed(2)} m²`;
  set('totalSurface',  surfTxt);
  set('surfaceDisplay',surfTxt);
  setAll('[data-surface]', surfTxt);

  // Totaux (sidebar)
  set('prixHT',  euro(goodsHT));
  set('prixTVA', euro(goodsTVA));
  set('prixTTC', euro(grandTTC));
  set('prixTransport', euro(transportTTC));

  // Info barème si dispo
  const info = transport?.info || transport?.label || state?.transport?.info || '';
  set('transportTarifInfo', info);

  // ---- Détail transport : sidebar (IDs existants) + section Transport (data-attrs) ----
  const d = state?.transport?.detailParts;
  if (d) {
    const pickKm  = d.pickARKm?.toFixed ? d.pickARKm.toFixed(1) : '0.0';
    const delKm   = d.delARKm?.toFixed  ? d.delARKm.toFixed(1)  : '0.0';
    const totKm   = d.totalKm?.toFixed  ? d.totalKm.toFixed(1)  : '0.0';
    const base    = d.base || '';
    const pickup  = d.pickup || '';
    const delivery= d.delivery || '';

    // Sidebar (IDs)
    set('recapTransportPickKm',  pickKm);
    set('recapTransportDelKm',   delKm);
    set('recapTransportTotalKm', totKm);
    set('recapTransportAtelier', base);
    set('recapTransportPickup',  pickup);
    set('recapTransportDelivery',delivery);
    const sameOrEmpty = !delivery || delivery === pickup;
    show('recapTransportDeliveryLine', !sameOrEmpty);

    // Section Transport (data-attrs)
    setDetail('pickKm',  pickKm);
    setDetail('delKm',   delKm);
    setDetail('totalKm', totKm);
    setDetail('atelier', base);
    setDetail('pickup',  pickup);
    setDetail('delivery',delivery);
    showDetailLine('delivery', !sameOrEmpty);
  } else {
    // reset léger
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
  }

  // Compat anciens IDs + data-attrs
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
