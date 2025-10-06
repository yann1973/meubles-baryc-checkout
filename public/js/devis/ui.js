// public/js/devis/ui.js
import { state } from '../state.js';
import { PRICING } from './constants.js';
import { computePricing } from './pricing.js';
import { renderTotals, clearRecap } from './recap.js';
import { renderRecapServices } from './recap-services.js';
import { initMapsBindings } from '../transport/maps.js';
import { refreshDistanceUI } from '../transport/distance.js';

const DEFAULT_SERVICES = {
  poncage: true,
  aerogommage: false,
  peinture1: false,
  peinture2: false,
  teinte: false,
  vernis: false,
  consommables: true,
};

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
    if (el.__bound) return; el.__bound = true;

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
    if (el.__bound) return; el.__bound = true;

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
  if (!host) return;
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
  const pricing = computePricing();
  if (!pricing) return;

  renderTotals(pricing);
  renderRecapServices(state);

  const surf = document.getElementById('surfaceDisplay');
  if (surf) surf.textContent = `${(pricing.totalSurface||0).toFixed(2)} m²`;
  // Notifie les autres onglets (CR) qu’il y a eu un recalcul
  try { window.dispatchEvent(new CustomEvent('devis:changed', { detail: { pricing } })); } catch {}
}

/* ===================== Tel — chiffres uniquement ===================== */
function bindPhoneDigitsOnly() {
  const tel = document.getElementById('telephone');
  const err = document.getElementById('telError');

  if (!tel || tel.__digitsBound) return;
  tel.__digitsBound = true;

  const sanitize = () => {
    const digits = (tel.value || '').replace(/\D/g, '').slice(0, 10);
    if (tel.value !== digits) tel.value = digits;
    if (err) {
      if (digits.length > 0 && digits.length < 10) err.textContent = '10 chiffres requis.';
      else err.textContent = '';
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
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });
}

/* ===================== RESET COMPLET (état + UI + storage) ===================== */
export function resetDevis() {
  const host = document.querySelector('#view');
  if (!host) return;

  // 1) State par défaut
  state.type = 'Table';
  state.L = 0; state.W = 0; state.H = 0;

  state.pieceCounts = state.pieceCounts || {};
  state.pieceCounts.ferrures_change = 0;
  state.pieceCounts.ferrures_polissage = 0;

  state.services = { ...DEFAULT_SERVICES };

  state.transport = state.transport || {};
  state.transport.mode = 'client';
  state.transport.pickKm = 0;
  state.transport.dropKm = 0;
  state.transport.distanceKm = 0;

  // 2) Form — valeurs
  const setVal = (id,val)=>{ const el=document.getElementById(id); if(el){ el.value = String(val); } };
  setVal('longueur','0'); setVal('largeur','0'); setVal('hauteur','0');
  setVal('f_change','0'); setVal('f_polish','0');

  // Services (checkboxes) -> valeurs par défaut
  host.querySelectorAll('#servicesM2 input[type="checkbox"][data-key]').forEach(cb=>{
    const key = cb.getAttribute('data-key');
    cb.checked = !!DEFAULT_SERVICES[key];
  });

  // Client
  ['nom','prenom','telephone','email','clientAddressMain','description'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const sel = document.getElementById('connaissance');
  if (sel) sel.value = '';

  // Transport
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
  if (manualToggle){
    manualToggle.checked = false;
    manualToggle.dispatchEvent(new Event('change',{bubbles:true}));
  }
  const distanceManual = document.getElementById('distanceManual');
  const distanceAutoBlock = document.getElementById('distanceAutoBlock');
  if (distanceManual) distanceManual.value = '0';
  if (distanceAutoBlock) distanceAutoBlock.textContent = '0 km';

  // 3) Effacer messages d’erreur
  ['clientErrors','telError','emailError','distanceError'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent='';
  });

  // 4) Storage — vide clés possibles de panier/état
  const PANIER_KEYS = ['devis_cart','panier','cart','DEVIS_CART','baryc_cart','checkout_items','devis-state'];
  PANIER_KEYS.forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} });
  // Fuzzy match
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (/(devis|cart|panier)/i.test(k)) localStorage.removeItem(k);
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (/(devis|cart|panier)/i.test(k)) sessionStorage.removeItem(k);
  }

  // 5) UI distance + recap + recompute
  refreshDistanceUI();
  clearRecap();
  recompute();

  // 6) notifier les autres modules
  window.dispatchEvent(new CustomEvent('devis:reset'));
  console.log('[devis] reset complet effectué');
}

/* ===================== Entrée principale ===================== */
export function initDevis(){
  const host = document.querySelector('#view');
  if (!host) return;

  // anti double-initialisation
  if (host.dataset.devisInit === '1') {
    console.debug('[devis] déjà initialisé — skip');
    return;
  }
  host.dataset.devisInit = '1';

  // si pas d’état services, initialise-le
  state.services = state.services ? { ...state.services } : { ...DEFAULT_SERVICES };
  state.pieceCounts = state.pieceCounts || { ferrures_change: 0, ferrures_polissage: 0 };
  state.transport = state.transport || { mode: 'client', pickKm: 0, dropKm: 0, distanceKm: 0 };

  buildServicesM2();
  bindTypeButtons();      // non bloquant si la zone n'existe pas
  bindDimensions();
  bindPieceInputs();
  bindPhoneDigitsOnly();

  // Google Maps + bindings distance (protégé)
  try { initMapsBindings(recompute); } catch (e) { console.warn('[devis] initMapsBindings', e); }

  // Premier calcul
  recompute();
}
