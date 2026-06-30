import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { ProductionPlanService } from '../production-plan/production-plan.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { ShiftWalletTransferDto } from './dto/shift-wallet-transfer.dto.js';
import { splitPosCatalogProducts } from './pos-catalog-sauces.js';
import {
  aggregateExpensesByPaymentMethod,
  aggregateShiftWalletTransfers,
  netCollectionByMethod,
} from './shift-collection-net.js';
import {
  isUncollectedOrder,
  uncollectedOrderOrWhere,
  uncollectedOrderWhere,
} from '../orders/order-collection.util.js';

const SHIFT_WALLET_METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي',
  INSTAPAY: 'انستاباي',
  WALLET: 'محفظة',
};

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private treasuryService: TreasuryService,
    private productionPlanService: ProductionPlanService,
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
    return {
      shiftOpen: true,
      shift,
      summary,
      created: true,
      ...(shift.acceptedHandoff ? { acceptedHandoff: shift.acceptedHandoff } : {}),
    };
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
      const posSummary = await this.getPosShiftSummary(openShift.id, { includeOrders: false });
      return {
        branch: { id: branch.id, name: branch.name },
        cashBox: { id: openShift.cashBox.id, name: openShift.cashBox.name },
        shiftOpen: true,
        shift: openShift,
        summary: {
          openingFloat: posSummary.openingFloat,
          incoming: posSummary.incoming,
          outgoing: posSummary.outgoing,
          pending: posSummary.pendingCashInCustody,
          pendingCashInCustody: posSummary.pendingCashInCustody,
          expectedCash: posSummary.expectedCash,
          totalSales: posSummary.salesTotal,
          byPaymentMethod: posSummary.byPaymentMethod,
          salesByMethod: posSummary.salesByMethod,
          expensesTotal: posSummary.expensesTotal,
          expensesByPaymentMethod: posSummary.expensesByPaymentMethod,
          netSalesByMethod: posSummary.netSalesByMethod,
          walletTransfers: posSummary.walletTransfers,
          ordersCount: posSummary.ordersCount,
          uncollectedCount: posSummary.uncollectedCount,
          uncollectedTotal: posSummary.uncollectedTotal,
        },
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
    const branch = await this.prisma.branch.findUnique({ where: { id: openDto.branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const openingFloat = openDto.openingFloat ?? 0;
    const openedAt = new Date();

    const txResult = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findFirst({
        where: { branchId: openDto.branchId, cashBoxId: openDto.cashBoxId, status: 'OPEN' },
      });
      if (existing) {
        throw new BadRequestException('يوجد وردية مفتوحة على هذه الخزنة بالفعل');
      }

      const shiftNumber = await this.sequenceService.getNextNumber(branch.organizationId, 'SHIFT', openDto.branchId);

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
        await this.recordShiftOpenFloatTx(tx, {
          branchId: openDto.branchId,
          cashBoxId: openDto.cashBoxId,
          shiftId: shift.id,
          amount: openingFloat,
          note: 'رصيد افتتاح الوردية',
          occurredAt: openedAt,
        });
      }

      const acceptedHandoff = await this.acceptPendingCashHandoff(openDto.cashBoxId, shift.id, tx);
      return { shift, acceptedHandoff };
    });

    return { ...txResult.shift, acceptedHandoff: txResult.acceptedHandoff };
  }

  async getHandoffOptions(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { cashBox: true, openedBy: true },
    });
    if (!shift) {
      throw new NotFoundException('الوردية غير موجودة');
    }

    const pending = await this.countTransferableOrders(shiftId);
    const openShifts = await this.prisma.shift.findMany({
      where: { branchId: shift.branchId, status: 'OPEN', id: { not: shiftId } },
      include: { openedBy: true, cashBox: true },
      orderBy: { openedAt: 'desc' },
    });
    const cashBoxes = await this.prisma.cashBox.findMany({
      where: { branchId: shift.branchId },
      orderBy: { code: 'asc' },
    });
    const openOnSameCashBox = await this.prisma.shift.findFirst({
      where: { cashBoxId: shift.cashBoxId, status: 'OPEN', id: { not: shiftId } },
      select: { id: true, shiftNumber: true },
    });

    return {
      shift: {
        id: shift.id,
        shiftNumber: shift.shiftNumber,
        cashBoxId: shift.cashBoxId,
        cashBoxName: shift.cashBox.name,
        cashierName: shift.openedBy.fullName ?? shift.openedBy.username ?? '—',
      },
      pending,
      openShifts: openShifts.map((s) => ({
        id: s.id,
        shiftNumber: s.shiftNumber,
        cashierName: s.openedBy.fullName ?? s.openedBy.username ?? '—',
        cashBoxId: s.cashBoxId,
        cashBoxName: s.cashBox.name,
        openedAt: s.openedAt.toISOString(),
      })),
      cashBoxes: cashBoxes.map((c) => ({ id: c.id, name: c.name, code: c.code })),
      hasOpenShiftOnCashBox: Boolean(openOnSameCashBox),
      canOpenSuccessor: !openOnSameCashBox,
    };
  }

  async getPendingCashHandoff(cashBoxId: string) {
    const row = await this.prisma.shiftCashHandoff.findFirst({
      where: { cashBoxId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      fromShiftNumber: row.fromShiftNumber,
      handedByName: row.handedByName,
      cashAmount: Number(row.cashAmount),
      uncollectedCount: row.uncollectedCount,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async resolveUserDisplayName(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, username: true },
    });
    return user?.fullName?.trim() || user?.username?.trim() || null;
  }

  private async acceptPendingCashHandoff(
    cashBoxId: string,
    acceptedShiftId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const pending = await tx.shiftCashHandoff.findFirst({
      where: { cashBoxId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) return null;
    await tx.shiftCashHandoff.update({
      where: { id: pending.id },
      data: { status: 'ACCEPTED', acceptedShiftId, acceptedAt: new Date() },
    });
    return {
      id: pending.id,
      fromShiftNumber: pending.fromShiftNumber,
      handedByName: pending.handedByName,
      cashAmount: Number(pending.cashAmount),
      uncollectedCount: pending.uncollectedCount,
      note: pending.note,
    };
  }

  async closeShift(closeDto: CloseShiftDto, userId: string) {
    if (!userId) {
      throw new BadRequestException('لم يتم التعرف على المستخدم');
    }

    const shiftRecord = await this.prisma.shift.findUnique({
      where: { id: closeDto.shiftId },
      include: { cashBox: true, openedBy: true },
    });
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

    const branch = await this.prisma.branch.findUnique({ where: { id: shiftRecord.branchId } });
    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    const handoffMode = closeDto.handoffMode ?? 'defer';
    const pending = await this.countTransferableOrders(closeDto.shiftId);
    const handoffNote = closeDto.note?.trim() ?? null;
    const handedByName = await this.resolveUserDisplayName(userId);

    let targetShiftId: string | null = null;
    let targetCashBoxId: string | null = null;
    let targetShiftNumber: string | null = null;

    if (handoffMode === 'existing') {
      if (!closeDto.targetShiftId) {
        throw new BadRequestException('حدد وردية المستلم');
      }
      const target = await this.prisma.shift.findUnique({
        where: { id: closeDto.targetShiftId },
        include: { cashBox: true, openedBy: true },
      });
      if (!target || target.status !== 'OPEN') {
        throw new BadRequestException('وردية المستلم غير متاحة');
      }
      if (target.branchId !== shiftRecord.branchId) {
        throw new BadRequestException('يجب أن تكون وردية المستلم في نفس الفرع');
      }
      if (target.id === closeDto.shiftId) {
        throw new BadRequestException('لا يمكن التسليم لنفس الوردية');
      }
      targetShiftId = target.id;
      targetCashBoxId = target.cashBoxId;
      targetShiftNumber = target.shiftNumber;
    } else if (handoffMode === 'successor') {
      targetCashBoxId = closeDto.successorCashBoxId ?? shiftRecord.cashBoxId;
      const conflict = await this.prisma.shift.findFirst({
        where: { cashBoxId: targetCashBoxId, status: 'OPEN', id: { not: closeDto.shiftId } },
      });
      if (conflict) {
        throw new BadRequestException('توجد وردية مفتوحة على الخزنة — استخدم «تسليم للكاشير التالي» أو اختر وردية مفتوحة أخرى');
      }
    }

    const closedAt = new Date();
    const summary = await this.treasuryService.getShiftSummary(closeDto.shiftId);
    const transferPlan = handoffMode === 'existing' && pending.total > 0 && targetShiftId
      ? await this.planOrderHandoff({
          sourceShiftId: closeDto.shiftId,
          targetShiftId,
          organizationId: branch.organizationId,
          branchId: shiftRecord.branchId,
        })
      : null;

    const txResult = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.update({
        where: { id: closeDto.shiftId },
        data: { status: 'CLOSED', closedAt },
        include: { cashBox: true, openedBy: true },
      });

      const closingNoteParts: string[] = [];
      if (handoffNote) closingNoteParts.push(handoffNote);

      const closing = await tx.shiftClosing.create({
        data: {
          shiftId: closeDto.shiftId,
          createdById: userId,
          expectedCash: summary.expectedCash,
          countedCash: closeDto.countedCash,
          varianceAmount: closeDto.countedCash - summary.expectedCash,
          ordersCount: summary.ordersCount ?? 0,
          totalSales: summary.totalSales ?? 0,
          note: handoffNote,
        },
      });

      let successor: typeof shift | null = null;
      let transferredCount = 0;
      let cashHandoffId: string | null = null;

      if (handoffMode === 'defer') {
        await tx.shiftCashHandoff.updateMany({
          where: { cashBoxId: shiftRecord.cashBoxId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        const handoff = await tx.shiftCashHandoff.create({
          data: {
            branchId: shiftRecord.branchId,
            cashBoxId: shiftRecord.cashBoxId,
            fromShiftId: closeDto.shiftId,
            fromShiftNumber: shiftRecord.shiftNumber,
            handedById: userId,
            handedByName,
            cashAmount: closeDto.countedCash,
            uncollectedCount: pending.uncollectedCount,
            note: handoffNote,
          },
        });
        cashHandoffId = handoff.id;
        closingNoteParts.push(`تسليم ${closeDto.countedCash} ج.م للكاشير التالي`);
      } else if (handoffMode === 'treasury') {
        if (closeDto.countedCash > 0) {
          await tx.treasuryTransaction.create({
            data: {
              branchId: shiftRecord.branchId,
              cashBoxId: shiftRecord.cashBoxId,
              shiftId: closeDto.shiftId,
              safeType: 'EXPENSES',
              transactionType: 'CASH_DEPOSIT',
              paymentMethod: 'CASH',
              amount: closeDto.countedCash,
              sourceType: 'SHIFT',
              sourceId: closeDto.shiftId,
              note: `تسليم عهدة وردية ${shiftRecord.shiftNumber} للإدارة`,
              approvalStatus: 'APPROVED',
              collectionStatus: 'APPROVED',
              affectsCash: true,
              occurredAt: closedAt,
            },
          });
        }
        closingNoteParts.push('تسليم العهدة للإدارة');
      } else if (handoffMode === 'successor') {
        const openingFloat = closeDto.successorOpeningFloat ?? closeDto.countedCash;
        const shiftNumber = await this.sequenceService.getNextNumber(
          branch.organizationId,
          'SHIFT',
          shiftRecord.branchId,
        );
        successor = await tx.shift.create({
          data: {
            branchId: shiftRecord.branchId,
            cashBoxId: targetCashBoxId!,
            openedById: userId,
            shiftNumber,
            openedAt: closedAt,
            openingFloat,
          },
          include: { cashBox: true, openedBy: true },
        });
        await tx.shiftOpening.create({
          data: {
            shiftId: successor.id,
            createdById: userId,
            amount: openingFloat,
            note: `تسليم من وردية ${shiftRecord.shiftNumber}`,
          },
        });
        targetShiftId = successor.id;
        targetShiftNumber = successor.shiftNumber;

        if (openingFloat > 0) {
          await this.recordShiftOpenFloatTx(tx, {
            branchId: shiftRecord.branchId,
            cashBoxId: successor.cashBoxId,
            shiftId: successor.id,
            amount: openingFloat,
            note: `تسليم عهدة من وردية ${shiftRecord.shiftNumber}`,
            occurredAt: closedAt,
          });
        }
      }

      if (handoffMode === 'existing' && targetShiftId && targetCashBoxId && transferPlan?.length) {
        transferredCount = await this.transferPendingOrders({
          tx,
          targetShiftId,
          targetCashBoxId,
          transfers: transferPlan,
        });
      }

      if (closingNoteParts.length) {
        await tx.shiftClosing.update({
          where: { id: closing.id },
          data: { note: closingNoteParts.join(' · ') },
        });
      }

      if (transferredCount > 0 && targetShiftNumber) {
        await tx.shiftClosing.update({
          where: { id: closing.id },
          data: {
            note: [
              closingNoteParts.join(' · '),
              `نقل ${transferredCount} طلب/سلة إلى وردية ${targetShiftNumber}`,
            ].filter(Boolean).join(' · '),
          },
        });
      }

      const closedDuplicates = await this.closeEmptyDuplicateOpenShifts(
        tx,
        shiftRecord.cashBoxId,
        closeDto.shiftId,
        closedAt,
        userId,
      );

      return { shift, closing, successor, transferredCount, cashHandoffId, closedDuplicates };
    }, { maxWait: 15_000, timeout: 120_000 });

    return {
      shift: txResult.shift,
      closing: txResult.closing,
      summary,
      successorShift: txResult.successor,
      cashHandoffId: txResult.cashHandoffId,
      closedDuplicates: txResult.closedDuplicates,
      handoff: {
        mode: handoffMode,
        targetShiftId,
        targetShiftNumber,
        transferredCount: txResult.transferredCount,
        cashAmount: handoffMode === 'defer' ? closeDto.countedCash : null,
        handedByName: handoffMode === 'defer' ? handedByName : null,
      },
    };
  }

  private async closeEmptyDuplicateOpenShifts(
    tx: Prisma.TransactionClient,
    cashBoxId: string,
    keepShiftId: string,
    closedAt: Date,
    userId: string,
  ) {
    const empties = await tx.shift.findMany({
      where: {
        cashBoxId,
        status: 'OPEN',
        id: { not: keepShiftId },
        orders: { none: {} },
        treasuryEntries: { none: {} },
        cashierExpenses: { none: {} },
      },
      select: { id: true, shiftNumber: true },
    });

    for (const phantom of empties) {
      await tx.shift.update({
        where: { id: phantom.id },
        data: { status: 'CLOSED', closedAt },
      });
      await tx.shiftClosing.create({
        data: {
          shiftId: phantom.id,
          createdById: userId,
          expectedCash: 0,
          countedCash: 0,
          varianceAmount: 0,
          ordersCount: 0,
          totalSales: 0,
          note: `إغلاق تلقائي — وردية مكررة فارغة (${phantom.shiftNumber})`,
        },
      });
    }

    return empties.length;
  }

  private async countTransferableOrders(shiftId: string) {
    const uncollectedWhere = uncollectedOrderWhere({ shiftId, status: 'CLOSED' });
    const [uncollectedCount, suspendedCount, openCount] = await Promise.all([
      this.prisma.order.count({ where: uncollectedWhere }),
      this.prisma.order.count({ where: { shiftId, status: 'SUSPENDED' } }),
      this.prisma.order.count({ where: { shiftId, status: 'OPEN' } }),
    ]);
    return {
      uncollectedCount,
      suspendedCount,
      openCount,
      total: uncollectedCount + suspendedCount + openCount,
    };
  }

  private recordShiftOpenFloatTx(
    tx: Prisma.TransactionClient,
    params: {
      branchId: string;
      cashBoxId: string;
      shiftId: string;
      amount: number;
      note: string;
      occurredAt: Date;
    },
  ) {
    return tx.treasuryTransaction.create({
      data: {
        branchId: params.branchId,
        cashBoxId: params.cashBoxId,
        shiftId: params.shiftId,
        safeType: 'EXPENSES',
        transactionType: 'SHIFT_OPEN_FLOAT',
        paymentMethod: 'CASH',
        amount: params.amount,
        sourceType: 'SHIFT',
        sourceId: params.shiftId,
        note: params.note,
        approvalStatus: 'APPROVED',
        collectionStatus: 'APPROVED',
        affectsCash: true,
        occurredAt: params.occurredAt,
      },
    });
  }

  private pendingOrdersWhere(sourceShiftId: string): Prisma.OrderWhereInput {
    return {
      shiftId: sourceShiftId,
      OR: [
        { status: 'SUSPENDED' },
        { status: 'OPEN' },
        {
          status: 'CLOSED',
          ...uncollectedOrderOrWhere,
        },
      ],
    };
  }

  private async planOrderHandoff(params: {
    sourceShiftId: string;
    targetShiftId?: string;
    organizationId: string;
    branchId: string;
  }) {
    const orders = await this.prisma.order.findMany({
      where: this.pendingOrdersWhere(params.sourceShiftId),
      select: { id: true, orderNumber: true },
    });
    if (!orders.length) return [];

    const existingNumbers = new Set(
      params.targetShiftId
        ? (
            await this.prisma.order.findMany({
              where: { shiftId: params.targetShiftId },
              select: { orderNumber: true },
            })
          ).map((o) => o.orderNumber)
        : [],
    );

    const transfers: Array<{ orderId: string; orderNumber: string; previousOrderNumber: string }> = [];
    for (const order of orders) {
      let orderNumber = order.orderNumber;
      if (existingNumbers.has(orderNumber)) {
        orderNumber = await this.sequenceService.getNextShiftOrderNumber(
          params.organizationId,
          params.branchId,
          params.targetShiftId ?? params.sourceShiftId,
        );
      }
      existingNumbers.add(orderNumber);
      transfers.push({ orderId: order.id, orderNumber, previousOrderNumber: order.orderNumber });
    }
    return transfers;
  }

  private async transferPendingOrders(params: {
    tx: Prisma.TransactionClient;
    targetShiftId: string;
    targetCashBoxId: string;
    transfers: Array<{ orderId: string; orderNumber: string; previousOrderNumber: string }>;
  }) {
    if (!params.transfers.length) return 0;

    const orderIds = params.transfers.map((t) => t.orderId);
    await params.tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        shiftId: params.targetShiftId,
        cashBoxId: params.targetCashBoxId,
      },
    });
    await params.tx.orderPayment.updateMany({
      where: { orderId: { in: orderIds } },
      data: { shiftId: params.targetShiftId },
    });

    for (const transfer of params.transfers) {
      if (transfer.orderNumber === transfer.previousOrderNumber) continue;
      await params.tx.order.update({
        where: { id: transfer.orderId },
        data: { orderNumber: transfer.orderNumber },
      });
    }

    return params.transfers.length;
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

  async getPosShiftSummary(shiftId: string, opts?: { includeOrders?: boolean }) {
    const includeOrders = opts?.includeOrders !== false;

    const [shift, treasurySummary, expenses, walletTransferTxs] = await Promise.all([
      this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: { openedBy: true, cashBox: true },
      }),
      this.treasuryService.getShiftSummary(shiftId),
      this.prisma.cashierExpense.findMany({
        where: { shiftId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.treasuryTransaction.findMany({
        where: {
          shiftId,
          sourceType: { in: ['SHIFT_WALLET_TRANSFER_OUT', 'SHIFT_WALLET_TRANSFER_IN'] },
        },
        select: { amount: true, paymentMethod: true, sourceType: true },
      }),
    ]);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesGeneral = expenses.filter((e) => e.kind === 'GENERAL').reduce((s, e) => s + Number(e.amount), 0);
    const expensesItems = expenses.filter((e) => e.kind === 'ITEM').reduce((s, e) => s + Number(e.amount), 0);
    const expensesByPaymentMethod = aggregateExpensesByPaymentMethod(expenses);
    const walletTransfers = aggregateShiftWalletTransfers(walletTransferTxs);
    const netSalesByMethod = netCollectionByMethod(
      treasurySummary.salesByMethod,
      expensesByPaymentMethod,
      walletTransfers,
    );

    let collectedApproved = 0;
    let collectedPending = 0;
    for (const tx of treasurySummary.transactions) {
      if (tx.transactionType !== 'SALE_RECEIPT') continue;
      const amount = Number(tx.amount);
      if (tx.approvalStatus === 'APPROVED') collectedApproved += amount;
      else if (tx.approvalStatus === 'PENDING') collectedPending += amount;
    }

    const base = {
      shift,
      openingFloat: treasurySummary.openingFloat,
      salesTotal: treasurySummary.totalSales,
      collectedApproved,
      collectedPending,
      expensesTotal,
      expensesGeneral,
      expensesItems,
      expenses,
      expectedCash: treasurySummary.expectedCash,
      pendingCashInCustody: treasurySummary.pendingCashInCustody,
      incoming: treasurySummary.incoming,
      outgoing: treasurySummary.outgoing,
      byPaymentMethod: treasurySummary.byPaymentMethod,
      salesByMethod: treasurySummary.salesByMethod,
      expensesByPaymentMethod,
      walletTransfers,
      netSalesByMethod,
    };

    if (!includeOrders) {
      const uncollectedWhere = uncollectedOrderWhere({ shiftId, status: 'CLOSED' });
      const [ordersCount, salesAgg, uncollectedAgg, uncollectedOrdersRaw, suspendedCount] = await Promise.all([
        this.prisma.order.count({ where: { shiftId, status: 'CLOSED' } }),
        this.prisma.order.aggregate({
          where: { shiftId, status: 'CLOSED' },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.aggregate({
          where: uncollectedWhere,
          _sum: { totalAmount: true },
          _count: true,
        }),
        this.prisma.order.findMany({
          where: uncollectedWhere,
          select: { orderNumber: true, totalAmount: true, customerName: true },
          orderBy: { closedAt: 'desc' },
          take: 25,
        }),
        this.prisma.order.count({ where: { shiftId, status: 'SUSPENDED' } }),
      ]);

      return {
        ...base,
        ordersCount,
        salesTotal: Number(salesAgg._sum.totalAmount ?? 0),
        suspendedCount,
        shiftClosedOrders: [],
        uncollectedCount: uncollectedAgg._count,
        uncollectedTotal: Number(uncollectedAgg._sum.totalAmount ?? 0),
        uncollectedOrders: uncollectedOrdersRaw.map((o) => ({
          orderNumber: o.orderNumber,
          total: Number(o.totalAmount),
          customerName: o.customerName,
        })),
      };
    }

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
      cancelRequestedAt: true,
      cancellationReason: true,
      closedAt: true,
      openedAt: true,
      createdBy: { select: { fullName: true, username: true } },
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

    let ordersCount = 0;
    let salesTotal = 0;
    let uncollectedTotal = 0;
    let uncollectedCount = 0;
    let suspendedCount = 0;
    const shiftClosedOrders: typeof orders = [];
    const uncollectedOrdersList: Array<{ orderNumber: string; total: number; customerName: string | null }> = [];

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
        uncollectedCount += 1;
        uncollectedOrdersList.push({
          orderNumber: order.orderNumber,
          total: amount,
          customerName: order.customerName,
        });
      }
    }

    let collectedApprovedFull = 0;
    let collectedPendingFull = 0;
    for (const tx of treasurySummary.transactions) {
      if (tx.transactionType !== 'SALE_RECEIPT') continue;
      const amount = Number(tx.amount);
      if (tx.approvalStatus === 'APPROVED') collectedApprovedFull += amount;
      else if (tx.approvalStatus === 'PENDING') collectedPendingFull += amount;
    }

    return {
      ...base,
      ordersCount,
      salesTotal,
      suspendedCount,
      shiftClosedOrders,
      collectedApproved: collectedApprovedFull,
      collectedPending: collectedPendingFull,
      uncollectedTotal,
      uncollectedCount,
      uncollectedOrders: uncollectedOrdersList.slice(0, 25),
    };
  }

  async transferShiftWallet(dto: ShiftWalletTransferDto, userId: string) {
    if (dto.fromPaymentMethod === dto.toPaymentMethod) {
      throw new BadRequestException('اختر حسابين مختلفين للتحويل');
    }

    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { cashBox: true },
    });
    if (!shift) {
      throw new NotFoundException('الوردية غير موجودة');
    }
    if (shift.status !== 'OPEN') {
      throw new BadRequestException('لا يمكن التحويل إلا في وردية مفتوحة');
    }

    const perms = await this.treasuryService.resolveWorkspacePermissions(userId);
    if (perms.openedByIdFilter && shift.openedById !== userId) {
      throw new BadRequestException('لا يمكنك التحويل من وردية مستخدم آخر');
    }

    const amount = Number(Number(dto.amount).toFixed(2));
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }

    const [treasurySummary, expenses, walletTransferTxs] = await Promise.all([
      this.treasuryService.getShiftSummary(dto.shiftId),
      this.prisma.cashierExpense.findMany({
        where: { shiftId: dto.shiftId },
        select: { amount: true, paymentMethod: true },
      }),
      this.prisma.treasuryTransaction.findMany({
        where: {
          shiftId: dto.shiftId,
          sourceType: { in: ['SHIFT_WALLET_TRANSFER_OUT', 'SHIFT_WALLET_TRANSFER_IN'] },
        },
        select: { amount: true, paymentMethod: true, sourceType: true },
      }),
    ]);

    const expensesByPaymentMethod = aggregateExpensesByPaymentMethod(expenses);
    const walletTransfers = aggregateShiftWalletTransfers(walletTransferTxs);
    const net = netCollectionByMethod(
      treasurySummary.salesByMethod,
      expensesByPaymentMethod,
      walletTransfers,
    );
    const available = net[dto.fromPaymentMethod]?.total ?? 0;
    if (amount > available + 0.001) {
      const label = SHIFT_WALLET_METHOD_LABELS[dto.fromPaymentMethod] ?? dto.fromPaymentMethod;
      throw new BadRequestException(
        `رصيد ${label} غير كافٍ (متاح ${available.toFixed(2)} ج.م)`,
      );
    }

    const transferId = randomUUID();
    const baseNote = dto.note?.trim() || `تحويل ${dto.fromPaymentMethod} → ${dto.toPaymentMethod}`;
    const fromMethod = dto.fromPaymentMethod as PaymentMethodType;
    const toMethod = dto.toPaymentMethod as PaymentMethodType;

    await this.prisma.$transaction(async (tx) => {
      await tx.treasuryTransaction.create({
        data: {
          branchId: shift.branchId,
          cashBoxId: shift.cashBoxId,
          shiftId: shift.id,
          safeType: 'EXPENSES',
          transactionType: 'CASH_WITHDRAWAL',
          paymentMethod: fromMethod,
          amount,
          sourceType: 'SHIFT_WALLET_TRANSFER_OUT',
          sourceId: transferId,
          note: `${baseNote} — خروج`,
          approvalStatus: 'APPROVED',
          collectionStatus: 'APPROVED',
          affectsCash: fromMethod === 'CASH',
          occurredAt: new Date(),
        },
      });
      await tx.treasuryTransaction.create({
        data: {
          branchId: shift.branchId,
          cashBoxId: shift.cashBoxId,
          shiftId: shift.id,
          safeType: 'EXPENSES',
          transactionType: 'CASH_DEPOSIT',
          paymentMethod: toMethod,
          amount,
          sourceType: 'SHIFT_WALLET_TRANSFER_IN',
          sourceId: transferId,
          note: `${baseNote} — دخول`,
          approvalStatus: 'APPROVED',
          collectionStatus: 'APPROVED',
          affectsCash: toMethod === 'CASH',
          occurredAt: new Date(),
        },
      });
    });

    return {
      transferId,
      fromPaymentMethod: dto.fromPaymentMethod,
      toPaymentMethod: dto.toPaymentMethod,
      amount,
      note: baseNote,
    };
  }

  async getPosCatalog(branchId: string) {
    const [categories, products, paymentMethods, dailyPlanMap] = await Promise.all([
      this.prisma.productCategory.findMany({
        where: { branchId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { branchId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.paymentMethod.findMany({
        where: { branchId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.productionPlanService.getSummaryMap(branchId),
    ]);

    const mappedProducts = products.map((product) => ({
      id: product.id,
      branchId: product.branchId,
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      salePrice: Number(product.salePrice),
      estimatedCost: product.estimatedCost ? Number(product.estimatedCost) : null,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
    }));

    const { menuProducts, sauces } = splitPosCatalogProducts(mappedProducts, categories);
    const productsWithPlan = menuProducts.map((product) => {
      const plan = dailyPlanMap.get(product.id);
      return plan ? { ...product, dailyPlan: plan } : product;
    });

    return {
      categories,
      products: productsWithPlan,
      sauces,
      paymentMethods,
    };
  }
}
