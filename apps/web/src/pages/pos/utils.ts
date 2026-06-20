import type { CollectionStatus } from '../../lib/pos-store.js';

export function formatCurrency(value: number) {
  return `${value.toLocaleString('en-US')} ج.م`;
}

export function collectionTone(status: CollectionStatus) {
  if (status === 'approved') {
    return { bg: 'rgba(15,118,110,0.12)', color: '#0f766e', border: 'rgba(15,118,110,0.25)' };
  }
  if (status === 'pending_approval') {
    return { bg: 'rgba(180,83,9,0.12)', color: '#b45309', border: 'rgba(180,83,9,0.25)' };
  }
  return { bg: 'rgba(185,28,28,0.10)', color: '#b91c1c', border: 'rgba(185,28,28,0.22)' };
}
