// public/js/cout_de_revient/cr.js
import { state } from '../state.js';
import { PRICING } from '../devis/constants.js';
import { computePricing } from '../devis/pricing.js';

const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

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

// ---- stockage des coûts saisis par l’utilisateur (€/m²) ----
const LS_KEY = 'cr_user_costs_v1';
let userCosts = loadUserCosts(); // { key: number }

function loadUserCosts() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const out = {};
    for (const k of Object.keys(obj || {})) {
      const v = Number(obj[k]);
      if (Number.isFinite(v) && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveUserCosts() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(userCosts)); } catch {}
}

function setUserCost(key, value) {
  if (!ORDER.includes(key)) return;
  if (value === '' || value == null || !Number.isFinite(Number(value))) {
    delete userCosts[key];
  } else {
    const n = Math.max(0, Number(value));
    userCosts[key] = n;
  }
  saveUserCosts();
  renderCR(); // live update
}

// ---- logique coût de revient €/m² pour une prestation ----
function getServiceCostM2(key) {
  // 1) coût saisi par l'utilisateur -> prioritaire
  if (Number.isFinite(userCosts[key])) return userCosts[key];

  // 2) coût direct dans PRICING
  const direct = PRICING?.costs?.servicesM2?.[key];
  if (Number.isFinite(direct)) return Math.max(0, Number(direct));

  // 3) estimation via marge depuis PV/m² (TTC) si dispo
  const pvService = PRICING?.servicesTTC?.[key]; // €/m² vendu
  if (!Number.isFinite(pvService)) return null;

  const mHT  = PRICING?.margin?.htRate;
  const mTTC = PRICING?.margin?.ttcRate;
  if (Number.isFinite(mHT))  return pvService * (1 - Math.max(0, Math.min(1, mHT)));
  if (Number.isFinite(mTTC)) return pvService * (1 - Math.max(0, Math.min(1, mTTC)));

  return null; // inconnu
}

// ---- rendu du tableau de config ----
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
    input.addEventListener('input', () => setUserCost(key, input.value));
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
      saveUserCosts();
      renderCostsTable();
      renderCR();
    });
  }
}

// ---- rendu principal CR ----
function renderCR() {
  const pricing = computePricing();
  if (!pricing) return;

  const surface   = Number(pricing.totalSurface || 0);
  const totalHT   = Number(pricing?.totals?.ht || pricing?.goods?.ht || 0);
  const totalTTC  = Number(pricing?.totals?.ttc || pricing?.goods?.ttc || 0);
  const pvM2HT    = surface > 0 ? totalHT  / surface : 0;
  const pvM2TTC   = surface > 0 ? totalTTC / surface : 0;

  // bloc per-prestation
  const list = document.getElementById('cr-services-list');
  if (list) list.innerHTML = '';
  let crM2Total = 0;
  let anyUnknown = false;

  ORDER.forEach((key) => {
    const selected = !!state?.services?.[key];
    const costM2 = getServiceCostM2(key);
    const effectiveM2 = selected && Number.isFinite(costM2) ? costM2 : 0;
    crM2Total += effectiveM2;

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

  // totaux + recap latéral
  const crM2     = crM2Total;
  const crMeuble = crM2 * surface;

  const elSurface   = document.getElementById('cr-surface');
  const elCrM2      = document.getElementById('cr-m2');
  const elCrMeuble  = document.getElementById('cr-meuble');
  const elPvM2HT    = document.getElementById('pv-m2-ht');
  const elPvM2TTC   = document.getElementById('pv-m2-ttc');
  const elPvTotalHT = document.getElementById('pv-total-ht');
  const elPvTotalTTC= document.getElementById('pv-total-ttc');
  const elRent      = document.getElementById('rentabilite');
  const elHint      = document.getElementById('cr-hint');

  if (elSurface)    elSurface.textContent   = surface ? `${surface.toFixed(2)} m²` : '— m²';
  if (elCrM2)       elCrM2.textContent      = `${euro(crM2)} /m²`;
  if (elCrMeuble)   elCrMeuble.textContent  = euro(crMeuble);

  if (elPvM2HT)     elPvM2HT.textContent    = surface ? `${euro(pvM2HT)} /m²`  : '— €/m²';
  if (elPvM2TTC)    elPvM2TTC.textContent   = surface ? `${euro(pvM2TTC)} /m²` : '— €/m²';
  if (elPvTotalHT)  elPvTotalHT.textContent = euro(totalHT);
  if (elPvTotalTTC) elPvTotalTTC.textContent= euro(totalTTC);

  const rent = totalHT > 0 ? ((totalHT - crMeuble) / totalHT) * 100 : NaN;
  if (elRent) elRent.textContent = Number.isFinite(rent) ? `${rent.toFixed(1)} %` : '— %';

  if (elHint) elHint.classList.toggle('hidden', !anyUnknown);
}

// ---- init + synchronisation temps réel ----
let bound = false;
export function initCR() {
  renderCostsTable(); // construit le tableau de saisie
  renderCR();

  if (!bound) {
    bound = true;
    // en temps réel depuis Devis
    window.addEventListener('devis:changed', renderCR);
    window.addEventListener('devis:reset', () => { renderCostsTable(); renderCR(); });

    // sécurité: revenir sur #cr
    window.addEventListener('hashchange', () => {
      if ((location.hash || '#devis').slice(1) === 'cr') renderCR();
    });
  }
}
