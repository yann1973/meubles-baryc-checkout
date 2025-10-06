// public/js/loader.js

// --- util: import tolérant du calculateur (computePricing en priorité) ---
let _computeFnPromise = null;
async function getComputeFn() {
  if (_computeFnPromise) return _computeFnPromise;
  _computeFnPromise = import('/js/devis/pricing.js')
    .then((mod) => {
      const fn =
        (typeof mod.computePricing === 'function' && mod.computePricing) ||
        (typeof mod.computeCR === 'function' && mod.computeCR) ||
        null;
      if (!fn) console.warn('[loader] Aucun computePricing/computeCR exporté par /js/devis/pricing.js');
      return fn;
    })
    .catch((e) => {
      console.warn('[loader] import pricing.js échoué:', e);
      return null;
    });
  return _computeFnPromise;
}

// --- cache des partials ---
const HTML_CACHE = new Map();
async function getPartial(name) {
  if (HTML_CACHE.has(name)) return HTML_CACHE.get(name);
  const url = `/partials/${encodeURIComponent(name)}.html`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de charger ${url} — HTTP ${res.status}`);
  const txt = await res.text();
  HTML_CACHE.set(name, txt);
  return txt;
}

function showErr(container, title, err) {
  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
      <div class="font-semibold mb-1">${title}</div>
      <pre class="text-xs overflow-auto">${(err && err.message) || err}</pre>
    </div>`;
}

