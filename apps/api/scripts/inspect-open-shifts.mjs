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
      _count: { select: { orders: true, treasuryEntries: true, cashierExpenses: true } },
      cashBox: { select: { name: true } },
      openedBy: { select: { fullName: true, username: true } },
    },
    orderBy: { openedAt: 'asc' },
  });

  for (const s of open) {
    console.log(
      `${s.shiftNumber} | ${s.cashBox.name} | orders=${s._count.orders} | tx=${s._count.treasuryEntries} | exp=${s._count.cashierExpenses} | ${s.openedAt.toISOString()}`,
    );
  }
}

main().finally(() => prisma.$disconnect());
