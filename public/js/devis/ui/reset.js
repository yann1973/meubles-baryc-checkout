// public/js/devis/ui/reset.js
import { state } from '/js/state.js';
import { recompute } from './recompute.js';
import { EVENTS, emit } from '/js/common/events.js';

export function resetDevis() {
  state.type = 'Table';
  state.L = 0; state.W = 0; state.H = 0;
  state.pieceCounts = { ferrures_change: 0, ferrures_polissage: 0 };
  state.services = {};
  state.transport = { mode: 'client', pickKm: 0, dropKm: 0, distanceKm: 0 };

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = String(val); };
  setVal('longueur', 0); setVal('largeur', 0); setVal('hauteur', 0);
  setVal('f_change', 0); setVal('f_polish', 0);

  document.querySelectorAll('#servicesM2 input[type="checkbox"]').forEach(cb => cb.checked = false);
  ['nom','prenom','telephone','email','clientAddressMain','transportAddressPickup','transportAddressDelivery','description']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  recompute();
  emit(EVENTS.DEVIS_RESET, {});
}
