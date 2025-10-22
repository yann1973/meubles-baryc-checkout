// public/js/transport/distance.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '../state.js';

// Helper DOM
const $ = (id) => document.getElementById(id);

// Adresse de référence (atelier)
function getBase() {
  return (PRICING?.transport?.baseAddress || '13 Rue du Cabotage, 56700 Hennebont, France').trim();
}

/** Met à jour l'affichage de la distance (auto ou manuel) */
export function refreshDistanceUI() {
  const autoBlock    = $('distanceAutoBlock');
  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');

  const km = Number(state?.transport?.distanceKm) || 0;

  if (manualToggle?.checked) {
    manualInput?.classList.remove('hidden');
    autoBlock?.classList.add('hidden');
  } else {
    manualInput?.classList.add('hidden');
    autoBlock?.classList.remove('hidden');
    if (autoBlock) autoBlock.textContent = `${km.toFixed(1)} km`;
  }
}

// --- Google DistanceMatrix promisifié (one-way) ---
function dmOneWayKm(origin, destination) {
  return new Promise((resolve) => {
    if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
      console.warn('[distance] Google API indisponible -> 0 km (fallback)');
      return resolve(0);
    }
    const svc = new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        if (status === 'OK') {
          const el = res?.rows?.[0]?.elements?.[0];
          const meters = el?.distance?.value ?? 0;
          return resolve(meters / 1000);
        }
        console.warn('[distance] DistanceMatrix status:', status);
        resolve(0);
      }
    );
  });
}

/**
 * Calcule la distance totale = RÉCUP A/R + LIVRAISON A/R.
 * - pickup = adresse récupération (sinon client si tu veux, mais ici c’est ce champ)
 * - delivery = adresse livraison ; si vide → on considère la même que pickup
 * - base = adresse de référence (atelier) depuis l’onglet CR
 * Appelle `callback()` après mise à jour pour déclencher un recompute global.
 */
export async function computeDistance(callback) {
  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');

  // 0) init transport state
  if (!state.transport) {
    state.transport = { mode: 'client', distanceKm: 0, pickKm: 0, dropKm: 0 };
  }

  // 1) Mode MANUEL
  if (manualToggle?.checked) {
    const v = Number(manualInput?.value || 0);
    state.transport.distanceKm = Number.isFinite(v) ? v : 0;
    // détail explicite même en manuel
    const total = state.transport.distanceKm;
    state.transport.detail =
      `Distance saisie manuellement — Total ≈ ${total.toFixed(1)} km`;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 2) Mode AUTO (Google)
  const base      = getBase();
  const pickup    = ($('transportAddressPickup')?.value || '').trim();
  // si pas de livraison différente → on livre au même endroit
  const delivery  = ($('transportAddressDelivery')?.value || pickup).trim();

  if (!base || !pickup) {
    // pas assez d’infos -> 0
    state.transport.distanceKm = 0;
    state.transport.detail = 'Transport non calculé (adresse de récupération manquante).';
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 2 appels one-way : base→pickup et base→delivery
  const [toPick, toDel] = await Promise.all([
    dmOneWayKm(base, pickup),
    dmOneWayKm(base, delivery || pickup),
  ]);

  // total = 2 A/R = 2*(base<->pickup) + 2*(base<->delivery)
  const pickAR = 2 * toPick;
  const delAR  = 2 * toDel;
  const total  = pickAR + delAR;

  state.transport.distanceKm = Math.round(total * 10) / 10;
  state.transport.detail =
    `Récupération A/R: ${pickAR.toFixed(1)} km — ` +
    `Livraison A/R: ${delAR.toFixed(1)} km — ` +
    `Total: ${state.transport.distanceKm.toFixed(1)} km`;

  refreshDistanceUI();
  if (typeof callback === 'function') callback();
}
