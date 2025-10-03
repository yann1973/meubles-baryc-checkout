// public/js/devis/cart.js
import { state } from '/js/state.js';
import { PRICING } from '/js/devis/constants.js';
import { computePricing } from '/js/devis/pricing.js';
import { fmtEUR, toHT } from '/js/utils.js';
import { calcOrderTransportDetails } from '/js/devis/transport-pricing.js';

// ---- helpers UI
function setTxt(id, text){
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function validateClient(){
  const errors=[];
  const nom=document.getElementById('nom');
  const prenom=document.getElementById('prenom');
  const email=document.getElementById('email');
  const tel=document.getElementById('telephone');
  const addr=document.getElementById('clientAddressMain');
  [nom,prenom,email,tel,addr].forEach(el=> el&&el.classList.remove('ring-2','ring-rose-500'));
  if(!nom?.value.trim()){ errors.push('Nom obligatoire.'); nom?.classList.add('ring-2','ring-rose-500'); }
  if(!prenom?.value.trim()){ errors.push('Prénom obligatoire.'); prenom?.classList.add('ring-2','ring-rose-500'); }
  if(!email?.checkValidity()){ errors.push('Email invalide.'); email?.classList.add('ring-2','ring-rose-500'); }
  if((tel?.value||'').replace(/\D/g,'').length!==10){ errors.push('Téléphone: 10 chiffres requis.'); tel?.classList.add('ring-2','ring-rose-500'); }
  if(!addr?.value.trim()){ errors.push('Adresse client obligatoire.'); addr?.classList.add('ring-2','ring-rose-500'); }
  const out=document.getElementById('clientErrors');
  if(out) out.innerHTML = errors.length ? ('• ' + errors.join('<br>• ')) : '';
  if(errors.length){ document.getElementById('clientSection')?.scrollIntoView({behavior:'smooth',block:'start'}); }
  return errors.length===0;
}

function clearBarycStorage(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith('baryc_')) keys.push(k);
    }
    keys.forEach(k=> localStorage.removeItem(k));
  }catch{}
}

