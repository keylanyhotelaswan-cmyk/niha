/**
 * إغلاق ورديات OPEN مكررة وفارغة على نفس الخزنة — يبقي الأحدث فقط.
 *
 * Usage:
 *   node apps/api/scripts/repair-duplicate-open-shifts.mjs --dry-run
 *   node apps/api/scripts/repair-duplicate-open-shifts.mjs --apply
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: join(root, '.env') });

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function main() {
  const open = await prisma.shift.findMany({
    where: { status: 'OPEN' },
    include: {
      _count: { select: { orders: true, treasuryEntries: true, cashierExpenses: true } },
      cashBox: { select: { name: true } },
    },
    orderBy: { openedAt: 'asc' },
  });

  const byBox = new Map();
  for (const s of open) {
    if (!byBox.has(s.cashBoxId)) byBox.set(s.cashBoxId, []);
    byBox.get(s.cashBoxId).push(s);
  }

  let toClose = [];
  for (const [cashBoxId, shifts] of byBox) {
    if (shifts.length <= 1) continue;
    const keeper = shifts[shifts.length - 1];
    for (const s of shifts.slice(0, -1)) {
      const empty = s._count.orders === 0 && s._count.treasuryEntries === 0 && s._count.cashierExpenses === 0;
      if (empty) {
        toClose.push({ shift: s, keeper: keeper.shiftNumber, box: s.cashBox.name });
      } else {
        console.warn(`⚠️  ${s.shiftNumber} has activity — manual review required`);
      }
    }
  }

  if (!toClose.length) {
    console.log('No empty duplicate open shifts to close.');
    return;
  }

  console.log(`${apply ? 'Closing' : 'Would close'} ${toClose.length} phantom shift(s):`);
  for (const row of toClose) {
    console.log(`  - ${row.shift.shiftNumber} (${row.box}) → keep ${row.keeper}`);
  }

  if (!apply) {
    console.log('\nRun with --apply to execute.');
    return;
  }

  const closedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const row of toClose) {
      await tx.shift.update({
        where: { id: row.shift.id },
        data: { status: 'CLOSED', closedAt },
      });
      await tx.shiftClosing.create({
        data: {
          shiftId: row.shift.id,
          expectedCash: 0,
          countedCash: 0,
          varianceAmount: 0,
          ordersCount: 0,
          totalSales: 0,
          note: `إغلاق إصلاحي — وردية مكررة فارغة (يبقى ${row.keeper})`,
        },
      });
    }
  });

  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
