// public/js/transport/distance.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '../state.js';

const $ = (id) => document.getElementById(id);
const round1 = (n) => Math.round(Number(n || 0) * 10) / 10;

function getBase() {
  return (PRICING?.transport?.baseAddress || '13 Rue du Cabotage, 56700 Hennebont, France').trim();
}

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

function dmOneWayKm(origin, destination) {
  return new Promise((resolve) => {
    if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
      console.warn('[distance] Google API indisponible -> 0 km (fallback)');
      return resolve(0);
    }
    const svc = new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix(
      { origins:[origin], destinations:[destination], travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC },
      (res, status) => {
        if (status === 'OK') {
          const el = res?.rows?.[0]?.elements?.[0];
          return resolve((el?.distance?.value || 0) / 1000);
        }
        console.warn('[distance] DistanceMatrix status:', status);
        resolve(0);
      }
    );
  });
}

export async function computeDistance(callback) {
  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');
  if (!state.transport) state.transport = { mode:'client', distanceKm:0, pickKm:0, dropKm:0 };

  const base     = getBase();
  const pickupEl = $('transportAddressPickup');
  const delivEl  = $('transportAddressDelivery');
  const pickup   = (pickupEl?.value || '').trim();
  const delivery = (delivEl?.value  || pickup).trim();

  // Mode MANUEL
  if (manualToggle?.checked) {
    const total = round1(manualInput?.value || 0);
    state.transport.distanceKm  = total;
    state.transport.detail      = `Distance saisie manuellement — Total ≈ ${total.toFixed(1)} km`;
    state.transport.detailParts = { base, pickup, delivery, pickARKm: 0, delARKm: 0, totalKm: total };
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // Mode AUTO
  if (!base || !pickup) {
    state.transport.distanceKm  = 0;
    state.transport.detail      = 'Transport non calculé (adresse de récupération manquante).';
    state.transport.detailParts = { base, pickup, delivery, pickARKm: 0, delARKm: 0, totalKm: 0 };
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  const [toPick, toDel] = await Promise.all([
    dmOneWayKm(base, pickup),
    dmOneWayKm(base, delivery || pickup),
  ]);

  const pickAR = round1(2 * toPick);
  const delAR  = round1(2 * toDel);
  const total  = round1(pickAR + delAR);

  state.transport.distanceKm  = total;
  state.transport.detail      = `Récupération A/R: ${pickAR.toFixed(1)} km — Livraison A/R: ${delAR.toFixed(1)} km — Total: ${total.toFixed(1)} km`;
  state.transport.detailParts = { base, pickup, delivery, pickARKm: pickAR, delARKm: delAR, totalKm: total };

  refreshDistanceUI();
  if (typeof callback === 'function') callback();
}