// --- API principale ---
export async function loadView(tab) {
  const view = document.getElementById('view');
  if (!view) throw new Error('#view introuvable');

  // ---------------------------
  // Onglet DEVIS
  // ---------------------------
  if (tab === 'devis') {
    // structure conteneur
    view.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="view-main" class="lg:col-span-2 space-y-6"></div>
          <aside id="view-side" class="lg:col-span-1"></aside>
        </div>
      </div>
    `;

    try {
      // charge les partials
      const [formHTML, sideHTML] = await Promise.all([
        getPartial('devis.form'),
        getPartial('devis.sidebar'),
      ]);

      const main = document.getElementById('view-main');
      const side = document.getElementById('view-side');
      if (!main || !side) throw new Error('Containers view-main/view-side manquants');

      main.innerHTML = formHTML;
      side.innerHTML = sideHTML;

      // année
      const y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();

      // imports dynamiques (tous optionnels)
      let state, renderTotals, initServices, renderRecapServices,
          initDimensions, initCart, initMapsBindings, loadGoogleMaps,
          initStripe, computeDistance;

      try { ({ state } = await import('/js/state.js')); } catch (e) { console.warn('[loader] state.js', e); }
      try { ({ renderTotals } = await import('/js/devis/recap.js')); } catch (e) { console.warn('[loader] recap.js', e); }
      try { ({ initServices, renderRecapServices } = await import('/js/devis/services.js')); } catch (e) { console.warn('[loader] services.js', e); }
      try { ({ initDimensions } = await import('/js/devis/dimensions.js')); } catch (e) { console.warn('[loader] dimensions.js', e); }
      try { ({ initCart } = await import('/js/devis/cart.js')); } catch (e) { console.warn('[loader] cart.js', e); }
      try { ({ initMapsBindings, loadGoogleMaps } = await import('/js/transport/maps.js')); } catch (e) { console.warn('[loader] maps.js', e); }
      try { ({ default: initStripe } = await import('/js/devis/stripe.js')); } catch (e) { console.warn('[loader] stripe.js', e); }
      try { ({ computeDistance } = await import('/js/transport/distance.js')); } catch (e) { console.warn('[loader] distance.js', e); }

      // fallbacks sûrs
      const safe = {
        state: state || { transport:{ mode:'client', pickKm:0, dropKm:0, distanceKm:0 }, cart:[], services:{}, pieceCounts:{} },
        renderTotals: renderTotals || (() => {}),
        initServices: initServices || (() => {}),
        renderRecapServices: renderRecapServices || (() => {}),
        initDimensions: initDimensions || (() => {}),
        initCart: initCart || (() => {}),
        initMapsBindings: initMapsBindings || (() => {}),
        loadGoogleMaps: loadGoogleMaps || (() => {}),
        initStripe: initStripe || (() => {}),
        computeDistance: computeDistance || (() => {}),
      };

      // recalc + diffusion d'événement global (pour CR)
      async function rerender() {
        try {
          const compute = await getComputeFn();
          const pricing = typeof compute === 'function' ? compute() : null;

          // rendu recap devis
          try { safe.renderTotals(pricing || {
            totals:{ ht:0, tva:0, ttc:0 }, totalSurface:0,
            goods:{ ht:0, tva:0, ttc:0 }, transport:{ ttc:0, discount:0, promoRate:0, raw:0, surcharge:0 },
          }); } catch {}

          // recap services basé sur le state
          try { safe.renderRecapServices(safe.state); } catch {}

          // notifier les autres onglets (CR)
          try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { pricing } })); } catch {}
        } catch (e) {
          console.debug('[loader] rerender ignoré:', e?.message || e);
        }
      }

      // Bind transport (copie adresse client -> pickup / gestion livraison diff.)
      const sameAsClient      = document.getElementById('sameAsClient');
      const deliveryDifferent = document.getElementById('deliveryDifferent');
      const clientAddr        = document.getElementById('clientAddressMain');
      const pickup            = document.getElementById('transportAddressPickup');
      const deliveryWrap      = document.getElementById('deliveryAddressWrap');

      sameAsClient?.addEventListener('change', () => {
        if (sameAsClient.checked && pickup && clientAddr) {
          pickup.value = clientAddr.value;
          try { safe.computeDistance(); } catch {}
          rerender();
        }
      });

      deliveryDifferent?.addEventListener('change', () => {
        if (deliveryDifferent.checked) {
          deliveryWrap?.classList.remove('hidden');
        } else {
          const d = document.getElementById('transportAddressDelivery');
          if (d) d.value = '';
          if (safe.state.transport) safe.state.transport.dropKm = 0;
          try { safe.computeDistance(); } catch {}
          deliveryWrap?.classList.add('hidden');
        }
        rerender();
      });

      // Inits (tolérants : avec ou sans callback)
      try { safe.initDimensions(rerender); } catch { try { safe.initDimensions(); } catch {} }
      try { safe.initServices(rerender); }   catch { try { safe.initServices(); }   catch {} }
      try { safe.initCart(() => rerender()); } catch { try { safe.initCart(); } catch {} }
      try { safe.initMapsBindings(rerender); } catch { try { safe.initMapsBindings(); } catch {} }

      // Charger Google Maps en idle
      if ('requestIdleCallback' in window) requestIdleCallback(() => safe.loadGoogleMaps(), { timeout: 2000 });
      else setTimeout(() => safe.loadGoogleMaps(), 800);

      // Stripe si dispo
      try { safe.initStripe(); } catch {}

      // Premier rendu
      await rerender();

      // Preload d'autres partials
      const pre = () => ['cr','ch'].forEach(n => getPartial(n).catch(() => {}));
      if ('requestIdleCallback' in window) requestIdleCallback(pre, { timeout: 1500 });
      else setTimeout(pre, 700);

    } catch (e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Devis”', e);
    }
    return;
  }

  // ---------------------------
  // Onglet COÛT DE REVIENT
  // ---------------------------
  if (tab === 'cr') {
    try {
      view.innerHTML = await getPartial('cr');
      const mod = await import('/js/cout_de_revient/cr.js');

      // notre module CR gère computePricing en interne via ses imports
      const init = mod.initCR || mod.default || (() => {});
      init();

      // sécurité : petit recalc global pour initialiser les chiffres
      try {
        const compute = await getComputeFn();
        const pricing = typeof compute === 'function' ? compute() : null;
        try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { pricing } })); } catch {}
      } catch {}
    } catch (e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Coût de revient”', e);
    }
    return;
  }

  // ---------------------------
  // Onglet COÛT HORAIRE
  // ---------------------------
  if (tab === 'ch') {
    try {
      view.innerHTML = await getPartial('ch');
      const mod = await import('/js/cout_horaire/ch.js');
      (mod.initCH || mod.default || (() => {}))();
      (mod.renderCH || (() => {}))();
    } catch (e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Coût horaire”', e);
    }
    return;
  }

  // onglet inconnu
  showErr(view, 'Onglet inconnu', tab);
}
