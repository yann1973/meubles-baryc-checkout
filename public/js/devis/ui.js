// public/js/devis/ui.js
import { state } from '/js/state.js';
import { PRICING } from '/js/devis/constants.js';
import { computePricing } from '/js/devis/pricing.js';
import { renderTotals, clearRecap } from '/js/devis/recap.js';
import { renderRecapServices } from '/js/devis/recap-services.js';
import { initMapsBindings } from '/js/transport/maps.js';
import { refreshDistanceUI } from '/js/transport/distance.js';

function euro(n){
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
}

/* ===================== Services au m² ===================== */
function buildServicesM2() {
  const host = document.getElementById('servicesM2');
  if (!host) return;
  host.innerHTML = '';

  const LABELS = {
    poncage: 'Ponçage de finition',
    aerogommage: 'Aérogommage',
    peinture1: 'Peinture 1 couleur',
    peinture2: 'Peinture 2 couleurs',
    teinte: 'Teinte',
    vernis: 'Vernis',
    consommables: 'Consommables',
  };
  const order = ['poncage','aerogommage','peinture1','peinture2','teinte','vernis','consommables'];

  order.forEach(key => {
    const price = PRICING?.servicesTTC?.[key] ?? 0;
    const wrap = document.createElement('label');
    wrap.className = 'flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-neutral-200';

    const span = document.createElement('span');
    span.textContent = `${LABELS[key] || key} (${euro(price)}/m²)`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'w-4 h-4';
    input.dataset.key = key;
    input.checked = !!state.services[key];

    input.addEventListener('change', () => {
      state.services[key] = !!input.checked;
      recompute();
    });

    wrap.appendChild(span);
    wrap.appendChild(input);
    host.appendChild(wrap);
  });
}







/* ===================== Pièces (ferrures) ===================== */
function bindPieceInputs() {
  [['f_change','ferrures_change'],['f_polish','ferrures_polissage']].forEach(([id,key])=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      const v = el.value === '' ? 0 : parseInt(el.value,10);
      state.pieceCounts[key] = Number.isFinite(v) ? v : 0;
      recompute();
    });
  });
}





/* ===================== Dimensions ===================== */
function bindDimensions() {
  [['longueur','L'],['largeur','W'],['hauteur','H']].forEach(([id,k])=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      const v = el.value === '' ? 0 : Number(el.value);
      state[k] = Number.isFinite(v) ? v : 0;
      recompute();
    });
  });
}






/* ===================== Type de meuble (si boutons présents) ===================== */
function bindTypeButtons(){
  const host = document.getElementById('typeButtons');
  if (!host) return; // pas bloquant si l’UI ne l’a pas
  const types = ["Chaise","Commode","Armoire","Lit","Console","Table","Buffet","Vaisselier","Bahut","Autre"];
  if (!host.__built){
    host.__built = true;
    host.innerHTML = '';
    types.forEach(t=>{
      const b=document.createElement('button');
      b.type = 'button';
      b.className='px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100';
      b.textContent=t;
      b.addEventListener('click', ()=>{ state.type=t; recompute(); });
      host.appendChild(b);
    });
  }
}






/* ===================== Recompute global ===================== */
function recompute(){
  // computePricing doit retourner un objet { totalSurface, goods:{ht,tva,ttc}, transport:{...}, totals:{...} }
  const pricing = computePricing();
  if (!pricing) return;

  renderTotals(pricing);
  renderRecapServices(state);

  const surf = document.getElementById('surfaceDisplay');
  if (surf) surf.textContent = `${(pricing.totalSurface||0).toFixed(2)} m²`;
}







