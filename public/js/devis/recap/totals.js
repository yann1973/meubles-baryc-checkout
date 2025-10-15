// public/js/devis/recap/totals.js
import { euro } from '/js/common/dom.js';

// Petits helpers sûrs
const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const set = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};
const setAll = (sel, txt) => {
  document.querySelectorAll(sel).forEach(el => { el.textContent = txt; });
};

/**
 * Met à jour les totaux (surface, HT/TVA/TTC, transport) dans la sidebar Devis.
 * Tolérant : met à jour les nouveaux IDs et garde la compat legacy.
 * @param {Object} pricing - objet retourné par computePricing()
 */
export function renderTotals(pricing = {}) {
  const totals    = pricing?.totals    || {};
  const goods     = pricing?.goods     || {};
  const transport = pricing?.transport || {};

  // --- Surface ---
  const surface = num(pricing?.totalSurface, 0);
  const surfTxt = `${surface.toFixed(2)} m²`;
  set('totalSurface',   surfTxt);           // sidebar (nouvel ID)
  set('surfaceDisplay', surfTxt);           // compat (carte dimensions)
  setAll('[data-surface]', surfTxt);

  // --- Meubles HT/TVA/TTC (on privilégie goods, fallback totals) ---
  const goodsHT  = num(goods?.ht,  num(totals?.ht,  0));
  // TVA : priorité à goods.tva, sinon totals.tva, sinon calc TTC-HT (si cohérent)
  let goodsTVA   = num(goods?.tva, num(totals?.tva, 0));
  const goodsTTC = num(goods?.ttc, num(totals?.ttc, 0));

  if (!goodsTVA && goodsTTC >= goodsHT) {
    const calcTVA = goodsTTC - goodsHT;
    if (Number.isFinite(calcTVA)) goodsTVA = calcTVA;
  }

  // --- Transport TTC ---
  const transportTTC = num(transport?.ttc, num(transport?.totalTTC, 0));

  // --- Total commande TTC (meubles TTC + transport TTC) ---
  const grandTTC = goodsTTC + transportTTC;

  // --- Nouveaux IDs (sidebar) ---
  set('prixHT',        euro(goodsHT));
  set('prixTVA',       euro(goodsTVA));
  set('prixTransport', euro(transportTTC));
  set('prixTTC',       euro(grandTTC));

  // --- Infos transport optionnelles ---
  const info   = transport?.info   ?? transport?.label  ?? '';
  const detail = transport?.detail ?? transport?.debug  ?? '';
  set('transportTarifInfo',   info || '');
  set('recapTransportDetail', detail || '');

  // --- Compat anciens IDs (si encore présents dans ta page) ---
  set('totalHT',       euro(goodsHT));
  set('totalTVA',      euro(goodsTVA));
  set('totalTTC',      euro(goodsTTC));     // ancien “TTC meubles” uniquement
  set('goodsHT',       euro(goodsHT));
  set('goodsTTC',      euro(goodsTTC));
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
    set('transportSurcharge', euro(num(transport.surcharge, 0)));
  }
}

/**
 * Remet à zéro l’affichage des totaux.
 */
export function clearRecap() {
  const zero  = (id) => { const el = document.getElementById(id); if (el) el.textContent = euro(0); };
  const text  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const all   = (sel, v) => { document.querySelectorAll(sel).forEach(el => { el.textContent = v; }); };

  // Surface
  text('totalSurface', '0,00 m²');
  text('surfaceDisplay', '0,00 m²');
  all('[data-surface]', '0,00 m²');

  // Nouveaux IDs (sidebar)
  zero('prixHT');
  zero('prixTVA');
  zero('prixTransport');
  zero('prixTTC');
  text('transportTarifInfo', '');
  text('recapTransportDetail', '');

  // Compat anciens IDs
  zero('totalHT');
  zero('totalTVA');
  zero('totalTTC');
  zero('goodsHT');
  zero('goodsTTC');
  zero('transportCost');
  zero('transportSurcharge');
  text('promoRate', '');

  // Data attrs (compat)
  all('[data-total="ht"]',  euro(0));
  all('[data-total="tva"]', euro(0));
  all('[data-total="ttc"]', euro(0));
  all('[data-transport="promoRate"]', '');
}
