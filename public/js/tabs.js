// public/js/tabs.js
import { loadView } from '/js/loader.js';

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  // Mapping des onglets → modules (chemins RELATIFS à ce fichier)
  const TABS = {
    devis: { moduleFromHere: './devis/ui/index.js',     initNames: ['initDevis', 'default'] },
    cr:    { moduleFromHere: './cout_de_revient/index.js', initNames: ['initCR', 'default'] },
    ch:    { moduleFromHere: './cout_horaire/ch.js',    initNames: ['initCH', 'default'] },
  };
  const VALID_TABS = new Set(Object.keys(TABS));

  let currentTab = null;
  let loading = false;
  let reqId = 0;

  const allTabs = [
    { el: tabDevis, key: 'devis' },
    { el: tabCR,    key: 'cr' },
    { el: tabCH,    key: 'ch' },
  ].filter(t => t.el);

  const setActive = (tab) => {
    allTabs.forEach(({ el, key }) => {
      const active = key === tab;
      el.classList.toggle('tab-active', active);
      el.setAttribute('aria-selected', String(active));
    });
  };

  const pickInit = (mod, names) => {
    for (const n of names) if (typeof mod?.[n] === 'function') return mod[n];
    return () => {};
  };

  const open = async (tab, { allowScroll = false } = {}) => {
    if (!VALID_TABS.has(tab)) tab = 'devis';
    if (loading || currentTab === tab) return;

    loading = true;
    const myReq = ++reqId;

    try {
      if (view) view.innerHTML = '';

      // detecte la demande de reset (?reset=1 ou flag localStorage)
      let resetAsked = false;
      let params = null;
      if (tab === 'devis') {
        params = new URLSearchParams(location.search);
        const flag = localStorage.getItem('force_reset') === '1';
        resetAsked = (params.get('reset') === '1') || flag;
      }

      // injecte la vue HTML
      await loadView(tab);
      if (myReq !== reqId) return;

      setActive(tab);

      // maj hash (sans empiler l’historique)
      const targetHash = '#' + tab;
      if (location.hash !== targetHash) history.replaceState(null, '', targetHash);

      // charge et initialise le module de l’onglet
      const { moduleFromHere, initNames } = TABS[tab];
      const mod  = await import(moduleFromHere);
      const init = pickInit(mod, initNames);
      init();

      // reset demandé → appelle resetDevis() puis nettoie l’URL/flag
      if (tab === 'devis' && resetAsked) {
        try { typeof mod.resetDevis === 'function' && mod.resetDevis(); } catch {}
        if (params) {
          params.delete('reset');
          const newUrl = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
          history.replaceState(null, '', newUrl);
        }
        try { localStorage.removeItem('force_reset'); } catch {}
        try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { reason: 'reset' } })); } catch {}
      }

      // pas de scroll auto (sauf navigation via hash)
      if (allowScroll && tab === 'devis') {
        document.querySelector('#devis')?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
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

  // hashchange: autorise le scroll (si l'utilisateur tape /#devis)
  window.addEventListener('hashchange', () => {
    const next = (location.hash || '#devis').slice(1);
    open(VALID_TABS.has(next) ? next : 'devis', { allowScroll: true });
  }, { passive: true });

  // ouverture initiale: pas de scroll forcé
  const initial = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(initial) ? initial : 'devis', { allowScroll: false });
}