/* ======= RESET COMPLET DU DEVIS (bouton "Vider le récap") ======= */
/*

function resetDevisForm(){
  // 1) State par défaut
  state.type = 'Table';
  state.L = 0; state.W = 0; state.H = 0;

  state.pieceCounts.ferrures_change = 0;
  state.pieceCounts.ferrures_polissage = 0;

  const DEFAULT_SERVICES = {
    poncage:true, aerogommage:false, peinture1:false, peinture2:false,
    teinte:false, vernis:false, consommables:true
  };
  state.services = { ...DEFAULT_SERVICES };

  state.transport.mode = 'client';
  state.transport.pickKm = 0;
  state.transport.dropKm = 0;
  state.transport.distanceKm = 0;

  // 2) Inputs — dimensions
  const setVal = (id,val)=>{ const el=document.getElementById(id); if(el){ el.value = String(val); } };
  setVal('longueur','0'); setVal('largeur','0'); setVal('hauteur','0');

  // 3) Inputs — pièces
  setVal('f_change','0'); setVal('f_polish','0');

  // 4) Inputs — services (checkboxes)
  document.querySelectorAll('#servicesM2 input[type="checkbox"][data-key]').forEach(cb=>{
    const key = cb.getAttribute('data-key');
    cb.checked = !!DEFAULT_SERVICES[key];
  });

  // 5) Inputs — client
  ['nom','prenom','telephone','email','clientAddressMain','description'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const sel = document.getElementById('connaissance');
  if (sel) sel.value = '';





  
  // 6) Inputs — transport
  const modeSel = document.getElementById('transportMode');
  if (modeSel){
    modeSel.value = 'client';
    modeSel.dispatchEvent(new Event('change',{bubbles:true}));
  }
  const sameAsClient = document.getElementById('sameAsClient');
  if (sameAsClient) sameAsClient.checked = false;

  const deliveryDifferent = document.getElementById('deliveryDifferent');
  const deliveryWrap = document.getElementById('deliveryAddressWrap');
  if (deliveryDifferent) deliveryDifferent.checked = false;
  if (deliveryWrap) deliveryWrap.classList.add('hidden');

  ['transportAddressPickup','transportAddressDelivery'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });

  const manualToggle = document.getElementById('manualDistanceToggle');
  const distanceManual = document.getElementById('distanceManual');
  const distanceAutoBlock = document.getElementById('distanceAutoBlock');
  if (manualToggle){
    manualToggle.checked = false;
    manualToggle.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if (distanceManual) distanceManual.value = '0';
  if (distanceAutoBlock) distanceAutoBlock.textContent = '0 km';

  // 7) Effacer messages d’erreur
  ['clientErrors','telError','emailError','distanceError'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent='';
  });

  // 8) UI distance + recap
  refreshDistanceUI();
  clearRecap();    // vide l’affichage du récap
  recompute();     // recalcule proprement les totaux (tout à 0)
}
*/




/* ======= Bouton "Vider le récapitulatif" ======= 
function bindClearRecapButton(){
  const btn = document.getElementById('btnClearRecap');
  if (btn && !btn.__bound){
    btn.__bound = true;
    btn.addEventListener('click', resetDevisForm);
  }
}
*/

// --- à coller quelque part en haut du fichier (sous tes autres petites fonctions) ---

/*
function bindPhoneDigitsOnly() {
  const tel = document.getElementById('telephone');
  const err = document.getElementById('telError');

  if (!tel || tel.__digitsBound) return;
  tel.__digitsBound = true;

  const sanitize = () => {
    const digits = (tel.value || '').replace(/\D/g, '').slice(0, 10);
    if (tel.value !== digits) tel.value = digits;
    // petit message si < 10 chiffres
    if (err) {
      if (digits.length > 0 && digits.length < 10) {
        err.textContent = '10 chiffres requis.';
      } else {
        err.textContent = '';
      }
    }
  };

  tel.addEventListener('input', sanitize);
  tel.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 10);
    tel.value = pasted;
    sanitize();
  });
  tel.addEventListener('keypress', (e) => {
    // bloque tout sauf 0–9
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
}


*/


/* ===================== Entrée principale =====================
export function initDevis(){
  buildServicesM2();
  bindTypeButtons();  // non bloquant si l'UI n'a pas la zone des types
  bindDimensions();
  bindPieceInputs();

  // Google Maps + liens avec recompute (ne remet PAS les mesures à 0)
  initMapsBindings(recompute);

  // Bouton "Vider le récap"
  bindClearRecapButton();

  bindPhoneDigitsOnly();
  
  // Premier calcul
  recompute();
}

 */










// public/js/devis/ui.js
export function initDevis() {
  console.log('[ui.js] initDevis OK');
  const host = document.querySelector('#view');
  if (!host) return;

  const box = document.createElement('div');
  box.className = 'max-w-3xl mx-auto p-4 mt-6 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900';
  box.innerHTML = `<div class="font-semibold mb-1">Devis chargé ✅</div>
                   <p class="text-sm">Module <code>/js/devis/ui.js</code> importé et exécuté.</p>`;
  host.appendChild(box);
}
