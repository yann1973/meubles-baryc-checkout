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
    (await import(/* @vite-ignore */ abs)) // dernier essai
  );
}

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  if (!view) console.warn('[tabs] #view introuvable');

  // ⚠️ chemins RELATIFS à tabs.js
  const TABS = {
    devis: { moduleFromHere: './devis/ui.js',            inits: ['initDevis', 'default'] },
    cr:    { moduleFromHere: './cout_de_revient/cr.js',  inits: ['initCR', 'default'] },
    ch:    { moduleFromHere: './cout_horaire/ch.js',     inits: ['initCH', 'default'] },
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
    // si tu utilises importModule(...) garde-le ; sinon remets import(...)
    const mod = await importModule(moduleFromHere);
    const init = pickInit(mod, inits) || (() => {});
    init();

    // ⬇️ pas de scroll automatique, sauf si autorisé (ex: navigation par hash externe)
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

// ⬇️ handlers: clic = pas de scroll ; hashchange = scroll autorisé
tabDevis?.addEventListener('click', () => open('devis', { allowScroll: false }));
tabCR?.addEventListener('click',    () => open('cr',    { allowScroll: false }));
tabCH?.addEventListener('click',    () => open('ch',    { allowScroll: false }));

window.addEventListener('hashchange', () => {
  const next = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(next) ? next : 'devis', { allowScroll: true });
}, { passive: true });

// Ouverture initiale: pas de scroll forcé
const initial = (location.hash || '#devis').slice(1);
open(VALID_TABS.has(initial) ? initial : 'devis', { allowScroll: false });
}
