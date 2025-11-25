// public/js/cout_de_revient/admin/transport.js
import { enablePlacesAutocomplete, loadGoogleMaps } from '/js/transport/maps.js';
import { loadConfig, saveConfig, applyConfig } from '/js/config/index.js';
import { PRICING } from '/js/devis/constants.js';

export function initTransportAdmin() {
  const input = document.getElementById('crTransportBase');
  if (!input) return;

  // valeur initiale (config ou fallback)
  const cfg = loadConfig();
  const fromCfg = cfg?.transport?.baseAddress
               || PRICING?.transport?.baseAddress
               || '13 Rue du Cabotage, 56700 Hennebont, France';
  input.value = fromCfg;

  // autocomplete
  loadGoogleMaps();
  enablePlacesAutocomplete(input);

  const persist = () => {
    const v = (input.value || '').trim();
    const next = {
      ...cfg,
      transport: {
        ...(cfg.transport || {}),
        baseAddress: v,
      }
    };
    saveConfig(next);
    applyConfig(next); // met à jour PRICING côté front
    // notifie le Devis si l’onglet est ouvert → recalc distance
    window.dispatchEvent(new CustomEvent('admin:transport-updated', { detail: { baseAddress: v }}));
  };

  // on sauvegarde à la volée
  if (!input.__bound) {
    input.__bound = true;
    input.addEventListener('change', persist);
    input.addEventListener('blur',   persist);
    // touche Entrée = persist aussi
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); persist(); }
    });
  }
}
