// public/js/loader/devis.js
import { getPartial, showErr } from './partials.js';
import { applyAdminConfig } from './admin-config.js';
import { bindLiveRerender } from './binds.js';

export async function mountDevis(view) {
  try {
    // 1) Layout (contient #view-main & #view-side)
    view.innerHTML = await getPartial('devis.layout');

    // 2) Injecte formulaire + sidebar
    const main = document.getElementById('view-main');
    const side = document.getElementById('view-side');
    if (!main || !side) throw new Error('Containers view-main/view-side manquants');
    [main.innerHTML, side.innerHTML] = await Promise.all([
      getPartial('devis.form'),
      getPartial('devis.sidebar'),
    ]);

    // 3) Config admin
    await applyAdminConfig();

    // 4) Footer année
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    // 5) Imports calcul/rendu/state
    const [{ computePricing }, { renderTotals }, { renderRecapServices }, { state }] =
      await Promise.all([
        import('/js/devis/pricing.js'),
        import('/js/devis/recap/totals.js'),
        import('/js/devis/recap/services.js'),
        import('/js/state.js'),
      ]);

    // --- RENDERER central
    const rerender = () => {
      try {
        const pricing = computePricing();
        try { renderTotals(pricing); } catch {}
        try { renderRecapServices(state, pricing); } catch {}
        try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { pricing } })); } catch {}
      } catch (e) {
        console.debug('[devis] rerender ignoré:', e?.message || e);
      }
    };
    // Debug à la demande
    window.__rerender = rerender;

    // 6) Orchestrateur Devis (construit la liste de prestations dynamiques)
    try {
      const { initDevis } = await import('/js/devis/ui/index.js');
      typeof initDevis === 'function' && initDevis();
    } catch (e) {
      console.warn('[devis] ui/index.js', e);
    }

    // 7) Modules optionnels
    try {
      const { initDimensions } = await import('/js/devis/dimensions.js');
      try { initDimensions(rerender); } catch { initDimensions && initDimensions(); }
    } catch (e) { console.warn('[devis] dimensions.js', e); }

    try {
      const { initCart } = await import('/js/devis/cart.js');
      try { initCart(() => rerender()); } catch { initCart && initCart(); }
    } catch (e) { console.warn('[devis] cart.js', e); }

    try {
      const { initMapsBindings, loadGoogleMaps } = await import('/js/transport/maps.js');
      try { initMapsBindings(rerender); } catch { initMapsBindings && initMapsBindings(); }
      if ('requestIdleCallback' in window) requestIdleCallback(() => loadGoogleMaps?.(), { timeout: 2000 });
      else setTimeout(() => loadGoogleMaps?.(), 800);
    } catch (e) { console.warn('[devis] maps.js', e); }

    try {
      const { default: initStripe } = await import('/js/devis/stripe.js');
      initStripe && initStripe();
    } catch (e) { console.warn('[devis] stripe.js', e); }

    // 8) Binds live (met à jour state puis rerender)
    bindLiveRerender(rerender, state);

    // 9) Écoutes globales (garantie d’update même si un module oublie d’appeler rerender)
    const onLive = (e) => {
      const t = e.target;
      // on ne recalcul que si l’évènement vient de la zone de saisie principale
      if (!document.getElementById('view-main')?.contains(t)) return;
      rerender();
    };
    document.addEventListener('input', onLive, true);
    document.addEventListener('change', onLive, true);

    // Événements custom utiles
    ['devis:reset','distance:changed','services:changed','dimensions:changed','cart:changed']
      .forEach(evt => window.addEventListener(evt, rerender, { passive: true }));

    // 10) Premier rendu
    rerender();

    // 11) Preload autres partials
    const pre = () => ['cr','ch'].forEach(n => getPartial(n).catch(() => {}));
    if ('requestIdleCallback' in window) requestIdleCallback(pre, { timeout: 1500 });
    else setTimeout(pre, 700);

  } catch (e) {
    console.error(e);
    await showErr(view, 'Erreur lors du chargement de “Devis”', e);
  }
}
