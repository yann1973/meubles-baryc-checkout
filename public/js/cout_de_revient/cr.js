// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { PRICING } from '../devis/constants.js';
import { computePricing } from '../devis/pricing.js';

const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const TARGET_RATE = 50; // objectif mini 50 € HT/h

const ORDER = ['poncage','aerogommage','peinture1','peinture2','teinte','vernis','consommables'];
const LABELS = {
  poncage: 'Ponçage de finition',
  aerogommage: 'Aérogommage',
  peinture1: 'Peinture 1 couleur',
  peinture2: 'Peinture 2 couleurs',
  teinte: 'Teinte',
  vernis: 'Vernis',
  consommables: 'Consommables',
};

// ---- stockage local ----
const LS_COSTS = 'cr_user_costs_v1';              // { prestation: €/m² }
const LS_HOURLY = 'cr_user_hourly_v1';            // nombre (€/h)
const LS_FERR = 'cr_user_ferrures_v1';            // { polissage: €/pièce, remplacement: €/pièce }

let userCosts = loadJSON(LS_COSTS, {});
let hourlyRate = Number(loadJSON(LS_HOURLY, 0)) || 0;
let ferrures = loadJSON(LS_FERR, { polissage: 0, remplacement: 0 });

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// helpers
function formatHours(t) {
  if (!Number.isFinite(t) || t <= 0) return '0 h';
  const h = Math.floor(t);
  const m = Math.floor((t - h) * 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

// ---- coût de revient €/m² pour une prestation ----
function getServiceCostM2(key) {
  // 1) TES coûts saisis -> priorité
  if (Number.isFinite(userCosts[key])) return Math.max(0, Number(userCosts[key]));

  // 2) coût direct configuré
  const direct = PRICING?.costs?.servicesM2?.[key];
  if (Number.isFinite(direct)) return Math.max(0, Number(direct));

  // 3) fallback: estimation via marge depuis PV/m² (TTC)
  const pvService = PRICING?.servicesTTC?.[key];
  if (!Number.isFinite(pvService)) return null;

  const mHT  = PRICING?.margin?.htRate;
  const mTTC = PRICING?.margin?.ttcRate;
  if (Number.isFinite(mHT))  return pvService * (1 - Math.max(0, Math.min(1, mHT)));
  if (Number.isFinite(mTTC)) return pvService * (1 - Math.max(0, Math.min(1, mTTC)));

  return null;
}

// ---- rendu : tableau editable (€/m²) ----
function renderCostsTable() {
  const tbody = document.getElementById('cr-config-table');
  if (!tbody) return;

  tbody.innerHTML = '';
  ORDER.forEach((key) => {
    const tr = document.createElement('tr');

    const tdLabel = document.createElement('td');
    tdLabel.className = 'py-2 pr-3';
    tdLabel.textContent = LABELS[key] || key;

    const tdInput = document.createElement('td');
    tdInput.className = 'py-2 pr-3';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.inputMode = 'decimal';
    input.className = 'w-32 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    input.value = Number.isFinite(userCosts[key]) ? String(userCosts[key]) : '';
    input.placeholder = (() => {
      const d = PRICING?.costs?.servicesM2?.[key];
      if (Number.isFinite(d)) return String(d);
      const pv = PRICING?.servicesTTC?.[key];
      return Number.isFinite(pv) ? `~${(pv * 0.7).toFixed(2)}` : '';
    })();
    input.addEventListener('input', () => {
      const v = input.value;
      if (v === '' || v == null || !Number.isFinite(Number(v))) delete userCosts[key];
      else userCosts[key] = Math.max(0, Number(v));
      saveJSON(LS_COSTS, userCosts);
      renderAll(); // live update
    });
    tdInput.appendChild(input);

    const tdPV = document.createElement('td');
    tdPV.className = 'py-2';
    const pv = PRICING?.servicesTTC?.[key];
    tdPV.textContent = Number.isFinite(pv) ? `${euro(pv)} /m²` : '—';

    tr.append(tdLabel, tdInput, tdPV);
    tbody.appendChild(tr);
  });

  const resetBtn = document.getElementById('btn-cr-reset-costs');
  if (resetBtn && !resetBtn.__bound) {
    resetBtn.__bound = true;
    resetBtn.addEventListener('click', () => {
      userCosts = {};
      saveJSON(LS_COSTS, userCosts);
      renderCostsTable();
      renderAll();
    });
  }
}

// ---- bind : MO & ferrures ----
function bindMoFerrures() {
  const elHr  = document.getElementById('cr-hourly-rate');
  const elPol = document.getElementById('cr-cost-ferrures-polissage');
  const elRem = document.getElementById('cr-cost-ferrures-remplacement');

  if (elHr && !elHr.__bound) {
    elHr.__bound = true;
    elHr.value = hourlyRate ? String(hourlyRate) : '';
    elHr.addEventListener('input', () => {
      const v = Number(elHr.value);
      hourlyRate = Number.isFinite(v) && v >= 0 ? v : 0;
      saveJSON(LS_HOURLY, hourlyRate);
      renderAll();
    });
  }

  if (elPol && !elPol.__bound) {
    elPol.__bound = true;
    elPol.value = Number.isFinite(ferrures.polissage) && ferrures.polissage > 0 ? String(ferrures.polissage) : '';
    elPol.addEventListener('input', () => {
      const v = Number(elPol.value);
      ferrures.polissage = Number.isFinite(v) && v >= 0 ? v : 0;
      saveJSON(LS_FERR, ferrures);
      renderAll();
    });
  }

  if (elRem && !elRem.__bound) {
    elRem.__bound = true;
    elRem.value = Number.isFinite(ferrures.remplacement) && ferrures.remplacement > 0 ? String(ferrures.remplacement) : '';
    elRem.addEventListener('input', () => {
      const v = Number(elRem.value);
      ferrures.remplacement = Number.isFinite(v) && v >= 0 ? v : 0;
      saveJSON(LS_FERR, ferrures);
      renderAll();
    });
  }
}

// ---- rendu : prestations + recap + temps max ----
function renderServicesAndRecap() {
  const pricing = computePricing();
  if (!pricing) return;

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht || pricing?.goods?.ht || 0);
  const totalTTC  = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);
  const pvM2HT    = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC   = surface > 0 ? totalTTC / surface : 0;

  const list = document.getElementById('cr-services-list');
  if (list) list.innerHTML = '';

  let crM2FromServices = 0;
  let anyUnknown = false;

  ORDER.forEach((key) => {
    const selected   = !!state?.services?.[key];
    const costM2     = getServiceCostM2(key); // peut être null
    const effectiveM2= selected && Number.isFinite(costM2) ? costM2 : 0;
    crM2FromServices += effectiveM2;

    const costMeuble = effectiveM2 * surface;

    const row = document.createElement('div');
    row.className = `flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${
      selected ? 'border-neutral-200 bg-white' : 'border-neutral-200/60 bg-neutral-50 text-neutral-500'
    }`;

    const left = document.createElement('div');
    left.className = 'flex items-center gap-2';
    const dot = document.createElement('span');
    dot.className = `inline-block h-2.5 w-2.5 rounded-full ${selected ? 'bg-emerald-500' : 'bg-neutral-300'}`;
    const label = document.createElement('span');
    label.textContent = LABELS[key] || key;
    left.append(dot, label);

    const right = document.createElement('div');
    right.className = 'text-right text-sm';
    const l1 = document.createElement('div');
    const l2 = document.createElement('div');

    if (Number.isFinite(costM2)) {
      l1.textContent = `${euro(costM2)} /m²`;
      l2.textContent = `${euro(costMeuble)} /meuble`;
    } else {
      l1.textContent = '— €/m²';
      l2.textContent = '— € /meuble';
      if (selected) anyUnknown = true;
    }

    right.append(l1, l2);
    row.append(left, right);
    list?.appendChild(row);
  });

  // --- ferrures (quantités depuis Devis) ---
  const qRem = Number(state?.pieceCounts?.ferrures_change || 0);
  const qPol = Number(state?.pieceCounts?.ferrures_polissage || 0);
  const cRem = Number(ferrures.remplacement || 0);
  const cPol = Number(ferrures.polissage || 0);
  const ferruresTotal = (qRem * cRem) + (qPol * cPol);

  // CR total fixe (hors temps) :
  //  - part m² (prestations cochées) + part ferrures
  const crM2_includingFerr = surface > 0 ? (crM2FromServices * surface + ferruresTotal) / surface : crM2FromServices;
  const crMeuble = (crM2FromServices * surface) + ferruresTotal;

  // Récap latéral
  const elSurface   = document.getElementById('cr-surface');
  const elCrM2      = document.getElementById('cr-m2');
  const elCrMeuble  = document.getElementById('cr-meuble');
  const elPvM2HT    = document.getElementById('pv-m2-ht');
  const elPvM2TTC   = document.getElementById('pv-m2-ttc');
  const elPvTotalHT = document.getElementById('pv-total-ht');
  const elPvTotalTTC= document.getElementById('pv-total-ttc');
  const elRent      = document.getElementById('rentabilite');
  const elHint      = document.getElementById('cr-hint');
  const elTmax      = document.getElementById('cr-tmax');

  if (elSurface)    elSurface.textContent   = surface ? `${surface.toFixed(2)} m²` : '— m²';
  if (elCrM2)       elCrM2.textContent      = `${euro(crM2_includingFerr)} /m²`;
  if (elCrMeuble)   elCrMeuble.textContent  = euro(crMeuble);
  if (elPvM2HT)     elPvM2HT.textContent    = surface ? `${euro(pvM2HT)} /m²`  : '— €/m²';
  if (elPvM2TTC)    elPvM2TTC.textContent   = surface ? `${euro(pvM2TTC)} /m²` : '— €/m²';
  if (elPvTotalHT)  elPvTotalHT.textContent = euro(totalHT);
  if (elPvTotalTTC) elPvTotalTTC.textContent= euro(totalTTC);

  // Rentabilité % (sur HT) — hors temps (car inconnu)
  const rent = totalHT > 0 ? ((totalHT - crMeuble) / totalHT) * 100 : NaN;
  if (elRent) elRent.textContent = Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %';

  // Temps max pour >= 50 €/h (HT), avec coût horaire saisi
  // t_max = (PV_HT_total − CR_fixe) / (TARGET_RATE + hourlyRate)
  const denom = TARGET_RATE + (Number(hourlyRate) || 0);
  const tmax = denom > 0 ? (totalHT - crMeuble) / denom : 0;
  if (elTmax) elTmax.textContent = formatHours(tmax);

  if (elHint) elHint.classList.toggle('hidden', true /* on masque par défaut */);
}

// orchestrateur
function renderAll() {
  renderCostsTable();
  bindMoFerrures();
  renderServicesAndRecap();
}

// ---- init + synchro temps réel ----
let bound = false;
export function initCR() {
  renderAll();

  if (!bound) {
    bound = true;
    // Devis -> CR en temps réel
    window.addEventListener('devis:changed', renderAll);
    window.addEventListener('devis:reset', renderAll);

    // sécurité : re-render si on revient sur #cr
    window.addEventListener('hashchange', () => {
      if ((location.hash || '#devis').slice(1) === 'cr') renderAll();
    });
  }
}
