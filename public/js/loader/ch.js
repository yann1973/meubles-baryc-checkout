// public/js/loader/ch.js
import { getPartial, showErr } from './partials.js';

export async function mountCH(view) {
  try {
    view.innerHTML = await getPartial('ch'); // 100% HTML
    const mod = await import('/js/cout_horaire/ch.js');
    (mod.initCH || mod.default || (() => {}))();
    (mod.renderCH || (() => {}))();
  } catch (e) {
    console.error(e);
    await showErr(view, 'Erreur lors du chargement de “Coût horaire”', e);
  }
}
