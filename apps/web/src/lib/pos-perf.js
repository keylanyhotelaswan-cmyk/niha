/** علامات أداء اختيارية لقياس فتح POS في DevTools → Performance */
const PREFIX = 'niha-pos';
export function markPosPerf(name) {
    if (typeof performance === 'undefined')
        return;
    try {
        performance.mark(`${PREFIX}:${name}`);
    }
    catch {
        /* ignore */
    }
}
export function measurePosPerf(name, start, end) {
    if (typeof performance === 'undefined')
        return;
    try {
        performance.measure(`${PREFIX}:${name}`, `${PREFIX}:${start}`, `${PREFIX}:${end}`);
    }
    catch {
        /* ignore */
    }
}
