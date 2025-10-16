// public/js/transport/distance.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '../state.js';

// Helper DOM
const $ = (id) => document.getElementById(id);

// Barème €/km (vient de l’onglet CR via applyConfig) — conservé si tu veux l’afficher
const kmRate = () => Number(PRICING?.transport?.kmRate) || 0;

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

  // // Si tu veux afficher le coût transport TTC, dé-commente :
  // const elCost = $('transportCost');
  // if (elCost) {
  //   const costTTC = km * kmRate();
  //   elCost.textContent = new Intl.NumberFormat('fr-FR',{ style:'currency', currency:'EUR' }).format(costTTC);
  // }
}

/**
 * Calcule la distance totale:
 *  - si "manuel" => lit le champ et met à jour state.transport.distanceKm
 *  - sinon => via Google DistanceMatrix, mais seulement si mode = 'baryc'
 *  total = (base↔pickup) A/R + (base↔delivery) A/R (si livraison différente)
 * Appelle `callback()` après mise à jour pour déclencher un recompute global.
 */
export function computeDistance(callback) {
  // sécurité: conteneur transport
  if (!state.transport) {
    state.transport = { mode: 'client', pickKm: 0, dropKm: 0, distanceKm: 0 };
  }

  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');
  const modeSel      = $('transportMode');
  const mode         = (modeSel?.value || state.transport.mode || 'client');

  // 1) Mode manuel prioritaire
  if (manualToggle?.checked) {
    const v = Number(manualInput?.value || 0);
    state.transport.distanceKm = Number.isFinite(v) ? v : 0;
    // on ne touche pas pickKm/dropKm en manuel
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 2) Transport par le client → pas de calcul, 0 km
  if (mode !== 'baryc') {
    state.transport.pickKm = 0;
    state.transport.dropKm = 0;
    state.transport.distanceKm = 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 3) Mode baryc (par nos soins) → DistanceMatrix
  const pickupEl     = $('transportAddressPickup');
  const deliveryEl   = $('transportAddressDelivery');
  const deliveryDiff = !!$('deliveryDifferent')?.checked;

  const base      = (PRICING?.transport?.baseAddress || '').trim();
  const pickup    = (pickupEl?.value || '').trim();
  const delivery  = deliveryDiff ? (deliveryEl?.value || '').trim() : '';

  // besoin a minima de base + pickup
  if (!base || !pickup) {
    state.transport.pickKm = 0;
    state.transport.dropKm = 0;
    state.transport.distanceKm = 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // Google API prête ?
  if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
    console.warn('[distance] Google API non disponible; conserve la distance courante');
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  const svc = new google.maps.DistanceMatrixService();

  // helper: aller-retour base↔dest en km
  const kmRoundTrip = (origin, dest) => new Promise((resolve) => {
    if (!origin || !dest) return resolve(0);
    svc.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [dest],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        if (status !== 'OK' ||
            !res?.rows?.[0]?.elements?.[0] ||
            res.rows[0].elements[0].status !== 'OK') {
          console.warn('[distance] status:', status, res?.rows?.[0]?.elements?.[0]?.status);
          return resolve(0);
        }
        const meters   = res.rows[0].elements[0].distance?.value || 0;
        const kmOneWay = meters / 1000;
        resolve(Math.round(kmOneWay * 2 * 10) / 10); // A/R arrondi 0.1
      }
    );
  });

  (async () => {
    try {
      const pickAR = await kmRoundTrip(base, pickup);          // base↔pickup A/R
      const dropAR = delivery ? await kmRoundTrip(base, delivery) : 0; // base↔delivery A/R si différent

      state.transport.pickKm     = pickAR;
      state.transport.dropKm     = dropAR;
      state.transport.distanceKm = (pickAR + dropAR) || 0;

    } catch (e) {
      console.warn('[distance] échec DistanceMatrix:', e);
      // on laisse la valeur courante si erreur
    } finally {
      refreshDistanceUI();
      if (typeof callback === 'function') callback();
    }
  })();
}
