// public/js/devis/ui/recompute.js
import { computePricing } from '/js/devis/pricing.js';
import { renderTotals } from '/js/devis/recap/totals.js';
import { renderRecapServices } from '/js/devis/recap/services.js';
import { state } from '/js/state.js';
import { EVENTS, emit } from '/js/common/events.js';

export function recompute() {
  const pricing = computePricing();
  renderTotals(pricing);
  renderRecapServices(state);
  emit(EVENTS.DEVIS_CHANGED, { pricing });
}
