// public/js/loader.js
import { showErr } from '/js/loader/partials.js';
import { mountDevis } from '/js/loader/devis.js';
import { mountCR }    from '/js/loader/cr.js';
import { mountCH }    from '/js/loader/ch.js';

export async function loadView(tab) {
  const view = document.getElementById('view');
  if (!view) throw new Error('#view introuvable');

  if (tab === 'devis') return mountDevis(view);
  if (tab === 'cr')    return mountCR(view);
  if (tab === 'ch')    return mountCH(view);

  await showErr(view, 'Onglet inconnu', tab);
}
