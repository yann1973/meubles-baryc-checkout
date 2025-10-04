// public/js/tabs.js
import { loadView } from '/js/loader.js';

export function initTabs() {
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  const VALID_TABS = new Set(['devis', 'cr', 'ch']);
  let currentTab = null;
  let loading = false;

  const setActive = (tab) => {
    const isDevis = tab === 'devis';
    const isCR    = tab === 'cr';
    const isCH    = tab === 'ch';

    tabDevis?.classList.toggle('tab-active', isDevis);
    tabCR?.classList.toggle('tab-active',    isCR);
    tabCH?.classList.toggle('tab-active',    isCH);

    tabDevis?.setAttribute('aria-selected', String(isDevis));
    tabCR?.setAttribute('aria-selected', String(isCR));
    tabCH?.setAttribute('aria-selected', String(isCH));
  };

  const scrollToHash = (hash) => {
    // on ne scroll que si une cible existe; sinon, remonte en haut
    const el = hash && document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const open = async (tab) => {
    if (!VALID_TABS.has(tab)) tab = 'devis';
    if (loading || currentTab === tab) return;
    loading = true;

    try {
      // vide la vue avant chargement
      if (view) view.innerHTML = '';

      // charge la partial correspondante
      await loadView(tab);
      setActive(tab);

      // met à jour l'URL sans polluer l'historique
      const targetHash = '#' + tab;
      if (location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
      }

      // charge le module JS de l’onglet
      if (tab === 'devis') {
        const mod = await import('/js/devis/ui.js'); // sans ?v=
        (mod.initDevis || mod.default || (()=>{}))();
      } else if (tab === 'cr') {
        const mod = await import('/js/cout_de_revient/cr.js');
        (mod.initCR || mod.default || (()=>{}))();
      } else if (tab === 'ch') {
        const mod = await import('/js/cout_horaire/ch.js');
        (mod.initCH || mod.default || (()=>{}))();
      }

      // scroll : si on est sur #devis et que <section id="devis"> existe, on y va;
      // sinon on remonte en haut (utile pour CR/CH où il n’y a pas d’ancre dédiée)
      scrollToHash(targetHash === '#devis' ? '#devis' : '');
      currentTab = tab;
    } catch (e) {
      console.error(e);
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

  // clics sur les onglets
  tabDevis?.addEventListener('click', () => open('devis'));
  tabCR?.addEventListener('click',    () => open('cr'));
  tabCH?.addEventListener('click',    () => open('ch'));

  // navigation via le hash (ex: l’utilisateur tape l’URL avec #cr)
  window.addEventListener('hashchange', () => {
    const hash = (location.hash || '#devis').slice(1);
    open(VALID_TABS.has(hash) ? hash : 'devis');
  });

  // ouverture initiale
  const initial = (location.hash || '#devis').slice(1);
  open(VALID_TABS.has(initial) ? initial : 'devis');
}
