const queue = [];
let processing = false;
let preloadStarted = false;
/** Preload print pipeline (صورة ESC/POS للعربي) */
export function preloadPosPrintPipeline() {
    if (preloadStarted)
        return;
    preloadStarted = true;
    void import('./pos-receipt.js');
    void import('./pos-receipt-render.js');
    void import('./pos-print-bridge.js');
    void import('./pos-receipt-escpos.js');
}
function yieldToUi(ms = 32) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
export function enqueuePosPrint(data, options = {}, onResult) {
    queue.push({ data, options, ...(onResult ? { onResult } : {}) });
    void drainQueue();
}
async function drainQueue() {
    if (processing)
        return;
    processing = true;
    try {
        while (queue.length > 0) {
            await yieldToUi();
            const job = queue.shift();
            const { printPosReceipt } = await import('./pos-receipt.js');
            const printRes = await printPosReceipt(job.data, job.options);
            job.onResult?.(printRes);
        }
    }
    finally {
        processing = false;
    }
}
