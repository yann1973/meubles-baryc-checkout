// public/js/cout_de_revient/admin/servicesTable.js
import { loadConfig, updateConfig } from '/js/config/index.js';
import { state } from '/js/state.js';
import { renderAllNumbers } from '../recap.js';

const slug = (s)=> (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40) || 'srv';
const uniq = (key, set)=>{ if(!set.has(key)) return key; let i=2; while(set.has(`${key}-${i}`)) i++; return `${key}-${i}`; };

export function renderServicesAdmin(){
  const cfg = loadConfig();
  const tbody = document.getElementById('adm-services-body'); if(!tbody) return;
  tbody.innerHTML = '';

  (cfg.services || []).forEach((row, idx) => {
    const tr = document.createElement('tr');

    const tdLabel = document.createElement('td'); tdLabel.className='py-2 pr-3';
    const inLabel = document.createElement('input'); inLabel.type='text';
    inLabel.className='w-56 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    inLabel.value=row.label || row.key;
    inLabel.addEventListener('input', ()=> updateConfig(c => { c.services[idx].label = inLabel.value || row.key; }));
    tdLabel.appendChild(inLabel);

    const tdKey = document.createElement('td'); tdKey.className='py-2 pr-3 text-neutral-500';
    tdKey.textContent = row.key;

    const tdPV = document.createElement('td'); tdPV.className='py-2 pr-3';
    const inPV = document.createElement('input'); inPV.type='number'; inPV.min='0'; inPV.step='0.01'; inPV.inputMode='decimal';
    inPV.className='w-28 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    inPV.value = Number.isFinite(row.pvTTC) ? String(row.pvTTC) : '';
    inPV.addEventListener('input', ()=>{
      const v = Number(inPV.value);
      updateConfig(c => { c.services[idx].pvTTC = Number.isFinite(v)&&v>=0 ? v : 0; });
      renderAllNumbers();
    });
    tdPV.appendChild(inPV);

    const tdCR = document.createElement('td'); tdCR.className='py-2 pr-3';
    const inCR = document.createElement('input'); inCR.type='number'; inCR.min='0'; inCR.step='0.01'; inCR.inputMode='decimal';
    inCR.className='w-28 h-9 px-2 rounded-md border border-neutral-300 bg-white';
    const crVal = (cfg.costsM2 || {})[row.key];
    inCR.value = Number.isFinite(crVal) ? String(crVal) : '';
    inCR.addEventListener('input', ()=>{
      const v = Number(inCR.value);
      updateConfig(c => {
        c.costsM2 ||= {};
        if (!Number.isFinite(v)) delete c.costsM2[row.key];
        else c.costsM2[row.key] = Math.max(0, v);
      });
      renderAllNumbers();
    });
    tdCR.appendChild(inCR);

    const tdAct = document.createElement('td'); tdAct.className='py-2';
    const del = document.createElement('button'); del.type='button';
    del.className='h-8 px-3 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50';
    del.textContent='Supprimer';
    del.addEventListener('click', ()=>{
      if (!confirm(`Supprimer « ${row.label||row.key} » ?`)) return;
      updateConfig(c => { c.services.splice(idx, 1); if (c.costsM2) delete c.costsM2[row.key]; });
      try { delete state.services?.[row.key]; } catch {}
      renderServicesAdmin(); renderAllNumbers();
    });
    tdAct.appendChild(del);

    tr.append(tdLabel, tdKey, tdPV, tdCR, tdAct);
    tbody.appendChild(tr);
  });

  const btnAdd = document.getElementById('adm-add');
  if (btnAdd && !btnAdd.__bound) {
    btnAdd.__bound = true;
    btnAdd.addEventListener('click', ()=>{
      const label = prompt('Libellé de la prestation ?'); if (!label) return;
      const base = slug(label);
      const set = new Set((loadConfig().services || []).map(s => s.key));
      const key = uniq(base, set);
      updateConfig(c => { (c.services ||= []).push({ key, label, pvTTC: 0 }); });
      renderServicesAdmin(); renderAllNumbers();
      document.querySelector('#adm-services-body tr:last-child input[type="text"]')?.focus();
    });
  }
}
