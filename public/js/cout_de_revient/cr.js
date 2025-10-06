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

// ---- stockage des coûts saisis (€/m²) ----
const LS_KEY = 'cr_user_costs_v1';
let userCosts = loadUserCosts();
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
  } catch { return {}; }
}
function saveUserCosts() { try { localStorage.setItem(LS_KEY, JSON.stringify(userCosts)); } catch {} }
function setUserCost(key, value) {
  if (!ORDER.includes(key)) return;
  if (value === '' || value == null || !Number.isFinite(Number(value))) delete userCosts[key];
  else userCosts[key] = Math.max(0, Number(value));
  saveUserCosts();
  renderCR(); // live update
}

// ---- helpers: garantir les conteneurs même si le partial ne les a pas ----
function ensureContainers() {
  const view = document.getElementById('view');
  if (!view) return;

  // layout principal si pas de grille
  let grid = view.querySelector('[data-cr-root]');
  if (!grid) {
    grid = document.createElement('section');
    grid.setAttribute('data-cr-root', '1');
    grid.className = 'max-w-6xl mx-auto p-4 grid md:grid-cols-3 gap-6';
    view.prepend(grid);
  }

  // colonne gauche (prestations + tableau)
  let left = grid.querySelector('[data-cr-left]');
  if (!left) {
    left = document.createElement('div');
    left.setAttribute('data-cr-left', '1');
    left.className = 'md:col-span-2 space-y-6';
    grid.prepend(left);
  }

  // bloc prestations (liste)
  if (!left.querySelector('#cr-services-card')) {
    const card = document.createElement('div');
    card.id = 'cr-services-card';
    card.innerHTML = `
      <h2 class="text-xl font-semibold mb-3">Coût de revient par prestation</h2>
      <p class="text-sm text-neutral-500 mb-4">
        Montants en €/m² et €/meuble selon les prestations cochées dans Devis.
      </p>
      <div id="cr-services-list" class="space-y-2"></div>`;
    left.appendChild(card);
  }

  // carte tableau éditable
  if (!left.querySelector('#cr-config-card')) {
    const card = document.createElement('div');
    card.id = 'cr-config-card';
    card.className = 'rounded-xl border border-neutral-200 bg-white p-4';
    card.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-3">
        <h3 class="text-base font-semibold">Mes coûts de revient (€/m²)</h3>
        <button id="btn-cr-reset-costs" type="button"
          class="h-9 px-3 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-sm">Réinitialiser mes coûts</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-neutral-500">
            <tr>
              <th class="py-2 pr-3">Prestation</th>
              <th class="py-2 pr-3">Mon CR €/m²</th>
              <th class="py-2">PV €/m² (TTC)</th>
            </tr>
          </thead>
          <tbody id="cr-config-table"></tbody>
        </table>
      </div>
      <p class="text-xs text-neutral-500 mt-2">
        Saisie auto, enregistrée localement (navigateur). Laisse vide pour utiliser le coût par défaut / marge.
      </p>`;
    left.appendChild(card);
  }

  // colonne droite (récap) — si déjà dans le partial on la laisse, sinon on la crée
  if (!grid.querySelector('[data-cr-aside]')) {
    const aside = document.createElement('aside');
    aside.setAttribute('data-cr-aside', '1');
    aside.className = 'md:col-span-1';
    aside.innerHTML = `
      <div class="sticky top-20 rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <h3 class="text-base font-semibold">Récapitulatif</h3>
        <div class="text-sm text-neutral-500">Surface totale</div>
        <div id="cr-surface" class="text-lg font-semibold">— m²</div>
        <hr class="my-2">
        <div class="text-sm text-neutral-500">Coût de revient / m²</div>
        <div id="cr-m2" class="text-lg font-semibold">— €/m²</div>
        <div class="text-sm text-neutral-500 mt-2">Coût de revient / meuble</div>
        <div id="cr-meuble" class="text-lg font-semibold">— €</div>
        <hr class="my-2">
        <div class="text-sm text-neutral-500">Prix vendu / m²</div>
        <div class="text-sm">HT : <span id="pv-m2-ht" class="font-medium">— €/m²</span></div>
        <div class="text-sm">TTC : <span id="pv-m2-ttc" class="font-medium">— €/m²</span></div>
        <div class="text-sm text-neutral-500 mt-2">Prix vendu total</div>
        <div class="text-sm">HT : <span id="pv-total-ht" class="font-medium">— €</span></div>
        <div class="text-sm">TTC : <span id="pv-total-ttc" class="font-medium">— €</span></div>
        <hr class="my-2">
        <div class="text-sm text-neutral-500">Rentabilité (sur HT)</div>
        <div id="rentabilite" class="text-lg font-semibold">— %</div>
        <p id="cr-hint" class="text-xs text-neutral-500 mt-2 hidden">
          Astuce : définis <code>PRICING.costs.servicesM2</code> ou une <code>PRICING.margin</code> pour l’estimation par défaut.
        </p>
      </div>`;
    grid.appendChild(aside);
  }
}

// ---- coût de revient €/m² pour une prestation ----
function getServiceCostM2(key) {
  // 1) coût saisi par l'utilisateur -> prioritaire
  if (Number.isFinite(userCosts[key])) return userCosts[key];

  // 2) coût direct dans PRICING
  const direct = PRICING?.costs?.servicesM2?.[key];
  if (Number.isFinite(direct)) return Math.max(0, Number(direct));

  // 3) estimation via marge depuis PV/m² (TTC) si dispo
  const pvService = PRICING?.servicesTTC?.[key];
  if (!Number.isFinite(pvService)) return null;

  const mHT  = PRICING?.margin?.htRate;
  const mTTC = PRICING?.margin?.ttcRate;
  if (Number.isFinite(mHT))  return pvService * (1 - Math.max(0, Math.min(1, mHT)));
  if (Number.isFinite(mTTC)) return pvService * (1 - Math.max(0, Math.min(1, mTTC)));

  return null;
}

// ---- rendu du tableau de saisie ----
function renderCostsTable() {
  ensureContainers();
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

// ---- rendu principal (prestations + recap) ----
function renderCR() {
  ensureContainers();

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
  ensureContainers();
  renderCostsTable();
  renderCR();

  if (!bound) {
    bound = true;
    window.addEventListener('devis:changed', renderCR);
    window.addEventListener('devis:reset', () => { renderCostsTable(); renderCR(); });
    window.addEventListener('hashchange', () => {
      if ((location.hash || '#devis').slice(1) === 'cr') renderCR();
    });
  }
}
