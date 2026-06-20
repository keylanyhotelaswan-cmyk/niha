import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const tsPath = path.join(dir, '../src/lib/pos-receipt-render.ts');
const jsPath = path.join(dir, '../src/lib/pos-receipt-render.js');

let s = fs.readFileSync(tsPath, 'utf8');

// imports / types
s = s.replace(/\n\s*type ReceiptSettings,?\n/g, '\n');
s = s.replace(/, type ReceiptSettings/g, '');
s = s.replace(/: ReceiptSettings/g, '');

// export type blocks
s = s.replace(/export type CustomerReceiptInput = \{[\s\S]*?\};\r?\n\r?\n/g, '');
s = s.replace(/export type KitchenReceiptInput = \{[\s\S]*?\};\r?\n\r?\n/g, '');

// param / return types
s = s.replace(/\(n: number\)/g, '(n)');
s = s.replace(/\(value: number\)/g, '(value)');
s = s.replace(/\(isoOrStr\?: string\)/g, '(isoOrStr)');
s = s.replace(/\(orderNumber: string, shiftNumber\?: string\)/g, '(orderNumber, shiftNumber)');
s = s.replace(/\(orderNumber: string\)/g, '(orderNumber)');
s = s.replace(/\(orderType: string\)/g, '(orderType)');
s = s.replace(/\(method: string\)/g, '(method)');
s = s.replace(/\(isPaid: boolean\)/g, '(isPaid)');
s = s.replace(/\(s: string\)/g, '(s)');
s = s.replace(/\(body: string, settings\)/g, '(body, settings)');
s = s.replace(/\(settings, forPrint: boolean\)/g, '(settings, forPrint)');
s = s.replace(/\(settings, renderWidthPx\?: number\)/g, '(settings, renderWidthPx)');
s = s.replace(/\(source, targetWidth: number\)/g, '(source, targetWidth)');
s = s.replace(/\(fullHtml: string,\r?\n\s*settings = getReceiptSettings\(\),\r?\n\): Promise<\{[\s\S]*?\} \| null>/g, '(fullHtml, settings = getReceiptSettings())');
s = s.replace(/, forPrint = true\): string/g, ', forPrint = true)');
s = s.replace(/: CustomerReceiptInput/g, '');
s = s.replace(/: KitchenReceiptInput/g, '');
s = s.replace(/: HTMLCanvasElement/g, '');
s = s.replace(/ as HTMLElement \| null/g, '');

s = s.replace(
  /const html2canvas = \(html2canvasPkg as unknown as typeof html2canvasPkg & \(\(el: HTMLElement, opts\?: object\) => Promise<HTMLCanvasElement>\)\);\r?\nconst capture = typeof html2canvas === 'function'\r?\n  \? html2canvas\r?\n  : \(html2canvas as \{ default: \(el: HTMLElement, opts\?: object\) => Promise<HTMLCanvasElement> \}\)\.default;/,
  "const html2canvas = html2canvasPkg;\nconst capture = typeof html2canvas === 'function' ? html2canvas : html2canvas.default;",
);
s = s.replace(/: \(el: HTMLElement, opts\?: object\) => Promise<HTMLCanvasElement>/g, '');
s = s.replace(/Promise<\{ base64: string; heightPx: number; widthPx: number; paperWidthMm: number \} \| null>/g, '');

fs.writeFileSync(jsPath, s);
console.log('Synced', jsPath);
