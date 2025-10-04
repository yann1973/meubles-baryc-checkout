// public/js/tabs.js
import { loadView } from '/js/loader.js';

// Helper d'import tolérant aux ?v=..., au cache et aux chemins
async function importModule(spec) {
  const buildURL = (p) => (p.startsWith('http') ? p : new URL(p, location.origin).href);

  // liste d'essais (as-is, sans query, cache-bust, relatif)
  const absolute = buildURL(spec);
  const cleanAbs = absolute.split('?')[0];
  const relative = buildURL(spec.replace(/^\//, ''));

  const candidates = [
    { url: absolute,            label: 'as-is' },
    { url: cleanAbs,            label: 'no-query' },
    { url: `${cleanAbs}?ts=${Date.now()}`, label: 'cache-bust' },
    { url: relative,            label: 'relative' },
  ];

  const isProbablyJS = (ct) => {
    if (!ct) return true;                   // certains serveurs n’envoient pas le CT sur HEAD
    const l = ct.toLowerCase();
    if (l.includes('javascript')) return true;
    if (l.includes('text/plain')) return true; // tolère certains setups
    if (l.includes('html')) return false;      // on refuse clairement HTML
    return true;
  };

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok && isProbablyJS(res.headers.get('content-type'))) {
        console.debug('[tabs] import', c.label, c.url, res.status, res.headers.get('content-type'));
        return await import(/* @vite-ignore */ c.url);
      }
      console.warn('[tabs] HEAD non OK / CT inattendu:', c.label, c.url, res.status, res.headers.get('content-type'));
    } catch (e) {
      console.warn('[tabs] HEAD échec pour', c.label, c.url, e);
    }
  }

  // dernier essai: laisse remonter l'erreur pour avoir la stack exacte
  return await import(/* @vite-ignore */ buildURL(spec));
}

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  if (!view) console.warn('[tabs] #view introuvable');

  const TABS = {
    devis: { module: '/js/devis/ui.js',            inits: ['initDevis', 'default'] },
    cr:    { module: '/js/cout_de_revient/cr.js',  inits: ['initCR', 'default'] },
    ch:    { module: '/js/cout_horaire/ch.js',     inits: ['initCH', 'default'] },
  };
  const VALID_TABS = new Set(Object.keys(TABS));

  let currentTab = null;
  let loading = false;
  let reqId = 0;

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
    for (const n of names) if (typeof mod?.[n] === 'function') return mod[n];
    return null;
  };

  const open = async (tab) => {
    if (!VALID_TABS.has(tab)) tab = 'devis';
    if (loading || currentTab === tab) return;

    loading = true;
    const myReq = ++reqId;
    console.debug('[tabs] open:', tab);

    try {
      if (view) view.innerHTML = '';
      if (typeof loadView !== 'function') throw new Error('loader.js: loadView introuvable');
      await loadView(tab);

      if (myReq !== reqId) return; // anti-course si clics rapides

      setActive(tab);

      const targetHash = '#' + tab;
      if (location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
      }

      const { module, inits } = TABS[tab];
      const mod = await importModule(module);
      const init = pickInit(mod, inits) || (() => {});
      init();

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

  tabDevis?.addEventListener('click', () => open('devis'));
  tabCR?.addEventListener('click',    () => open('cr'));
  tabCH?.addEventListener('click',    () => open('ch'));

  window.addEventListener('hashchange', () => {
    const next = (location.hash || '#devis').slice(1);
    open(VALID_TABS.has(next) ? next : 'devis');
  }, { passive: true });

  const initial = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(initial) ? initial : 'devis');
}
