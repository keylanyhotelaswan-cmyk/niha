import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: join(root, '.env') });

const prisma = new PrismaClient();

async function main() {
  const open = await prisma.shift.findMany({
    where: { status: 'OPEN' },
    include: {
      branch: { select: { name: true } },
      cashBox: { select: { name: true, code: true } },
      openedBy: { select: { username: true, fullName: true } },
    },
    orderBy: { openedAt: 'asc' },
  });

  console.log(`OPEN shifts: ${open.length}`);
  for (const s of open) {
    console.log(
      `- ${s.shiftNumber} | ${s.branch.name} | ${s.cashBox.name} | ${s.openedBy.fullName ?? s.openedBy.username} | ${s.openedAt.toISOString()}`,
    );
  }

  const grouped = await prisma.shift.groupBy({
    by: ['cashBoxId'],
    where: { status: 'OPEN' },
    _count: { _all: true },
  });
  const dupes = grouped.filter((g) => g._count._all > 1);
  if (dupes.length) {
    console.log('\nDuplicate OPEN on same cash box:');
    for (const d of dupes) {
      const box = await prisma.cashBox.findUnique({ where: { id: d.cashBoxId }, select: { name: true } });
      console.log(`  ${box?.name ?? d.cashBoxId}: ${d._count._all} open shifts`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
