import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType, Prisma, SafeType, TreasuryTransactionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { aggregateExpensesByPaymentMethod, aggregateShiftWalletTransfers, netCollectionByMethod } from '../shifts/shift-collection-net.js';
import { TransferDto } from './dto/transfer.dto.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { uncollectedOrderWhere } from '../orders/order-collection.util.js';

export type WorkspaceSection = 'current' | 'history' | 'treasury' | 'approvals';

type TreasuryTxRow = {
  amount: Prisma.Decimal | number;
  transactionType: TreasuryTransactionType;
  paymentMethod: PaymentMethodType;
  safeType?: SafeType;
  approvalStatus: string | null;
  affectsCash: boolean;
};

const CASH_IN_TYPES: TreasuryTransactionType[] = ['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'];
const CASH_OUT_TYPES: TreasuryTransactionType[] = [
  'CASH_WITHDRAWAL',
  'OPERATING_EXPENSE_PAYMENT',
  'VENDOR_PAYMENT',
  'SETUP_COST_PAYMENT',
];
const EXPENSE_ONLY_OUT_TYPES: TreasuryTransactionType[] = [
  'OPERATING_EXPENSE_PAYMENT',
  'VENDOR_PAYMENT',
  'SETUP_COST_PAYMENT',
];

type SafeBalanceSummary = {
  profitsSafe: number;
  expensesSafe: number;
  totalSafe: number;
};

type WalletSafeBalances = Record<SafeType, number>;
type WalletBalanceSummary = Record<PaymentMethodType, WalletSafeBalances & { total: number }>;
type WalletTotals = {
  bySafeType: SafeBalanceSummary;
  byPaymentMethod: Record<PaymentMethodType, number>;
  walletBalances: WalletBalanceSummary;
};

type WorkspacePermissions = {
  canApprove: boolean;
  canManageShift: boolean;
  canViewAllShifts: boolean;
  canViewTreasury: boolean;
  canViewApprovals: boolean;
  openedByIdFilter: string | null;
};

type BranchTreasuryBalance = SafeBalanceSummary & {
  byPaymentMethod: Record<string, number>;
  physicalCash: number;
  walletBalances: WalletBalanceSummary;
  walletTotalsByPaymentMethod: Record<PaymentMethodType, number>;
};

@Injectable()
export class TreasuryService {
  private workspacePermCache = new Map<string, { expiresAt: number; value: WorkspacePermissions }>();
  private branchBalanceCache = new Map<string, { expiresAt: number; value: BranchTreasuryBalance }>();

  constructor(private prisma: PrismaService) {}

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private normalizeSafeType(value?: SafeType | null): SafeType {
    return value ?? 'EXPENSES';
  }

  private addToSafeBalance(
    balances: Record<SafeType, number>,
    safeType: SafeType,
    transactionType: TreasuryTransactionType,
    amount: number,
    sourceType?: string,
  ) {
    const signedAmount = this.signedTreasuryAmount(transactionType, amount, sourceType);
    balances[safeType] += signedAmount;
  }

  private summarizeSafeBalances(balances: Record<SafeType, number>): SafeBalanceSummary {
    const profitsSafe = this.roundMoney(balances.PROFITS);
    const expensesSafe = this.roundMoney(balances.EXPENSES);
    return {
      profitsSafe,
      expensesSafe,
      totalSafe: this.roundMoney(profitsSafe + expensesSafe),
    };
  }

  private signedTreasuryAmount(
    transactionType: TreasuryTransactionType,
    amount: number,
    sourceType?: string | null,
  ) {
    if ((transactionType as string) === 'INTERNAL_WALLET_TRANSFER') {
      return sourceType === 'INTERNAL_WALLET_TRANSFER_OUT' ? -amount : amount;
    }
    if (CASH_IN_TYPES.includes(transactionType)) return amount;
    if (CASH_OUT_TYPES.includes(transactionType)) return -amount;
    return 0;
  }

  private emptyWalletBalances(): WalletBalanceSummary {
    const methods: PaymentMethodType[] = ['CASH', 'CARD', 'INSTAPAY', 'WALLET', 'MIXED'];
    return methods.reduce((acc, method) => {
      acc[method] = { PROFITS: 0, EXPENSES: 0, total: 0 };
      return acc;
    }, {} as WalletBalanceSummary);
  }

  private summarizeWalletBalances(transactions: Array<{
    amount: Prisma.Decimal | number;
    transactionType: TreasuryTransactionType;
    safeType: SafeType;
    paymentMethod: PaymentMethodType;
    sourceType?: string | null;
  }>): WalletTotals {
    const walletBalances = this.emptyWalletBalances();
    const safeBalancesByType: Record<SafeType, number> = { PROFITS: 0, EXPENSES: 0 };
    const byPaymentMethod = {
      CASH: 0,
      CARD: 0,
      INSTAPAY: 0,
      WALLET: 0,
      MIXED: 0,
    } as Record<PaymentMethodType, number>;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const signedAmount = this.signedTreasuryAmount(tx.transactionType, amount, tx.sourceType);
      if (signedAmount === 0) continue;

      safeBalancesByType[tx.safeType] += signedAmount;
      walletBalances[tx.paymentMethod][tx.safeType] += signedAmount;
      walletBalances[tx.paymentMethod].total += signedAmount;
      byPaymentMethod[tx.paymentMethod] += signedAmount;
    }

