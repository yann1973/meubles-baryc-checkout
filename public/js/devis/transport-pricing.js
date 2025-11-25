// public/js/devis/transport-pricing.js

/**
 * Barème par RAYON (distance atelier → adresse) — TTC :
 *  - 0–9,99   → 79,90 €
 *  - 10–19,99 → 99,90 €
 *  - 20–29,99 → 119,90 €
 *  - 30–39,99 → 149,90 €
 *  - ≥ 40     → 149,90 € + 3,00 €/km au-delà de 40
 *
 * Règle :
 *   On calcule le rayon pour l’adresse de RÉCUPÉRATION et pour l’adresse de LIVRAISON.
 *   Le prix appliqué est celui de la tranche correspondant au PLUS GRAND rayon des deux.
 *
 * Majoration logistique : +15% par meuble supplémentaire (n - 1), appliquée une seule fois.
 *
 * Module pur (aucun accès DOM).
 */

// ----------------- utils -----------------
const nfEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const nfKM  = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function r2(v){ return Math.round(num(v) * 100) / 100; }
function euro(n){ return nfEUR.format(num(n)); }
function kmf(n){ return nfKM.format(Math.max(0, num(n))); }

// ----------------- barème par rayon -----------------
export function bracketRawTTC(radiusKm) {
  const km = Math.max(0, num(radiusKm));

  if (km <=  9.99) return { raw: 79.90,  label: '0–9,99 km (forfait 2 A/R)' };
  if (km <= 19.99) return { raw: 99.90,  label: '10–19,99 km (forfait 2 A/R)' };
  if (km <= 29.99) return { raw: 119.90, label: '20–29,99 km (forfait 2 A/R)' };
  if (km <= 39.99) return { raw: 149.90, label: '30–39,99 km (forfait 2 A/R)' };

  const raw = r2(149.90 + (km - 40) * 3.00);
  return { raw, label: '≥ 40 km (149,90 € + 3,00 €/km au-delà, 2 A/R)' };
}

// ----------------- majoration logistique -----------------
export function surchargeRate(cartItemsCount) {
  const n = Math.max(0, num(cartItemsCount));
  return n > 1 ? 0.15 * (n - 1) : 0;
}

// ----------------- calcul à partir des 2 rayons -----------------
/**
 * Calcule le transport pour la commande à partir des RAYONS récup/livr.
 * On applique la tranche correspondant au MAX(rayonPickup, rayonLivraison).
 *
 * @param {number} pickRadiusKm
 * @param {number} dropRadiusKm
 * @param {number} cartItemsCount
 * @param {'baryc'|'client'} mode
 * @returns {{
 *   raw:number, rate:number, surcharge:number, ttc:number, label:string,
 *   info:string, detail:string, detailLines:string[],
 *   pickRadiusKm:number, dropRadiusKm:number, appliedRadiusKm:number
 * }}
 */
export function calcOrderTransportDetailsFromRadii(pickRadiusKm, dropRadiusKm, cartItemsCount, mode = 'baryc') {
  if (mode !== 'baryc') {
    const detail = 'Transport à vos soins — aucun coût facturé.';
    return {
      raw: 0, rate: 0, surcharge: 0, ttc: 0,
      label: 'transport à vos soins',
      info:  'Barème par rayon (atelier)',
      detail,
      detailLines: [detail],
      pickRadiusKm: 0,
      dropRadiusKm: 0,
      appliedRadiusKm: 0,
    };
  }

  const rPick = Math.max(0, num(pickRadiusKm));
  const rDrop = Math.max(0, num(dropRadiusKm));
  const applied = Math.max(rPick, rDrop);

  if (applied === 0) {
    const detail = 'Rayons non calculés (récup/livraison manquants).';
    return {
      raw: 0, rate: 0, surcharge: 0, ttc: 0,
      label: 'distance non calculée',
      info:  'Barème par rayon (atelier)',
      detail,
      detailLines: [detail],
      pickRadiusKm: rPick,
      dropRadiusKm: rDrop,
      appliedRadiusKm: 0,
    };
  }

  const { raw, label } = bracketRawTTC(applied);
  const rate      = surchargeRate(cartItemsCount);
  const surcharge = r2(raw * rate);
  const ttc       = r2(raw + surcharge);

  const lines = [
    `Récupération : ${kmf(rPick)} km (rayon atelier)`,
    `Livraison    : ${kmf(rDrop)} km (rayon atelier)`,
    `Rayon appliqué (max) : ${kmf(applied)} km`,
    `Forfait : ${label} → base ${euro(raw)}`,
  ];
  if (surcharge > 0) {
    const n = Math.max(0, num(cartItemsCount));
    const pct = Math.round((surcharge / Math.max(raw, 0.01)) * 100);
    lines.push(`Majoration logistique : ${euro(surcharge)} (${pct} % pour ${n} meuble${n>1?'s':''})`);
  }
  lines.push(`Transport TTC : ${euro(ttc)}`);

  return {
    raw, rate, surcharge, ttc, label,
    info: 'Barème par rayon (depuis l’atelier)',
    detail: lines.join(' — '),
    detailLines: lines,
    pickRadiusKm: rPick,
    dropRadiusKm: rDrop,
    appliedRadiusKm: applied,
  };
}

// ----------------- compat anciennes signatures -----------------
export function calcOrderTransportDetails(distanceKm, cartItemsCount, mode = 'baryc') {
  return calcOrderTransportDetailsFromRadii(distanceKm, distanceKm, cartItemsCount, mode);
}
export function calcOrderTransportTTCFromRadii(pickRadiusKm, dropRadiusKm, cartItemsCount, mode = 'baryc') {
  return calcOrderTransportDetailsFromRadii(pickRadiusKm, dropRadiusKm, cartItemsCount, mode).ttc;
}
export function calcOrderTransportTTC(distanceKm, cartItemsCount, mode = 'baryc') {
  return calcOrderTransportDetails(distanceKm, cartItemsCount, mode).ttc;
}
