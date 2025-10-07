// public/js/devis/services.js
export { buildServicesM2 as initServices } from '/js/devis/ui/buildServices.js';
export { renderRecapServices } from '/js/devis/recap/services.js';

import { PRICING, SERVICE_LABELS } from '../pricing.js';
import { state } from '../state.js';

export function initServices(onChanged){
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
  if(!wrap) return;
  services.forEach(([key,label])=>{
    const row=document.createElement('label'); row.className='flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-neutral-200';
    const span=document.createElement('span'); span.textContent=`${label} (${new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(PRICING.servicesTTC[key])}/m²)`;
    const input=document.createElement('input'); input.type='checkbox'; input.className='w-4 h-4'; input.checked=!!state.services[key];
    input.onchange=()=>{ state.services[key]=input.checked; onChanged(); };
    row.appendChild(span); row.appendChild(input); wrap.appendChild(row);
  });
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
    const li=document.createElement('li'); li.textContent = `Changement de ferrures × ${state.pieceCounts.ferrures_change}`; list.appendChild(li);
  }
  if((state.pieceCounts.ferrures_polissage||0) > 0){
    const li=document.createElement('li'); li.textContent = `Polissage des ferrures × ${state.pieceCounts.ferrures_polissage}`; list.appendChild(li);
  }
  if(state.transport.mode === 'baryc'){
    const li=document.createElement('li');
    const p = Number(state.transport.pickKm)||0;
    const dr = Number(state.transport.dropKm)||0;
    const d = Number(state.transport.distanceKm)||0;
    li.textContent = `Transport (Baryc) — Récup: ${p} km ×2 • Livraison: ${dr} km ×2 • Total: ${d} km`;
    list.appendChild(li);
  } else {
    const li=document.createElement('li'); li.textContent = 'Transport à vos soins'; list.appendChild(li);
  }
}
