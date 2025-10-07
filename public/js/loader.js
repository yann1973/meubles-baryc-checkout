// public/js/loader.js

// ------------------------------
// Cache des partials
// ------------------------------
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

// ------------------------------
// Appliquer la config Admin (PV/CR/transport) avant de construire l'UI
// Essaie d’abord /js/config/index.js, sinon retombe sur /js/config.js
// ------------------------------
async function applyAdminConfig() {
  try {
    const { loadConfig, applyConfig } = await import('/js/config/index.js');
    applyConfig(loadConfig());
    return;
  } catch {}
  try {
    // compat si tu n'as pas encore mis en place /config/index.js
    const { loadConfig, applyConfig } = await import('/js/config.js');
    applyConfig(loadConfig());
  } catch (e) {
    console.warn('[loader] Impossible d’appliquer la config admin:', e);
  }
}

// ------------------------------
// API principale
// ------------------------------
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

      // applique la config admin (prestations/PV/transport) avant de construire l’UI
      await applyAdminConfig();

      // année
      const y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();

      // --- Nouvel orchestrateur Devis
      const { initDevis } = await import('/js/devis/ui/index.js');
      // --- Recompute central (à passer en callback aux modules qui en ont besoin)
      const { recompute } = await import('/js/devis/ui/recompute.js');

      // Initialise l'UI Devis (cases prestations dynamiques + 1er calcul)
      (initDevis || (() => {}))();

      // --- Modules "legacy" utiles : dimensions/panier/Maps/Stripe
      // (Tolérants : s'ils n'existent pas chez toi, on log juste un warn)
      try {
        const { initDimensions } = await import('/js/devis/dimensions.js');
        try { initDimensions(recompute); } catch { initDimensions && initDimensions(); }
      } catch (e) { console.warn('[loader] dimensions.js', e); }

      try {
        const { initCart } = await import('/js/devis/cart.js');
        try { initCart(() => recompute()); } catch { initCart && initCart(); }
      } catch (e) { console.warn('[loader] cart.js', e); }

      try {
        const { initMapsBindings, loadGoogleMaps } = await import('/js/transport/maps.js');
        try { initMapsBindings(recompute); } catch { initMapsBindings && initMapsBindings(); }
        // Charge Google Maps en idle
        if ('requestIdleCallback' in window) requestIdleCallback(() => loadGoogleMaps?.(), { timeout: 2000 });
        else setTimeout(() => loadGoogleMaps?.(), 800);
      } catch (e) { console.warn('[loader] maps.js', e); }

      try {
        const { default: initStripe } = await import('/js/devis/stripe.js');
        initStripe && initStripe();
      } catch (e) { console.warn('[loader] stripe.js', e); }

      // Premier rendu / recalcul de sécurité
      try { recompute(); } catch {}

      // Pré-charger d'autres partials
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

      // applique la config (au cas où l'utilisateur arrive directement sur /#cr)
      await applyAdminConfig();

      // Nouvel orchestrateur CR (admin + récap)
      const { initCR } = await import('/js/cout_de_revient/index.js');
      (initCR || (() => {}))();
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
