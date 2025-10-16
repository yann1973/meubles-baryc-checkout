// public/js/transport/maps.js
import { PRICING } from '/js/devis/constants.js';
import { computeDistance, refreshDistanceUI } from './distance.js';
import { state } from '../state.js';

let mapsLoaded   = false;
let loading      = false;
let recomputeCb  = null;
let lastKeyUsed  = '';   // pour éviter de recharger si même clé
const SCRIPT_ID  = 'gmap-places-script';

/* ----------------- Helpers config ----------------- */

// Adresse d’origine “société” (modifiable via l’onglet CR / applyConfig)
function getCompanyOrigin() {
  return PRICING?.transport?.baseAddress || '';
}

// Clé Google Maps : on regarde d’abord window.ENV (servi par /env.js) puis window.CONFIG
function getMapsApiKey() {
  const fromEnv = (window.ENV && window.ENV.GOOGLE_MAPS_API_KEY) || '';
  const fromCfg = (window.CONFIG && window.CONFIG.GOOGLE_MAPS_API_KEY) || '';
  return fromEnv || fromCfg || '';
}

function buildMapsSrc(key) {
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=fr&region=FR&callback=__mapsInit`;
}

/* ----------------- Autocomplete ----------------- */

function attachAutocomplete(input) {
  if (!input || input.__ac) return;
  if (!(window.google && google.maps && google.maps.places)) return;

  const opts = {
    types: ['geocode'], // adresses & villes
    componentRestrictions: { country: ['fr'] },
    fields: ['formatted_address', 'geometry', 'address_components'],
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
        if (modeSel) {
          modeSel.value = 'baryc';
          modeSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // Recalcul après une adresse
    computeDistance(recomputeCb);
  });
}

function setupAllInputs() {
  const client   = document.getElementById('clientAddressMain');
  const pickup   = document.getElementById('transportAddressPickup');
  const delivery = document.getElementById('transportAddressDelivery');

  [client, pickup, delivery].forEach(el => attachAutocomplete(el));

  // Auto-attach au focus (au cas où la lib se charge après)
  [client, pickup, delivery].forEach(el => {
    if (!el || el.__focusBound) return;
    el.__focusBound = true;
    el.addEventListener('focus', () => attachAutocomplete(el), { passive: true });
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

/* ----------------- Callback Google ----------------- */

// Doit être globale pour le callback de l’API
window.__mapsInit = function () {
  mapsLoaded = true;
  loading = false;
  setupAllInputs();
};

/* ----------------- Chargement de l’API Google (Places) ----------------- */

export function loadGoogleMaps() {
  // clé
  const key = getMapsApiKey();
  if (!key) {
    console.error('[maps] Aucune clé Google Maps détectée. Renseigne PUBLIC_GOOGLE_MAPS_API_KEY (via /env.js) ou CONFIG.GOOGLE_MAPS_API_KEY.');
    return; // on n’essaie pas de charger sans clé
  }

  // si déjà chargé avec la même clé, inutile d’en refaire plus
  if (mapsLoaded && lastKeyUsed === key) return;

  // si un script existe mais change de clé → on le remplace
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();

  // si un chargement est en cours et pour la même clé, on ne double pas
  if (loading && lastKeyUsed === key) return;

  loading = true;
  lastKeyUsed = key;

  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.src = buildMapsSrc(key);
  s.async = true;
  s.defer = true;
  s.onerror = () => {
    loading = false;
    console.error('[maps] Échec de chargement Google Maps. Vérifie la clé, les restrictions HTTP referrer, les APIs activées (Maps JavaScript + Places) et la facturation.');
  };
  document.head.appendChild(s);

  // Failsafe : si pas d’init sous 10s, log d’aide
  setTimeout(() => {
    if (!mapsLoaded && !(window.google && google.maps && google.maps.places)) {
      console.warn('[maps] Google Maps non initialisé. Causes probables : referer non autorisé, API Places non activée, clé invalide ou facturation.');
    }
  }, 10000);
}

/* ----------------- Bindings UI + intégration au recalcul ----------------- */

export function initMapsBindings(onChange) {
  recomputeCb = typeof onChange === 'function' ? onChange : null;

  // charge l’API + tente l’attach des inputs (si la lib arrive après, on ré-attache au focus)
  loadGoogleMaps();
  setupAllInputs();

  const manualToggle      = document.getElementById('manualDistanceToggle');
  const distanceManual    = document.getElementById('distanceManual');
  const distanceAutoBlock = document.getElementById('distanceAutoBlock');
  const recalcBtn         = document.getElementById('recalcDistance');
  const modeSel           = document.getElementById('transportMode');
  const sameAsClient      = document.getElementById('sameAsClient');
  const deliveryDifferent = document.getElementById('deliveryDifferent');
  const deliveryWrap      = document.getElementById('deliveryAddressWrap');

  // Synchro Admin: adresse de référence / barème km
  window.addEventListener('admin:transport-updated', () => {
    const pickupEl = document.getElementById('transportAddressPickup');
    const origin   = getCompanyOrigin();
    if (pickupEl && !pickupEl.value.trim() && origin) {
      pickupEl.value = origin;
    }
    const isManual = !!manualToggle?.checked;
    const isBaryc  = (modeSel?.value || state?.transport?.mode) === 'baryc';
    if (isBaryc && !isManual) {
      computeDistance(recomputeCb);
    } else {
      recomputeCb && recomputeCb();
    }
  }, { passive: true });

  // Saisie manuelle distance
  if (manualToggle && distanceManual && distanceAutoBlock && !manualToggle.__bound) {
    manualToggle.__bound = true;

    manualToggle.addEventListener('change', () => {
      if (manualToggle.checked) {
        distanceManual.classList.remove('hidden');
        distanceAutoBlock.classList.add('hidden');
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

  // Bouton "Recalculer avec Google"
  if (recalcBtn && !recalcBtn.__bound) {
    recalcBtn.__bound = true;
    recalcBtn.addEventListener('click', () => computeDistance(recomputeCb));
  }

  // Sélecteur de mode transport
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

        if (manualOn) {
          const n = Number(distanceManual?.value || 0);
          state.transport.distanceKm = Number.isFinite(n) ? n : 0;
          refreshDistanceUI();
          recomputeCb && recomputeCb();
        } else {
          // Pré-remplit l'origine si besoin
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

  // "Utiliser l’adresse client comme adresse de récupération"
  if (sameAsClient && !sameAsClient.__bound) {
    sameAsClient.__bound = true;
    sameAsClient.addEventListener('change', () => {
      const client = document.getElementById('clientAddressMain');
      const pickup = document.getElementById('transportAddressPickup');
      if (sameAsClient.checked && client && pickup) {
        pickup.value = client.value;
        if (modeSel) {
          modeSel.value = 'baryc';
          modeSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        computeDistance(recomputeCb);
      }
    });
  }

  // "Adresse de livraison différente"
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

  // Premier état
  const isManual = !!manualToggle?.checked;
  const isBaryc  = (modeSel?.value || state?.transport?.mode) === 'baryc';
  if (isBaryc && !isManual) {
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
