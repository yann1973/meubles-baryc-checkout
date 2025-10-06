// public/js/transport/distance.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '../state.js';

// Km rate dynamique (vient de l'onglet CR via applyConfig)
const kmRate = () => Number(PRICING?.transport?.kmRate) || 0;

// Petit helper UI
function $(id) { return document.getElementById(id); }

export function refreshDistanceUI() {
  const autoBlock     = $('distanceAutoBlock');
  const manualToggle  = $('manualDistanceToggle');
  const manualInput   = $('distanceManual');

  const km = Number(state?.transport?.distanceKm) || 0;

  // Affichage du bloc auto / champ manuel
  if (manualToggle?.checked) {
    manualInput?.classList.remove('hidden');
    autoBlock?.classList.add('hidden');
  } else {
    manualInput?.classList.add('hidden');
    autoBlock?.classList.remove('hidden');
    if (autoBlock) autoBlock.textContent = `${km.toFixed(1)} km`;
  }

  // Si tu as des zones pour afficher le prix transport, tu peux décommenter :
  // const costTTC = km * kmRate();
  // const elCost = $('transportCost');
  // if (elCost) elCost.textContent = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(costTTC);
}

// Calcule la distance (manuel => valeur champ ; sinon Google DistanceMatrix si dispo)
// Met à jour state.transport.distanceKm puis rafraîchit l'UI et appelle le callback.
export function computeDistance(callback) {
  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');

  // 1) Mode manuel
  if (manualToggle?.checked) {
    const v = Number(manualInput?.value || 0);
    state.transport.distanceKm = Number.isFinite(v) ? v : 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 2) Mode auto (Google)
  const pickupEl   = $('transportAddressPickup');
  const deliveryEl = $('transportAddressDelivery');

  // Fallback: si pickup vide, on prend l'adresse de référence (onglet CR)
  const origin      = (pickupEl?.value || PRICING?.transport?.baseAddress || '').trim();
  const destination = (deliveryEl?.value || '').trim();

  if (!origin || !destination) {
    state.transport.distanceKm = 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // Google API prête ?
  if (window.google && google.maps && google.maps.DistanceMatrixService) {
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
          const km = meters / 1000;
          state.transport.distanceKm = Math.round(km * 10) / 10; // 0.1 km
        } else {
          console.warn('[distance] DistanceMatrix status:', status);
          // on ne change pas la valeur si échec
        }
        refreshDistanceUI();
        if (typeof callback === 'function') callback();
      }
    );
  } else {
    console.warn('[distance] Google API non disponible; conserve la distance courante');
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
  }
}
