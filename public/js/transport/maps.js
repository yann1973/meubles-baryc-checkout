// public/js/transport/maps.js
import { PRICING } from '/js/devis/constants.js';
import { computeDistance, refreshDistanceUI } from './distance.js';
import { state } from '../state.js';

let mapsLoaded = false;
let loading = false;
let recomputeCb = null;

// --- origine "société" (modifiable depuis l'onglet CR via applyConfig)
function getCompanyOrigin() {
  return PRICING?.transport?.baseAddress || '';
}

// --- clé Google depuis /env.js (window.ENV.*)
function getMapsKey() {
  return (window.ENV && window.ENV.GOOGLE_MAPS_API_KEY) || '';
}

// ---------- Autocomplete pour un <input> ----------
function attachAutocomplete(input) {
  if (!input || input.__ac) return;
  if (!(window.google && google.maps && google.maps.places)) return;

  const opts = {
    types: ['geocode'], // adresses & villes
    componentRestrictions: { country: ['fr'] },
    fields: ['formatted_address','geometry','address_components'],
  };

  input.setAttribute('autocomplete', 'off');
  input.__ac = new google.maps.places.Autocomplete(input, opts);

  input.__ac.addListener('place_changed', () => {
    const place = input.__ac.getPlace();
    if (place?.formatted_address) input.value = place.formatted_address;

    // Si l'adresse client change et que "même adresse" est coché → copie en récupération
    if (input.id === 'clientAddressMain') {
      const sameAsClient = document.getElementById('sameAsClient');
      if (sameAsClient?.checked) {
        const pickup = document.getElementById('transportAddressPickup');
        if (pickup) pickup.value = input.value;
        const modeSel = document.getElementById('transportMode');
        if (modeSel) { modeSel.value = 'baryc'; modeSel.dispatchEvent(new Event('change',{bubbles:true})); }
      }
    }

    // recalcul de distance après saisie d'une adresse
    computeDistance(recomputeCb);
  });
}

// ---------- Attache tous les inputs concernés ----------
function setupAllInputs() {
  const client   = document.getElementById('clientAddressMain');
  const pickup   = document.getElementById('transportAddressPickup');
  const delivery = document.getElementById('transportAddressDelivery');

  [client, pickup, delivery].forEach(el => attachAutocomplete(el));

  // Auto-attach au focus (si la lib se charge après)
  [client, pickup, delivery].forEach(el => {
    if (!el || el.__focusBound) return;
    el.__focusBound = true;
    el.addEventListener('focus', () => attachAutocomplete(el));
  });

  // Recalcule si l’utilisateur valide sans choisir une suggestion
  [client, pickup, delivery].forEach(el => {
    if (!el || el.__typingBound) return;
    el.__typingBound = true;
    el.addEventListener('blur', () => {
      if ((el.value || '').trim().length > 5) computeDistance(recomputeCb);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); computeDistance(recomputeCb); }
    });
  });
}

// ---------- Callback global pour l'API Google ----------
window.__mapsInit = function () {
  mapsLoaded = true;
  setupAllInputs();
};

