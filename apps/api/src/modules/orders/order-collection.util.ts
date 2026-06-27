import type { Prisma } from '@prisma/client';

/** تعريف موحّد: طلب غير محصّل (قائمة الوردية + ملخص KPI + الخزنة) */
export const uncollectedOrderOrWhere = {
  OR: [
    { collectionStatus: 'UNCOLLECTED' as const },
    { paymentStatus: 'PENDING' as const },
  ],
} satisfies Prisma.OrderWhereInput;

export function uncollectedOrderWhere(
  base: Prisma.OrderWhereInput,
): Prisma.OrderWhereInput {
  return { AND: [base, uncollectedOrderOrWhere] };
}

export function isUncollectedOrder(order: {
  collectionStatus: string;
  paymentStatus: string;
}): boolean {
  return (
    order.collectionStatus === 'UNCOLLECTED' || order.paymentStatus === 'PENDING'
  );
}
