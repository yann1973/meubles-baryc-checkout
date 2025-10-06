// public/js/loader.js

import { computePricing as _computePricing } from '/js/devis/pricing.js';
// Expose un alias local nommé computeCR pour le reste du fichier
const computeCR = _computePricing;


const HTML_CACHE = new Map();

async function getPartial(name){
  if (HTML_CACHE.has(name)) return HTML_CACHE.get(name);
  const res = await fetch(`partials/${name}.html`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de charger partials/${name}.html — HTTP ${res.status}`);
  const txt = await res.text();
  HTML_CACHE.set(name, txt);
  return txt;
}

function showErr(container, title, err){
  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
      <div class="font-semibold mb-1">${title}</div>
      <pre class="text-xs overflow-auto">${(err && err.message) || err}</pre>
    </div>`;
}

export async function loadView(tab){
  const view = document.getElementById('view');
  if (!view) throw new Error('#view introuvable');

  if (tab === 'devis') {
    // Structure conteneur (main + sidebar)
    view.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="view-main" class="lg:col-span-2 space-y-6"></div>
          <aside id="view-side" class="lg:col-span-1"></aside>
        </div>
      </div>
    `;

    try {
      // Charge les partiels
      const [formHTML, sideHTML] = await Promise.all([
        getPartial('devis.form'),
        getPartial('devis.sidebar'),
      ]);
      const main = document.getElementById('view-main');
      const side = document.getElementById('view-side');
      if (!main || !side) throw new Error('Containers view-main/view-side manquants');

      main.innerHTML = formHTML;
      side.innerHTML = sideHTML;

      // © année
      const y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();

      // Imports dynamiques (défensifs)
      let state, computePricing, renderTotals, initServices, renderRecapServices,
          initDimensions, initCart, initMapsBindings, loadGoogleMaps, initStripe,
          computeCR, initCR, computeDistance;

      try { ({ state } = await import('/js/state.js')); } catch(e){ console.warn('state.js', e); }
      try { ({ computePricing } = await import('/js/devis/pricing.js')); } catch(e){ console.warn('pricing.js', e); }
      try { ({ renderTotals } = await import('/js/devis/recap.js')); } catch(e){ console.warn('recap.js', e); }
      try { ({ initServices, renderRecapServices } = await import('/js/devis/services.js')); } catch(e){ console.warn('services.js', e); }
      try { ({ initDimensions } = await import('/js/devis/dimensions.js')); } catch(e){ console.warn('dimensions.js', e); }
      try { ({ initCart } = await import('/js/devis/cart.js')); } catch(e){ console.warn('cart.js', e); }
      try { ({ initMapsBindings, loadGoogleMaps } = await import('/js/transport/maps.js')); } catch(e){ console.warn('maps.js', e); }
      try { ({ default: initStripe } = await import('/js/devis/stripe.js')); } catch(e){ console.warn('stripe.js', e); }
      try { ({ computeCR, initCR } = await import('/js/cout_de_revient/cr.js')); } catch(e){ console.warn('cr.js', e); }
      try { ({ computeDistance } = await import('/js/transport/distance.js')); } catch(e){ console.warn('distance.js', e); }

      // Fallbacks sûrs
      const safe = {
        state: state || { transport:{ mode:'client', pickKm:0, dropKm:0, distanceKm:0 }, cart:[], services:{}, pieceCounts:{} },
        computePricing: computePricing || (()=>({
          totals:{ ht:0, tva:0, ttc:0 },
          totalSurface:0,
          goods:{ ht:0, tva:0, ttc:0 },
          transport:{ ttc:0, discount:0, promoRate:0, raw:0, surcharge:0 },
        })),
        renderTotals: renderTotals || (()=>{}),
        initServices: initServices || (()=>{}),
        renderRecapServices: renderRecapServices || (()=>{}),
        initDimensions: initDimensions || (()=>{}),
        initCart: initCart || (()=>{}),
        initMapsBindings: initMapsBindings || (()=>{}),
        loadGoogleMaps: loadGoogleMaps || (()=>{}),
        initStripe: initStripe || (()=>{}),
        computeCR: computeCR || (()=>{}),
        initCR: initCR || (()=>{}),
        computeDistance: computeDistance || (()=>{}),
      };

      // Bind transport (copie adresse client -> pickup, livraison différente)
      const sameAsClient      = document.getElementById('sameAsClient');
      const deliveryDifferent = document.getElementById('deliveryDifferent');
      const clientAddr        = document.getElementById('clientAddressMain');
      const pickup            = document.getElementById('transportAddressPickup');
      const deliveryWrap      = document.getElementById('deliveryAddressWrap');

      sameAsClient && sameAsClient.addEventListener('change', ()=>{
        if (sameAsClient.checked && pickup && clientAddr) {
          pickup.value = clientAddr.value;
          safe.computeDistance(()=>rerender());
        }
      });

      deliveryDifferent && deliveryDifferent.addEventListener('change', ()=>{
        if (deliveryDifferent.checked) {
          deliveryWrap?.classList.remove('hidden');
        } else {
          const d = document.getElementById('transportAddressDelivery');
          if (d) d.value = '';
          if (safe.state.transport) safe.state.transport.dropKm = 0;
          safe.computeDistance(()=>rerender());
          deliveryWrap?.classList.add('hidden');
        }
      });

      // Recalcul unique
      function rerender(){
        const p = safe.computePricing();
        safe.renderTotals(p);
        // IMPORTANT : passer le state au récap services
        try { safe.renderRecapServices(safe.state); } catch {}
        // Idempotent : certains modules rebind proprement
        try { safe.initCart(()=>{}); } catch {}
        try { safe.computeCR(p, safe.state); } catch {}
      }

      // Inits
      try { safe.initDimensions(()=>rerender()); } catch {}
      try { safe.initServices(()=>rerender()); } catch {}
      try { safe.initCart(()=>{ rerender(); }); } catch {}
      try { safe.initMapsBindings(()=>rerender()); } catch {}

      // Charge Google Maps en idle
      if ('requestIdleCallback' in window) requestIdleCallback(()=> safe.loadGoogleMaps(), { timeout: 2000 });
      else setTimeout(()=> safe.loadGoogleMaps(), 800);

      // Stripe si présent
      try { safe.initStripe(); } catch {}

      // Premier rendu
      rerender();

      // Précharge les autres partials en idle
      const pre = () => ['devis.form','devis.sidebar','cr','ch'].forEach(n=>getPartial(n).catch(()=>{}));
      if ('requestIdleCallback' in window) requestIdleCallback(pre, { timeout: 1500 });
      else setTimeout(pre, 700);

    } catch(e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Devis”', e);
    }
    return;
  }

  if (tab === 'cr') {
    try {
      view.innerHTML = await getPartial('cr');
      const [{ initCR, computeCR }, { computePricing }, { state }] = await Promise.all([
        import('/js/cout_de_revient/cr.js'),
        import('/js/devis/pricing.js'),
        import('/js/state.js'),
      ]);
      const recalc = ()=>{
        const p = computePricing();
        computeCR(p, state);
      };
      initCR(recalc);
      recalc();
    } catch(e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Coût de revient”', e);
    }
    return;
  }

  if (tab === 'ch') {
    try {
      view.innerHTML = await getPartial('ch');
      const mod = await import('/js/cout_horaire/ch.js');
      (mod.initCH || (()=>{}))();
      (mod.renderCH || (()=>{}))();
    } catch(e) {
      console.error(e);
      showErr(view, 'Erreur lors du chargement de “Coût horaire”', e);
    }
    return;
  }

  showErr(view, 'Onglet inconnu', tab);
}
