// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { PRICING } from '../devis/constants.js';
import { computePricing } from '../devis/pricing.js';
import { loadConfig, updateConfig, applyConfig, exportConfig, importConfig } from '../config.js';

const euro = (n) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const TARGET_RATE = 50;

const ORDER = () => (PRICING.meta?.services || []).map(s => s.key);
const LABEL = (k) => (PRICING.meta?.services?.find(s => s.key === k)?.label || k);

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    .slice(0,40) || 'srv';
}
function uniqueKey(baseKey) {
  const existing = new Set((loadConfig().services || []).map(s => s.key));
  if (!existing.has(baseKey)) return baseKey;
  let i = 2;
  while (existing.has(`${baseKey}-${i}`)) i++;
  return `${baseKey}-${i}`;
}

/* ------------ TABLEAU ADMIN PRESTATIONS (PV éditable, suppression) ------------ */
function renderAdminServices() {
  const cfg = loadConfig();
  const tbody = document.getElementById('adm-services-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  (cfg.services || []).forEach((row, idx) => {
    const tr = document.createElement('tr');

    // Libellé (éditable)
    const tdLabel = document.createElement('td');
    tdLabel.className = 'py-2 pr-3';
    const inLabel = document.createElement('input');
    inLabel.type = 'text';
    inLabel.className = 'w-56 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    inLabel.value = row.label || row.key;
    inLabel.addEventListener('input', () => {
      updateConfig(c => { c.services[idx].label = inLabel.value || row.key; });
      // Devis reconstruit ses cases via event
    });
    tdLabel.appendChild(inLabel);

    // Clé (ro)
    const tdKey = document.createElement('td');
    tdKey.className = 'py-2 pr-3 text-neutral-500';
    tdKey.textContent = row.key;

    // PV €/m² TTC (éditable)
    const tdPV = document.createElement('td');
    tdPV.className = 'py-2 pr-3';
    const inPV = document.createElement('input');
    inPV.type = 'number'; inPV.min='0'; inPV.step='0.01'; inPV.inputMode='decimal';
    inPV.className = 'w-28 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    inPV.value = Number.isFinite(row.pvTTC) ? String(row.pvTTC) : '';
    inPV.addEventListener('input', () => {
      const v = Number(inPV.value);
      updateConfig(c => { c.services[idx].pvTTC = Number.isFinite(v) && v >= 0 ? v : 0; });
      renderAllNumbers(); // reflète PV dans le récap
    });
    tdPV.appendChild(inPV);

    // CR €/m² (éditable)
    const tdCR = document.createElement('td');
    tdCR.className = 'py-2 pr-3';
    const inCR = document.createElement('input');
    inCR.type = 'number'; inCR.min='0'; inCR.step='0.01'; inCR.inputMode='decimal';
    inCR.className = 'w-28 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    const crVal = (cfg.costsM2 || {})[row.key];
    inCR.value = Number.isFinite(crVal) ? String(crVal) : '';
    inCR.addEventListener('input', () => {
      const v = Number(inCR.value);
      updateConfig(c => {
        c.costsM2 = c.costsM2 || {};
        if (!Number.isFinite(v)) delete c.costsM2[row.key];
        else c.costsM2[row.key] = Math.max(0, v);
      });
      renderCostsTable();
      renderAllNumbers();
    });
    tdCR.appendChild(inCR);

    // Action (supprimer)
    const tdAct = document.createElement('td');
    tdAct.className = 'py-2';
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'h-8 px-3 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50';
    btnDel.textContent = 'Supprimer';
    btnDel.addEventListener('click', () => {
      if (!confirm(`Supprimer la prestation « ${row.label || row.key} » ?`)) return;
      updateConfig(c => {
        c.services.splice(idx, 1);           // retire du catalogue
        if (c.costsM2) delete c.costsM2[row.key]; // nettoie CR m² personnalisé
      });
      // si cochée côté devis, on décoche
      try { delete state.services?.[row.key]; } catch {}
      renderAdminServices();
      renderCostsTable();
      renderAllNumbers();
    });
    tdAct.appendChild(btnDel);

    tr.append(tdLabel, tdKey, tdPV, tdCR, tdAct);
    tbody.appendChild(tr);
  });

  // Ajouter (clé unique + focus)
  const btnAdd = document.getElementById('adm-add');
  if (btnAdd && !btnAdd.__bound) {
    btnAdd.__bound = true;
    btnAdd.addEventListener('click', () => {
      const label = prompt('Libellé de la prestation ?');
      if (!label) return;
      const base = slugify(label);
      const key = uniqueKey(base);
      updateConfig(c => { (c.services ||= []).push({ key, label, pvTTC: 0 }); });
      renderAdminServices();
      renderCostsTable();
      renderAllNumbers();
      // focus sur la dernière ligne ajoutée
      const last = document.querySelector('#adm-services-body tr:last-child input[type="text"]');
      last?.focus();
    });
  }

  // Export / Import
  const btnExp = document.getElementById('adm-export');
  if (btnExp && !btnExp.__bound) {
    btnExp.__bound = true;
    btnExp.addEventListener('click', exportConfig);
  }
  const inpImp = document.getElementById('adm-import');
  if (inpImp && !inpImp.__bound) {
    inpImp.__bound = true;
    inpImp.addEventListener('change', async () => {
      const f = inpImp.files?.[0];
      if (!f) return;
      await importConfig(f);
      renderAdminServices();
      renderCostsTable();
      renderAllNumbers();
      inpImp.value = '';
    });
  }
}

