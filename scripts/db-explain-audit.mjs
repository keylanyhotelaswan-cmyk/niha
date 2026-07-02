/**
 * PostgreSQL EXPLAIN ANALYZE audit — external to app runtime, read-only.
 * Run: cd apps/api && node ../../scripts/db-explain-audit.mjs
 */
const { PrismaClient } = require('@prisma/client');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const p = new PrismaClient();

function walkPlan(node, acc = {}) {
  if (!node || typeof node !== 'object') return acc;
  const t = node['Node Type'];
  if (t) acc[t] = (acc[t] || 0) + 1;
  if (node.Plans) node.Plans.forEach((c) => walkPlan(c, acc));
  if (node['Plans']) node['Plans'].forEach((c) => walkPlan(c, acc));
  return acc;
}

function flattenPlan(node, depth = 0, out = []) {
  if (!node) return out;
  out.push({
    depth,
    nodeType: node['Node Type'],
    relation: node['Relation Name'],
    indexName: node['Index Name'],
    actualRows: node['Actual Rows'],
    planRows: node['Plan Rows'],
    actualTotalTime: node['Actual Total Time'],
    actualStartupTime: node['Actual Startup Time'],
    sharedHit: node['Shared Hit Blocks'],
    sharedRead: node['Shared Read Blocks'],
    filter: node['Filter'],
    sortKey: node['Sort Key'],
    groupKey: node['Group Key'],
    joinType: node['Join Type'],
  });
  const kids = node.Plans || node['Plans'] || [];
  kids.forEach((c) => flattenPlan(c, depth + 1, out));
  return out;
}

async function explain(name, sql, meta) {
  const t0 = performance.now();
  let raw;
  let error = null;
  try {
    raw = await p.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  } catch (e) {
    error = String(e.message || e);
    return {
      id: name,
      ...meta,
      error,
      clientWallMs: Math.round(performance.now() - t0),
    };
  }
  const planRoot = raw[0]['QUERY PLAN'][0];
  const plan = planRoot.Plan;
  const nodeCounts = walkPlan(plan);
  const flat = flattenPlan(plan);
  return {
    id: name,
    ...meta,
    sql,
    planningTimeMs: planRoot['Planning Time'],
    executionTimeMs: planRoot['Execution Time'],
    clientWallMs: Math.round(performance.now() - t0),
    rootNodeType: plan['Node Type'],
    rootActualRows: plan['Actual Rows'],
    rootPlanRows: plan['Plan Rows'],
    rootSharedHitBlocks: plan['Shared Hit Blocks'],
    rootSharedReadBlocks: plan['Shared Read Blocks'],
    totalCost: plan['Total Cost'],
    startupCost: plan['Startup Cost'],
    nodeTypeCounts: nodeCounts,
    planTree: flat,
    hasSeqScan: flat.some((n) => n.nodeType === 'Seq Scan'),
    hasIndexScan: flat.some((n) => n.nodeType === 'Index Scan' || n.nodeType === 'Index Only Scan'),
    hasBitmapScan: flat.some((n) => n.nodeType?.includes('Bitmap')),
    hasHashJoin: flat.some((n) => n.nodeType === 'Hash Join'),
    hasNestedLoop: flat.some((n) => n.nodeType === 'Nested Loop'),
    hasMergeJoin: flat.some((n) => n.nodeType === 'Merge Join'),
    hasSort: flat.some((n) => n.nodeType === 'Sort'),
    hasGroupAggregate: flat.some((n) => n.nodeType === 'GroupAggregate' || n.nodeType === 'HashAggregate'),
    explainJson: planRoot,
  };
}

