// public/js/state.js
export const PRICING = {
  tva: 0.2,
  servicesTTC: {
    poncage: 12,
    aerogommage: 45,
    peinture1: 49,
    peinture2: 89,
    teinte: 49,
    vernis: 49,
    consommables: 19,
    ferrures_change: 18,
    ferrures_polissage: 12,
  },
  transportBracketsTTC: [
    { min: 0,  max: 9,  price: 99.9 },
    { min: 10, max: 19, price: 129.9 },
    { min: 20, max: 29, price: 169.9 },
    { min: 30, max: 39, price: 199.9 },
  ],
  transportPerKmTTC: 3.0,
  transportPromo: [
    { minItems: 2, rate: 0.15 },
    { minItems: 3, rate: 0.25 },
  ],
};

export const SERVICE_LABELS = {
  poncage: 'Ponçage de finition',
  aerogommage: 'Aérogommage',
  peinture1: 'Peinture 1 couleur',
  peinture2: 'Peinture 2 couleurs',
  teinte: 'Teinte',
  vernis: 'Vernis',
  consommables: 'Consommables',
};

// public/js/state.js
export const state = {
  type: 'Table',
  L: 0, W: 0, H: 0,
  services: {
    poncage: false,
    aerogommage: false,
    peinture1: false,
    peinture2: false,
    teinte: false,
    vernis: false,
    // au moins un service coché pour voir un prix bouger
    consommables: true,
  },
  pieceCounts: { ferrures_change: 0, ferrures_polissage: 0 },
  transport: { mode: 'client', pickKm: 0, dropKm: 0, distanceKm: 0 },
  cart: JSON.parse(localStorage.getItem('baryc_cart_v1') || '[]'),
};