/* ------------ Mini tableau CR €/m² (lecture/édition) ------------ */
function renderCostsTable() {
  const cfg = loadConfig();
  const tbody = document.getElementById('cr-config-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  (cfg.services || []).forEach((s) => {
    const tr = document.createElement('tr');

    const tdLabel = document.createElement('td');
    tdLabel.className = 'py-2 pr-3';
    tdLabel.textContent = s.label || s.key;

    const tdCR = document.createElement('td');
    tdCR.className = 'py-2 pr-3';
    const input = document.createElement('input');
    input.type = 'number'; input.min='0'; input.step='0.01'; input.inputMode='decimal';
    input.className = 'w-28 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    const crVal = (cfg.costsM2 || {})[s.key];
    input.value = Number.isFinite(crVal) ? String(crVal) : '';
    input.addEventListener('input', () => {
      const v = Number(input.value);
      updateConfig(c => {
        c.costsM2 = c.costsM2 || {};
        if (!Number.isFinite(v)) delete c.costsM2[s.key];
        else c.costsM2[s.key] = Math.max(0, v);
      });
      renderAllNumbers();
    });
    tdCR.appendChild(input);

    const tdPV = document.createElement('td');
    tdPV.className = 'py-2';
    tdPV.textContent = `${euro(s.pvTTC || 0)} /m²`;

    tr.append(tdLabel, tdCR, tdPV);
    tbody.appendChild(tr);
  });

  const resetBtn = document.getElementById('btn-cr-reset-costs');
  if (resetBtn && !resetBtn.__bound) {
    resetBtn.__bound = true;
    resetBtn.addEventListener('click', () => {
      updateConfig(c => { c.costsM2 = {}; });
      renderCostsTable();
      renderAllNumbers();
    });
  }
}

/* ------------ Récap / chiffres ------------ */
function formatHours(t){ if(!Number.isFinite(t)||t<=0) return '0 h'; const h=Math.floor(t),m=Math.floor((t-h)*60);return m?`${h} h ${m} min`:`${h} h`; }

