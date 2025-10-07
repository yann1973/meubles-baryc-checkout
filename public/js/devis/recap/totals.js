// public/js/devis/recap/totals.js
import { euro } from '/js/common/dom.js';

/**
 * Met à jour les totaux (HT/TVA/TTC, surface, transport).
 * Le rendu est tolérant : si un élément n'existe pas, on l'ignore.
 * @param {Object} pricing - objet retourné par computePricing()
 */
export function renderTotals(pricing = {}) {
  const totals    = pricing.totals    || {};
  const goods     = pricing.goods     || {};
  const transport = pricing.transport || {};
  const surface   = Number(pricing.totalSurface || 0);

  // helpers
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setData = (name, txt) => {
    document.querySelectorAll(`[data-total="${name}"]`).forEach(el => { el.textContent = txt; });
  };

  // Totaux principaux
  const HT  = Number(totals.ht  ?? goods.ht  ?? 0);
  const TVA = Number(totals.tva ?? 0);
  const TTC = Number(totals.ttc ?? goods.ttc ?? 0);

  // Écritures (IDs classiques)
  set('totalHT',  euro(HT));
  set('totalTVA', euro(TVA));
  set('totalTTC', euro(TTC));

  // Doubles protections (data-attrs facultatifs)
  setData('ht',  euro(HT));
  setData('tva', euro(TVA));
  setData('ttc', euro(TTC));

  // Détails "goods" si présents
  set('goodsHT',  euro(Number(goods.ht  || 0)));
  set('goodsTTC', euro(Number(goods.ttc || 0)));

  // Surface
  set('surfaceDisplay', surface ? `${surface.toFixed(2)} m²` : '0.00 m²');
  document.querySelectorAll('[data-surface]').forEach(el => { el.textContent = `${surface.toFixed(2)} m²`; });

  // Transport
  set('transportCost', euro(Number(transport.ttc || 0)));
  if (typeof transport.promoRate === 'number') {
    // ex: -10 %
    const promoTxt = transport.promoRate ? `${Math.round(transport.promoRate * 100)} %` : '0 %';
    set('promoRate', promoTxt);
    document.querySelectorAll('[data-transport="promoRate"]').forEach(el => { el.textContent = promoTxt; });
  }

  // Surcharge / remise éventuelle (si tu les affiches)
  if (typeof transport.surcharge === 'number') {
    set('transportSurcharge', euro(Number(transport.surcharge || 0)));
  }
}

/**
 * Nettoie l'affichage du récapitulatif (totaux à zéro / texte vide).
 * Utile quand on réinitialise le devis.
 */
export function clearRecap() {
  const empty = (sel) => document.querySelectorAll(sel).forEach(el => el.textContent = '');
  const zero  = (sel) => document.querySelectorAll(sel).forEach(el => el.textContent = euro(0));

  // IDs classiques
  ['totalHT','totalTVA','totalTTC','goodsHT','goodsTTC','transportCost','transportSurcharge','promoRate','surfaceDisplay']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = id === 'surfaceDisplay' ? '0.00 m²' : euro(0); });

  // Data attrs éventuels
  zero('[data-total="ht"]');
  zero('[data-total="tva"]');
  zero('[data-total="ttc"]');
  empty('[data-surface]');
  empty('[data-transport="promoRate"]');
}
