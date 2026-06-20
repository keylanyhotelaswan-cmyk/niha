import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
const raw = readFileSync(envPath);

let text;
if (raw.length >= 2 && raw[1] === 0 && raw[0] !== 0) {
  text = raw.toString('utf16le');
} else if (raw[0] === 0xff && raw[1] === 0xfe) {
  text = raw.slice(2).toString('utf16le');
} else {
  text = raw.toString('utf8');
}

writeFileSync(envPath, text.replace(/^\uFEFF/, ''), 'utf8');
console.log('✅ converted .env to UTF-8');
