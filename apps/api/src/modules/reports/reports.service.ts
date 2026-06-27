import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { ReportsAnalyticsService } from './reports-analytics.service.js';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private treasuryService: TreasuryService,
    private analytics: ReportsAnalyticsService,
  ) {}

  async dashboard(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersTodayAgg = await this.prisma.order.aggregate({
      where: { branchId, status: 'CLOSED', closedAt: { gte: today } },
      _sum: { totalAmount: true },
      _count: true,
    });

    const salesToday = Number(ordersTodayAgg._sum.totalAmount ?? 0);

    const openShift = await this.prisma.shift.findFirst({
      where: { branchId, status: 'OPEN' },
      include: { treasuryEntries: true },
    });

    let expectedCash = 0;
    if (openShift) {
      const opening = Number(openShift.openingFloat);
      let inAmt = 0;
      let outAmt = 0;
      for (const tx of openShift.treasuryEntries) {
        if (!tx.affectsCash || tx.approvalStatus !== 'APPROVED') continue;
        const amt = Number(tx.amount);
        if (['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'].includes(tx.transactionType)) inAmt += amt;
        else outAmt += amt;
      }
      expectedCash = opening + inAmt - outAmt;
    }

    const lowStock = await this.prisma.stockItem.findMany({
      where: { branchId, onHandQuantity: { lte: 10 } },
      take: 10,
    });

    const operatingExpensesToday = await this.prisma.operatingExpense.aggregate({
      where: { branchId, expenseDate: { gte: today } },
      _sum: { amount: true },
    });

    const treasuryToday = await this.treasuryService.getTreasuryToday(branchId);
    const pendingCollections = await this.treasuryService.listPendingCollections(branchId);

    return {
      salesToday,
      ordersCountToday: ordersTodayAgg._count,
      expectedCash,
      shiftOpen: !!openShift,
      lowStockCount: lowStock.length,
      operatingExpensesToday: Number(operatingExpensesToday._sum.amount ?? 0),
      pendingCollectionsCount: pendingCollections.length,
      pendingCollectionsTotal: treasuryToday.pendingTotal,
      treasuryTodayApproved: treasuryToday.approvedTotal,
    };
  }

  async operations(branchId: string, from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    if (!to) {
      toDate.setHours(23, 59, 59, 999);
    }
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [breakdown, shiftHistory] = await Promise.all([
      this.analytics.getOperationsBreakdown(branchId, fromDate, toDate),
      this.analytics.getShiftSalesHistory(branchId, fromDate, toDate),
    ]);

    const { orderCount, totalSales, salesByCashier, topSellingItems } = breakdown;
    const shiftOrdersTotal = shiftHistory.reduce((s, sh) => s + sh.ordersCount, 0);

    return {
      dataSource: 'historical',
      dataSourceNote:
        'سجل تاريخي من قاعدة البيانات — يشمل فواتير الورديات المغلقة حتى لو اختفت من شاشة نقطة البيع.',
      kpis: [
        { label: 'إجمالي المبيعات', value: totalSales, note: `${orderCount} فاتورة مغلقة` },
        { label: 'متوسط الفاتورة', value: orderCount ? totalSales / orderCount : 0, note: 'آخر 90 يوم (افتراضي)' },
        { label: 'ورديات مغلقة', value: shiftHistory.length, note: `${shiftOrdersTotal} فاتورة محفوظة` },
      ],
      salesByCashier,
      topSellingItems,
      shiftHistory,
      ordersAnalyzed: orderCount,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }

  async treasury(branchId: string, shiftId?: string) {
    const treasuryToday = await this.treasuryService.getTreasuryToday(branchId);
    const treasuryCumulative = await this.treasuryService.getBranchTreasuryBalance(branchId);

    const where: Record<string, string> = { branchId };
    if (shiftId) where.shiftId = shiftId;

    const transactions = await this.prisma.treasuryTransaction.findMany({
      where,
      include: { paymentMethodRef: true },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    const totalIn = transactions
      .filter((t) => t.affectsCash && t.approvalStatus === 'APPROVED' && ['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'].includes(t.transactionType))
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalOut = transactions
      .filter((t) => t.affectsCash && t.approvalStatus === 'APPROVED' && !['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'].includes(t.transactionType))
      .reduce((s, t) => s + Number(t.amount), 0);

    return {
      kpis: [
        { label: 'تحصيل معتمد اليوم', value: treasuryToday.approvedTotal, note: 'كل طرق الدفع' },
        { label: 'تحصيل معلق اليوم', value: treasuryToday.pendingTotal, note: 'بانتظار الاعتماد' },
        { label: 'نقدي في العهدة', value: treasuryToday.physicalCash, note: 'الوردية المفتوحة' },
      ],
      treasuryToday,
      treasuryCumulative,
      transactions,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }

  async setup(branchId: string) {
    const items = await this.prisma.setupCostItem.findMany({
      where: { branchId },
      include: { category: true },
    });

    const contracted = items.reduce((s, i) => s + Number(i.contractedAmount), 0);
    const paid = items.reduce((s, i) => s + Number(i.paidAmount), 0);

    const byCategory = new Map<string, { category: string; contracted: number; paid: number }>();
    for (const item of items) {
      const cat = item.category?.name ?? 'غير مصنف';
      const entry = byCategory.get(cat) ?? { category: cat, contracted: 0, paid: 0 };
      entry.contracted += Number(item.contractedAmount);
      entry.paid += Number(item.paidAmount);
      byCategory.set(cat, entry);
    }

    return {
      kpis: [
        { label: 'إجمالي التأسيس', value: contracted, note: 'قيمة البنود' },
        { label: 'المسدد', value: paid, note: 'دفعات فعلية' },
        { label: 'المتبقي', value: contracted - paid, note: 'التزامات متبقية' },
      ],
      setupByCategory: [...byCategory.values()],
    };
  }

  async inventory(branchId: string) {
    const items = await this.prisma.stockItem.findMany({ where: { branchId } });
    const totalValue = items.reduce((s, i) => s + Number(i.onHandQuantity) * Number(i.averageCost), 0);
    const lowStock = items.filter((i) => Number(i.onHandQuantity) <= 10);

    return {
      kpis: [
        { label: 'قيمة المخزون', value: totalValue, note: 'بمتوسط التكلفة' },
        { label: 'عدد الأصناف', value: items.length, note: 'خامات مسجلة' },
        { label: 'تنبيهات المخزون', value: lowStock.length, note: 'أصناف منخفضة' },
      ],
      lowStockItems: lowStock.slice(0, 10).map((i) => ({ name: i.name, onHand: Number(i.onHandQuantity) })),
    };
  }
}
