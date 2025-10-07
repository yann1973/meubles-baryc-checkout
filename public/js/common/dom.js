// public/js/common/dom.js
export const $ = (id) => document.getElementById(id);
export const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(Number(n) || 0);

export function formatHours(t) {
  if (!Number.isFinite(t) || t <= 0) return '0 h';
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
