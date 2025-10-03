// public/js/transport/distance.js
import { CONFIG } from '../config.js';
import { state } from '../state.js';

const CACHE_KEY = 'baryc_dist_cache_v1';
const DIST_CACHE = new Map(); // key => {pick, drop, tot, ts}

// ===== Cache (restore + persist) =====
(function restoreCache(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    arr.forEach(([k,v])=> DIST_CACHE.set(k,v));
  }catch{}
})();
function persistCache(){
  try{
    localStorage.setItem(CACHE_KEY, JSON.stringify([...DIST_CACHE]));
  }catch{}
}

// ===== Helpers =====
function setErr(msg){
  const errEl = document.getElementById('distanceError');
  if (errEl) errEl.textContent = msg || '';
}
function kmFromMeters(m){
  return Math.max(0, Math.round((Number(m)||0) / 100) / 10); // arrondi 0,1 km
}
function cacheKey(pickup, deliveryOn, delivery){
  return JSON.stringify([pickup||'', deliveryOn?1:0, deliveryOn?(delivery||''):'' ]);
}

// ===== UI update (aperçu + récap) =====
function updateUI(){
  const modeSel = document.getElementById('transportMode');
  const modeIsBaryc = (modeSel?.value === 'baryc') || state.transport.mode === 'baryc';

  const p  = Number(state.transport.pickKm) || 0;  // atelier→récup (aller simple)
  const dr = Number(state.transport.dropKm) || 0;  // atelier→livraison (aller simple)
  const isDeliveryDifferent = !!document.getElementById('deliveryDifferent')?.checked;

  const recupAR = (p * 2);
  const livAR   = (dr * 2);
  const tot     = (isDeliveryDifferent && dr > 0) ? (recupAR + livAR) : (p * 4);

  // Bloc aperçu rapide (au-dessus du bouton Recalculer)
  const quick = document.getElementById('distanceAutoBlock');
  if (quick) {
    quick.innerHTML = `
      <div class="grid gap-1">
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-neutral-600">Récupération</span>
          <span class="text-sm"><strong>${p.toFixed(1)} km</strong> aller • <strong>${recupAR.toFixed(1)} km</strong> A/R</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-neutral-600">Livraison</span>
          <span class="text-sm">${
            isDeliveryDifferent
              ? `<strong>${dr.toFixed(1)} km</strong> aller • <strong>${livAR.toFixed(1)} km</strong> A/R`
              : `même adresse — A→B : <strong>${p.toFixed(1)} km</strong> • A/R récup : <strong>${recupAR.toFixed(1)} km</strong> + A/R livraison : <strong>${recupAR.toFixed(1)} km</strong>`
          }</span>
        </div>
        <div class="h-px bg-neutral-200 my-1"></div>
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-neutral-600">Total transport</span>
          <span class="text-sm font-semibold">${tot.toFixed(1)} km</span>
        </div>
      </div>`;
  }

  // Ligne unique dans le Récap (droite)
  const recapDetail = document.getElementById('recapTransportDetail');
  if (recapDetail) {
    if (!modeIsBaryc) {
      recapDetail.textContent = 'Livraison par vos soins';
    } else {
      recapDetail.innerHTML = isDeliveryDifferent
        ? `Récup A/R : <strong>${recupAR.toFixed(1)} km</strong> • Livraison A/R : <strong>${livAR.toFixed(1)} km</strong> • Total : <strong>${(recupAR + livAR).toFixed(1)} km</strong>`
        : `A→B : <strong>${p.toFixed(1)} km</strong> • A/R récup : <strong>${recupAR.toFixed(1)} km</strong> + A/R livraison : <strong>${recupAR.toFixed(1)} km</strong> • Total : <strong>${(p*4).toFixed(1)} km</strong>`;
    }
  }

  // Distance totale utilisée pour la tarification (0 si "à vos soins")
  state.transport.distanceKm = modeIsBaryc ? tot : 0;
}

// ===== Calcul Google (avec cache) =====
export function computeDistance(onChange){
  const pickup   = (document.getElementById('transportAddressPickup')?.value || '').trim();
  const delivery = (document.getElementById('transportAddressDelivery')?.value || '').trim();
  const deliveryOn = !!document.getElementById('deliveryDifferent')?.checked;

  const done = () => {
    updateUI();
    if (typeof onChange === 'function') onChange();
  };

  setErr('');

  // Pas d’adresse → reset km (on conserve le mode sélectionné dans le select)
  if (!pickup && !(deliveryOn && delivery)) {
    const modeSel = document.getElementById('transportMode');
    state.transport.mode = (modeSel?.value === 'baryc') ? 'baryc' : 'client';
    state.transport.pickKm = 0;
    state.transport.dropKm = 0;
    state.transport.distanceKm = 0;
    return done();
  }

  // 1) Cache (instantané)
  const key = cacheKey(pickup, deliveryOn, delivery);
  const cached = DIST_CACHE.get(key);
  if (cached && (Date.now() - (cached.ts||0) < 1000*60*60*24*7)) { // 7 jours
    state.transport.mode = 'baryc';
    state.transport.pickKm = Number(cached.pick)||0;
    state.transport.dropKm = Number(cached.drop)||0;
    state.transport.distanceKm = Number(cached.tot)||0;
    return done();
  }

  // 2) Google DistanceMatrix si pas en cache
  if (!(window.google && google.maps && google.maps.DistanceMatrixService)) {
    setErr('Google Maps non chargé.');
    // on garde l’affichage actuel, mais on déclenche quand même le render
    return done();
  }

  const svc = new google.maps.DistanceMatrixService();
  const origins = [CONFIG.REFERENCE_ADDRESS || 'Meubles Baryc, 13 Rue du Cabotage, 56700 Hennebont, France'];
  const destinations = [pickup, ...(deliveryOn && delivery ? [delivery] : [])].filter(Boolean);

  svc.getDistanceMatrix(
    {
      origins,
      destinations,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC
    },
    (res, status) => {
      if (status !== 'OK') {
        setErr('Erreur Google: ' + status);
        return done();
      }
      const row = res?.rows?.[0]?.elements || [];
      let pick = 0, drop = 0;

      if (row[0]?.status === 'OK') pick = kmFromMeters(row[0].distance.value || 0);
      if (deliveryOn && row[1]?.status === 'OK') drop = kmFromMeters(row[1].distance.value || 0);

      state.transport.mode = 'baryc';
      state.transport.pickKm = pick;
      state.transport.dropKm = deliveryOn ? drop : 0;

      const tot = (deliveryOn && drop > 0) ? (pick * 2 + drop * 2) : (pick * 4);
      state.transport.distanceKm = tot;

      // Enregistre en cache
      DIST_CACHE.set(key, { pick, drop, tot, ts: Date.now() });
      persistCache();

      return done();
    }
  );
}

export function refreshDistanceUI(){
  updateUI();
}
