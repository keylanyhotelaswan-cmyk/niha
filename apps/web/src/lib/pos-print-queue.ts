import type { ReceiptData, PrintReceiptResult } from './pos-receipt.js';
import type { PrintCopies } from './pos-receipt.js';

type PrintJob = {
  data: ReceiptData;
  options: { force?: boolean; silent?: boolean; copies?: PrintCopies };
  onResult?: (result: PrintReceiptResult) => void;
};

const queue: PrintJob[] = [];
let processing = false;
let preloadStarted = false;

/** Preload print pipeline (صورة ESC/POS للعربي) */
export function preloadPosPrintPipeline(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void import('./pos-receipt.js');
  void import('./pos-receipt-render.js');
  void import('./pos-print-bridge.js');
  void import('./pos-receipt-escpos.js');
}

function yieldToUi(ms = 32): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function enqueuePosPrint(
  data: ReceiptData,
  options: PrintJob['options'] = {},
  onResult?: PrintJob['onResult'],
): void {
  queue.push({ data, options, ...(onResult ? { onResult } : {}) });
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      await yieldToUi();
      const job = queue.shift()!;
      const { printPosReceipt } = await import('./pos-receipt.js');
      const printRes = await printPosReceipt(job.data, job.options);
      job.onResult?.(printRes);
    }
  } finally {
    processing = false;
  }
}