async function main() {
  const branch = await p.branch.findFirst({ orderBy: { createdAt: 'asc' } });
  const org = branch ? await p.organization.findUnique({ where: { id: branch.organizationId } }) : null;
  const openShift = branch
    ? await p.shift.findFirst({
        where: { branchId: branch.id, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      })
    : null;
  const anyShift = branch
    ? await p.shift.findFirst({ where: { branchId: branch.id }, orderBy: { openedAt: 'desc' } })
    : null;
  const shiftId = openShift?.id || anyShift?.id;
  const branchId = branch?.id;
  const orgId = org?.id;

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateKey = `${y}-${m}-${d}`;
  const dayStart = `${dateKey} 00:00:00`;
  const dayEnd = `${dateKey} 23:59:59`;

  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);

  const counts = {
    treasuryApprovedBranch: await p.treasuryTransaction.count({
      where: { branchId, approvalStatus: 'APPROVED' },
    }),
    treasuryShift: shiftId ? await p.treasuryTransaction.count({ where: { shiftId } }) : 0,
    orders: await p.order.count({ where: { branchId } }),
    shiftsInRange: await p.shift.count({
      where: { branchId, openedAt: { gte: fromDate, lte: toDate } },
    }),
  };

  const bid = branchId;
  const sid = shiftId;
  const oid = orgId;

  const queries = [];

  // TRS-001 getBranchTreasuryBalance
  queries.push(
    await explain(
      'TRS-001-branch-treasury-balance',
      `SELECT amount, "transactionType", "paymentMethod", "safeType", "sourceType", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "branchId" = '${bid}'
         AND "approvalStatus" = 'APPROVED'::"ApprovalStatus"`,
      {
        prismaLocation: 'treasury.service.ts:1194 — prisma.treasuryTransaction.findMany',
        function: 'TreasuryService.getBranchTreasuryBalance',
        file: 'apps/api/src/modules/treasury/treasury.service.ts',
        tables: ['TreasuryTransaction'],
        estimatedRows: counts.treasuryApprovedBranch,
      },
    ),
  );

  // TRS-002a shift txs
  if (sid) {
    queries.push(
      await explain(
        'TRS-002a-shift-all-transactions',
        `SELECT id, amount, "transactionType", "paymentMethod", "safeType", "approvalStatus",
                "affectsCash", "sourceType", "sourceId", note, "occurredAt"
         FROM "TreasuryTransaction"
         WHERE "shiftId" = '${sid}'
         ORDER BY "occurredAt" DESC`,
        {
          prismaLocation: 'treasury.service.ts:1270 — findMany where shiftId orderBy occurredAt desc',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['TreasuryTransaction'],
          estimatedRows: counts.treasuryShift,
        },
      ),
    );

    queries.push(
      await explain(
        'TRS-002b-shift-expenses',
        `SELECT amount, "paymentMethod" FROM "CashierExpense" WHERE "shiftId" = '${sid}'`,
        {
          prismaLocation: 'treasury.service.ts:1275',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['CashierExpense'],
        },
      ),
    );

    queries.push(
      await explain(
        'TRS-002c-closed-orders-aggregate',
        `SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS sales
         FROM "Order"
         WHERE "shiftId" = '${sid}' AND status = 'CLOSED'::"OrderStatus"`,
        {
          prismaLocation: 'treasury.service.ts:1279 — order.aggregate',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['Order'],
        },
      ),
    );

    queries.push(
      await explain(
        'TRS-002d-uncollected-aggregate',
        `SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS total
         FROM "Order"
         WHERE "shiftId" = '${sid}'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")`,
        {
          prismaLocation: 'treasury.service.ts:1284 — order.aggregate uncollectedWhere',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['Order'],
        },
      ),
    );

    queries.push(
      await explain(
        'TRS-002e-uncollected-orders-list',
        `SELECT "orderNumber", "totalAmount", "customerName"
         FROM "Order"
         WHERE "shiftId" = '${sid}'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")
         ORDER BY "closedAt" DESC
         LIMIT 25`,
        {
          prismaLocation: 'treasury.service.ts:1289',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['Order'],
        },
      ),
    );

    queries.push(
      await explain(
        'TRS-002f-shift-find-unique',
        `SELECT s.* FROM "Shift" s WHERE s.id = '${sid}'`,
        {
          prismaLocation: 'treasury.service.ts:1244 — shift.findUnique + include cashBox, openedBy',
          function: 'TreasuryService.getShiftSummaryLight',
          file: 'apps/api/src/modules/treasury/treasury.service.ts',
          tables: ['Shift', 'CashBox', 'User'],
          note: 'Prisma adds JOINs for include; this EXPLAIN is PK lookup only',
        },
      ),
    );
  }

  // POS context path
  if (oid) {
    queries.push(
      await explain(
        'POS-CTX-001-branch-by-org',
        `SELECT id, name, "organizationId", "createdAt"
         FROM "Branch"
         WHERE "organizationId" = '${oid}'
         ORDER BY "createdAt" ASC
         LIMIT 1`,
        {
          prismaLocation: 'shifts.service.ts:69 — branch.findFirst',
          function: 'ShiftsService.getPosContext',
          file: 'apps/api/src/modules/shifts/shifts.service.ts',
          tables: ['Branch'],
        },
      ),
    );
  }

  if (bid) {
    queries.push(
      await explain(
        'POS-CTX-002-open-shift',
        `SELECT s.id FROM "Shift" s
         WHERE s."branchId" = '${bid}' AND s.status = 'OPEN'::"ShiftStatus"
         ORDER BY s."openedAt" DESC
         LIMIT 1`,
        {
          prismaLocation: 'shifts.service.ts:88 — shift.findFirst OPEN',
          function: 'ShiftsService.getPosContext',
          file: 'apps/api/src/modules/shifts/shifts.service.ts',
          tables: ['Shift'],
        },
      ),
    );

    queries.push(
      await explain(
        'POS-CTX-003-cashbox-fallback',
        `SELECT id, name FROM "CashBox"
         WHERE "branchId" = '${bid}'
         ORDER BY code ASC
         LIMIT 1`,
        {
          prismaLocation: 'shifts.service.ts:123',
          function: 'ShiftsService.getPosContext',
          file: 'apps/api/src/modules/shifts/shifts.service.ts',
          tables: ['CashBox'],
        },
      ),
    );
  }

  // getPosCatalog
  queries.push(
    await explain(
      'CAT-001-product-categories',
      `SELECT * FROM "ProductCategory" WHERE "branchId" = '${bid}' ORDER BY name ASC`,
      {
        prismaLocation: 'shifts.service.ts:1123',
        function: 'ShiftsService.getPosCatalog',
        file: 'apps/api/src/modules/shifts/shifts.service.ts',
        tables: ['ProductCategory'],
      },
    ),
  );

  queries.push(
    await explain(
      'CAT-002-products',
      `SELECT * FROM "Product" WHERE "branchId" = '${bid}' ORDER BY name ASC`,
      {
        prismaLocation: 'shifts.service.ts:1127',
        function: 'ShiftsService.getPosCatalog',
        file: 'apps/api/src/modules/shifts/shifts.service.ts',
        tables: ['Product'],
      },
    ),
  );

  queries.push(
    await explain(
      'CAT-003-payment-methods',
      `SELECT * FROM "PaymentMethod"
       WHERE "branchId" = '${bid}' AND "isActive" = true
       ORDER BY "sortOrder" ASC`,
      {
        prismaLocation: 'shifts.service.ts:1131',
        function: 'ShiftsService.getPosCatalog',
        file: 'apps/api/src/modules/shifts/shifts.service.ts',
        tables: ['PaymentMethod'],
      },
    ),
  );

  // Production plan groupBy
  queries.push(
    await explain(
      'PLAN-001-orderitem-groupby-sold',
      `SELECT oi."productId", SUM(oi.quantity) AS qty
       FROM "OrderItem" oi
       INNER JOIN "Order" o ON o.id = oi."orderId"
       WHERE o."branchId" = '${bid}'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND o."closedAt" >= '${dayStart}'::timestamp
         AND o."closedAt" <= '${dayEnd}'::timestamp
       GROUP BY oi."productId"`,
      {
        prismaLocation: 'production-plan.service.ts:63 — orderItem.groupBy',
        function: 'ProductionPlanService.soldQuantitiesForDay / getSummaryMap',
        file: 'apps/api/src/modules/production-plan/production-plan.service.ts',
        tables: ['OrderItem', 'Order'],
      },
    ),
  );

  queries.push(
    await explain(
      'PLAN-002-daily-plan',
      `SELECT "productId", "plannedQuantity" FROM "ProductDailyPlan"
       WHERE "branchId" = '${bid}' AND "dateKey" = '${dateKey}'`,
      {
        prismaLocation: 'production-plan.service.ts:85',
        function: 'ProductionPlanService.getDailyPlan',
        file: 'apps/api/src/modules/production-plan/production-plan.service.ts',
        tables: ['ProductDailyPlan'],
      },
    ),
  );

  // listShifts
  queries.push(
    await explain(
      'SHF-001-list-shifts',
      `SELECT s.id, s."shiftNumber", s."openedAt", s.status
       FROM "Shift" s
       WHERE s."branchId" = '${bid}'
         AND s."openedAt" >= '${fromDate.toISOString()}'::timestamptz
         AND s."openedAt" <= '${toDate.toISOString()}'::timestamptz
       ORDER BY s."openedAt" DESC`,
      {
        prismaLocation: 'shifts.service.ts:162 — shift.findMany',
        function: 'ShiftsService.listShifts',
        file: 'apps/api/src/modules/shifts/shifts.service.ts',
        tables: ['Shift'],
        estimatedRows: counts.shiftsInRange,
        note: 'Each row then triggers getShiftSummary N+1 in app — not single SQL',
      },
    ),
  );

  // listShiftsForWorkspace optimized batch
  queries.push(
    await explain(
      'SHF-002-batch-shift-transactions',
      `SELECT "shiftId", amount, "transactionType", "paymentMethod", "approvalStatus", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "shiftId" IN (
         SELECT id FROM "Shift"
         WHERE "branchId" = '${bid}'
           AND "openedAt" >= '${fromDate.toISOString()}'::timestamptz
           AND "openedAt" <= '${toDate.toISOString()}'::timestamptz
         ORDER BY "openedAt" DESC
         LIMIT 50
       )`,
      {
        prismaLocation: 'treasury.service.ts:806 — listShiftsForWorkspace batch',
        function: 'TreasuryService.listShiftsForWorkspace',
        file: 'apps/api/src/modules/treasury/treasury.service.ts',
        tables: ['TreasuryTransaction', 'Shift'],
      },
    ),
  );

  // listOrdersByShift — OPEN shift uncollected
  if (sid) {
    queries.push(
      await explain(
        'ORD-001-by-shift-uncollected-open',
        `SELECT id, "orderNumber", "totalAmount", "closedAt", "collectionStatus", "paymentStatus"
         FROM "Order"
         WHERE "shiftId" = '${sid}'
           AND status = 'CLOSED'::"OrderStatus"
           AND ("collectionStatus" = 'UNCOLLECTED'::"CollectionStatus"
                OR "paymentStatus" = 'PENDING'::"PaymentStatus")
         ORDER BY "closedAt" DESC
         LIMIT 26`,
        {
          prismaLocation: 'orders.service.ts:1056 — listOrdersByShift filter=uncollected OPEN shift',
          function: 'OrdersService.listOrdersByShift',
          file: 'apps/api/src/modules/orders/orders.service.ts',
          tables: ['Order'],
        },
      ),
    );

    queries.push(
      await explain(
        'ORD-002-shift-lookup',
        `SELECT "branchId", "cashBoxId", status FROM "Shift" WHERE id = '${sid}'`,
        {
          prismaLocation: 'orders.service.ts:1008',
          function: 'OrdersService.listOrdersByShift',
          file: 'apps/api/src/modules/orders/orders.service.ts',
          tables: ['Shift'],
        },
      ),
    );
  }

  // Reports
  queries.push(
    await explain(
      'RPT-001-dashboard-orders-today',
      `SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM("totalAmount"), 0) AS sales
       FROM "Order"
       WHERE "branchId" = '${bid}'
         AND status = 'CLOSED'::"OrderStatus"
         AND "closedAt" >= '${fromDate.toISOString()}'::timestamptz`,
      {
        prismaLocation: 'reports.service.ts:18 — order.aggregate',
        function: 'ReportsService.dashboard',
        file: 'apps/api/src/modules/reports/reports.service.ts',
        tables: ['Order'],
      },
    ),
  );

  if (sid) {
    queries.push(
      await explain(
        'RPT-002-dashboard-open-shift-treasury-entries',
        `SELECT tt.id, tt.amount, tt."transactionType", tt."approvalStatus", tt."affectsCash"
         FROM "TreasuryTransaction" tt
         WHERE tt."shiftId" = (
           SELECT id FROM "Shift"
           WHERE "branchId" = '${bid}' AND status = 'OPEN'::"ShiftStatus"
           LIMIT 1
         )`,
        {
          prismaLocation: 'reports.service.ts:26 — shift.findFirst include treasuryEntries',
          function: 'ReportsService.dashboard',
          file: 'apps/api/src/modules/reports/reports.service.ts',
          tables: ['Shift', 'TreasuryTransaction'],
        },
      ),
    );
  }

  queries.push(
    await explain(
      'RPT-003-operations-kpi',
      `SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM(o."totalAmount"), 0) AS sales
       FROM "Order" o
       WHERE o."branchId" = '${bid}'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND COALESCE(o."closedAt", o."openedAt") >= (NOW() - INTERVAL '90 days')
         AND COALESCE(o."closedAt", o."openedAt") <= NOW()`,
      {
        prismaLocation: 'reports-analytics.service.ts:491 — getOperationsBreakdown kpi',
        function: 'ReportsAnalyticsService.getOperationsBreakdown',
        file: 'apps/api/src/modules/reports/reports-analytics.service.ts',
        tables: ['Order'],
      },
    ),
  );

  queries.push(
    await explain(
      'RPT-004-operations-top-products',
      `SELECT p.name, SUM(oi.quantity) AS quantity, SUM(oi."lineTotal") AS revenue
       FROM "OrderItem" oi
       JOIN "Order" o ON o.id = oi."orderId"
       JOIN "Product" p ON p.id = oi."productId"
       WHERE o."branchId" = '${bid}'
         AND o.status = 'CLOSED'::"OrderStatus"
         AND COALESCE(o."closedAt", o."openedAt") >= (NOW() - INTERVAL '90 days')
         AND COALESCE(o."closedAt", o."openedAt") <= NOW()
       GROUP BY p.name
       ORDER BY SUM(oi."lineTotal") DESC
       LIMIT 10`,
      {
        prismaLocation: 'reports-analytics.service.ts:504',
        function: 'ReportsAnalyticsService.getOperationsBreakdown',
        file: 'apps/api/src/modules/reports/reports-analytics.service.ts',
        tables: ['OrderItem', 'Order', 'Product'],
      },
    ),
  );

  queries.push(
    await explain(
      'RPT-005-treasury-report-balance',
      `SELECT amount, "transactionType", "paymentMethod", "safeType", "sourceType", "affectsCash"
       FROM "TreasuryTransaction"
       WHERE "branchId" = '${bid}' AND "approvalStatus" = 'APPROVED'::"ApprovalStatus"`,
      {
        prismaLocation: 'reports.service.ts:108 — getBranchTreasuryBalance',
        function: 'ReportsService.treasury',
        file: 'apps/api/src/modules/reports/reports.service.ts',
        tables: ['TreasuryTransaction'],
        estimatedRows: counts.treasuryApprovedBranch,
      },
    ),
  );

  queries.push(
    await explain(
      'RPT-006-treasury-transactions-list',
      `SELECT id, amount, "transactionType", "occurredAt"
       FROM "TreasuryTransaction"
       WHERE "branchId" = '${bid}'
       ORDER BY "occurredAt" DESC
       LIMIT 100`,
      {
        prismaLocation: 'reports.service.ts:113',
        function: 'ReportsService.treasury',
        file: 'apps/api/src/modules/reports/reports.service.ts',
        tables: ['TreasuryTransaction'],
      },
    ),
  );

  queries.push(
    await explain(
      'RPT-007-get-treasury-today',
      `SELECT amount, "paymentMethod", "safeType", "approvalStatus", "transactionType", "sourceType"
       FROM "TreasuryTransaction"
       WHERE "branchId" = '${bid}'
         AND "occurredAt" >= '${dayStart}'::timestamp
         AND "occurredAt" <= '${dayEnd}'::timestamp`,
      {
        prismaLocation: 'treasury.service.ts:578 — getTreasuryToday',
        function: 'TreasuryService.getTreasuryToday',
        file: 'apps/api/src/modules/treasury/treasury.service.ts',
        tables: ['TreasuryTransaction'],
      },
    ),
  );

  queries.push(
    await explain(
      'RPT-008-inventory-all-stock',
      `SELECT id, name, "onHandQuantity", "averageCost" FROM "StockItem" WHERE "branchId" = '${bid}'`,
      {
        prismaLocation: 'reports.service.ts:172',
        function: 'ReportsService.inventory',
        file: 'apps/api/src/modules/reports/reports.service.ts',
        tables: ['StockItem'],
      },
    ),
  );

  // Index listing from pg
  const indexes = await p.$queryRawUnsafe(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'TreasuryTransaction','Shift','Order','OrderItem','Product',
        'ProductCategory','PaymentMethod','CashierExpense','StockItem','ProductDailyPlan','Branch','CashBox'
      )
    ORDER BY tablename, indexname
  `);

  const tableStats = await p.$queryRawUnsafe(`
    SELECT relname AS table_name,
           n_live_tup AS estimated_live_rows,
           seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
    FROM pg_stat_user_tables
    WHERE relname IN (
      'TreasuryTransaction','Shift','Order','OrderItem','Product',
      'ProductCategory','PaymentMethod','CashierExpense','StockItem'
    )
    ORDER BY relname
  `);

  const out = {
    auditedAt: new Date().toISOString(),
    database: 'PostgreSQL via Prisma (Supabase remote)',
    sampleIds: { branchId: bid, shiftId: sid, organizationId: oid, dateKey },
    tableCounts: counts,
    pgTableStats: tableStats,
    indexes,
    queries,
  };

  const outPath = join(__dirname, '..', 'database-explain-results.json');
  writeFileSync(
    outPath,
    JSON.stringify(out, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
    'utf8',
  );
  console.log('Wrote', outPath);
  console.log('Queries:', queries.length, 'Errors:', queries.filter((q) => q.error).length);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