    for (const method of Object.keys(walletBalances) as PaymentMethodType[]) {
      walletBalances[method].PROFITS = this.roundMoney(walletBalances[method].PROFITS);
      walletBalances[method].EXPENSES = this.roundMoney(walletBalances[method].EXPENSES);
      walletBalances[method].total = this.roundMoney(walletBalances[method].total);
      byPaymentMethod[method] = this.roundMoney(byPaymentMethod[method]);
    }

    return {
      bySafeType: this.summarizeSafeBalances(safeBalancesByType),
      byPaymentMethod,
      walletBalances,
    };
  }

  private async getSplitSetting(branchId: string, date?: string) {
    const { dateKey } = this.dayRange(date);
    const setting = await this.prisma.dailySafeSplitSetting.findUnique({
      where: { branchId_dateKey: { branchId, dateKey } },
    });
    const expensesPercentage = Number(setting?.expensesPercentage ?? 50);
    const profitsPercentage = Number(setting?.profitsPercentage ?? 100 - expensesPercentage);
    return {
      dateKey,
      expensesPercentage,
      profitsPercentage,
      id: setting?.id ?? null,
      updatedAt: setting?.updatedAt ?? null,
    };
  }

  async getSafeSplitSetting(branchId: string, date?: string) {
    return this.getSplitSetting(branchId, date);
  }

  async updateSafeSplitSetting(params: {
    branchId: string;
    date?: string;
    expensesPercentage: number;
    updatedById?: string | null;
  }) {
    const expensesPercentage = this.roundMoney(params.expensesPercentage);
    if (expensesPercentage < 0 || expensesPercentage > 100) {
      throw new BadRequestException('Expenses percentage must be between 0 and 100');
    }

    const { dateKey } = this.dayRange(params.date);
    const profitsPercentage = this.roundMoney(100 - expensesPercentage);

    return this.prisma.dailySafeSplitSetting.upsert({
      where: { branchId_dateKey: { branchId: params.branchId, dateKey } },
      create: {
        branchId: params.branchId,
        dateKey,
        expensesPercentage,
        profitsPercentage,
        updatedById: params.updatedById ?? null,
      },
      update: {
        expensesPercentage,
        profitsPercentage,
        updatedById: params.updatedById ?? null,
      },
    });
  }

  private computeShiftTotals(openingFloat: number, transactions: TreasuryTxRow[]) {
    let incoming = 0;
    let outgoing = 0;
    let pending = 0;
    let totalSales = 0;
    let pendingCashInCustody = 0;
    const byPaymentMethod: Record<string, { approved: number; pending: number }> = {};

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const approved = tx.approvalStatus === 'APPROVED';
      const rejected = tx.approvalStatus === 'REJECTED';

      if (tx.transactionType === 'SALE_RECEIPT' && !rejected) {
        const key = tx.paymentMethod;
        if (!byPaymentMethod[key]) byPaymentMethod[key] = { approved: 0, pending: 0 };
        if (approved) {
          byPaymentMethod[key].approved += amount;
          totalSales += amount;
        } else if (tx.approvalStatus === 'PENDING') {
          byPaymentMethod[key].pending += amount;
          pending += amount;
          // نقدي محصّل وبانتظار اعتماد الإدارة = في عهدة الكاشير (يُخصم عند الاعتماد)
          if (tx.paymentMethod === 'CASH') {
            incoming += amount;
            pendingCashInCustody += amount;
          }
        }
        continue;
      }

      if (!tx.affectsCash) {
        if (tx.approvalStatus === 'PENDING') pending += amount;
        continue;
      }
      if (CASH_IN_TYPES.includes(tx.transactionType)) incoming += amount;
      else if (CASH_OUT_TYPES.includes(tx.transactionType)) outgoing += amount;
    }

    return {
      openingFloat,
      incoming,
      outgoing,
      pending,
      expectedCash: openingFloat + incoming - outgoing,
      totalSales,
      byPaymentMethod,
      salesByMethod: Object.fromEntries(
        Object.entries(byPaymentMethod).map(([method, vals]) => [
          method,
          { ...vals, total: vals.approved + vals.pending },
        ]),
      ),
      pendingCashInCustody,
    };
  }

  async transferToTreasury(dto: TransferDto, userId: string) {
    return this.recordTransaction({
      branchId: dto.branchId,
      cashBoxId: dto.cashBoxId,
      safeType: 'EXPENSES',
      transactionType: 'CASH_DEPOSIT',
      paymentMethod: 'CASH',
      amount: dto.amount,
      sourceType: 'TRANSFER',
      sourceId: dto.treasuryId,
      note: dto.note,
      affectsCash: true,
    });
  }

  async createMovement(dto: CreateMovementDto) {
    const typeMap: Record<CreateMovementDto['movementType'], TreasuryTransactionType> = {
      CASH_DEPOSIT: 'CASH_DEPOSIT',
      CASH_WITHDRAWAL: 'CASH_WITHDRAWAL',
      OPERATING_EXPENSE: 'OPERATING_EXPENSE_PAYMENT',
    };

    const safeType = this.normalizeSafeType(dto.safeType as SafeType | undefined);

    return this.recordTransaction({
      branchId: dto.branchId,
      cashBoxId: dto.cashBoxId,
      safeType,
      shiftId: dto.shiftId ?? null,
      transactionType: typeMap[dto.movementType],
      paymentMethod: dto.paymentMethod ?? 'CASH',
      amount: dto.amount,
      sourceType: 'MANUAL',
      sourceId: dto.shiftId ?? dto.cashBoxId,
      note: dto.note,
      affectsCash: dto.affectsCash ?? true,
      approvalStatus: 'APPROVED',
      collectionStatus: 'APPROVED',
    });
  }

  async recordSaleReceipt(params: {
    branchId: string;
    cashBoxId: string;
    shiftId?: string | null;
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentMethod: PaymentMethodType;
    paymentMethodId?: string | null;
    collectionStatus: 'PENDING_APPROVAL' | 'UNCOLLECTED' | 'APPROVED';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    affectsCash: boolean;
    note?: string;
  }) {
    const split = await this.getSplitSetting(params.branchId);
    const expensesAmount = this.roundMoney((params.amount * split.expensesPercentage) / 100);
    const profitsAmount = this.roundMoney(params.amount - expensesAmount);
    const baseNote = params.note ?? `تحصيل طلب ${params.orderNumber}`;

    const entries: Array<{ safeType: SafeType; amount: number; label: string }> = [
      { safeType: 'EXPENSES' as SafeType, amount: expensesAmount, label: 'خزنة المصاريف' },
      { safeType: 'PROFITS' as SafeType, amount: profitsAmount, label: 'خزنة الأرباح' },
    ].filter((entry) => entry.amount > 0);

    return Promise.all(
      entries.map((entry) =>
        this.recordTransaction({
          branchId: params.branchId,
          cashBoxId: params.cashBoxId,
          safeType: entry.safeType,
          shiftId: params.shiftId ?? null,
          paymentMethodId: params.paymentMethodId ?? null,
          transactionType: 'SALE_RECEIPT',
          paymentMethod: params.paymentMethod,
          amount: entry.amount,
          sourceType: 'ORDER',
          sourceId: params.orderId,
          note: `${baseNote} - ${entry.label}`,
          collectionStatus: params.collectionStatus,
          approvalStatus: params.approvalStatus,
          affectsCash: params.affectsCash,
        }),
      ),
    );
  }

  async recordTransaction(params: {
    branchId: string;
    cashBoxId: string;
    safeType?: SafeType;
    shiftId?: string | null;
    paymentMethodId?: string | null;
    transactionType: TreasuryTransactionType;
    paymentMethod: PaymentMethodType;
    amount: number;
    sourceType: string;
    sourceId: string;
    note?: string | null;
    collectionStatus?: 'PENDING_APPROVAL' | 'UNCOLLECTED' | 'APPROVED' | null;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    affectsCash?: boolean;
  }) {
    const safeType = this.normalizeSafeType(params.safeType);
    if (EXPENSE_ONLY_OUT_TYPES.includes(params.transactionType) && safeType !== 'EXPENSES') {
      throw new BadRequestException('Expense payments must be withdrawn from expenses safe');
    }
    if (params.transactionType === 'VENDOR_PAYMENT') {
      if (params.shiftId) {
        throw new BadRequestException('Vendor payments must not be linked to a shift');
      }
      if (safeType !== 'EXPENSES') {
        throw new BadRequestException('Vendor payments must use expenses safe');
      }
    }
    if (
      params.transactionType === 'CASH_WITHDRAWAL' &&
      safeType === 'PROFITS' &&
      params.sourceType !== 'PROFIT_WITHDRAWAL'
    ) {
      throw new BadRequestException('Use profit withdrawal for withdrawing from profits safe');
    }

    return this.prisma.treasuryTransaction.create({
      data: {
        branchId: params.branchId,
        cashBoxId: params.cashBoxId,
        safeType,
        shiftId: params.shiftId ?? null,
        paymentMethodId: params.paymentMethodId ?? null,
        transactionType: params.transactionType,
        paymentMethod: params.paymentMethod,
        amount: params.amount,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        collectionStatus: params.collectionStatus ?? null,
        approvalStatus: params.approvalStatus ?? 'APPROVED',
        affectsCash: params.affectsCash ?? true,
          occurredAt: new Date(),
        note: params.note ?? null,
      },
    });
  }

  async internalTransfer(params: {
    branchId: string;
    cashBoxId: string;
    fromSafeType: SafeType;
    fromPaymentMethod: PaymentMethodType;
    toSafeType: SafeType;
    toPaymentMethod: PaymentMethodType;
    amount: number;
    note?: string | null;
  }) {
    const amount = this.roundMoney(params.amount);
    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }
    if (
      params.fromSafeType === params.toSafeType &&
      params.fromPaymentMethod === params.toPaymentMethod
    ) {
      throw new BadRequestException('Transfer source and destination must be different');
    }

    const balance = await this.getBranchTreasuryBalance(params.branchId, params.cashBoxId);
    const available = balance.walletBalances[params.fromPaymentMethod][params.fromSafeType];
    if (available < amount) {
      throw new BadRequestException('Insufficient safe balance for internal transfer');
    }

    const transferId = randomUUID();
    const baseNote = params.note?.trim() || 'تحويل داخلي بين الخزنتين';
    const [outgoing, incoming] = await this.prisma.$transaction([
      this.prisma.treasuryTransaction.create({
        data: {
          branchId: params.branchId,
          cashBoxId: params.cashBoxId,
          safeType: params.fromSafeType,
          transactionType: 'CASH_WITHDRAWAL',
          paymentMethod: params.fromPaymentMethod,
          amount,
          sourceType: 'INTERNAL_WALLET_TRANSFER_OUT',
          sourceId: transferId,
          approvalStatus: 'APPROVED',
          collectionStatus: 'APPROVED',
          affectsCash: params.fromPaymentMethod === 'CASH',
          occurredAt: new Date(),
          note: `${baseNote} - خروج`,
        },
      }),
      this.prisma.treasuryTransaction.create({
        data: {
          branchId: params.branchId,
          cashBoxId: params.cashBoxId,
          safeType: params.toSafeType,
          transactionType: 'CASH_DEPOSIT',
          paymentMethod: params.toPaymentMethod,
          amount,
          sourceType: 'INTERNAL_WALLET_TRANSFER_IN',
          sourceId: transferId,
          approvalStatus: 'APPROVED',
          collectionStatus: 'APPROVED',
          affectsCash: params.toPaymentMethod === 'CASH',
          occurredAt: new Date(),
          note: `${baseNote} - دخول`,
        },
      }),
    ]);

    return { transferId, outgoing, incoming };
  }

  async withdrawProfit(params: {
    branchId: string;
    cashBoxId: string;
    paymentMethod: PaymentMethodType;
    amount: number;
    note?: string | null;
  }) {
    const amount = this.roundMoney(params.amount);
    if (amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than zero');
    }

    const balance = await this.getBranchTreasuryBalance(params.branchId, params.cashBoxId);
    const available = balance.walletBalances[params.paymentMethod].PROFITS;
    if (available < amount) {
      throw new BadRequestException('Insufficient profits balance for withdrawal');
    }

    return this.recordTransaction({
      branchId: params.branchId,
      cashBoxId: params.cashBoxId,
      safeType: 'PROFITS',
      transactionType: 'CASH_WITHDRAWAL',
      paymentMethod: params.paymentMethod,
      amount,
      sourceType: 'PROFIT_WITHDRAWAL',
      sourceId: randomUUID(),
      note: params.note?.trim() || 'سحب أرباح',
      affectsCash: params.paymentMethod === 'CASH',
      approvalStatus: 'APPROVED',
      collectionStatus: 'APPROVED',
    });
  }

  async listTransactions(filters: {
    branchId?: string;
    cashBoxId?: string;
    shiftId?: string;
    openedById?: string;
  }) {
    const where: Prisma.TreasuryTransactionWhereInput = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.cashBoxId) where.cashBoxId = filters.cashBoxId;
    if (filters.shiftId) where.shiftId = filters.shiftId;
    if (filters.openedById) {
      where.shift = { openedById: filters.openedById };
    }

    return this.prisma.treasuryTransaction.findMany({
      where,
      include: { paymentMethodRef: true },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  async batchApproveTransactions(ids: string[]) {
    const results = [];
    for (const id of ids) {
      results.push(await this.approveTransaction(id));
    }
    return { approved: results.length, transactions: results };
  }

  private dayRange(date?: string) {
    let start: Date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parts = date.split('-').map(Number);
      const y = parts[0]!;
      const m = parts[1]!;
      const d = parts[2]!;
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return { start, end, dateKey };
  }

  async getTreasuryToday(
    branchId: string,
    date?: string,
    cashBoxId?: string,
    expectedCashFromShift?: number | null,
  ) {
    const { start, end } = this.dayRange(date);
    const transactions = await this.prisma.treasuryTransaction.findMany({
      where: {
        branchId,
        occurredAt: { gte: start, lte: end },
        ...(cashBoxId ? { cashBoxId } : {}),
      },
      select: {
        amount: true,
        paymentMethod: true,
        safeType: true,
        approvalStatus: true,
        transactionType: true,
        sourceType: true,
      },
    });

    const byPaymentMethod: Record<string, { approved: number; pending: number }> = {};
    let approvedTotal = 0;
    let pendingTotal = 0;
    const safeTxs: typeof transactions = [];

    for (const tx of transactions) {
      if (tx.transactionType === 'SALE_RECEIPT') {
        const amount = Number(tx.amount);
        const key = tx.paymentMethod;
        if (!byPaymentMethod[key]) byPaymentMethod[key] = { approved: 0, pending: 0 };
        if (tx.approvalStatus === 'APPROVED') {
          byPaymentMethod[key].approved += amount;
          approvedTotal += amount;
        } else if (tx.approvalStatus === 'PENDING') {
          byPaymentMethod[key].pending += amount;
          pendingTotal += amount;
        }
      } else if (tx.approvalStatus === 'APPROVED') {
        safeTxs.push(tx);
      }
    }

    const walletTotals = this.summarizeWalletBalances(safeTxs);

    let physicalCash = expectedCashFromShift ?? 0;
    if (expectedCashFromShift == null && cashBoxId) {
      const openShift = await this.prisma.shift.findFirst({
        where: { branchId, cashBoxId, status: 'OPEN' },
        select: { id: true, openingFloat: true },
      });
      if (openShift) {
        const shiftTxs = await this.prisma.treasuryTransaction.findMany({
          where: { shiftId: openShift.id },
          select: {
            amount: true,
            transactionType: true,
            paymentMethod: true,
            approvalStatus: true,
            affectsCash: true,
          },
        });
        physicalCash = this.computeShiftTotals(Number(openShift.openingFloat), shiftTxs).expectedCash;
      }
    }

    return {
      byPaymentMethod,
      approvedTotal,
      pendingTotal,
      physicalCash,
      ...walletTotals.bySafeType,
      walletBalances: walletTotals.walletBalances,
      walletTotalsByPaymentMethod: walletTotals.byPaymentMethod,
    };
  }

  async listPendingCollections(branchId: string, date?: string) {
    const { start, end } = this.dayRange(date);
    const transactions = await this.prisma.treasuryTransaction.findMany({
      where: {
        branchId,
        transactionType: 'SALE_RECEIPT',
        approvalStatus: 'PENDING',
        occurredAt: { gte: start, lte: end },
      },
      include: {
        paymentMethodRef: true,
        shift: { include: { openedBy: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });

    const orderIds = [...new Set(transactions
      .filter((tx) => tx.sourceType === 'ORDER')
      .map((tx) => tx.sourceId))];
    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, orderNumber: true, customerName: true, createdById: true, createdBy: { select: { fullName: true } } },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o] as const));
    type OrderSummary = (typeof orders)[number];

    const grouped = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const key = tx.sourceType === 'ORDER' ? `ORDER:${tx.sourceId}` : tx.id;
      grouped.set(key, [...(grouped.get(key) ?? []), tx]);
    }

    return Array.from(grouped.values()).map((group) => {
      const tx = group[0]!;
      const order: OrderSummary | null | undefined = tx.sourceType === 'ORDER' ? orderMap.get(tx.sourceId) : null;
      return {
        id: tx.id,
        transactionIds: group.map((item) => item.id),
        amount: group.reduce((sum, item) => sum + Number(item.amount), 0),
        paymentMethod: tx.paymentMethod,
        paymentMethodName: tx.paymentMethodRef?.name ?? tx.paymentMethod,
        occurredAt: tx.occurredAt,
        note: tx.note,
        orderId: order?.id ?? null,
        orderNumber: order?.orderNumber ?? tx.sourceId,
        customerName: order?.customerName ?? null,
        cashierName: tx.shift?.openedBy?.fullName ?? order?.createdBy?.fullName ?? '—',
        shiftNumber: tx.shift?.shiftNumber ?? null,
      };
    });
  }

  async resolveWorkspacePermissions(userId: string): Promise<WorkspacePermissions> {
    const cached = this.workspacePermCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);
    const bypassRoles = ['Admin', 'Super Admin', 'Manager'];
    const isBypass = roleNames.some((name) =>
      bypassRoles.some((bypass) => name.toLowerCase().includes(bypass.toLowerCase())),
    );

    const permissions = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.code),
    );

    const has = (code: string) => {
      if (isBypass) return true;
      if (permissions.includes(code)) return true;
      const parts = code.split('.');
      if (parts.length >= 1 && permissions.includes(`${parts[0]}.manage`)) return true;
      return false;
    };

    const canManageShift = has('treasury.manage');
    const canApprove = has('orders.approve_collection');
    const canViewTreasury = canManageShift;
    const canViewApprovals = canApprove;

    const result: WorkspacePermissions = {
      canApprove,
      canManageShift,
      canViewAllShifts: canManageShift,
      canViewTreasury,
      canViewApprovals,
      openedByIdFilter: canManageShift ? null : userId,
    };

    this.workspacePermCache.set(userId, {
      expiresAt: Date.now() + 60_000,
      value: result,
    });

    return result;
  }

  async listShiftsForWorkspace(
    branchId: string,
    from?: string,
    to?: string,
    openedById?: string | null,
  ) {
    const parseDayStart = (value?: string) => {
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const parts = value.split('-').map(Number);
        const y = parts[0]!;
        const m = parts[1]!;
        const d = parts[2]!;
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return start;
    };
    const parseDayEnd = (value?: string) => {
      const start = parseDayStart(value);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const fromDate = parseDayStart(from);
    const toDate = parseDayEnd(to ?? from);

    const where: Prisma.ShiftWhereInput = {
      branchId,
      openedAt: { gte: fromDate, lte: toDate },
    };
    if (openedById) where.openedById = openedById;

    const shifts = await this.prisma.shift.findMany({
      where,
      include: { cashBox: true, openedBy: true, closingRecord: true },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });

    if (!shifts.length) return [];

    const shiftIds = shifts.map((s) => s.id);
    const allTransactions = await this.prisma.treasuryTransaction.findMany({
      where: { shiftId: { in: shiftIds } },
      select: {
        shiftId: true,
        amount: true,
        transactionType: true,
        paymentMethod: true,
        approvalStatus: true,
        affectsCash: true,
      },
    });

    const txsByShift = new Map<string, TreasuryTxRow[]>();
    for (const tx of allTransactions) {
      if (!tx.shiftId) continue;
      const list = txsByShift.get(tx.shiftId) ?? [];
      list.push(tx);
      txsByShift.set(tx.shiftId, list);
    }

    return shifts.map((shift) => {
      const totals = this.computeShiftTotals(
        Number(shift.openingFloat),
        txsByShift.get(shift.id) ?? [],
      );
      return {
        shift,
        openingFloat: totals.openingFloat,
        incoming: totals.incoming,
        outgoing: totals.outgoing,
        pending: totals.pending,
        expectedCash: totals.expectedCash,
        byPaymentMethod: totals.byPaymentMethod,
        totalSales: totals.totalSales,
        variance: shift.closingRecord ? Number(shift.closingRecord.varianceAmount) : null,
      };
    });
  }

  async collectorDailySummary(branchId: string, date?: string) {
    const { start, end, dateKey } = this.dayRange(date);

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
      date: dateKey,
      collectors: Array.from(byUser.values()).sort((a, b) => b.total - a.total),
    };
  }

  async getWorkspace(params: {
    branchId: string;
    cashBoxId: string;
    fromDate?: string;
    toDate?: string;
    userId: string;
    sections?: WorkspaceSection[];
  }) {
    const { branchId, cashBoxId, userId } = params;
    const fromDate = params.fromDate;
    const toDate = params.toDate ?? params.fromDate;
    const sectionSet = new Set<WorkspaceSection>(params.sections ?? ['current']);

    const needPaymentMethods = sectionSet.has('approvals') || sectionSet.has('treasury');
    const needTreasuryToday = sectionSet.has('treasury') || sectionSet.has('approvals');
    const needTreasuryCumulative = sectionSet.has('treasury');

    const [perms, branch, cashBox, paymentMethods] = await Promise.all([
      this.resolveWorkspacePermissions(userId),
      this.prisma.branch.findUnique({ where: { id: branchId } }),
      this.prisma.cashBox.findUnique({ where: { id: cashBoxId } }),
      needPaymentMethods
        ? this.prisma.paymentMethod.findMany({
            where: { branchId, isActive: true },
            orderBy: { sortOrder: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    if (!branch) throw new NotFoundException('Branch not found');
    if (!cashBox) throw new NotFoundException('Cash box not found');

    const { dateKey: fromKey } = this.dayRange(fromDate);
    const { dateKey: toKey } = this.dayRange(toDate);
    const reportDate = toDate ?? fromDate;
    const { dateKey } = this.dayRange(reportDate);

    let currentShift: {
      shiftOpen: boolean;
      shift: Awaited<ReturnType<TreasuryService['getShiftSummary']>>['shift'] | null;
      summary: Omit<Awaited<ReturnType<TreasuryService['getShiftSummary']>>, 'shift' | 'transactions'> | null;
    } = {
      shiftOpen: false,
      shift: null,
      summary: null,
    };
    let shiftTransactions: Awaited<ReturnType<TreasuryService['listTransactions']>> = [];

    if (sectionSet.has('current')) {
      const shift = await this.prisma.shift.findFirst({
        where: { branchId, cashBoxId, status: 'OPEN' },
        include: { cashBox: true, openedBy: true },
        orderBy: { openedAt: 'desc' },
      });

      if (shift) {
        const summary = await this.getShiftSummaryLight(shift.id);
        currentShift = {
          shiftOpen: true,
          shift: summary.shift,
          summary: {
            openingFloat: summary.openingFloat,
            incoming: summary.incoming,
            outgoing: summary.outgoing,
            pending: summary.pending,
            pendingCashInCustody: summary.pendingCashInCustody,
            expectedCash: summary.expectedCash,
            totalSales: summary.totalSales,
            byPaymentMethod: summary.byPaymentMethod,
            salesByMethod: summary.salesByMethod,
            expensesTotal: summary.expensesTotal,
            expensesByPaymentMethod: summary.expensesByPaymentMethod,
            netSalesByMethod: summary.netSalesByMethod,
            walletTransfers: summary.walletTransfers,
            ordersCount: summary.ordersCount,
            transactionCount: summary.transactionCount,
            uncollectedCount: summary.uncollectedCount,
            uncollectedTotal: summary.uncollectedTotal,
            uncollectedOrders: summary.uncollectedOrders,
          },
        };
        shiftTransactions = summary.transactions as unknown as typeof shiftTransactions;
      }
    }

    const emptyTreasuryToday = {
      byPaymentMethod: {} as Record<string, { approved: number; pending: number }>,
      approvedTotal: 0,
      pendingTotal: 0,
      physicalCash: 0,
      profitsSafe: 0,
      expensesSafe: 0,
      totalSafe: 0,
      walletBalances: this.emptyWalletBalances(),
      walletTotalsByPaymentMethod: {
        CASH: 0,
        CARD: 0,
        INSTAPAY: 0,
        WALLET: 0,
        MIXED: 0,
      } as Record<PaymentMethodType, number>,
    };

    const [
      treasuryToday,
      treasuryCumulative,
      pendingCollections,
      shiftsForDate,
      collectorSummary,
      safeSplitSetting,
    ] = await Promise.all([
      needTreasuryToday
        ? this.getTreasuryToday(
            branchId,
            reportDate,
            cashBoxId,
            currentShift.summary?.expectedCash ?? null,
          )
        : Promise.resolve(emptyTreasuryToday),
      needTreasuryCumulative && perms.canViewTreasury
        ? this.getBranchTreasuryBalance(branchId, cashBoxId)
        : Promise.resolve({
            byPaymentMethod: {},
            physicalCash: 0,
            profitsSafe: 0,
            expensesSafe: 0,
            totalSafe: 0,
            walletBalances: this.emptyWalletBalances(),
            walletTotalsByPaymentMethod: {
              CASH: 0,
              CARD: 0,
              INSTAPAY: 0,
              WALLET: 0,
              MIXED: 0,
            } as Record<PaymentMethodType, number>,
          }),
      sectionSet.has('approvals') && perms.canViewApprovals
        ? this.listPendingCollections(branchId, reportDate)
        : Promise.resolve([]),
      sectionSet.has('history')
        ? this.listShiftsForWorkspace(branchId, fromDate, toDate, perms.openedByIdFilter)
        : Promise.resolve([]),
      sectionSet.has('approvals') && perms.canViewTreasury
        ? this.collectorDailySummary(branchId, reportDate)
        : Promise.resolve({ date: dateKey, collectors: [] }),
      sectionSet.has('treasury') && perms.canViewTreasury
        ? this.getSafeSplitSetting(branchId, reportDate)
        : Promise.resolve({ dateKey, expensesPercentage: 50, profitsPercentage: 50, id: null, updatedAt: null }),
    ]);

    return {
      context: {
        branch: { id: branch.id, name: branch.name },
        cashBox: { id: cashBox.id, name: cashBox.name },
        date: dateKey,
        fromDate: fromKey,
        toDate: toKey,
        paymentMethods,
      },
      sectionsLoaded: Array.from(sectionSet),
      currentShift,
      shiftTransactions,
      treasuryToday,
      treasuryCumulative,
      safeSplitSetting,
      pendingCollections,
      shiftsForDate,
      collectorSummary,
      permissions: {
        canApprove: perms.canApprove,
        canManageShift: perms.canManageShift,
        canViewAllShifts: perms.canViewAllShifts,
        canViewTreasury: perms.canViewTreasury,
        canViewApprovals: perms.canViewApprovals,
      },
    };
  }

  async listTransactionsWithScope(params: {
    branchId?: string;
    cashBoxId?: string;
    shiftId?: string;
    userId: string;
  }) {
    const perms = await this.resolveWorkspacePermissions(params.userId);
    const filters: {
      branchId?: string;
      cashBoxId?: string;
      shiftId?: string;
      openedById?: string;
    } = {};
    if (params.branchId) filters.branchId = params.branchId;
    if (params.cashBoxId) filters.cashBoxId = params.cashBoxId;
    if (params.shiftId) filters.shiftId = params.shiftId;
    if (perms.openedByIdFilter) filters.openedById = perms.openedByIdFilter;
    return this.listTransactions(filters);
  }

  async approveTransaction(id: string) {
    const tx = await this.prisma.treasuryTransaction.findUnique({ where: { id } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    const isCash = tx.paymentMethod === 'CASH';
    const splitWhere =
      tx.sourceType === 'ORDER' && tx.transactionType === 'SALE_RECEIPT'
        ? {
            sourceType: tx.sourceType,
            sourceId: tx.sourceId,
            transactionType: tx.transactionType,
            approvalStatus: 'PENDING' as const,
          }
        : { id };

    await this.prisma.treasuryTransaction.updateMany({
      where: splitWhere,
      data: {
        approvalStatus: 'APPROVED',
        collectionStatus: 'APPROVED',
        affectsCash: isCash,
      },
    });
    const updated = await this.prisma.treasuryTransaction.findUnique({ where: { id } });

    if (tx.sourceType === 'ORDER') {
      await this.prisma.order.updateMany({
        where: { id: tx.sourceId },
        data: { approvalStatus: 'APPROVED', collectionStatus: 'APPROVED' },
      });
      await this.prisma.orderPayment.updateMany({
        where: { orderId: tx.sourceId, approvalStatus: 'PENDING' },
        data: { approvalStatus: 'APPROVED', affectsCash: isCash },
      });
    }

    return updated;
  }

  async rejectTransaction(id: string, reason?: string) {
    const tx = await this.prisma.treasuryTransaction.findUnique({ where: { id } });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    if (tx.approvalStatus !== 'PENDING') {
      throw new BadRequestException('Only pending transactions can be rejected');
    }

    const splitWhere =
      tx.sourceType === 'ORDER' && tx.transactionType === 'SALE_RECEIPT'
        ? {
            sourceType: tx.sourceType,
            sourceId: tx.sourceId,
            transactionType: tx.transactionType,
            approvalStatus: 'PENDING' as const,
          }
        : { id };

    await this.prisma.treasuryTransaction.updateMany({
      where: splitWhere,
      data: {
        approvalStatus: 'REJECTED',
        affectsCash: false,
        ...(reason ? { note: `${tx.note ?? ''} [رفض: ${reason}]`.trim() } : {}),
      },
    });
    const updated = await this.prisma.treasuryTransaction.findUnique({ where: { id } });

    if (tx.sourceType === 'ORDER' && tx.transactionType === 'SALE_RECEIPT') {
      const order = await this.prisma.order.findUnique({
        where: { id: tx.sourceId },
        select: { id: true, status: true, totalAmount: true },
      });
      if (order?.status === 'CLOSED') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            collectionStatus: 'UNCOLLECTED',
            approvalStatus: 'PENDING',
            paymentStatus: 'PENDING',
            amountPaid: 0,
            amountDue: Number(order.totalAmount),
          },
        });
        await this.prisma.orderPayment.updateMany({
          where: { orderId: order.id },
          data: { approvalStatus: 'REJECTED', affectsCash: false },
        });
      }
    } else if (tx.sourceType === 'ORDER') {
      await this.prisma.order.updateMany({
        where: { id: tx.sourceId },
        data: { collectionStatus: 'UNCOLLECTED', approvalStatus: 'PENDING' },
      });
      await this.prisma.orderPayment.updateMany({
        where: { orderId: tx.sourceId },
        data: { approvalStatus: 'REJECTED', affectsCash: false },
      });
    }

    return updated;
  }

  async getBranchTreasuryBalance(branchId: string, cashBoxId?: string): Promise<BranchTreasuryBalance> {
    const cacheKey = `${branchId}:${cashBoxId ?? 'all'}`;
    const cached = this.branchBalanceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const transactions = await this.prisma.treasuryTransaction.findMany({
      where: {
        branchId,
        approvalStatus: 'APPROVED',
        ...(cashBoxId ? { cashBoxId } : {}),
      },
      select: {
        amount: true,
        transactionType: true,
        paymentMethod: true,
        safeType: true,
        sourceType: true,
        affectsCash: true,
      },
    });

    const byPaymentMethod: Record<string, number> = {};
    let physicalCash = 0;
    const walletTotals = this.summarizeWalletBalances(transactions);

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const incoming = CASH_IN_TYPES.includes(tx.transactionType);
      const outgoing = CASH_OUT_TYPES.includes(tx.transactionType);

      if (tx.transactionType === 'SALE_RECEIPT') {
        const key = tx.paymentMethod;
        byPaymentMethod[key] = (byPaymentMethod[key] ?? 0) + amount;
      }

      if (tx.affectsCash && tx.transactionType !== 'SALE_RECEIPT') {
        if ((tx.transactionType as string) === 'INTERNAL_WALLET_TRANSFER') {
          physicalCash += this.signedTreasuryAmount(tx.transactionType, amount, tx.sourceType);
        } else if (incoming) physicalCash += amount;
        else if (outgoing) physicalCash -= amount;
      }
    }

    const result = {
      byPaymentMethod,
      physicalCash,
      ...walletTotals.bySafeType,
      walletBalances: walletTotals.walletBalances,
      walletTotalsByPaymentMethod: walletTotals.byPaymentMethod,
    };
    this.branchBalanceCache.set(cacheKey, { expiresAt: Date.now() + 45_000, value: result });
    return result;
  }

  async getShiftSummaryLight(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { cashBox: true, openedBy: true },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const txSelect = {
      amount: true,
      transactionType: true,
      paymentMethod: true,
      safeType: true,
      approvalStatus: true,
      affectsCash: true,
      sourceType: true,
    } as const;

    const uncollectedWhere = uncollectedOrderWhere({ shiftId, status: 'CLOSED' });

    const [allTxRows, recentTransactionsRaw, expenseRows, walletTransferTxs, closedOrdersAgg, uncollectedAgg, uncollectedOrdersRaw] = await Promise.all([
      this.prisma.treasuryTransaction.findMany({
        where: { shiftId },
        select: txSelect,
      }),
      this.prisma.treasuryTransaction.findMany({
        where: { shiftId },
        select: {
          id: true,
          amount: true,
          transactionType: true,
          paymentMethod: true,
          safeType: true,
          note: true,
          occurredAt: true,
          approvalStatus: true,
          sourceType: true,
          sourceId: true,
          paymentMethodRef: { select: { name: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 200,
      }),
      this.prisma.cashierExpense.findMany({
        where: { shiftId },
        select: { amount: true, paymentMethod: true },
      }),
      this.prisma.treasuryTransaction.findMany({
        where: {
          shiftId,
          sourceType: { in: ['SHIFT_WALLET_TRANSFER_OUT', 'SHIFT_WALLET_TRANSFER_IN'] },
        },
        select: { amount: true, paymentMethod: true, sourceType: true },
      }),
      this.prisma.order.aggregate({
        where: { shiftId, status: 'CLOSED' },
        _count: true,
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
    ]);

    const orderIds = [
      ...new Set(
        recentTransactionsRaw
          .filter((tx) => tx.sourceType === 'ORDER' && tx.sourceId)
          .map((tx) => tx.sourceId),
      ),
    ];
    const linkedOrders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, orderNumber: true },
        })
      : [];
    const orderNumberMap = new Map(linkedOrders.map((o) => [o.id, o.orderNumber] as const));
    const recentTransactions = recentTransactionsRaw.map((tx) => ({
      ...tx,
      orderId: tx.sourceType === 'ORDER' ? tx.sourceId : null,
      orderNumber: tx.sourceType === 'ORDER' ? orderNumberMap.get(tx.sourceId) ?? null : null,
    }));

    const totals = this.computeShiftTotals(Number(shift.openingFloat), allTxRows);
    const expensesTotal = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
    const expensesByPaymentMethod = aggregateExpensesByPaymentMethod(expenseRows);
    const walletTransfers = aggregateShiftWalletTransfers(walletTransferTxs);
    const netSalesByMethod = netCollectionByMethod(totals.salesByMethod, expensesByPaymentMethod, walletTransfers);
    const uncollectedOrders = uncollectedOrdersRaw.map((o) => ({
      orderNumber: o.orderNumber,
      total: Number(o.totalAmount),
      customerName: o.customerName,
    }));
    return {
      shift,
      transactions: recentTransactions,
      transactionCount: allTxRows.length,
      ordersCount: closedOrdersAgg._count,
      expensesTotal,
      expensesByPaymentMethod,
      walletTransfers,
      netSalesByMethod,
      uncollectedCount: uncollectedAgg._count,
      uncollectedTotal: Number(uncollectedAgg._sum.totalAmount ?? 0),
      uncollectedOrders,
      ...totals,
      totalSales: Number(closedOrdersAgg._sum.totalAmount ?? 0),
    };
  }

  async getShiftSummary(shiftId: string) {
    return this.getShiftSummaryLight(shiftId);
  }
}
