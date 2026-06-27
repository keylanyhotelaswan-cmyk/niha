import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { name: 'asc' },
  });

  const monthStart = new Date('2026-06-01T00:00:00.000Z');
  const now = new Date();

  console.log('=== Branches ===');
  for (const b of branches) {
    console.log(`  ${b.name} (${b.id}) status=${b.status}`);
  }

  console.log('\n=== Orders by branch (all time) ===');
  for (const b of branches) {
    const byStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { branchId: b.id },
      _count: true,
    });
    const closed = byStatus.find((x) => x.status === 'CLOSED')?._count ?? 0;
    const total = byStatus.reduce((s, x) => s + x._count, 0);
    console.log(`  ${b.name}: total=${total} closed=${closed}`, byStatus.map((x) => `${x.status}:${x._count}`).join(', '));
  }

  console.log('\n=== Closed orders since Jun 1 ===');
  for (const b of branches) {
    const cnt = await prisma.order.count({
      where: {
        branchId: b.id,
        status: 'CLOSED',
        OR: [
          { closedAt: { gte: monthStart, lte: now } },
          { closedAt: null, openedAt: { gte: monthStart, lte: now } },
        ],
      },
    });
    const agg = await prisma.order.aggregate({
      where: {
        branchId: b.id,
        status: 'CLOSED',
        OR: [
          { closedAt: { gte: monthStart, lte: now } },
          { closedAt: null, openedAt: { gte: monthStart, lte: now } },
        ],
      },
      _sum: { totalAmount: true },
    });
    console.log(`  ${b.name}: count=${cnt} sales=${Number(agg._sum.totalAmount ?? 0)}`);
  }

  console.log('\n=== Sample closed orders (latest 5) ===');
  const samples = await prisma.order.findMany({
    where: { status: 'CLOSED' },
    select: {
      orderNumber: true,
      branchId: true,
      status: true,
      closedAt: true,
      openedAt: true,
      totalAmount: true,
      collectionStatus: true,
    },
    orderBy: { openedAt: 'desc' },
    take: 5,
  });
  for (const o of samples) {
    console.log(
      `  #${o.orderNumber} branch=${o.branchId.slice(0, 8)}… closedAt=${o.closedAt?.toISOString() ?? 'null'} openedAt=${o.openedAt.toISOString()} total=${o.totalAmount} coll=${o.collectionStatus}`,
    );
  }

  console.log('\n=== Closed shifts since Jun 1 ===');
  for (const b of branches) {
    const n = await prisma.shift.count({
      where: { branchId: b.id, status: 'CLOSED', closedAt: { gte: monthStart } },
    });
    console.log(`  ${b.name}: ${n} closed shifts`);
  }

  const nullClosedAt = await prisma.order.count({
    where: { status: 'CLOSED', closedAt: null },
  });
  console.log(`\n=== CLOSED orders with closedAt=null: ${nullClosedAt} ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
