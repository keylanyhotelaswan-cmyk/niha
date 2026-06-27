import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const branchId = 'a33633ba-aad8-41c9-80cf-9cdf91baa575';
const toDate = new Date();
toDate.setHours(23, 59, 59, 999);
const fromDate = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);

async function main() {
  console.log('from', fromDate.toISOString(), 'to', toDate.toISOString());

  const dateFilter = Prisma.sql`
    o."branchId" = ${branchId}
    AND o.status = 'CLOSED'
    AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
    AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
  `;

  const kpiRows = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM(o."totalAmount"), 0) AS sales
    FROM "Order" o
    WHERE ${dateFilter}
  `;
  console.log('KPI (nested dateFilter):', kpiRows);

  const kpiInline = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS cnt, COALESCE(SUM(o."totalAmount"), 0) AS sales
    FROM "Order" o
    WHERE o."branchId" = ${branchId}
      AND o.status = 'CLOSED'
      AND COALESCE(o."closedAt", o."openedAt") >= ${fromDate}
      AND COALESCE(o."closedAt", o."openedAt") <= ${toDate}
  `;
  console.log('KPI (inline):', kpiInline);

  const shiftRaw = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n
    FROM "Shift" s
    WHERE s."branchId" = ${branchId}
      AND s.status = 'CLOSED'
      AND s."closedAt" >= ${fromDate}
      AND s."closedAt" <= ${toDate}
  `;
  console.log('Closed shifts:', shiftRaw);
}

main().finally(() => prisma.$disconnect());
