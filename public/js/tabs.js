// public/js/tabs.js
import { loadView } from '/js/loader.js';

export function initTabs(){
  const tabDevis = document.getElementById('tabDevis');
  const tabCR    = document.getElementById('tabCR');
  const tabCH    = document.getElementById('tabCH');
  const view     = document.getElementById('view');

  const setActive = (tab) => {
    tabDevis?.classList.toggle('tab-active', tab === 'devis');
    tabCR?.classList.toggle('tab-active',    tab === 'cr');
    tabCH?.classList.toggle('tab-active',    tab === 'ch');
  };

  const open = async (tab) => {
    try {
      if (view) view.innerHTML = '';
      await loadView(tab);
      setActive(tab);

      const targetHash = '#' + tab;
      if (location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
      }

      if (tab === 'devis') {
        const mod = await import('/js/devis/ui.js');     // ⬅⬅ sans ?v=
        (mod.initDevis || mod.default)();
      } else if (tab === 'cr') {
        const mod = await import('/js/cout_de_revient/cr.js'); // ⬅⬅
        (mod.initCR || mod.default || (()=>{}))();
      } else if (tab === 'ch') {
        const mod = await import('/js/cout_horaire/ch.js');    // ⬅⬅
        (mod.initCH || mod.default || (()=>{}))();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      if (view) {
        view.innerHTML = `
          <div class="max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
            <div class="font-semibold mb-1">Erreur de chargement de l’onglet “${tab}”</div>
            <pre class="text-xs overflow-auto">${(e && e.message) || e}</pre>
          </div>`;
      }
    }
  };

  tabDevis?.addEventListener('click', () => open('devis'));
  tabCR?.addEventListener('click',    () => open('cr'));
  tabCH?.addEventListener('click',    () => open('ch'));

  const initial = (location.hash || '#devis').slice(1);
  open(initial);
}
