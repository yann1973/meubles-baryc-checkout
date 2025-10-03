// public/js/devis/transport-pricing.js

// Barème (TTC) demandé :
// 0–9,9 km   → 79,90 €
// 10–19,9 km → 99,90 €
// 20–29,9 km → 119,90 €
// 30–39,9 km → 149,90 €
// ≥ 40 km    → 149,90 € + 3,00 €/km au-delà de 40
export function bracketRawTTC(distanceKm) {
  const km = Math.max(0, Number(distanceKm) || 0);

  if (km <= 9.9)   return { raw: 79.90,  label: '0–9,9 km (forfait)' };
  if (km <= 19.9)  return { raw: 99.90,  label: '10–19,9 km (forfait)' };
  if (km <= 29.9)  return { raw: 119.90, label: '20–29,9 km (forfait)' };
  if (km <= 39.9)  return { raw: 149.90, label: '30–39,9 km (forfait)' };

  const extraKm = km - 40;
  const raw = +(149.90 + (extraKm * 3.00)).toFixed(2);
  return { raw, label: '≥ 40 km (149,90 € + 3,00 €/km au-delà)' };
}

// +15% par meuble supplémentaire (n - 1), appliqué UNE SEULE FOIS sur le transport d’ordre
export function surchargeRate(cartItemsCount) {
  const n = Math.max(0, Number(cartItemsCount) || 0);
  return n > 1 ? 0.15 * (n - 1) : 0;
}

// Détail du transport facturé pour la COMMANDE (une seule ligne pour l’ordre)
export function calcOrderTransportDetails(distanceKm, cartItemsCount, mode = 'baryc') {
  // Transport à vos soins → 0
  if (mode !== 'baryc') {
    return { raw: 0, rate: 0, surcharge: 0, ttc: 0, label: 'transport à vos soins' };
  }
  // Pas de distance calculée → 0
  const km = Math.max(0, Number(distanceKm) || 0);
  if (km === 0) {
    return { raw: 0, rate: 0, surcharge: 0, ttc: 0, label: 'distance non calculée' };
  }

  const { raw, label } = bracketRawTTC(km);
  const rate = surchargeRate(cartItemsCount);
  const surcharge = +(raw * rate).toFixed(2);
  const ttc = +(raw + surcharge).toFixed(2);

  return { raw, rate, surcharge, ttc, label };
}

export function calcOrderTransportTTC(distanceKm, cartItemsCount, mode = 'baryc') {
  return calcOrderTransportDetails(distanceKm, cartItemsCount, mode).ttc;
}
