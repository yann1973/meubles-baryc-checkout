// public/js/utils.js

// ——— Formatters mis en cache (perf) ———
const EUR_FMT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const NF_CACHE = new Map();

// € format
export function fmtEUR(n) {
  return EUR_FMT.format(isFiniteNumber(n) ? n : 0);
}

// Nombre générique avec min/max décimales (cache par couple min|max)
export function fmtNumber(n, { min = 2, max = 2 } = {}) {
  const mi = clamp(min, 0, 20);
  const ma = clamp(Math.max(mi, max), 0, 20);
  const key = mi + '|' + ma;

  let nf = NF_CACHE.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: mi,
      maximumFractionDigits: ma,
    });
    NF_CACHE.set(key, nf);
  }
  return nf.format(isFiniteNumber(n) ? n : 0);
}

// Coercition robuste (gère virgule française, espaces)
export function toN(v, def = 0) {
  if (v === '' || v == null) return def;
  if (typeof v === 'number') return Number.isFinite(v) ? v : def;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}

// Conversion TTC -> HT
export function toHT(ttc, tva = 0.2) {
  const ratio = 1 + toN(tva, 0);
  return ratio > 0 ? toN(ttc, 0) / ratio : 0;
}

// Arrondi au pas supérieur (ex: 0.05)
export function roundUpToStep(val, step) {
  const v = Math.max(0, toN(val, 0));
  const s = Math.max(0, toN(step, 0.000001));
  if (v === 0) return 0;
  const dp = decimals(s);
  const m = Math.ceil((v / s) - 1e-12);
  return +((m * s).toFixed(dp));
}

// S = 2×(L×H) + (L×P) + 2×(P×H)  (P = profondeur = W)
export function surfaceM2(L, W, H) {
  const l = Math.max(0, toN(L, 0));
  const w = Math.max(0, toN(W, 0));
  const h = Math.max(0, toN(H, 0));
  return (2 * (l * h)) + (l * w) + (2 * (w * h));
}

// Surface traitée arrondie au 0.05 m² supérieur
export function treatedSurface(L, W, H) {
  return roundUpToStep(surfaceM2(L, W, H), 0.05);
}

// ——— Helpers ———
export function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

export function clamp(n, min, max) {
  n = toN(n, 0);
  return Math.min(max, Math.max(min, n));
}

function decimals(x) {
  const s = String(x);
  const i = s.indexOf('.');
  return i === -1 ? 0 : (s.length - i - 1);
}

// Debounce simple pour inputs (perf UX)
export function debounce(fn, delay = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
