// public/js/transport/distance.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '../state.js';

// Helpers DOM
const $ = (id) => document.getElementById(id);

// Adresse atelier (réglable via Admin/CR -> applyConfig)
function baseAddress() {
  return (PRICING?.transport?.baseAddress || '13 Rue du Cabotage, 56700 Hennebont, France').trim();
}

// Arrondi à 0,1 km
const round01 = (km) => Math.round((Number(km) || 0) * 10) / 10;

// --- UI: montre/cacher auto vs manuel et affiche le rayon appliqué (max des deux) ---
export function refreshDistanceUI() {
  const autoBlock    = $('distanceAutoBlock');
  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');

  // Rayon appliqué = max(pick, drop)
  const pick = Number(state?.transport?.pickRadiusKm) || 0;
  const drop = Number(state?.transport?.dropRadiusKm) || 0;
  const applied = round01(Math.max(pick, drop));

  // copy de compat pour d’autres modules qui lisent encore distanceKm
  if (!state.transport) state.transport = {};
  state.transport.distanceKm = applied;

  if (manualToggle?.checked) {
    manualInput?.classList.remove('hidden');
    autoBlock?.classList.add('hidden');
  } else {
    manualInput?.classList.add('hidden');
    autoBlock?.classList.remove('hidden');
    if (autoBlock) autoBlock.textContent = `${applied.toFixed(1)} km`;
  }
}

// Promisifie DistanceMatrix atelier -> destination (km)
function getDrivingKm(origin, dest) {
  return new Promise((resolve) => {
    if (!origin || !dest) return resolve(0);

    if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
      console.warn('[distance] Google API non disponible; km=0 pour', dest);
      return resolve(0);
    }
    try {
      const svc = new google.maps.DistanceMatrixService();
      svc.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [dest],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
        },
        (res, status) => {
          if (status === 'OK') {
            const el = res?.rows?.[0]?.elements?.[0];
            const meters = el?.distance?.value ?? 0;
            return resolve(round01(meters / 1000));
          }
          console.warn('[distance] DistanceMatrix status:', status, 'dest=', dest);
          resolve(0);
        }
      );
    } catch (e) {
      console.warn('[distance] DistanceMatrix exception:', e);
      resolve(0);
    }
  });
}

/**
 * Calcule les **rayons** depuis l’atelier :
 * - si “manuel” -> applique la valeur aux 2 rayons
 * - si mode "client" -> rayons = 0
 * - sinon -> atelier→pickup et atelier→delivery (si renseignée), puis applique max(pick, drop)
 * Met à jour :
 *   - state.transport.pickRadiusKm
 *   - state.transport.dropRadiusKm
 *   - state.transport.distanceKm (compat: rayon appliqué = max des deux)
 * Appelle `callback()` ensuite.
 */
export async function computeDistance(callback) {
  if (!state.transport) {
    state.transport = { mode: 'client', pickRadiusKm: 0, dropRadiusKm: 0, distanceKm: 0 };
  }

  const manualToggle = $('manualDistanceToggle');
  const manualInput  = $('distanceManual');

  // 0) Mode transport "client" → 0
  if ((state.transport.mode || 'client') === 'client') {
    state.transport.pickRadiusKm = 0;
    state.transport.dropRadiusKm = 0;
    state.transport.distanceKm   = 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 1) Mode MANUEL
  if (manualToggle?.checked) {
    const v = Number(manualInput?.value || 0);
    const km = Number.isFinite(v) ? Math.max(0, v) : 0;
    state.transport.pickRadiusKm = km;
    state.transport.dropRadiusKm = km;
    state.transport.distanceKm   = km; // compat
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  // 2) Mode AUTO (Google) — rayon = max(atelier→pickup, atelier→delivery)
  const origin   = baseAddress();
  const pickup   = ($('transportAddressPickup')?.value || '').trim();
  const delivery = ($('transportAddressDelivery')?.value || '').trim();

  if (!origin) {
    console.warn('[distance] Adresse atelier vide; rayons=0');
    state.transport.pickRadiusKm = 0;
    state.transport.dropRadiusKm = 0;
    state.transport.distanceKm   = 0;
    refreshDistanceUI();
    if (typeof callback === 'function') callback();
    return;
  }

  const [pickKm, dropKm] = await Promise.all([
    pickup ? getDrivingKm(origin, pickup) : Promise.resolve(0),
    delivery ? getDrivingKm(origin, delivery) : Promise.resolve(0),
  ]);

  state.transport.pickRadiusKm = pickKm;
  state.transport.dropRadiusKm = dropKm;
  state.transport.distanceKm   = round01(Math.max(pickKm, dropKm)); // compat

  refreshDistanceUI();
  if (typeof callback === 'function') callback();
}
