// public/js/devis/ui/buildServices.js
import { PRICING } from '/js/devis/constants.js';
import { state } from '/js/state.js';
import { euro } from '/js/common/dom.js';
import { recompute } from './recompute.js';

export function buildServicesM2() {
  const host = document.getElementById('servicesM2');
  if (!host) return;
  host.innerHTML = '';

  const list = Array.isArray(PRICING.meta?.services)
    ? PRICING.meta.services
    : Object.keys(PRICING.servicesTTC || {}).map(key => ({ key, label: key }));

  list.forEach(({ key, label }) => {
    const price = PRICING?.servicesTTC?.[key] ?? 0;

    const wrap = document.createElement('label');
    wrap.className = 'flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-neutral-200';

    const span = document.createElement('span');
    span.textContent = `${label || key} (${euro(price)}/m²)`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'w-4 h-4';
    input.dataset.key = key;
    input.checked = !!state.services[key];

    input.addEventListener('change', () => {
      state.services[key] = !!input.checked;
      recompute();
    });

    wrap.append(span, input);
    host.appendChild(wrap);
  });
}
