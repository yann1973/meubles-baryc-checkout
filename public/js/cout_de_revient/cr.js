// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { computePricing } from '../devis/pricing.js'; // <- OK : export existe
import { toN, fmtEUR } from '../utils.js';

/**
 * Initialise les bindings des champs CR.
 * onUpdate : callback appelé à chaque saisie/changement pour recalculer l'affichage CR.
 */
export function initCR(onUpdate){
  const ids = [
    'cr_cout_h','cr_handling_h','cr_include_transport',
    'cr_t_poncage','cr_t_aero','cr_t_p1','cr_t_p2','cr_t_teinte','cr_t_vernis',
    'cr_p_p1','cr_p_p2','cr_p_teinte','cr_p_vernis','cr_p_cons','cr_t_f','cr_p_f'
  ];

  const safeUpdate = () => { if (typeof onUpdate === 'function') onUpdate(); };

  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input',  safeUpdate);
    el.addEventListener('change', safeUpdate);
  });

  // Premier calcul immédiat
  safeUpdate();
}

/**
 * Calcule et affiche le coût de revient à partir du pricing courant
 * pricing : résultat de computePricing()
 * stateRef : conservé pour compat, non utilisé ici
 */
export function computeCR(pricing /* from computePricing() */, stateRef){
  // Si l'onglet n'est pas présent, on ne fait rien
  if (!document.getElementById('cr_out_total')) return;

  // Surface issue du pricing (sécurisé)
  const surf = Math.max(0, Number(pricing?.totalSurface) || 0);

  // Temps par m²
  const tPon = toN(document.getElementById('cr_t_poncage')?.value);
  const tAer = toN(document.getElementById('cr_t_aero')?.value);
  const tP1  = toN(document.getElementById('cr_t_p1')?.value);
  const tP2  = toN(document.getElementById('cr_t_p2')?.value);
  const tTe  = toN(document.getElementById('cr_t_teinte')?.value);
  const tVe  = toN(document.getElementById('cr_t_vernis')?.value);
  const hdl  = toN(document.getElementById('cr_handling_h')?.value); // manutention (heures par déplacement)

  // Coût horaire
  const costH= toN(document.getElementById('cr_cout_h')?.value);

  // Produits €/m²
  const pP1  = toN(document.getElementById('cr_p_p1')?.value);
  const pP2  = toN(document.getElementById('cr_p_p2')?.value);
  const pTe  = toN(document.getElementById('cr_p_teinte')?.value);
  const pVe  = toN(document.getElementById('cr_p_vernis')?.value);
  const pCo  = toN(document.getElementById('cr_p_cons')?.value);

  // Ferrures
  const tf   = toN(document.getElementById('cr_t_f')?.value); // h/pc
  const pf   = toN(document.getElementById('cr_p_f')?.value); // €/pc

  // Heures main d'oeuvre selon services cochés
  let hM2 = 0;
  if (state.services.poncage)      hM2 += tPon;
  if (state.services.aerogommage)  hM2 += tAer;
  if (state.services.peinture1)    hM2 += tP1;
  if (state.services.peinture2)    hM2 += tP2;
  if (state.services.teinte)       hM2 += tTe;
  if (state.services.vernis)       hM2 += tVe;

  // Manutention A/R (hdl * 2)
  const heuresMO = (hM2 * surf) + (hdl * 2);
  const coutMO   = heuresMO * costH;

  // Coût produits / m²
  let matM2 = 0;
  if (state.services.peinture1)     matM2 += pP1;
  if (state.services.peinture2)     matM2 += pP2;
  if (state.services.teinte)        matM2 += pTe;
  if (state.services.vernis)        matM2 += pVe;
  if (state.services.consommables)  matM2 += pCo;

  const coutMat = matM2 * surf;

  // Ferrures
  const nFerr = (toN(state.pieceCounts.ferrures_change) + toN(state.pieceCounts.ferrures_polissage));
  const coutFerr = nFerr * (tf * costH + pf);

  // Transport (optionnel)
  const trInc = (document.getElementById('cr_include_transport')?.value || 'yes') === 'yes';
  const coutTr = trInc ? (Number(pricing?.transport?.ttc) || 0) : 0;

  // Total CR
  const total = coutMO + coutMat + coutFerr + coutTr;

  // Sortie UI
  const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
  set('cr_out_surface', `${surf.toFixed(2)} m²`);
  set('cr_out_heures',  `${heuresMO.toFixed(2)} h`);
  set('cr_out_mo',      fmtEUR(coutMO));
  set('cr_out_mat',     fmtEUR(coutMat));
  set('cr_out_f',       fmtEUR(coutFerr));
  set('cr_out_tr',      fmtEUR(coutTr));
  set('cr_out_total',   fmtEUR(total));
}

/**
 * Câblage complet : branche les inputs CR et recalcule à chaque changement
 * à partir du pricing courant (computePricing).
 */
export function wireCR(){
  initCR(() => {
    const pricing = computePricing();   // même base de calcul que l’onglet Devis
    computeCR(pricing, state);
  });
}

// On exporte aussi par défaut, pour que tabs.js puisse appeler (wireCR || default)
export default wireCR;
