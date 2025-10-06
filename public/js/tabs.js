console.log("[DEPLOY TEST] " + new Date().toISOString());



// public/js/tabs.js
import { loadView } from '/js/loader.js';

// helper d'import tolérant + chemins relatifs à ce fichier
async function importModule(specFromHere) {
  const abs = new URL(specFromHere, import.meta.url).href;
  const clean = abs.split('?')[0];
  const withBust = `${clean}?ts=${Date.now()}`;

  const isJS = (ct) => {
    if (!ct) return true;
    const l = ct.toLowerCase();
    if (l.includes('javascript') || l.includes('text/plain')) return true;
    if (l.includes('html')) return false;
    return true;
  };

  async function tryOne(url, label) {
    try {
      const h = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (h.ok && isJS(h.headers.get('content-type'))) {
        console.debug('[tabs] import', label, url, h.status, h.headers.get('content-type'));
        return await import(/* @vite-ignore */ url);
      }
      console.warn('[tabs] HEAD non OK/CT:', label, url, h.status, h.headers.get('content-type'));
    } catch (e) {
      console.warn('[tabs] HEAD échec', label, url, e);
    }
    return null;
  }

  return (
    (await tryOne(abs, 'as-is')) ||
    (await tryOne(clean, 'no-query')) ||
    (await tryOne(withBust, 'cache-bust')) ||
    (await import(/* @vite-ignore */ abs)) // dernier essai visible en console si ça casse
  );
}

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  if (!view) console.warn('[tabs] #view introuvable');

  // chemins RELATIFS à tabs.js
  const TABS = {
    devis: { moduleFromHere: './devis/ui.js',           inits: ['initDevis', 'default'] },
    cr:    { moduleFromHere: './cout_de_revient/cr.js', inits: ['initCR', 'default'] },
    ch:    { moduleFromHere: './cout_horaire/ch.js',    inits: ['initCH', 'default'] },
  };
  const VALID_TABS = new Set(Object.keys(TABS));

  let currentTab = null;
  let loading = false;
  let reqId = 0;

  const allTabs = [
    { el: tabDevis, key: 'devis' },
    { el: tabCR,    key: 'cr' },
    { el: tabCH,    key: 'ch' },
  ].filter(Boolean);

  const setActive = (tab) => {
    allTabs.forEach(({ el, key }) => {
      const active = key === tab;
      el.classList.toggle('tab-active', active);
      el.setAttribute('aria-selected', String(active));
    });
  };

  const pickInit = (mod, names) => {
    for (const n of names) if (typeof mod?.[n] === 'function') return mod[n];
    return null;
  };

  const open = async (tab, { allowScroll = false } = {}) => {
    if (!VALID_TABS.has(tab)) tab = 'devis';
    if (loading || currentTab === tab) return;

    loading = true;
    const myReq = ++reqId;
    console.debug('[tabs] open:', tab);

    try {
      if (view) view.innerHTML = '';
      if (typeof loadView !== 'function') throw new Error('loader.js: loadView introuvable');
      await loadView(tab);

      if (myReq !== reqId) return; // anti-course

      setActive(tab);

      const targetHash = '#' + tab;
      if (location.hash !== targetHash) history.replaceState(null, '', targetHash);

      const { moduleFromHere, inits } = TABS[tab];
      const mod = await importModule(moduleFromHere);
      const init = pickInit(mod, inits) || (() => {});
      init();

      // --- reset demandé depuis l'URL ?reset=1 ou via flag localStorage
if (tab === 'devis') {
  const params = new URLSearchParams(location.search);
  const flag = localStorage.getItem('force_reset') === '1';
  const asked = params.get('reset') === '1' || flag;

  if (asked) {
    console.debug('[tabs] resetDevis() requested');
    try {
      if (typeof mod.resetDevis === 'function') mod.resetDevis();
      else console.warn('[tabs] mod.resetDevis absente');
    } catch (e) {
      console.warn('[tabs] resetDevis error:', e);
    }

    // nettoie URL + flag pour éviter de re-reset
    params.delete('reset');
    const newUrl = location.pathname + (params.toString() ? '?' + params : '') + location.hash;
    history.replaceState(null, '', newUrl);
    try { localStorage.removeItem('force_reset'); } catch {}
  }
}


window.dispatchEvent(new CustomEvent('devis:changed', { detail: { reason: 'reset' } }));

      // AUCUN scroll automatique par défaut
      if (allowScroll && tab === 'devis') {
        const anchor = document.querySelector('#devis');
        anchor?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }

      currentTab = tab;
    } catch (e) {
      console.error('[tabs] open error:', e);
      if (view) {
        view.innerHTML = `
          <div class="max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
            <div class="font-semibold mb-1">Erreur de chargement de l’onglet “${tab}”</div>
            <pre class="text-xs overflow-auto">${(e && e.message) || e}</pre>
          </div>`;
      }
    } finally {
      loading = false;
    }
  };

  // clics: pas de scroll forcé
  tabDevis?.addEventListener('click', () => open('devis', { allowScroll: false }));
  tabCR?.addEventListener('click',    () => open('cr',    { allowScroll: false }));
  tabCH?.addEventListener('click',    () => open('ch',    { allowScroll: false }));

  // navigation par hash: autorise le scroll (si l'utilisateur tape /#devis)
  window.addEventListener('hashchange', () => {
    const next = (location.hash || '#devis').slice(1);
    open(VALID_TABS.has(next) ? next : 'devis', { allowScroll: true });
  }, { passive: true });

  // ouverture initiale: pas de scroll forcé
  const initial = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(initial) ? initial : 'devis', { allowScroll: false });
}
