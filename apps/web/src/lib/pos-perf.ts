/** علامات أداء اختيارية لقياس فتح POS في DevTools → Performance */
const PREFIX = 'niha-pos';

export function markPosPerf(name: string) {
  if (typeof performance === 'undefined') return;
  try {
    performance.mark(`${PREFIX}:${name}`);
  } catch {
    /* ignore */
  }
}

export function measurePosPerf(name: string, start: string, end: string) {
  if (typeof performance === 'undefined') return;
  try {
    performance.measure(`${PREFIX}:${name}`, `${PREFIX}:${start}`, `${PREFIX}:${end}`);
  } catch {
    /* ignore */
  }
}
