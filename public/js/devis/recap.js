// public/js/devis/recap.js
import { fmtEUR } from '/js/utils.js';
import { state } from '/js/state.js';

const safe = (v, d=0)=> (Number.isFinite(v) ? v : d);

export function renderTotals(pricing){
  // anti-casse: valeurs par défaut si un champ est manquant
  const surf      = safe(pricing?.totalSurface, 0);
  const goodsHT   = safe(pricing?.goods?.ht, 0);
  const goodsTVA  = safe(pricing?.goods?.tva, 0);
  const goodsTTC  = safe(pricing?.goods?.ttc, 0);
  const trTTC     = safe(pricing?.transport?.ttc, 0);
  const trLabel   = pricing?.transport?.label || '';
  const trDisc    = safe(pricing?.transport?.discount, 0);
  const recapLine = pricing?.transport?.recapLine || ''; // phrase "Récup A/R…"

  const totalTTC  = safe(pricing?.totals?.ttc, goodsTTC + trTTC);

  const set = (id, val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };

  set('totalSurface', `${surf.toFixed(2)} m²`);
  set('prixHT',       fmtEUR(goodsHT));
  set('prixTVA',      fmtEUR(goodsTVA));
  set('prixTTC',      fmtEUR(totalTTC));
  set('prixTransport',fmtEUR(trTTC));

  const tar = document.getElementById('transportTarifInfo');
  if (tar) tar.textContent = trLabel || '';

  const det = document.getElementById('recapTransportDetail');
  if (det) det.innerHTML = recapLine || (state.transport.mode === 'baryc' ? '' : 'Livraison par vos soins');

  const remiseLine = document.getElementById('ligneRemiseTransport');
  const remiseVal  = document.getElementById('prixRemiseTransport');
  if (remiseLine && remiseVal){
    if (trDisc > 0){
      remiseLine.classList.remove('hidden');
      remiseVal.textContent = '–' + fmtEUR(trDisc).replace('€',' €');
    } else {
      remiseLine.classList.add('hidden');
    }
  }
}

/* Vide le récap ET remet les champs à zéro (sans toucher le panier) */
export function clearRecap(){
  // Dimensions
  const L=document.getElementById('longueur');
  const W=document.getElementById('largeur');
  const H=document.getElementById('hauteur');
  if (L) L.value = '0';
  if (W) W.value = '0';
  if (H) H.value = '0';
  state.L = 0; state.W = 0; state.H = 0;

  // Pièces
  const fc=document.getElementById('f_change');
  const fp=document.getElementById('f_polish');
  if (fc) fc.value='0';
  if (fp) fp.value='0';
  state.pieceCounts.ferrures_change = 0;
  state.pieceCounts.ferrures_polissage = 0;

  // Transport
  const modeSel = document.getElementById('transportMode');
  if (modeSel){ modeSel.value = 'client'; modeSel.dispatchEvent(new Event('change',{bubbles:true})); }
  const same = document.getElementById('sameAsClient');
  const delv = document.getElementById('deliveryDifferent');
  const wrap = document.getElementById('deliveryAddressWrap');
  const tPick= document.getElementById('transportAddressPickup');
  const tDel = document.getElementById('transportAddressDelivery');
  if (same) same.checked = false;
  if (delv) delv.checked = false;
  if (wrap) wrap.classList.add('hidden');
  if (tPick) tPick.value = '';
  if (tDel)  tDel.value  = '';

  state.transport.mode = 'client';
  state.transport.pickKm = 0;
  state.transport.dropKm = 0;
  state.transport.distanceKm = 0;

  const quick = document.getElementById('distanceAutoBlock');
  if (quick) quick.textContent = '0 km';
  const err = document.getElementById('distanceError');
  if (err) err.textContent = '';

  // Affichages du récap
  setText('totalSurface','0,00 m²');
  setText('prixHT',fmtEUR(0));
  setText('prixTVA',fmtEUR(0));
  setText('prixTransport',fmtEUR(0));
  setText('prixTTC',fmtEUR(0));

  const tar = document.getElementById('transportTarifInfo');
  if (tar) tar.textContent = '';
  const det = document.getElementById('recapTransportDetail');
  if (det) det.textContent = 'Livraison par vos soins';

  const remiseLine = document.getElementById('ligneRemiseTransport');
  if (remiseLine) remiseLine.classList.add('hidden');
}

function setText(id, val){
  const el=document.getElementById(id);
  if (el) el.textContent = val;
}
