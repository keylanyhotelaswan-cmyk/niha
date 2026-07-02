/**
 * Generate database-execution-plan-audit.md from measured JSON.
 * Run: node scripts/generate-db-audit-report.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'apps/database-explain-results.json'), 'utf8'));

function fmtPlanTree(q) {
  if (!q.planTree?.length) return '_لا توجد بيانات_';
  return q.planTree
    .map((n) => {
      const pad = '  '.repeat(n.depth);
      const parts = [
        n.nodeType,
        n.relation ? `on ${n.relation}` : '',
        n.indexName ? `index=${n.indexName}` : '',
        n.actualRows != null ? `actual_rows=${n.actualRows}` : '',
        n.actualTotalTime != null ? `actual_time=${n.actualTotalTime}ms` : '',
        n.sharedHit != null ? `shared_hit=${n.sharedHit}` : '',
        n.sharedRead != null ? `shared_read=${n.sharedRead}` : '',
        n.filter ? `filter=${n.filter}` : '',
      ].filter(Boolean);
      return `${pad}- ${parts.join(' | ')}`;
    })
    .join('\n');
}

function fmtNodeFlags(q) {
  return [
    `Sequential Scan: ${q.hasSeqScan}`,
    `Index Scan: ${q.hasIndexScan}`,
    `Bitmap Scan: ${q.hasBitmapScan}`,
    `Hash Join: ${q.hasHashJoin}`,
    `Nested Loop: ${q.hasNestedLoop}`,
    `Merge Join: ${q.hasMergeJoin}`,
    `Sort: ${q.hasSort}`,
    `Group/Aggregate: ${q.hasGroupAggregate}`,
  ].join('\n');
}

let md = `# PostgreSQL Execution Plan Audit — Niha v1

**تاريخ القياس:** ${data.auditedAt}  
**مصدر البيانات:** \`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)\` عبر Prisma \`$queryRawUnsafe\` من \`apps/api\`  
**قاعدة البيانات:** ${data.database}  
**القيد:** لم يُعدَّل التطبيق — قياس فقط.

---

## 1. معرفات العينة المستخدمة في القياس

- branchId: \`${data.sampleIds.branchId}\`
- shiftId: \`${data.sampleIds.shiftId}\`
- organizationId: \`${data.sampleIds.organizationId}\`
- dateKey: \`${data.sampleIds.dateKey}\`

## 2. أحجام الجداول عند القياس (COUNT فعلي)

| الجدول / المقياس | الصفوف |
|------------------|--------|
| TreasuryTransaction (branch + APPROVED) | ${data.tableCounts.treasuryApprovedBranch} |
| TreasuryTransaction (shiftId sample) | ${data.tableCounts.treasuryShift} |
| Order (branch) | ${data.tableCounts.orders} |
| Shift (اليوم في النطاق) | ${data.tableCounts.shiftsInRange} |

## 3. إحصائيات PostgreSQL (pg_stat_user_tables) — مقاس

| table_name | estimated_live_rows | seq_scan | seq_tup_read | idx_scan | idx_tup_fetch |
|------------|---------------------|----------|--------------|----------|---------------|
`;

for (const s of data.pgTableStats) {
  md += `| ${s.table_name} | ${s.estimated_live_rows} | ${s.seq_scan} | ${s.seq_tup_read} | ${s.idx_scan} | ${s.idx_tup_fetch} |\n`;
}

md += `
**ملاحظة قياس:** \`Execution Time\` في EXPLAIN هو زمن تنفيذ PostgreSQL على الخادم. \`clientWallMs\` يشمل زمن الشبكة (Supabase بعيد) وغالباً ~400ms إضافية لكل استعلام.

---

## 4. ملخص تنفيذي للخطط (مرتب حسب Execution Time على الخادم)

| ID | Execution Time (ms) | Planning Time (ms) | Client Wall (ms) | Actual Rows | Seq Scan | Index Used |
|----|---------------------|--------------------|------------------|-------------|----------|------------|
`;

const sorted = [...data.queries].sort((a, b) => (b.executionTimeMs || 0) - (a.executionTimeMs || 0));
for (const q of sorted) {
  const idx = (q.planTree || []).find((n) => n.indexName)?.indexName || (q.hasSeqScan ? 'Seq Scan' : '—');
  md += `| ${q.id} | ${q.executionTimeMs ?? q.error} | ${q.planningTimeMs ?? '—'} | ${q.clientWallMs ?? '—'} | ${q.rootActualRows ?? '—'} | ${q.hasSeqScan} | ${idx} |\n`;
}

md += `
---

## 5. تفاصيل كل استعلام ساخن (أدلة مقاسة)

`;

const groups = [
  {
    title: 'TreasuryService.getBranchTreasuryBalance()',
    ids: ['TRS-001-branch-treasury-balance', 'RPT-005-treasury-report-balance'],
  },
  {
    title: 'TreasuryService.getShiftSummaryLight()',
    ids: [
      'TRS-002a-shift-all-transactions',
      'TRS-002b-shift-expenses',
      'TRS-002c-closed-orders-aggregate',
      'TRS-002d-uncollected-aggregate',
      'TRS-002e-uncollected-orders-list',
      'TRS-002f-shift-find-unique',
    ],
  },
  {
    title: 'ShiftsService.getPosContext()',
    ids: ['POS-CTX-001-branch-by-org', 'POS-CTX-002-open-shift', 'POS-CTX-003-cashbox-fallback'],
  },
  {
    title: 'ShiftsService.getPosCatalog() + ProductionPlanService',
    ids: ['CAT-001-product-categories', 'CAT-002-products', 'CAT-003-payment-methods', 'PLAN-001-orderitem-groupby-sold', 'PLAN-002-daily-plan'],
  },
  {
    title: 'ShiftsService.listShifts() + TreasuryService.listShiftsForWorkspace()',
    ids: ['SHF-001-list-shifts', 'SHF-002-batch-shift-transactions'],
  },
  {
    title: 'OrdersService.listOrdersByShift()',
    ids: ['ORD-001-by-shift-uncollected-open', 'ORD-002-shift-lookup'],
  },
  {
    title: 'ReportsService + ReportsAnalyticsService',
    ids: [
      'RPT-001-dashboard-orders-today',
      'RPT-002-dashboard-open-shift-treasury-entries',
      'RPT-003-operations-kpi',
      'RPT-004-operations-top-products',
      'RPT-006-treasury-transactions-list',
      'RPT-007-get-treasury-today',
      'RPT-008-inventory-all-stock',
    ],
  },
];

for (const g of groups) {
  md += `### ${g.title}\n\n`;
  for (const id of g.ids) {
    const q = data.queries.find((x) => x.id === id);
    if (!q) continue;
    md += `#### ${q.id}\n\n`;
    if (q.error) {
      md += `**خطأ:** ${q.error}\n\n`;
      continue;
    }
    md += `- **الملف:** ${q.file || '—'}\n`;
    md += `- **الدالة:** ${q.function || '—'}\n`;
    md += `- **موقع Prisma:** ${q.prismaLocation || '—'}\n`;
    md += `- **الجداول:** ${(q.tables || []).join(', ') || '—'}\n`;
    if (q.estimatedRows != null) md += `- **صفوف مقدرة (COUNT):** ${q.estimatedRows}\n`;
    if (q.note) md += `- **ملاحظة:** ${q.note}\n`;
    md += `\n**SQL المكافئ:**\n\n\`\`\`sql\n${q.sql}\n\`\`\`\n\n`;
    md += `**EXPLAIN ANALYZE — ملخص مقاس:**\n\n`;
    md += `- Planning Time: **${q.planningTimeMs} ms**\n`;
    md += `- Execution Time: **${q.executionTimeMs} ms**\n`;
    md += `- Client round-trip (wall): **${q.clientWallMs} ms**\n`;
    md += `- Root Node Type: **${q.rootNodeType}**\n`;
    md += `- Actual Rows (root): **${q.rootActualRows}**\n`;
    md += `- Plan Rows (root): **${q.rootPlanRows}**\n`;
    md += `- Startup Cost / Total Cost: **${q.startupCost} / ${q.totalCost}**\n`;
    md += `- Shared Hit Blocks (root): **${q.rootSharedHitBlocks}**\n`;
    md += `- Shared Read Blocks (root): **${q.rootSharedReadBlocks}**\n`;
    md += `\n**عقد الخطة المكتشفة:**\n\n\`\`\`\n${fmtNodeFlags(q)}\n\`\`\`\n\n`;
    md += `**شجرة الخطة (مقاسة):**\n\n\`\`\`\n${fmtPlanTree(q)}\n\`\`\`\n\n`;
    md += `---\n\n`;
  }
}

md += `## 6. استعلامات متعددة غير مدمجة في SQL واحد (وصف من الكود — بدون EXPLAIN موحّد)

### ShiftsService.listShifts() — N+1 على مستوى التطبيق

- **الملف:** \`apps/api/src/modules/shifts/shifts.service.ts\`
- **الدالة:** \`listShifts()\` سطر 150–182
- **SQL الأول (مقاس):** SHF-001-list-shifts — Execution **${data.queries.find((q) => q.id === 'SHF-001-list-shifts')?.executionTimeMs} ms**
- **لكل صف وردية:** يستدعي \`TreasuryService.getShiftSummary(id)\` = \`getShiftSummaryLight\` = **6 استعلامات** (TRS-002a … TRS-002f)
- **عند ${data.tableCounts.shiftsInRange} وردية في النطاق اليوم:** ${data.tableCounts.shiftsInRange} × 6 = **${data.tableCounts.shiftsInRange * 6}** استعلام إضافي مُقدَّر من بنية الكود
- **مقارنة:** SHF-002-batch-shift-transactions (listShiftsForWorkspace) — Execution **${data.queries.find((q) => q.id === 'SHF-002-batch-shift-transactions')?.executionTimeMs} ms** — يجلب txs لكل الورديات في استعلام واحد

### ShiftsService.getPosContext() مع وردية مفتوحة

عند وجود وردية OPEN يستدعي \`getPosShiftSummary()\` الذي يستدعي \`getShiftSummaryLight\` + \`cashierExpense.findMany\` — مجموع الاستعلامات = POS-CTX-* + TRS-002*

---

## 7. الفهارس ذات الصلة (من pg_indexes — مقاس)

| Table | Index | Definition |
|-------|-------|------------|
`;

const relevant = data.indexes.filter((i) =>
  [
    'TreasuryTransaction',
    'Shift',
    'Order',
    'OrderItem',
    'Product',
    'CashierExpense',
    'Branch',
    'CashBox',
    'ProductDailyPlan',
  ].includes(i.tablename),
);
for (const i of relevant) {
  md += `| ${i.tablename} | ${i.indexname} | \`${i.indexdef}\` |\n`;
}

md += `
---

## 8. أبطأ تنفيذ على الخادم (Top 5 — مقاس)

`;

for (const [i, q] of sorted.slice(0, 5).entries()) {
  md += `${i + 1}. **${q.id}** — Execution **${q.executionTimeMs} ms**, Planning **${q.planningTimeMs} ms**, Rows **${q.rootActualRows}**, SeqScan=${q.hasSeqScan}\n`;
}

md += `
---

## 9. استعلامات استخدمت Sequential Scan (مقاس)

`;

for (const q of data.queries.filter((x) => x.hasSeqScan)) {
  const scans = (q.planTree || []).filter((n) => n.nodeType === 'Seq Scan');
  md += `### ${q.id}\n`;
  md += `- Execution Time: **${q.executionTimeMs} ms**\n`;
  for (const s of scans) {
    md += `- Seq Scan on **${s.relation}** | actual_rows=${s.actualRows} | filter: \`${s.filter || 'none'}\`\n`;
  }
  md += '\n';
}

md += `
---

## 10. ملف الأدلة الخام

النتائج الكاملة بصيغة JSON (تتضمن \`explainJson\` لكل استعلام):

\`apps/database-explain-results.json\`

---

*نهاية التقرير — measured database evidence only. لا توصيات تحسين.*
`;

writeFileSync(join(root, 'database-execution-plan-audit.md'), md, 'utf8');
console.log('Wrote database-execution-plan-audit.md', md.length, 'chars');
