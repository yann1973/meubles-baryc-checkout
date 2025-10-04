// public/js/tabs.js
import { loadView } from '/js/loader.js';

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  if (!view) {
    console.warn('[tabs] #view introuvable');
  }

  // Onglets supportés + modules associés
  const TABS = {
    devis: { module: '/js/devis/ui.js',    inits: ['initDevis', 'default'] },
    cr:    { module: '/js/cout_de_revient/cr.js', inits: ['initCR', 'default'] },
    ch:    { module: '/js/cout_horaire/ch.js',    inits: ['initCH', 'default'] },
  };
  const VALID_TABS = new Set(Object.keys(TABS));

  let currentTab = null;
  let loading = false;
  let reqId = 0; // anti-course (si on clique vite)

  const allTabs = [
    { el: tabDevis, key: 'devis' },
    { el: tabCR,    key: 'cr' },
    { el: tabCH,    key: 'ch' },
  ].filter(t => !!t.el);

  const setActive = (tab) => {
    allTabs.forEach(({ el, key }) => {
      const isActive = key === tab;
      el.classList.toggle('tab-active', isActive);
      el.setAttribute('aria-selected', String(isActive));
    });
  };

  const scrollForTab = (tab) => {
    if (tab === 'devis') {
      const anchor = document.querySelector('#devis');
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pickInit = (mod, names) => {
    for (const n of names) {
      if (typeof mod?.[n] === 'function') return mod[n];
    }
    return null;
  };

  const open = async (tab) => {
    if (!VALID_TABS.has(tab)) tab = 'devis';
    if (loading || currentTab === tab) return;

    loading = true;
    const myReq = ++reqId;

    try {
      // reset de la zone d’injection
      if (view) view.innerHTML = '';

      // charge la vue HTML (partial)
      if (typeof loadView !== 'function') {
        throw new Error('loader.js: loadView introuvable (mauvais export ?)');
      }
      await loadView(tab);

      // si une autre ouverture a démarré entre-temps, on s’arrête
      if (myReq !== reqId) return;

      setActive(tab);

      // met à jour l'URL sans empiler l'historique
      const targetHash = '#' + tab;
      if (location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
      }

      // charge et initialise le module JS de l’onglet
      const { module, inits } = TABS[tab];
      const mod = await import(module);
      const init = pickInit(mod, inits) || (() => {});
      init();

      // scroll adapté
      scrollForTab(tab);

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

  // Clics onglets
  tabDevis?.addEventListener('click', () => open('devis'));
  tabCR?.addEventListener('click',    () => open('cr'));
  tabCH?.addEventListener('click',    () => open('ch'));

  // Navigation via le hash (#devis / #cr / #ch)
  window.addEventListener('hashchange', () => {
    const next = (location.hash || '#devis').slice(1);
    open(VALID_TABS.has(next) ? next : 'devis');
  }, { passive: true });

  // Ouverture initiale
  const initial = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(initial) ? initial : 'devis');
}
