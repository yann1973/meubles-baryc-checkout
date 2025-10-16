// public/js/transport/distance.js
import { state } from '../state.js';
import { PRICING } from '/js/devis/constants.js';

/**
 * Met à jour le bloc distance (lecture seule côté UI Transport).
 */
export function refreshDistanceUI() {
  const block = document.getElementById('distanceAutoBlock');
  if (block) {
    const km = Number(state.transport?.distanceKm || 0);
    block.textContent = `${km.toFixed(1)} km`;
  }
}

/**
 * Calcule la distance totale:
 *   total = (base↔pickup) A/R  +  (base↔delivery) A/R (si livraison différente).
 * Écrit les valeurs dans state.transport.{pickKm, dropKm, distanceKm}
 * et appelle onDone() si fourni (pour relancer le pricing/récap).
 */
export async function computeDistance(onDone) {
  // Sécurité: initialise le conteneur transport dans le state
  if (!state.transport) {
    state.transport = { mode: 'client', pickKm: 0, dropKm: 0, distanceKm: 0 };
  }

  // Si transport à la charge du client OU saisie manuelle → pas de calcul Google
  const manualOn = !!document.getElementById('manualDistanceToggle')?.checked;
  if (state.transport.mode !== 'baryc' || manualOn) {
    refreshDistanceUI();
    if (typeof onDone === 'function') onDone();
    return;
  }

  // Adresse de référence (société) requise
  const base = (PRICING?.transport?.baseAddress || '').trim();
  const pickup = document.getElementById('transportAddressPickup')?.value?.trim() || '';
  const useDelivery = !!document.getElementById('deliveryDifferent')?.checked;
  const delivery = useDelivery ? (document.getElementById('transportAddressDelivery')?.value?.trim() || '') : '';

  if (!base || !pickup) {
    // Impossible de calculer sans base ou pickup → remet à 0
    state.transport.pickKm = 0;
    state.transport.dropKm = 0;
    state.transport.distanceKm = 0;
    refreshDistanceUI();
    if (typeof onDone === 'function') onDone();
    return;
  }

  // Google Maps chargé ?
  if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
    console.warn('[distance] Google Maps non chargé (DistanceMatrixService indisponible).');
    refreshDistanceUI();
    if (typeof onDone === 'function') onDone();
    return;
  }

  try {
    const svc = new google.maps.DistanceMatrixService();

    const pickAR = await kmRoundTrip(svc, base, pickup);      // base↔pickup aller-retour
    const dropAR = delivery ? await kmRoundTrip(svc, base, delivery) : 0; // base↔delivery A/R si différent

    state.transport.pickKm = pickAR;
    state.transport.dropKm = dropAR;
    state.transport.distanceKm = (pickAR + dropAR) || 0;

    refreshDistanceUI();
  } catch (e) {
    console.warn('[distance] échec calcul DistanceMatrix:', e);
  } finally {
    if (typeof onDone === 'function') onDone();
  }
}

/* ----------------- Helpers ----------------- */

function kmRoundTrip(svc, origin, dest) {
  return new Promise((resolve) => {
    if (!origin || !dest) return resolve(0);
    svc.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [dest],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        if (status !== 'OK' || !res?.rows?.[0]?.elements?.[0] || res.rows[0].elements[0].status !== 'OK') {
          console.warn('[distance] statut:', status, res?.rows?.[0]?.elements?.[0]?.status);
          return resolve(0);
        }
        const meters = res.rows[0].elements[0].distance?.value || 0;
        const kmOneWay = meters / 1000;
        resolve(kmOneWay * 2); // A/R
      }
    );
  });
}
