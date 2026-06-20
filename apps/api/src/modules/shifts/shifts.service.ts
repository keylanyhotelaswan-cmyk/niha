import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private treasuryService: TreasuryService,
  ) {}

  async autoOpenShift(openDto: OpenShiftDto, userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { branchId: openDto.branchId, cashBoxId: openDto.cashBoxId, status: 'OPEN' },
      include: { cashBox: true, openedBy: true },
    });

    if (existing) {
      const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
      if (perms.openedByIdFilter && existing.openedById !== userId) {
        throw new BadRequestException(
          'يوجد وردية مفتوحة على هذه الخزنة من مستخدم آخر. اطلب من المدير إغلاقها.',
        );
      }
      const summary = await this.treasuryService.getShiftSummary(existing.id);
      return { shiftOpen: true, shift: existing, summary, created: false };
    }

    const shift = await this.openShift({ ...openDto, openingFloat: openDto.openingFloat ?? 0 }, userId);
    const summary = await this.treasuryService.getShiftSummary(shift.id);
    return { shiftOpen: true, shift, summary, created: true };
  }

  async getPosContext(organizationId: string, userId?: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    if (!branch) {
      throw new NotFoundException('لا يوجد فرع مرتبط بحسابك');
    }

    const shiftWhere: Prisma.ShiftWhereInput = {
      branchId: branch.id,
      status: 'OPEN',
    };
    if (userId) {
      const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
      if (perms.openedByIdFilter) {
        shiftWhere.openedById = perms.openedByIdFilter;
      }
    }

    const openShift = await this.prisma.shift.findFirst({
      where: shiftWhere,
      include: { cashBox: true, openedBy: true },
      orderBy: { openedAt: 'desc' },
    });

    if (openShift) {
      const summary = await this.treasuryService.getShiftSummary(openShift.id);
      const posSummary = await this.getPosShiftSummary(openShift.id);
      return {
        branch: { id: branch.id, name: branch.name },
        cashBox: { id: openShift.cashBox.id, name: openShift.cashBox.name },
        shiftOpen: true,
        shift: openShift,
        summary,
        posSummary,
      };
    }

    const cashBox = await this.prisma.cashBox.findFirst({
      where: { branchId: branch.id },
      orderBy: { code: 'asc' },
    });
    if (!cashBox) {
      throw new BadRequestException('لا توجد خزنة للفرع — اطلب من المدير إضافة خزنة');
    }

    return {
      branch: { id: branch.id, name: branch.name },
      cashBox: { id: cashBox.id, name: cashBox.name },
      shiftOpen: false,
      shift: null,
      summary: null,
      posSummary: null,
    };
  }

  async listShiftsForUser(branchId: string, from?: string, to?: string, userId?: string) {
    let openedById: string | undefined;
    if (userId) {
      const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
      if (perms.openedByIdFilter) openedById = perms.openedByIdFilter;
    }
    return this.listShifts(branchId, from, to, openedById);
  }

  async listShifts(branchId: string, from?: string, to?: string, openedById?: string) {
    const fromDate = from ? new Date(from) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const where: Prisma.ShiftWhereInput = {
      branchId,
      openedAt: { gte: fromDate, lte: toDate },
    };
    if (openedById) where.openedById = openedById;

    const shifts = await this.prisma.shift.findMany({
      where,
      include: { cashBox: true, openedBy: true, closingRecord: true },
      orderBy: { openedAt: 'desc' },
    });

    return Promise.all(
      shifts.map(async (shift) => {
        const summary = await this.treasuryService.getShiftSummary(shift.id);
        return {
          shift,
          openingFloat: summary.openingFloat,
          incoming: summary.incoming,
          outgoing: summary.outgoing,
          pending: summary.pending,
          expectedCash: summary.expectedCash,
          byPaymentMethod: summary.byPaymentMethod,
          totalSales: summary.totalSales,
        };
      }),
    );
  }

  async collectorDailySummary(branchId: string, date?: string) {
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const payments = await this.prisma.orderPayment.findMany({
      where: {
        approvalStatus: 'APPROVED',
        collectedAt: { gte: start, lte: end },
        order: { branchId },
      },
      include: { collectedBy: true, paymentMethod: true },
    });

    const byUser = new Map<string, {
      userId: string;
      fullName: string;
      total: number;
      byMethod: Record<string, number>;
    }>();

    for (const payment of payments) {
      const userId = payment.collectedById ?? 'unknown';
      const fullName = payment.collectedBy?.fullName ?? 'غير معروف';
      const amount = Number(payment.amount);
      const methodKey = payment.paymentMethod?.code ?? payment.paymentMethod?.type ?? 'OTHER';

      if (!byUser.has(userId)) {
        byUser.set(userId, { userId, fullName, total: 0, byMethod: {} });
      }
      const entry = byUser.get(userId)!;
      entry.total += amount;
      entry.byMethod[methodKey] = (entry.byMethod[methodKey] ?? 0) + amount;
    }

    return {
      date: start.toISOString().slice(0, 10),
      collectors: Array.from(byUser.values()).sort((a, b) => b.total - a.total),
    };
  }

  async openShift(openDto: OpenShiftDto, userId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { branchId: openDto.branchId, cashBoxId: openDto.cashBoxId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException('An open shift already exists for this cash box');
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: openDto.branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const shiftNumber = await this.sequenceService.getNextNumber(branch.organizationId, 'SHIFT', openDto.branchId);
    const openingFloat = openDto.openingFloat ?? 0;
    const openedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.create({
        data: {
          branchId: openDto.branchId,
          cashBoxId: openDto.cashBoxId,
          openedById: userId,
          shiftNumber,
          openedAt,
          openingFloat,
        },
        include: { cashBox: true, openedBy: true },
      });

      await tx.shiftOpening.create({
        data: {
          shiftId: shift.id,
          createdById: userId,
          amount: openingFloat,
        },
      });

      if (openingFloat > 0) {
        await this.treasuryService.recordTransaction({
          branchId: openDto.branchId,
          cashBoxId: openDto.cashBoxId,
          shiftId: shift.id,
          transactionType: 'SHIFT_OPEN_FLOAT',
          paymentMethod: 'CASH',
          amount: openingFloat,
          sourceType: 'SHIFT',
          sourceId: shift.id,
          note: 'رصيد افتتاح الوردية',
          approvalStatus: 'APPROVED',
          collectionStatus: 'APPROVED',
          affectsCash: true,
        });
      }

      return shift;
    });
  }

  async closeShift(closeDto: CloseShiftDto, userId: string) {
    if (!userId) {
      throw new BadRequestException('لم يتم التعرف على المستخدم');
    }

    const shiftRecord = await this.prisma.shift.findUnique({ where: { id: closeDto.shiftId } });
    if (!shiftRecord) {
      throw new NotFoundException('الوردية غير موجودة');
    }
    if (shiftRecord.status !== 'OPEN') {
      throw new BadRequestException('الوردية مغلقة بالفعل');
    }

    const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
    if (perms.openedByIdFilter && shiftRecord.openedById !== userId) {
      throw new BadRequestException('لا يمكنك إغلاق وردية مستخدم آخر');
    }

    const closedAt = new Date();
    const summary = await this.treasuryService.getShiftSummary(closeDto.shiftId);

    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.update({
        where: { id: closeDto.shiftId },
        data: { status: 'CLOSED', closedAt },
        include: { cashBox: true, openedBy: true },
      });

      const closing = await tx.shiftClosing.create({
        data: {
          shiftId: closeDto.shiftId,
          createdById: userId,
          expectedCash: summary.expectedCash,
          countedCash: closeDto.countedCash,
          varianceAmount: closeDto.countedCash - summary.expectedCash,
          note: closeDto.note ?? null,
        },
      });

      return { shift, closing, summary };
    });
  }

  async currentShiftForCashBox(branchId: string, cashBoxId: string, userId?: string) {
    const where: Prisma.ShiftWhereInput = { branchId, cashBoxId, status: 'OPEN' };
    if (userId) {
      const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
      if (perms.openedByIdFilter) {
        where.openedById = perms.openedByIdFilter;
      }
    }

    const shift = await this.prisma.shift.findFirst({
      where,
      include: { cashBox: true, openedBy: true, treasuryEntries: { orderBy: { occurredAt: 'desc' }, take: 50 } },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) {
      return { shiftOpen: false, shift: null, summary: null };
    }

    const summary = await this.treasuryService.getShiftSummary(shift.id);
    return { shiftOpen: true, shift, summary };
  }

  async getPosShiftSummary(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { openedBy: true, cashBox: true },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const treasurySummary = await this.treasuryService.getShiftSummary(shiftId);

    const expenses = await this.prisma.cashierExpense.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'desc' },
    });
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesGeneral = expenses.filter((e) => e.kind === 'GENERAL').reduce((s, e) => s + Number(e.amount), 0);
    const expensesItems = expenses.filter((e) => e.kind === 'ITEM').reduce((s, e) => s + Number(e.amount), 0);

    const posOrderSelect = {
      id: true,
      orderNumber: true,
      orderType: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      captainName: true,
      totalAmount: true,
      discountAmount: true,
      note: true,
      collectionStatus: true,
      paymentStatus: true,
      status: true,
      closedAt: true,
      openedAt: true,
      items: { include: { product: true } },
    } as const;

    const orders = await this.prisma.order.findMany({
      where: { shiftId, status: { in: ['CLOSED', 'OPEN', 'SUSPENDED'] } },
      select: posOrderSelect,
      orderBy: { closedAt: 'desc' },
    });

    const pendingReceiptOrderIds = treasurySummary.transactions
      .filter((tx) => tx.transactionType === 'SALE_RECEIPT' && tx.approvalStatus === 'PENDING' && tx.sourceType === 'ORDER')
      .map((tx) => tx.sourceId);
    const loadedOrderIds = new Set(orders.map((o) => o.id));
    const missingReceiptOrderIds = pendingReceiptOrderIds.filter((id) => !loadedOrderIds.has(id));
    if (missingReceiptOrderIds.length) {
      const extraOrders = await this.prisma.order.findMany({
        where: { id: { in: missingReceiptOrderIds }, status: 'CLOSED' },
        select: posOrderSelect,
      });
      orders.push(...extraOrders);
    }

    const isUncollectedOrder = (order: { collectionStatus: string; paymentStatus: string }) =>
      order.collectionStatus === 'UNCOLLECTED' || order.paymentStatus === 'PENDING';

    let ordersCount = 0;
    let salesTotal = 0;
    let uncollectedTotal = 0;
    let suspendedCount = 0;
    const shiftClosedOrders: typeof orders = [];

    for (const order of orders) {
      if (order.status === 'SUSPENDED') {
        suspendedCount += 1;
        continue;
      }
      if (order.status !== 'CLOSED') continue;
      shiftClosedOrders.push(order);
      ordersCount += 1;
      const amount = Number(order.totalAmount);
      salesTotal += amount;
      if (isUncollectedOrder(order)) {
        uncollectedTotal += amount;
      }
    }

    let collectedApproved = 0;
    let collectedPending = 0;
    for (const tx of treasurySummary.transactions) {
      if (tx.transactionType !== 'SALE_RECEIPT') continue;
      const amount = Number(tx.amount);
      if (tx.approvalStatus === 'APPROVED') collectedApproved += amount;
      else if (tx.approvalStatus === 'PENDING') collectedPending += amount;
    }

    return {
      shift,
      openingFloat: treasurySummary.openingFloat,
      salesTotal: treasurySummary.totalSales,
      ordersCount,
      suspendedCount,
      shiftClosedOrders,
      collectedApproved,
      collectedPending,
      uncollectedTotal,
      expensesTotal,
      expensesGeneral,
      expensesItems,
      expenses,
      expectedCash: treasurySummary.expectedCash,
      pendingCashInCustody: treasurySummary.pendingCashInCustody,
      incoming: treasurySummary.incoming,
      outgoing: treasurySummary.outgoing,
      byPaymentMethod: treasurySummary.byPaymentMethod,
    };
  }
}
