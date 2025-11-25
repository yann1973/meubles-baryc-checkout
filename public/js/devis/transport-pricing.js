// public/js/devis/transport-pricing.js

/**
 * Calcul du transport par **rayon** (distance en km depuis l'atelier).
 * Tranches/prix (TTC) conservés :
 *  - 0–9,99   → 79,90 €
 *  - 10–19,99 → 99,90 €
 *  - 20–29,99 → 119,90 €
 *  - 30–39,99 → 149,90 €
 *  - ≥ 40     → 149,90 € + 3,00 €/km au-delà de 40
 *
 * NB: Les fonctions ici sont **pures** (pas de DOM), et ne dépendent pas d’un format d’état.
 *     L’argument `distanceKm` est interprété comme le **rayon** déjà calculé (voir distance.js).
 */

// ——————————————————————————————————————————————
// Utilitaires locaux
// ——————————————————————————————————————————————
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function round2(n) {
  return Math.round(toNum(n) * 100) / 100;
}
function euro(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(toNum(n));
}

// ——————————————————————————————————————————————
// Barème par rayon (TTC) — renvoie le forfait “brut” et un libellé de tranche
// ——————————————————————————————————————————————
export function bracketRawTTC(distanceKm) {
  const km = Math.max(0, toNum(distanceKm));

  if (km <= 9.99)   return { raw: 79.90,  label: '0–9,99 km (forfait)' };
  if (km <= 19.99)  return { raw: 99.90,  label: '10–19,99 km (forfait)' };
  if (km <= 29.99)  return { raw: 119.90, label: '20–29,99 km (forfait)' };
  if (km <= 39.99)  return { raw: 149.90, label: '30–39,99 km (forfait)' };

  const extraKm = km - 40;
  const raw = round2(149.90 + (extraKm * 3.00));
  return { raw, label: '≥ 40 km (149,90 € + 3,00 €/km au-delà)' };
}

// ——————————————————————————————————————————————
// Majoration logistique : +15% par meuble supplémentaire (n - 1)
// ——————————————————————————————————————————————
export function surchargeRate(cartItemsCount) {
  const n = Math.max(0, toNum(cartItemsCount));
  return n > 1 ? 0.15 * (n - 1) : 0;
}

// ——————————————————————————————————————————————
// Détail complet du transport pour la COMMANDE (une seule ligne)
// ——————————————————————————————————————————————
export function calcOrderTransportDetails(distanceKm, cartItemsCount, mode = 'baryc') {
  // Transport à vos soins → coût nul
  if (mode !== 'baryc') {
    return {
      raw: 0,
      rate: 0,
      surcharge: 0,
      ttc: 0,
      label: 'transport à vos soins',
      info: 'Transport à vos soins',
      detail: 'Aucun coût de transport facturé (client).',
      radiusKm: 0,
    };
  }

  const km = Math.max(0, toNum(distanceKm));
  if (km === 0) {
    return {
      raw: 0,
      rate: 0,
      surcharge: 0,
      ttc: 0,
      label: 'distance non calculée',
      info: 'Barème par rayon (atelier)',
      detail: 'Rayon 0,0 km — distance non calculée.',
      radiusKm: 0,
    };
  }

  const { raw, label } = bracketRawTTC(km);
  const rate = surchargeRate(cartItemsCount);
  const surcharge = round2(raw * rate);
  const ttc = round2(raw + surcharge);

  // Texte explicatif standardisé (pour sidebar et/ou section Transport)
  const info = 'Barème par rayon (depuis l’atelier)';
  const parts = [
    `Rayon ${km.toFixed(1)} km — ${label}`,
    `base ${euro(raw)}`,
  ];
  if (surcharge > 0) {
    const n = Math.max(0, toNum(cartItemsCount));
    const pct = Math.round((surcharge / Math.max(raw, 0.01)) * 100); // protection /0
    parts.push(`+ maj logistique ${euro(surcharge)} (${pct} % pour ${n} meuble${n > 1 ? 's' : ''})`);
  }
  const detail = parts.join(' → ');

  return {
    raw,          // base TTC (forfait / ≥40 + 3€/km)
    rate,         // taux de maj logistique appliqué
    surcharge,    // montant TTC de la maj
    ttc,          // total TTC transport pour l’ordre
    label,        // libellé tranche
    info,         // court texte explicatif
    detail,       // détail complet “humain”
    radiusKm: km, // pour affichage éventuel ailleurs
  };
}

// ——————————————————————————————————————————————
// Raccourci : juste le TTC calculé
// ——————————————————————————————————————————————
export function calcOrderTransportTTC(distanceKm, cartItemsCount, mode = 'baryc') {
  return calcOrderTransportDetails(distanceKm, cartItemsCount, mode).ttc;
}
