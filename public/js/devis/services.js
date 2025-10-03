// public/js/devis/services.js
import { state, PRICING, SERVICE_LABELS } from '../state.js';

export function initServices(onChange){
  const services = [
    ['poncage','Ponçage de finition'],
    ['aerogommage','Aérogommage'],
    ['peinture1','Peinture 1 couleur'],
    ['peinture2','Peinture 2 couleurs'],
    ['teinte','Teinte'],
    ['vernis','Vernis'],
    ['consommables','Consommables'],
  ];
  const wrap = document.getElementById('servicesM2');
  if (wrap) {
    wrap.innerHTML = '';
    services.forEach(([key,label])=>{
      const row=document.createElement('label');
      row.className='flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-neutral-200';
      row.innerHTML = `<span>${label} (${PRICING.servicesTTC[key].toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}/m²)</span>`;
      const input=document.createElement('input');
      input.type='checkbox'; input.className='w-4 h-4'; input.checked=!!state.services[key];
      input.addEventListener('change', ()=>{ state.services[key]=input.checked; onChange && onChange(); });
      row.appendChild(input); wrap.appendChild(row);
    });
  }

  const fchg = document.getElementById('f_change');
  const fpol = document.getElementById('f_polish');
  if (fchg) fchg.addEventListener('input', ()=>{ state.pieceCounts.ferrures_change = Number(fchg.value||0); onChange && onChange(); });
  if (fpol) fpol.addEventListener('input', ()=>{ state.pieceCounts.ferrures_polissage = Number(fpol.value||0); onChange && onChange(); });
}

export function renderRecapServices(){
  const list = document.getElementById('recapServices');
  if(!list) return;
  list.innerHTML = '';
  Object.entries(state.services).forEach(([k,checked])=>{
    if(checked){
      const li=document.createElement('li');
      li.textContent = SERVICE_LABELS[k] || k;
      list.appendChild(li);
    }
  });
  if((state.pieceCounts.ferrures_change||0) > 0){
    const li=document.createElement('li');
    li.textContent = `Changement de ferrures × ${state.pieceCounts.ferrures_change}`;
    list.appendChild(li);
  }
  if((state.pieceCounts.ferrures_polissage||0) > 0){
    const li=document.createElement('li');
    li.textContent = `Polissage des ferrures × ${state.pieceCounts.ferrures_polissage}`;
    list.appendChild(li);
  }
  const li=document.createElement('li');
  if(state.transport.mode === 'baryc'){
    const p = Number(state.transport.pickKm)||0;
    const dr = Number(state.transport.dropKm)||0;
    const d = Number(state.transport.distanceKm)||0;
    li.textContent = `Transport (Baryc) — Récup: ${p} km ×2 • Livraison: ${dr} km ×2 • Total: ${d} km`;
  } else {
    li.textContent = 'Transport à vos soins';
  }
  list.appendChild(li);
}
