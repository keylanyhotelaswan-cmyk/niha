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
      return {
        branch: { id: branch.id, name: branch.name },
        cashBox: { id: openShift.cashBox.id, name: openShift.cashBox.name },
        shiftOpen: true,
        shift: openShift,
        summary: null,
        posSummary: null,
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
    };
  }

  async closeShift(closeDto: CloseShiftDto, userId: string) {
    if (!userId) {
      throw new BadRequestException('لم يتم التعرف على المستخدم');
    }

    const shiftRecord = await this.prisma.shift.findUnique({
      where: { id: closeDto.shiftId },
      include: { cashBox: true },
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

    const pending = await this.countTransferableOrders(closeDto.shiftId);
    const needsHandoff = pending.total > 0;

    if (needsHandoff && !closeDto.handoffMode) {
      throw new BadRequestException(
        `يوجد ${pending.uncollectedCount} طلب لم يُحصّل${pending.suspendedCount ? ` و${pending.suspendedCount} معلّق` : ''}. اختر «تسليم وردية» لنقلها قبل الإغلاق.`,
      );
    }

    let targetShiftId: string | null = null;
    let targetCashBoxId: string | null = null;
    let targetShiftNumber: string | null = null;

    if (closeDto.handoffMode === 'existing') {
      if (!closeDto.targetShiftId) {
        throw new BadRequestException('حدد وردية المستلم');
      }
      const target = await this.prisma.shift.findUnique({
        where: { id: closeDto.targetShiftId },
        include: { cashBox: true },
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
    } else if (closeDto.handoffMode === 'successor') {
      targetCashBoxId = closeDto.successorCashBoxId ?? shiftRecord.cashBoxId;
      const conflict = await this.prisma.shift.findFirst({
        where: { cashBoxId: targetCashBoxId, status: 'OPEN', id: { not: closeDto.shiftId } },
      });
      if (conflict) {
        throw new BadRequestException('توجد وردية مفتوحة على الخزنة المختارة — اختر وردية مفتوحة أخرى أو خزنة مختلفة');
      }
    }

    const closedAt = new Date();
    const summary = await this.treasuryService.getShiftSummary(closeDto.shiftId);
    const handoffNote = closeDto.note?.trim() ?? null;
    const transferPlan = closeDto.handoffMode && pending.total > 0
      ? await this.planOrderHandoff({
          sourceShiftId: closeDto.shiftId,
          ...(closeDto.handoffMode === 'existing' && closeDto.targetShiftId
            ? { targetShiftId: closeDto.targetShiftId }
            : {}),
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

      const closing = await tx.shiftClosing.create({
        data: {
          shiftId: closeDto.shiftId,
          createdById: userId,
          expectedCash: summary.expectedCash,
          countedCash: closeDto.countedCash,
          varianceAmount: closeDto.countedCash - summary.expectedCash,
          note: handoffNote,
        },
      });

      let successor: typeof shift | null = null;
      let transferredCount = 0;

      if (closeDto.handoffMode === 'successor') {
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

      if (closeDto.handoffMode && targetShiftId && targetCashBoxId && pending.total > 0) {
        transferredCount = await this.transferPendingOrders({
          tx,
          targetShiftId,
          targetCashBoxId,
          transfers: transferPlan ?? [],
        });
      }

      if (transferredCount > 0 && targetShiftNumber) {
        await tx.shiftClosing.update({
          where: { id: closing.id },
          data: {
            note: [
              handoffNote,
              `تسليم ${transferredCount} طلب/سلة إلى وردية ${targetShiftNumber}`,
            ].filter(Boolean).join(' · '),
          },
        });
      }

      return { shift, closing, successor, transferredCount };
    }, { maxWait: 15_000, timeout: 120_000 });

    return {
      shift: txResult.shift,
      closing: txResult.closing,
      summary,
      successorShift: txResult.successor,
      handoff: closeDto.handoffMode
        ? {
            mode: closeDto.handoffMode,
            targetShiftId,
            targetShiftNumber,
            transferredCount: txResult.transferredCount,
          }
        : null,
    };
  }

  private async countTransferableOrders(shiftId: string) {
    const uncollectedWhere = {
      shiftId,
      status: 'CLOSED' as const,
      OR: [{ collectionStatus: 'UNCOLLECTED' as const }, { paymentStatus: 'PENDING' as const }],
    };
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
          OR: [{ collectionStatus: 'UNCOLLECTED' }, { paymentStatus: 'PENDING' }],
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

    const [shift, treasurySummary, expenses] = await Promise.all([
      this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: { openedBy: true, cashBox: true },
      }),
      this.treasuryService.getShiftSummary(shiftId),
      this.prisma.cashierExpense.findMany({
        where: { shiftId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesGeneral = expenses.filter((e) => e.kind === 'GENERAL').reduce((s, e) => s + Number(e.amount), 0);
    const expensesItems = expenses.filter((e) => e.kind === 'ITEM').reduce((s, e) => s + Number(e.amount), 0);

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
    };

    if (!includeOrders) {
      const uncollectedWhere = {
        shiftId,
        status: 'CLOSED' as const,
        OR: [{ collectionStatus: 'UNCOLLECTED' as const }, { paymentStatus: 'PENDING' as const }],
      };
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

    const isUncollectedOrder = (order: { collectionStatus: string; paymentStatus: string }) =>
      order.collectionStatus === 'UNCOLLECTED' || order.paymentStatus === 'PENDING';

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

  async getPosCatalog(branchId: string) {
    const [categories, products, paymentMethods] = await Promise.all([
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

    const sauceCategoryIds = new Set(
      categories.filter((c) => c.name.includes('صوص')).map((c) => c.id),
    );
    const sauces = mappedProducts.filter(
      (p) => sauceCategoryIds.has(p.categoryId) || (p.sku?.startsWith('NY-SAU-') ?? false),
    );
    const menuProducts = mappedProducts.filter(
      (p) => !sauceCategoryIds.has(p.categoryId) && !(p.sku?.startsWith('NY-SAU-') ?? false),
    );

    return {
      categories,
      products: menuProducts,
      sauces,
      paymentMethods,
    };
  }
}
