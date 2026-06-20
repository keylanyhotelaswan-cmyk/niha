import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';

@Injectable()
export class SetupCostsService {
  constructor(
    private prisma: PrismaService,
    private treasuryService: TreasuryService,
  ) {}

  listCategories() {
    return this.prisma.setupCategory.findMany({ orderBy: { name: 'asc' } });
  }

  listItems(branchId: string, categoryId?: string) {
    return this.prisma.setupCostItem.findMany({
      where: { branchId, ...(categoryId ? { categoryId } : {}) },
      include: { category: true, payments: true },
      orderBy: { incurredAt: 'desc' },
    });
  }

  createItem(data: {
    branchId: string;
    categoryId: string;
    title: string;
    contractedAmount: number;
    vendorName?: string;
    incurredAt?: Date;
  }) {
    return this.prisma.setupCostItem.create({
      data: {
        branchId: data.branchId,
        categoryId: data.categoryId,
        title: data.title,
        contractedAmount: data.contractedAmount,
        vendorName: data.vendorName ?? null,
        incurredAt: data.incurredAt ?? new Date(),
      },
      include: { category: true, payments: true },
    });
  }

  async addPayment(data: {
    setupCostItemId: string;
    branchId: string;
    paymentMethodId: string;
    cashBoxId?: string;
    amount: number;
    reference?: string;
    createdById?: string;
  }) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.setupCostPayment.create({
        data: {
          setupCostItemId: data.setupCostItemId,
          branchId: data.branchId,
          paymentMethodId: data.paymentMethodId,
          amount: data.amount,
          reference: data.reference ?? null,
          createdById: data.createdById ?? null,
        },
      });

      const item = await tx.setupCostItem.findUnique({ where: { id: data.setupCostItemId } });
      if (item) {
        const newPaid = Number(item.paidAmount) + data.amount;
        await tx.setupCostItem.update({
          where: { id: data.setupCostItemId },
          data: { paidAmount: newPaid },
        });
      }

      return payment;
    });

    const [paymentMethod, cashBox] = await Promise.all([
      this.prisma.paymentMethod.findUnique({ where: { id: data.paymentMethodId } }),
      data.cashBoxId
        ? this.prisma.cashBox.findUnique({ where: { id: data.cashBoxId } })
        : this.prisma.cashBox.findFirst({ where: { branchId: data.branchId }, orderBy: { name: 'asc' } }),
    ]);

    if (cashBox && paymentMethod) {
      await this.treasuryService.recordTransaction({
        branchId: data.branchId,
        cashBoxId: cashBox.id,
        safeType: 'EXPENSES',
        transactionType: 'SETUP_COST_PAYMENT',
        paymentMethod: paymentMethod.type,
        paymentMethodId: paymentMethod.id,
        amount: data.amount,
        sourceType: 'SETUP_COST_PAYMENT',
        sourceId: payment.id,
        note: data.reference ? `دفعة تأسيس: ${data.reference}` : 'دفعة تأسيس',
        affectsCash: paymentMethod.type === 'CASH',
        approvalStatus: 'APPROVED',
        collectionStatus: 'APPROVED',
      });
    }

    return payment;
  }
}
