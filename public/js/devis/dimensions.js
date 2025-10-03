// public/js/devis/dimensions.js
import { state } from '../state.js';
import { treatedSurface } from '../utils.js';

export function initDimensions(onChange){
  const L=document.getElementById('longueur');
  const W=document.getElementById('largeur');
  const H=document.getElementById('hauteur');

  const set = (inp, key) => {
    if (!inp) return;
    inp.addEventListener('input', ()=>{
      const v = inp.value;
      state[key] = (v===''?0:parseFloat(v));
      updateSurface();
      onChange && onChange();
    });
    inp.addEventListener('blur', ()=>{
      if (inp.value===''){ inp.value='0'; inp.dispatchEvent(new Event('input')); }
    });
  };

  function updateSurface(){
    const s = treatedSurface(state.L, state.W, state.H);
    const el = document.getElementById('surfaceDisplay');
    if (el) el.textContent = `${s.toFixed(2)} m²`;
  }

  set(L,'L'); set(W,'W'); set(H,'H');
  updateSurface();
}
