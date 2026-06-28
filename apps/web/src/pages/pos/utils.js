import { formatOrderTimestamp } from '../../lib/date-utils.js';
import { ui } from '../../lib/ui-tokens.js';
export function formatCurrency(value) {
    return `${value.toLocaleString('en-US')} ج.م`;
}
export { formatOrderTimestamp };
export function collectionTone(status, cancelPending) {
    if (cancelPending) {
        return { bg: ui.dangerBg, color: ui.danger, border: ui.dangerBorder };
    }
    if (status === 'approved') {
        return { bg: ui.skyLight, color: ui.navySoft, border: ui.skyBorder };
    }
    if (status === 'pending_approval') {
        return { bg: ui.warnBg, color: ui.warn, border: ui.warnBorder };
    }
    return { bg: ui.dangerBg, color: ui.danger, border: ui.dangerBorder };
}
