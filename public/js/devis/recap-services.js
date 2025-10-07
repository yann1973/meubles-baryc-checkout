// public/js/devis/recap-services.js
export { renderRecapServices } from '/js/devis/recap/services.js';

export function renderRecapServices(state){
  const list = document.getElementById('recapServices');
  if(!list) return;
  list.innerHTML = '';

  const LABELS = {
    poncage: 'Ponçage de finition',
    aerogommage: 'Aérogommage',
    peinture1: 'Peinture 1 couleur',
    peinture2: 'Peinture 2 couleurs',
    teinte: 'Teinte',
    vernis: 'Vernis',
    consommables: 'Consommables',
  };

  Object.entries(state.services).forEach(([k,checked])=>{
    if(checked){
      const li=document.createElement('li');
      li.textContent = LABELS[k] || k;
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
}
