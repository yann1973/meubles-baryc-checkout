// public/js/loader/binds.js
/** Lie les entrées du formulaire pour mettre à jour `state` puis appeler `rerender()` */
export function bindLiveRerender(rerender, state) {
  const main = document.getElementById('view-main');
  if (!main) return;

  // Prestations (checkboxes)
  const servicesBox = document.getElementById('servicesM2');
  if (servicesBox && !servicesBox.__bound) {
    servicesBox.__bound = true;
    servicesBox.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.matches('input[type="checkbox"][data-key]')) {
        const key = t.getAttribute('data-key');
        if (!state.services) state.services = {};
        state.services[key] = !!t.checked;
        rerender();
      }
    });
  }

  // Helpers numériques
  const num = (v) => {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const set = (obj, k, v) => { if (obj) obj[k] = v; };

  // Dimensions (m)
  const L = document.getElementById('longueur');
  const W = document.getElementById('largeur');
  const H = document.getElementById('hauteur');

  const bindNum = (el, k) => {
    if (!el || el.__bound) return;
    el.__bound = true;
    const upd = () => { set(state, k, num(el.value)); rerender(); };
    el.addEventListener('input', upd);
    el.addEventListener('change', upd);
  };
  bindNum(L, 'L');
  bindNum(W, 'W');
  bindNum(H, 'H');

  // Ferrures (pièces)
  if (!state.pieceCounts) state.pieceCounts = {};
  const fChange = document.getElementById('f_change');
  const fPolish = document.getElementById('f_polish');

  const bindInt = (el, key) => {
    if (!el || el.__bound) return;
    el.__bound = true;
    const upd = () => {
      state.pieceCounts[key] = Math.max(0, parseInt(el.value || '0', 10) || 0);
      rerender();
    };
    el.addEventListener('input', upd);
    el.addEventListener('change', upd);
  };
  bindInt(fChange, 'ferrures_change');
  bindInt(fPolish, 'ferrures_polissage');

  // Distance manuelle / mode transport
  if (!state.transport) state.transport = { mode: 'client', distanceKm: 0, pickKm: 0, dropKm: 0 };
  const manualToggle  = document.getElementById('manualDistanceToggle');
  const distanceInput = document.getElementById('distanceManual');

  if (manualToggle && !manualToggle.__bound) {
    manualToggle.__bound = true;
    manualToggle.addEventListener('change', () => {
      if (manualToggle.checked) {
        state.transport.mode = 'baryc';
        state.transport.distanceKm = num(distanceInput?.value || 0);
      }
      // sinon, Google recalculera via maps.js
      rerender();
    });
  }

  if (distanceInput && !distanceInput.__bound) {
    distanceInput.__bound = true;
    const upd = () => {
      state.transport.mode = 'baryc';
      state.transport.distanceKm = num(distanceInput.value || 0);
      rerender();
    };
    distanceInput.addEventListener('input', upd);
    distanceInput.addEventListener('change', upd);
  }

  // Délégation générique : tout élément avec data-recompute="1"
  if (!main.__recomputeBound) {
    main.__recomputeBound = true;
    const maybe = (e) => { const t = e.target; if (t?.dataset?.recompute === '1') rerender(); };
    main.addEventListener('input', maybe);
    main.addEventListener('change', maybe);
  }
}
