// public/js/devis/pricing.js
import { state } from '/js/state.js';
import { PRICING } from '/js/devis/constants.js';
import { toHT, treatedSurface } from '/js/utils.js';
import { calcOrderTransportDetails } from '/js/devis/transport-pricing.js';

function sumServicesM2(surfaceM2) {
  const s = PRICING.servicesTTC || {};
  const sv = state.services || {};
  return (
    (sv.poncage       ? (s.poncage       || 0) * surfaceM2 : 0) +
    (sv.aerogommage   ? (s.aerogommage   || 0) * surfaceM2 : 0) +
    (sv.peinture1     ? (s.peinture1     || 0) * surfaceM2 : 0) +
    (sv.peinture2     ? (s.peinture2     || 0) * surfaceM2 : 0) +
    (sv.teinte        ? (s.teinte        || 0) * surfaceM2 : 0) +
    (sv.vernis        ? (s.vernis        || 0) * surfaceM2 : 0) +
    (sv.consommables  ? (s.consommables  || 0) * surfaceM2 : 0)
  );
}

function piecesTTC() {
  const s = PRICING.servicesTTC || {};
  const pc = state.pieceCounts || {};
  const chg = (pc.ferrures_change     || 0) * (s.ferrures_change     || 0);
  const pol = (pc.ferrures_polissage  || 0) * (s.ferrures_polissage  || 0);
  return chg + pol;
}

export function computePricing(opts = {}) {
  const surface = treatedSurface(state.L, state.W, state.H);

  const goodsTTC = +(sumServicesM2(surface) + piecesTTC()).toFixed(2);
  const goodsHT  = +(toHT(goodsTTC, PRICING.tva)).toFixed(2);
  const goodsTVA = +(goodsTTC - goodsHT).toFixed(2);

  // nombre d’articles pris en compte pour la majoration transport
  const promoCount = Number.isFinite(opts.promoCount)
    ? opts.promoCount
    : ((state.cart?.length || 0) + 1);

  const td = calcOrderTransportDetails(
    state.transport?.distanceKm || 0,
    promoCount,
    state.transport?.mode || 'client'
  );

  return {
    totalSurface: surface,
    goods: { ht: goodsHT, tva: goodsTVA, ttc: goodsTTC },
    transport: td, // { raw, rate, surcharge, ttc, label }
  };
}
