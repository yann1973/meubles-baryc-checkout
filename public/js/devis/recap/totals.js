// public/js/devis/recap/totals.js
import { euro } from '/js/common/dom.js';
import { state } from '/js/state.js';

/**
 * Met à jour les totaux (surface, HT/TVA/TTC, transport) dans la sidebar Devis.
 * Tolérant : met à jour les nouveaux IDs et garde la compat legacy.
 * @param {Object} pricing - objet retourné par computePricing()
 */
export function renderTotals(pricing = {}) {
  const totals    = pricing?.totals    || {};
  const goods     = pricing?.goods     || {};
  const transport = pricing?.transport || {};

  // --- valeurs numériques sûres ---
  const surface = Number(pricing?.totalSurface ?? 0) || 0;

  const goodsHT  = Number(goods?.ht  ?? totals?.ht  ?? 0) || 0;
  const goodsTVA = Number(goods?.tva ?? totals?.tva ?? 0) || 0;
  const goodsTTC = Number(goods?.ttc ?? totals?.ttc ?? 0) || 0;

  const transportTTC = Number(
    transport?.ttc ??
    transport?.totalTTC ??
    0
  ) || 0;

  const grandTTC = goodsTTC + transportTTC;

  // --- helpers ---
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setAll = (selector, txt) => {
    document.querySelectorAll(selector).forEach(el => { el.textContent = txt; });
  };

  // --- Surface (nouveau + compat)
  set('totalSurface', surface ? `${surface.toFixed(2)} m²` : '0,00 m²'); // sidebar
  set('surfaceDisplay', surface ? `${surface.toFixed(2)} m²` : '0,00 m²'); // carte dimensions (compat)
  setAll('[data-surface]', `${surface.toFixed(2)} m²`);

  // --- Totaux meubles (nouveaux IDs)
  set('prixHT',  euro(goodsHT));
  set('prixTVA', euro(goodsTVA));
  // Total TTC COMMANDE (meubles TTC + transport TTC)
  set('prixTTC', euro(grandTTC));

  // --- Transport (nouvel ID)
  set('prixTransport', euro(transportTTC));

  // --- Infos transport : prends d'abord pricing.transport.*, sinon state.transport.*
  const info   = (transport && (transport.info   || transport.label))  || state?.transport?.info  || '';
  const detail = (transport && (transport.detail || transport.debug)) || state?.transport?.detail || '';

  set('transportTarifInfo', info || '');
  set('recapTransportDetail', detail || '');

  // --- Compatibilité (anciens IDs + data-attrs)
  set('totalHT',  euro(goodsHT));
  set('totalTVA', euro(goodsTVA));
  set('totalTTC', euro(goodsTTC));        // ancien : TTC des meubles seulement
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

/** Remet à zéro l’affichage des totaux. */
export function clearRecap() {
  const zero  = (id) => { const el = document.getElementById(id); if (el) el.textContent = euro(0); };
  const text  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setAll = (sel, v) => { document.querySelectorAll(sel).forEach(el => { el.textContent = v; }); };

  // Surface
  text('totalSurface', '0,00 m²');
  text('surfaceDisplay', '0,00 m²');
  setAll('[data-surface]', '0,00 m²');

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
  setAll('[data-total="ht"]',  euro(0));
  setAll('[data-total="tva"]', euro(0));
  setAll('[data-total="ttc"]', euro(0));
  setAll('[data-transport="promoRate"]', '');
}