// ---------- Charge l'API Google Maps Places (sans doublons) ----------
export function loadGoogleMaps() {
  if (mapsLoaded || loading) return;
  if (document.getElementById('gmap-places-script')) return; // déjà injecté
  loading = true;

  const key = getMapsKey();
  if (!key) {
    console.warn('[maps] GOOGLE_MAPS_API_KEY manquante (window.ENV.GOOGLE_MAPS_API_KEY). Charge quand même sans clé → échec probable.');
  }

  const s = document.createElement('script');
  s.id = 'gmap-places-script';
  s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=fr&region=FR&callback=__mapsInit`;
  s.async = true;
  s.defer = true;
  s.onerror = () => console.error('[maps] Google Maps failed to load');
  document.head.appendChild(s);
}

// ---------- Bindings UI + intégration au recompute global ----------
export function initMapsBindings(onChange) {
  recomputeCb = typeof onChange === 'function' ? onChange : null;

  loadGoogleMaps();
  setupAllInputs();

  const manualToggle        = document.getElementById('manualDistanceToggle');
  const distanceManual      = document.getElementById('distanceManual');
  const distanceAutoBlock   = document.getElementById('distanceAutoBlock');
  const recalcBtn           = document.getElementById('recalcDistance');
  const modeSel             = document.getElementById('transportMode');
  const sameAsClient        = document.getElementById('sameAsClient');
  const deliveryDifferent   = document.getElementById('deliveryDifferent');
  const deliveryWrap        = document.getElementById('deliveryAddressWrap');

  // --- Synchro avec l'ADMIN : adresse de référence & barème km
  // Quand l'admin modifie l'adresse de référence dans l'onglet CR, on recalcule ici.
  window.addEventListener('admin:transport-updated', () => {
    // si l'utilisateur n'a pas rempli "pickup", on utilise l'origine société par défaut
    const pickupEl = document.getElementById('transportAddressPickup');
    const origin = getCompanyOrigin();
    if (pickupEl && !pickupEl.value.trim() && origin) {
      pickupEl.value = origin;
    }
    // si on est en mode "baryc" et non-manuel, relance un calcul
    const isManual = !!manualToggle?.checked;
    const isBaryc  = (modeSel?.value || state?.transport?.mode) === 'baryc';
    if (isBaryc && !isManual) {
      computeDistance(recomputeCb);
    } else {
      // pas de calcul (manuel ou client), mais on met à jour le prix via recompute()
      recomputeCb && recomputeCb();
    }
  }, { passive: true });

  // --- Saisie manuelle distance
  if (manualToggle && distanceManual && distanceAutoBlock && !manualToggle.__bound) {
    manualToggle.__bound = true;

    manualToggle.addEventListener('change', () => {
      if (manualToggle.checked) {
        distanceManual.classList.remove('hidden');
        distanceAutoBlock.classList.add('hidden');
        // passe en mode baryc si on force une distance
        state.transport.mode = 'baryc';
        const n = Number(distanceManual.value || 0);
        state.transport.distanceKm = Number.isFinite(n) ? n : 0;
        refreshDistanceUI();
        recomputeCb && recomputeCb();
      } else {
        distanceManual.classList.add('hidden');
        distanceAutoBlock.classList.remove('hidden');
        computeDistance(recomputeCb);
      }
    });

    distanceManual.addEventListener('input', () => {
      state.transport.mode = 'baryc';
      const n = Number(distanceManual.value || 0);
      state.transport.distanceKm = Number.isFinite(n) ? n : 0;
      refreshDistanceUI();
      recomputeCb && recomputeCb();
    });
  }

  // --- Bouton "Recalculer avec Google"
  if (recalcBtn && !recalcBtn.__bound) {
    recalcBtn.__bound = true;
    recalcBtn.addEventListener('click', () => computeDistance(recomputeCb));
  }

  // --- Sélecteur de mode transport
  if (modeSel && !modeSel.__bound) {
    modeSel.__bound = true;
    modeSel.addEventListener('change', () => {
      const val = modeSel.value;

      if (val === 'client') {
        // Transport par le client → km = 0
        state.transport.mode = 'client';
        state.transport.pickKm = 0;
        state.transport.dropKm = 0;
        state.transport.distanceKm = 0;
        refreshDistanceUI();
        recomputeCb && recomputeCb();
      } else {
        // Par nos soins → recalcule (ou conserve la valeur manuelle)
        state.transport.mode = 'baryc';
        const manualOn    = !!manualToggle?.checked;
        const manualInput = distanceManual;

        if (manualOn) {
          const n = Number(manualInput?.value || 0);
          state.transport.distanceKm = Number.isFinite(n) ? n : 0;
          refreshDistanceUI();
          recomputeCb && recomputeCb();
        } else {
          // pré-remplit l'origine par défaut si pickup vide
          const pickupEl = document.getElementById('transportAddressPickup');
          if (pickupEl && !pickupEl.value.trim()) {
            const origin = getCompanyOrigin();
            if (origin) pickupEl.value = origin;
          }
          computeDistance(recomputeCb);
        }
      }
    });
  }

  // --- "Utiliser l’adresse client comme adresse de récupération"
  if (sameAsClient && !sameAsClient.__bound) {
    sameAsClient.__bound = true;
    sameAsClient.addEventListener('change', () => {
      const client = document.getElementById('clientAddressMain');
      const pickup = document.getElementById('transportAddressPickup');
      if (sameAsClient.checked && client && pickup) {
        pickup.value = client.value;
        if (modeSel) { modeSel.value = 'baryc'; modeSel.dispatchEvent(new Event('change',{bubbles:true})); }
        computeDistance(recomputeCb);
      }
    });
  }

  // --- "Adresse de livraison différente"
  if (deliveryDifferent && !deliveryDifferent.__bound) {
    deliveryDifferent.__bound = true;
    deliveryDifferent.addEventListener('change', () => {
      if (deliveryDifferent.checked) {
        deliveryWrap?.classList.remove('hidden');
      } else {
        const d = document.getElementById('transportAddressDelivery');
        if (d) d.value = '';
        computeDistance(recomputeCb); // recalc sans livraison
        deliveryWrap?.classList.add('hidden');
      }
    });
  }

  // --- Premier état
  // si mode baryc + pas manuel → calcule ; sinon rafraîchit juste l'affichage
  const isManual = !!manualToggle?.checked;
  const isBaryc  = (modeSel?.value || state?.transport?.mode) === 'baryc';
  if (isBaryc && !isManual) {
    // pré-remplit l'origine si besoin
    const pickupEl = document.getElementById('transportAddressPickup');
    if (pickupEl && !pickupEl.value.trim()) {
      const origin = getCompanyOrigin();
      if (origin) pickupEl.value = origin;
    }
    computeDistance(recomputeCb);
  } else {
    refreshDistanceUI();
    recomputeCb && recomputeCb();
  }
}