function renderServicesAndRecap() {
  const pricing = computePricing();
  if (!pricing) return;

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht || pricing?.goods?.ht || 0);
  const totalTTC  = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);
  const pvM2HT    = surface>0 ? totalHT/surface : 0;
  const pvM2TTC   = surface>0 ? totalTTC/surface : 0;

  const list = document.getElementById('cr-services-list');
  if (list) list.innerHTML = '';
  let crM2FromServices = 0;

  ORDER().forEach((key) => {
    const selected = !!state?.services?.[key];
    const costM2   = PRICING.costs?.servicesM2?.[key];
    const effM2    = (selected && Number.isFinite(costM2)) ? costM2 : 0;
    crM2FromServices += effM2;

    const row = document.createElement('div');
    row.className = `flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${
      selected ? 'border-neutral-200 bg-white' : 'border-neutral-200/60 bg-neutral-50 text-neutral-500'
    }`;
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-block h-2.5 w-2.5 rounded-full ${selected ? 'bg-emerald-500' : 'bg-neutral-300'}"></span>
        <span>${LABEL(key)}</span>
      </div>
      <div class="text-right text-sm">
        <div>${Number.isFinite(costM2) ? euro(costM2)+' /m²' : '— €/m²'}</div>
        <div>${Number.isFinite(costM2) ? euro((costM2||0)*(surface||0))+' /meuble' : '— € /meuble'}</div>
      </div>`;
    list?.appendChild(row);
  });

  const crM2     = crM2FromServices;
  const crMeuble = crM2 * surface;

  const elSurface   = document.getElementById('cr-surface');
  const elCrM2      = document.getElementById('cr-m2');
  const elCrMeuble  = document.getElementById('cr-meuble');
  const elPvM2HT    = document.getElementById('pv-m2-ht');
  const elPvM2TTC   = document.getElementById('pv-m2-ttc');
  const elPvTotalHT = document.getElementById('pv-total-ht');
  const elPvTotalTTC= document.getElementById('pv-total-ttc');
  const elRent      = document.getElementById('rentabilite');
  const elTmax      = document.getElementById('cr-tmax');

  if (elSurface)    elSurface.textContent   = surface ? `${surface.toFixed(2)} m²` : '— m²';
  if (elCrM2)       elCrM2.textContent      = `${euro(crM2)} /m²`;
  if (elCrMeuble)   elCrMeuble.textContent  = euro(crMeuble);
  if (elPvM2HT)     elPvM2HT.textContent    = surface ? `${euro(pvM2HT)} /m²` : '— €/m²';
  if (elPvM2TTC)    elPvM2TTC.textContent   = surface ? `${euro(pvM2TTC)} /m²` : '— €/m²';
  if (elPvTotalHT)  elPvTotalHT.textContent = euro(totalHT);
  if (elPvTotalTTC) elPvTotalTTC.textContent= euro(totalTTC);

  const rent = totalHT>0 ? ((totalHT - crMeuble)/totalHT)*100 : NaN;
  if (elRent) elRent.textContent = Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %';

  const tmax = TARGET_RATE>0 ? (totalHT - crMeuble)/TARGET_RATE : 0;
  if (elTmax) elTmax.textContent = formatHours(tmax);
}

function renderAllNumbers(){ renderServicesAndRecap(); }

export function initCR() {
  // applique la config au chargement
  applyConfig(loadConfig());

  renderAdminServices();
  renderCostsTable();
  renderAllNumbers();

  // sync live
  window.addEventListener('devis:changed', renderAllNumbers);
  window.addEventListener('devis:reset', renderAllNumbers);
  window.addEventListener('admin:services-updated', renderAllNumbers);
  window.addEventListener('admin:pricing-updated', renderAllNumbers);
  window.addEventListener('admin:transport-updated', renderAllNumbers);

  // bind transport inputs
  const cfg = loadConfig();
  const elAdr = document.getElementById('adm-origin');
  const elKm  = document.getElementById('adm-km-rate');

  if (elAdr && !elAdr.__bound) {
    elAdr.__bound = true;
    elAdr.value = cfg.transport?.baseAddress || '';
    elAdr.addEventListener('input', () => {
      updateConfig(c => { c.transport.baseAddress = elAdr.value || ''; });
    });
  }
  if (elKm && !elKm.__bound) {
    elKm.__bound = true;
    elKm.value = cfg.transport?.kmRate ? String(cfg.transport.kmRate) : '';
    elKm.addEventListener('input', () => {
      const v = Number(elKm.value);
      updateConfig(c => { c.transport.kmRate = Number.isFinite(v) && v >= 0 ? v : 0; });
    });
  }
}
