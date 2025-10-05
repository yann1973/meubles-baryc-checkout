// public/js/devis/ui.js
export function initDevis() {
  console.log('[ui.js] initDevis OK');
  const host = document.querySelector('#view');
  if (host) {
    const box = document.createElement('div');
    box.className = 'max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900';
    box.innerHTML = `<div class="font-semibold mb-1">Devis chargé ✅</div>
                     <p class="text-sm">Module <code>/js/devis/ui.js</code> importé et exécuté.</p>`;
    host.appendChild(box);
  }
  return true;
}
