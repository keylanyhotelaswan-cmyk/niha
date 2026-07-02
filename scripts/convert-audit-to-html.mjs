import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'runtime-performance-audit.md'), 'utf8');

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdTableToHtml(block) {
  const lines = block.trim().split('\n').filter((l) => l.includes('|'));
  if (lines.length < 2) return escapeHtml(block);
  const rows = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()));
  const cells = rows.map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
  if (!cells.length) return escapeHtml(block);
  const body = cells
    .map(
      (row, i) =>
        `<tr>${row.map((c) => `<${i === 0 && cells.length > 1 ? 'th' : 'td'}>${inlineMd(c)}</${i === 0 && cells.length > 1 ? 'th' : 'td'}>`).join('')}</tr>`,
    )
    .join('');
  return `<table dir="rtl"><tbody>${body}</tbody></table>`;
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function convert(mdText) {
  const parts = mdText.split(/(```[\s\S]*?```)/g);
  let html = '';
  for (const part of parts) {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
      html += `<pre dir="ltr">${escapeHtml(code)}</pre>`;
      continue;
    }
    const blocks = part.split(/\n\n+/);
    for (const block of blockTrim(blocks)) {
      const t = block.trim();
      if (!t) continue;
      if (t.startsWith('# ')) {
        html += `<h1>${inlineMd(t.slice(2))}</h1>`;
      } else if (t.startsWith('## ')) {
        html += `<h2>${inlineMd(t.slice(3))}</h2>`;
      } else if (t.startsWith('### ')) {
        html += `<section class="issue"><h3>${inlineMd(t.slice(4))}</h3>`;
      } else if (t.includes('|') && t.split('\n').every((l) => l.includes('|') || !l.trim())) {
        html += mdTableToHtml(t) + '</section>';
      } else if (t.startsWith('---')) {
        html += '<hr/>';
      } else {
        html += `<p>${inlineMd(t).replace(/\n/g, '<br/>')}</p>`;
      }
    }
  }
  return html;
}

function blockTrim(blocks) {
  const out = [];
  let buf = [];
  for (const b of blocks) {
    if (b.startsWith('### ')) {
      if (buf.length) out.push(buf.join('\n\n'));
      buf = [b];
    } else if (buf.length && buf[0].startsWith('### ')) {
      buf.push(b);
      out.push(buf.join('\n\n'));
      buf = [];
    } else {
      out.push(b);
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

const body = convert(md);

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>تدقيق أداء Niha v1</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.7;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px 20px 48px;
      background: #f5f5f5;
      color: #1a1a1a;
    }
    h1 { font-size: 1.6rem; color: #0d47a1; border-bottom: 3px solid #0d47a1; padding-bottom: 8px; }
    h2 { font-size: 1.25rem; color: #1565c0; margin-top: 2rem; }
    h3 { font-size: 1.05rem; color: #333; margin: 0 0 12px; }
    .issue {
      background: #fff;
      border: 1px solid #ddd;
      border-right: 4px solid #ff9800;
      border-radius: 8px;
      padding: 16px 18px;
      margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 0.95rem; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: right; vertical-align: top; }
    th { background: #e3f2fd; width: 28%; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; direction: ltr; unicode-bidi: embed; }
    pre {
      background: #263238;
      color: #eceff1;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    hr { border: none; border-top: 2px solid #ddd; margin: 24px 0; }
    p { margin: 10px 0; }
    .banner {
      background: #e8f5e9;
      border: 1px solid #81c784;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="banner">
    <strong>كيفية القراءة:</strong> افتح هذا الملف في Chrome أو Edge (نقر مزدوج على runtime-performance-audit.html).
    نسخة نصية بسيطة: runtime-performance-audit.txt
  </div>
  ${body}
</body>
</html>`;

writeFileSync(join(root, 'runtime-performance-audit.html'), html, 'utf8');

// Plain text without tables
let txt = md
  .replace(/\|[-:\s|]+\|\n/g, '')
  .replace(/\*\*/g, '')
  .replace(/`/g, '')
  .replace(/同上/g, 'نفس batch ~5.3s')
  .replace(/```[\s\S]*?```/g, (m) => '\n--- كود ---\n' + m.replace(/```\w*\n?|```/g, '') + '\n---\n');

txt = txt.replace(/\|([^|\n]+)\|([^|\n]+)\|/g, (_, a, b) => {
  const k = a.trim();
  const v = b.trim();
  if (!k || k === 'الحقل' || k === '--------') return '';
  return `  • ${k}: ${v}\n`;
});

writeFileSync(join(root, 'runtime-performance-audit.txt'), '\uFEFF' + txt, 'utf8');
console.log('OK: runtime-performance-audit.html + runtime-performance-audit.txt');