export function renderCart(){
  const empty = document.getElementById('cartEmpty');
  const block = document.getElementById('cartBlock');
  const items = document.getElementById('cartItems');
  if(!empty || !block || !items) return;

  items.innerHTML = '';

  if(state.cart.length){
    empty.classList.add('hidden');
    block.classList.remove('hidden');

    // ==== Lignes articles (MEUBLES)
    state.cart.forEach((it,idx)=>{
      const card=document.createElement('div');
      card.className='p-3 rounded-2xl border border-neutral-200 bg-white';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-medium">${it.name}</div>
            <div class="text-xs text-neutral-500">${new Date(it.date).toLocaleString('fr-FR')}</div>
          </div>
          <div class="text-right">
            <div class="font-semibold">${fmtEUR(+it.totalHT || 0)} HT</div>
            <div class="text-xs">${fmtEUR(+it.totalTTC || 0)} TTC</div>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <button class="px-4 py-2 rounded-2xl border border-neutral-300 hover:bg-neutral-100 text-xs" data-cart-remove="${idx}">Retirer</button>
        </div>`;
      items.appendChild(card);
    });
    // Remove handlers
    document.querySelectorAll('[data-cart-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = +btn.getAttribute('data-cart-remove');
        state.cart.splice(i,1);
        localStorage.setItem('baryc_cart_v1', JSON.stringify(state.cart));
        renderCart();
      });
    });

    // ==== Totaux MEUBLES (recalculés proprement)
    const goodsHT  = +(state.cart.reduce((s,it)=> s + (+it.totalHT || 0), 0)).toFixed(2);
    const goodsTVA = +(goodsHT * PRICING.tva).toFixed(2);
    const goodsTTC = +(goodsHT + goodsTVA).toFixed(2);
    setTxt('cartGoodsHT',  fmtEUR(goodsHT));
    setTxt('cartGoodsTVA', fmtEUR(goodsTVA));
    setTxt('cartGoodsTTC', fmtEUR(goodsTTC));

    // ==== Transport d’ordre (une seule ligne pour la commande)
    const td = calcOrderTransportDetails(
      state.transport.distanceKm,
      Math.max(1, state.cart.length || 0),
      state.transport.mode
    );

    const box = document.getElementById('cartTransportBox');
    const baseEl = document.getElementById('cartTransportBase');
    const majLine = document.getElementById('cartTransportMajLine');
    const majLbl  = document.getElementById('cartTransportMajLabel');
    const majAmt  = document.getElementById('cartTransportMajAmount');
    const trHTEl  = document.getElementById('cartTransportHT');
    const trTVAEl = document.getElementById('cartTransportTVA');
    const trTTCEl = document.getElementById('cartTransportTTC');

    const trTTC = (td && state.transport.mode === 'baryc') ? (+td.ttc || 0) : 0;
    const trHT  = +toHT(trTTC, PRICING.tva).toFixed(2);
    const trTVA = +(trTTC - trHT).toFixed(2);

    if (box){
      if (trTTC > 0){
        box.classList.remove('hidden');
        if (baseEl) baseEl.textContent = fmtEUR(+td.raw || 0);
        if (td.rate > 0 && td.surcharge > 0){
          majLine?.classList.remove('hidden');
          if (majLbl) majLbl.textContent = `Majoration logistique (+${Math.round(td.rate*100)}% × ${Math.max(0,(state.cart.length||1)-1)} meuble(s))`;
          if (majAmt) majAmt.textContent = '+' + fmtEUR(+td.surcharge || 0).replace('€',' €');
        } else {
          majLine?.classList.add('hidden');
        }
        trHTEl && (trHTEl.textContent   = fmtEUR(trHT));
        trTVAEl && (trTVAEl.textContent = fmtEUR(trTVA));
        trTTCEl && (trTTCEl.textContent = fmtEUR(trTTC));
      } else {
        box.classList.add('hidden');
        // on nettoie visuellement
        trHTEl && (trHTEl.textContent   = fmtEUR(0));
        trTVAEl && (trTVAEl.textContent = fmtEUR(0));
        trTTCEl && (trTTCEl.textContent = fmtEUR(0));
      }
    }

    // ==== TOTAL COMMANDE (MEUBLES + TRANSPORT)
    const grandHT  = +(goodsHT + trHT).toFixed(2);
    const grandTVA = +(goodsTVA + trTVA).toFixed(2);
    // TTC affiché = HT + TVA (évite les écarts d’arrondis cumulés)
    const grandTTC = +(grandHT + grandTVA).toFixed(2);

    setTxt('cartGrandHT',  fmtEUR(grandHT));
    setTxt('cartGrandTVA', fmtEUR(grandTVA));
    setTxt('cartGrandTTC', fmtEUR(grandTTC));

  } else {
    // Panier vide → tout masquer / remettre à zéro
    empty.classList.remove('hidden');
    block.classList.add('hidden');

    ['cartGoodsHT','cartGoodsTVA','cartGoodsTTC',
     'cartTransportBase','cartTransportHT','cartTransportTVA','cartTransportTTC',
     'cartGrandHT','cartGrandTVA','cartGrandTTC'
    ].forEach(id=> setTxt(id, fmtEUR(0)));

    const box = document.getElementById('cartTransportBox');
    const majLine = document.getElementById('cartTransportMajLine');
    box?.classList.add('hidden');
    majLine?.classList.add('hidden');
  }
}

export function initCart(onChanged){
  // Ajouter au panier (meuble uniquement)
  const addBtn=document.getElementById('addToCart');
  if(addBtn){
    addBtn.onclick=()=>{
      if(!validateClient()) return;
      const preview = computePricing({ promoCount: (state.cart?.length||0) + 1 });
      const line={
        id:String(Date.now()),
        name: document.getElementById('description')?.value || 'Devis sur mesure',
        date:new Date().toISOString(),
        totalHT: +(preview.goods.ht || 0),
        totalTTC:+(preview.goods.ttc || 0),
      };
      state.cart.push(line);
      localStorage.setItem('baryc_cart_v1', JSON.stringify(state.cart));

      const msg=document.getElementById('message');
      msg?.replaceChildren(document.createTextNode('Ajouté au panier.'));
      setTimeout(()=>{ if(msg) msg.textContent=''; }, 1000);

      renderCart();
      onChanged && onChanged();
    };
  }

  // Vider panier
  const clearBtn=document.getElementById('cartClear');
  if(clearBtn){
    clearBtn.onclick=()=>{
      state.cart=[];
      localStorage.removeItem('baryc_cart_v1');
      clearBarycStorage();
      renderCart();
      onChanged && onChanged();
    };
  }

  // Payer en ligne (meubles + transport d’ordre)
  const payBtn=document.getElementById('cartPay');
  if(payBtn){
    payBtn.onclick=async ()=>{
      if(!validateClient()) return;

      // Lignes meubles (si vides, fallback sur le devis courant)
      let itemsPayload=[];
      if (state.cart.length){
        itemsPayload = state.cart.map((it,idx)=>({
          name: it.name || `Article ${idx+1}`,
          description: `Article #${idx+1} — ajouté le ${new Date(it.date).toLocaleDateString('fr-FR')}`,
          amount: Math.max(50, Math.round((+it.totalTTC || 0) * 100)),
          quantity: 1
        }));
      } else {
        const p = computePricing({ promoCount: 1 });
        const amount = Math.round((+p.goods.ttc || 0) * 100);
        if(!amount || amount < 50){ alert('Montant trop faible.'); return; }
        itemsPayload = [{
          name: 'Devis Meubles Baryc — Meuble',
          description: `Surface ${(+p.totalSurface || 0).toFixed(2)} m²`,
          amount,
          quantity: 1
        }];
      }

      // Transport d’ordre (une seule ligne)
      const td = calcOrderTransportDetails(
        state.transport.distanceKm,
        Math.max(1, state.cart.length || 0),
        state.transport.mode
      );
      if (state.transport.mode === 'baryc' && +td.ttc > 0){
        itemsPayload.push({
          name: 'Transport (récup/livraison)',
          description: `${td.label} — base ${(+td.raw).toFixed(2)} € + majoration ${Math.round((+td.rate||0)*100)}%`,
          amount: Math.max(50, Math.round((+td.ttc) * 100)),
          quantity: 1
        });
      }

      const payload = {
        currency: 'EUR',
        items: itemsPayload,
        metadata: {
          client_nom: document.getElementById('nom')?.value || '',
          client_prenom: document.getElementById('prenom')?.value || '',
          client_phone: document.getElementById('telephone')?.value || '',
          client_email: document.getElementById('email')?.value || '',
          connaissance: document.getElementById('connaissance')?.value || '',
          description: document.getElementById('description')?.value || '',
          cart_size: String(state.cart.length || 0),
          transport_mode: state.transport.mode,
          transport_total_km: String(state.transport.distanceKm||0),
        },
      };

      try{
        const r = await fetch('/create-checkout-session', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        if(!r.ok) throw new Error(j.error || 'Erreur serveur');
        window.location.href = j.checkoutUrl;
      }catch(e){
        alert(e.message || e);
      }
    };
  }

  // premier rendu
  renderCart();
}
