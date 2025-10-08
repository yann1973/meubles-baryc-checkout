// public/js/loader.js

// ------------------------------
// Cache des partials (HTML uniquement)
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

// ------------------------------
// Affichage d’erreur via partial (fallback texte simple)
// public/partials/error.html avec [data-slot="title"], [data-slot="message"]
// ------------------------------
async function showErr(container, title, err) {
  const msg = (err && err.message) || String(err || 'Erreur inconnue');
  try {
    const html = await getPartial('error');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.body.firstElementChild || document.createElement('div');
    const t = root.querySelector('[data-slot="title"]');
    const m = root.querySelector('[data-slot="message"]');
    if (t) t.textContent = title;
    if (m) m.textContent = msg;
    container.replaceChildren(root);
  } catch {
    container.textContent = `${title} — ${msg}`;
  }
}

// ------------------------------
// Appliquer la config Admin (PV/CR/transport)
// 1) /js/config/index.js (nouveau)
// 2) fallback /js/config.js (ancien)
// ------------------------------
async function applyAdminConfig() {
  try {
    const { loadConfig, applyConfig } = await import('/js/config/index.js');
    applyConfig(loadConfig());
    return;
  } catch {}
  try {
    const { loadConfig, applyConfig } = await import('/js/config.js');
    applyConfig(loadConfig());
  } catch (e) {
    console.warn('[loader] Impossible d’appliquer la config admin:', e);
  }
}

// ------------------------------
// Bind “live” : déclenche rerender quand l’utilisateur modifie l’UI
// (sans écrire d’HTML ici; on écoute simplement les éléments existants)
// ------------------------------
function bindLiveRerender(rerender) {
  const main = document.getElementById('view-main');
  if (!main) return;

  // Prestations (cases à cocher) — conteneur #servicesM2 si présent
  const servicesBox = document.getElementById('servicesM2');
  if (servicesBox && !servicesBox.__bound) {
    servicesBox.__bound = true;
    servicesBox.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.matches('input[type="checkbox"]')) rerender();
    });
  }

  // Dimensions : longueur / largeur / hauteur
  ['longueur', 'largeur', 'hauteur'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.__bound) {
      el.__bound = true;
      el.addEventListener('input', () => rerender());
      el.addEventListener('change', () => rerender());
    }
  });

  // Pièces (ferrures) si ça impacte le prix
  ['f_change', 'f_polish'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.__bound) {
      el.__bound = true;
      el.addEventListener('input', () => rerender());
      el.addEventListener('change', () => rerender());
    }
  });

  // Délégation générique : tout élément marqués data-recompute="1"
  if (!main.__recomputeBound) {
    main.__recomputeBound = true;
    main.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.recompute === '1') rerender();
    });
    main.addEventListener('input', (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.recompute === '1') rerender();
    });
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
    try {
      // 1) Structure layout (100% dans un partial)
      //    -> doit contenir #view-main et #view-side
      view.innerHTML = await getPartial('devis.layout');

      // 2) Injecter form + sidebar (tes partials existants)
      const main = document.getElementById('view-main');
      const side = document.getElementById('view-side');
      if (!main || !side) throw new Error('Containers view-main/view-side manquants');

      main.innerHTML = await getPartial('devis.form');
      side.innerHTML = await getPartial('devis.sidebar');

      // 3) Config admin avant construction UI
      await applyAdminConfig();

      // 4) Footer année (si présent)
      const y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();

      // 5) Imports nécessaires au calcul + rendu recap
      const [{ computePricing }, { renderTotals }, { renderRecapServices }, { state }] =
        await Promise.all([
          import('/js/devis/pricing.js'),
          import('/js/devis/recap/totals.js'),
          import('/js/devis/recap/services.js'),
          import('/js/state.js'),
        ]);

      // 6) Recompute central : calcule une fois, passe pricing au récap services
      async function rerender() {
        try {
          const pricing = computePricing();
          try { renderTotals(pricing); } catch {}
          try { renderRecapServices(state, pricing); } catch {}
          try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { pricing } })); } catch {}
        } catch (e) {
          console.debug('[loader] rerender ignoré:', e?.message || e);
        }
      }

      // 7) Orchestrateur Devis (construit la liste des prestations, binds internes)
      try {
        const { initDevis } = await import('/js/devis/ui/index.js');
        if (typeof initDevis === 'function') initDevis(); // pas d’HTML ici, juste des binds côté UI
      } catch (e) {
        console.warn('[loader] devis/ui/index.js', e);
      }

      // 8) Modules optionnels : dimensions / panier / Maps / Stripe (tolérants)
      try {
        const { initDimensions } = await import('/js/devis/dimensions.js');
        try { initDimensions(rerender); } catch { initDimensions && initDimensions(); }
      } catch (e) { console.warn('[loader] dimensions.js', e); }

      try {
        const { initCart } = await import('/js/devis/cart.js');
        try { initCart(() => rerender()); } catch { initCart && initCart(); }
      } catch (e) { console.warn('[loader] cart.js', e); }

      try {
        const { initMapsBindings, loadGoogleMaps } = await import('/js/transport/maps.js');
        try { initMapsBindings(rerender); } catch { initMapsBindings && initMapsBindings(); }
        if ('requestIdleCallback' in window) requestIdleCallback(() => loadGoogleMaps?.(), { timeout: 2000 });
        else setTimeout(() => loadGoogleMaps?.(), 800);
      } catch (e) { console.warn('[loader] maps.js', e); }

      try {
        const { default: initStripe } = await import('/js/devis/stripe.js');
        initStripe && initStripe();
      } catch (e) { console.warn('[loader] stripe.js', e); }

      // 9) Bind “live” pour déclencher rerender sur les inputs clés
      bindLiveRerender(rerender);

      // 10) Premier rendu
      await rerender();

      // 11) Pré-charger les autres partials
      const pre = () => ['cr', 'ch'].forEach(n => getPartial(n).catch(() => {}));
      if ('requestIdleCallback' in window) requestIdleCallback(pre, { timeout: 1500 });
      else setTimeout(pre, 700);

    } catch (e) {
      console.error(e);
      await showErr(view, 'Erreur lors du chargement de “Devis”', e);
    }
    return;
  }

  // ---------------------------
  // Onglet COÛT DE REVIENT
  // ---------------------------
  if (tab === 'cr') {
    try {
      view.innerHTML = await getPartial('cr'); // 100% HTML depuis partial
      await applyAdminConfig();
      const { initCR } = await import('/js/cout_de_revient/index.js');
      (initCR || (() => {}))();
    } catch (e) {
      console.error(e);
      await showErr(view, 'Erreur lors du chargement de “Coût de revient”', e);
    }
    return;
  }

  // ---------------------------
  // Onglet COÛT HORAIRE
  // ---------------------------
  if (tab === 'ch') {
    try {
      view.innerHTML = await getPartial('ch'); // 100% HTML depuis partial
      const mod = await import('/js/cout_horaire/ch.js');
      (mod.initCH || mod.default || (() => {}))();
      (mod.renderCH || (() => {}))();
    } catch (e) {
      console.error(e);
      await showErr(view, 'Erreur lors du chargement de “Coût horaire”', e);
    }
    return;
  }

  // onglet inconnu
  await showErr(view, 'Onglet inconnu', tab);
}
