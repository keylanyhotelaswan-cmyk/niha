import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { VendorLedgerService } from './vendor-ledger.service.js';

@Injectable()
export class VendorAccountsDashboardService {
  constructor(
    private prisma: PrismaService,
    private treasury: TreasuryService,
    private vendorLedger: VendorLedgerService,
  ) {}

  async getContext(branchId: string, cashBoxId?: string) {
    const treasury = await this.treasury.getBranchTreasuryBalance(branchId, cashBoxId);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [vendors, paymentsAgg, unpaidInvoices, recentPayments] = await Promise.all([
      this.prisma.vendor.findMany({ where: { branchId }, orderBy: { name: 'asc' } }),
      this.prisma.vendorPayment.aggregate({
        where: { branchId, paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.vendorInvoice.count({
        where: {
          branchId,
          status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        },
      }),
      this.prisma.vendorPayment.findMany({
        where: { branchId },
        include: { vendor: true, paymentMethod: true },
        orderBy: { paidAt: 'desc' },
        take: 8,
      }),
    ]);

    const vendorBalances = await Promise.all(
      vendors.map(async (v) => ({
        id: v.id,
        balance: await this.vendorLedger.getBalance(v.id),
      })),
    );
    const balanceMap = new Map(vendorBalances.map((b) => [b.id, b.balance]));
    const totalPayable = vendorBalances.reduce((s, b) => s + Math.max(0, b.balance), 0);
    const vendorsWithDebt = vendorBalances.filter((b) => b.balance > 0.01).length;

    return {
      treasury: {
        expensesSafe: treasury.expensesSafe,
        profitsSafe: treasury.profitsSafe,
        totalSafe: treasury.totalSafe,
        walletBalances: treasury.walletBalances,
      },
      summary: {
        vendorCount: vendors.length,
        totalPayable: Number(totalPayable.toFixed(2)),
        vendorsWithDebt,
        unpaidInvoices,
        paymentsThisMonth: Number(paymentsAgg._sum.amount ?? 0),
        paymentsCountThisMonth: paymentsAgg._count,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        vendorName: p.vendor.name,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod?.name ?? p.paymentMethod?.type,
        reference: p.reference,
      })),
      vendorBalances: Object.fromEntries(balanceMap),
    };
  }
}
