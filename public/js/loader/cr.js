// public/js/loader/cr.js
import { getPartial, showErr } from './partials.js';
import { applyAdminConfig } from './admin-config.js';

export async function mountCR(view) {
  try {
    view.innerHTML = await getPartial('cr'); // 100% HTML
    await applyAdminConfig();

    const { initCR } = await import('/js/cout_de_revient/index.js');
    (initCR || (() => {}))();
  } catch (e) {
    console.error(e);
    await showErr(view, 'Erreur lors du chargement de “Coût de revient”', e);
  }
}
