function n(id){ return Number(document.getElementById(id)?.value||0); }
function fmt(n,d=2){ return n.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}); }

export function initCH(){
  const ids=['ch_heuresFacturablesMois','ch_tauxNonProductif','ch_loyer','ch_eauElec','ch_assurances','ch_internetSite','ch_comptable','ch_carburant','ch_mensualitePret','ch_amortissementsMensuels','ch_autresFixes','ch_salaireNetSouhaite','ch_chargesSocialesPct','ch_coeffNetToBrut','ch_consommablesHeure','ch_entretienHeure'];
  ids.forEach(id=>{ const el=document.getElementById(id); el && el.addEventListener('input', renderCH); });
}
export function renderCH(){
  const hFact = n('ch_heuresFacturablesMois');
  const nonProd = n('ch_tauxNonProductif');
  const coutsFixesMensuels = n('ch_loyer')+n('ch_eauElec')+n('ch_assurances')+n('ch_internetSite')+n('ch_comptable')+n('ch_carburant')+n('ch_mensualitePret')+n('ch_amortissementsMensuels')+n('ch_autresFixes');
  const salaireBrut = n('ch_salaireNetSouhaite') * (n('ch_coeffNetToBrut')||1);
  const coutEmployeur = salaireBrut * (1 + n('ch_chargesSocialesPct')/100);
  const heuresProductives = hFact * (1 - nonProd/100);
  const chargesMensuellesTotales = coutsFixesMensuels + coutEmployeur;
  const coutFixeParHeure = heuresProductives>0 ? chargesMensuellesTotales/heuresProductives : 0;
  const varH = n('ch_consommablesHeure') + n('ch_entretienHeure');
  const crh = coutFixeParHeure + varH;

  set('ch_out_heuresProductives', fmt(heuresProductives,1)+' h');
  set('ch_out_coutsFixes', fmt(coutsFixesMensuels)+' €');
  set('ch_out_coutEmployeur', fmt(coutEmployeur)+' €');
  set('ch_out_chargesTotales', fmt(chargesMensuellesTotales)+' €');
  set('ch_out_coutFixeH', fmt(coutFixeParHeure)+' €');
  set('ch_out_varH', fmt(varH)+' €');
  set('ch_out_crh', fmt(crh)+' €');
}
function set(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }
