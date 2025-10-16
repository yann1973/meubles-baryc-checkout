// public/js/loader/partials.js
const HTML_CACHE = new Map();

export async function getPartial(name) {
  if (HTML_CACHE.has(name)) return HTML_CACHE.get(name);
  const url = `/partials/${encodeURIComponent(name)}.html`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de charger ${url} — HTTP ${res.status}`);
  const txt = await res.text();
  HTML_CACHE.set(name, txt);
  return txt;
}

/** Affiche une erreur via partial error.html si présent, sinon texte brut */
export async function showErr(container, title, err) {
  const msg = (err && err.message) || String(err || 'Erreur inconnue');
  try {
    const html = await getPartial('error');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.body.firstElementChild || document.createElement('div');
    const t = root.querySelector('[data-slot="title"]');
    const m = root.querySelector('[data-slot="message"]');
    if (t) t.textContent = title;
    if (m) m.textContent = msg;
    container.replaceChildren(root);
  } catch {
    container.textContent = `${title} — ${msg}`;
  }
}
