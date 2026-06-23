import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { CreateCashierExpenseDto } from './dto/create-cashier-expense.dto.js';

@Injectable()
export class CashierExpensesService {
  constructor(
    private prisma: PrismaService,
    private treasuryService: TreasuryService,
  ) {}

  async create(dto: CreateCashierExpenseDto, userId: string) {
    if (dto.kind === 'ITEM') {
      if (!dto.stockItemId || !dto.quantity || !dto.unitPrice) {
        throw new BadRequestException('stockItemId, quantity and unitPrice are required for ITEM expense');
      }
    }

    let shiftId = dto.shiftId ?? null;
    let cashBoxId: string | null = null;

    if (shiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift || shift.branchId !== dto.branchId) {
        throw new NotFoundException('Shift not found');
      }
      if (shift.status !== 'OPEN') {
        throw new BadRequestException('Cannot add expense to a closed shift');
      }
      cashBoxId = shift.cashBoxId;
    } else {
      const shift = await this.prisma.shift.findFirst({
        where: { branchId: dto.branchId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });
      if (!shift) {
        throw new BadRequestException('No open shift — open a shift before recording shift expenses');
      }
      shiftId = shift.id;
      cashBoxId = shift.cashBoxId;
    }

    const amount = dto.kind === 'ITEM'
      ? Number((dto.quantity! * dto.unitPrice!).toFixed(2))
      : Number((dto.amount ?? 0).toFixed(2));

    if (amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    const expenseLabel = dto.kind === 'ITEM' ? 'مصروف خامة من الوردية' : 'مصروف عام من الوردية';
    const noteText = dto.note?.trim() ? `${expenseLabel}: ${dto.note.trim()}` : expenseLabel;
    const paymentMethod = (dto.paymentMethod ?? 'CASH') as PaymentMethodType;
    const affectsCash = paymentMethod === 'CASH';

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cashierExpense.create({
        data: {
          branchId: dto.branchId,
          shiftId,
          createdById: userId,
          kind: dto.kind,
          stockItemId: dto.stockItemId ?? null,
          quantity: dto.quantity ?? null,
          unitPrice: dto.unitPrice ?? null,
          amount,
          paymentMethod,
          note: dto.note ?? null,
        },
      });

      if (dto.kind === 'ITEM') {
        const qty = dto.quantity!;
        const unitPrice = dto.unitPrice!;

        const doc = await tx.stockDocument.create({
          data: {
            branchId: dto.branchId,
            documentNumber: `SD-${Date.now()}`,
            documentType: 'PURCHASE_RECEIPT',
            status: 'POSTED',
            occurredAt: new Date(),
            note: `Cashier expense purchase: ${created.id}`,
            createdById: userId,
          },
        });

        await tx.stockDocumentLine.create({
          data: {
            documentId: doc.id,
            stockItemId: dto.stockItemId!,
            quantity: qty,
            unitCost: unitPrice,
            lineTotal: Number((qty * unitPrice).toFixed(2)),
          },
        });

        const stockItem = await tx.stockItem.findUnique({ where: { id: dto.stockItemId! } });
        if (!stockItem) throw new NotFoundException('Stock item not found');

        await tx.stockLedgerEntry.create({
          data: {
            branchId: dto.branchId,
            warehouseId: stockItem.warehouseId,
            stockItemId: dto.stockItemId!,
            stockDocumentId: doc.id,
            direction: 'IN',
            quantity: qty,
            unitCost: unitPrice,
            totalCost: Number((qty * unitPrice).toFixed(2)),
            sourceType: 'cashier_expense',
            sourceId: created.id,
            occurredAt: new Date(),
          },
        });

        const currentOnHand = Number(stockItem.onHandQuantity || 0);
        const currentAvg = Number(stockItem.averageCost || 0);
        const totalQty = currentOnHand + qty;
        const newAvg = totalQty > 0
          ? Number(((currentOnHand * currentAvg + qty * unitPrice) / totalQty).toFixed(4))
          : unitPrice;

        await tx.stockItem.update({
          where: { id: dto.stockItemId! },
          data: {
            averageCost: newAvg,
            onHandQuantity: Number((currentOnHand + qty).toFixed(3)),
          },
        });
      }

      return created;
    });

    if (cashBoxId) {
      await this.treasuryService.recordTransaction({
        branchId: dto.branchId,
        cashBoxId,
        safeType: 'EXPENSES',
        shiftId,
        transactionType: 'OPERATING_EXPENSE_PAYMENT',
        paymentMethod,
        amount,
        sourceType: 'CASHIER_EXPENSE',
        sourceId: expense.id,
        note: noteText,
        affectsCash,
        approvalStatus: 'APPROVED',
        collectionStatus: 'APPROVED',
      });
    }

    return expense;
  }

  async listForShift(branchId: string, shiftId: string) {
    return this.prisma.cashierExpense.findMany({
      where: { branchId, shiftId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Minimal stock list for POS expense picker (cashiers with pos.use only). */
  async listStockItemsForExpense(branchId: string) {
    return this.prisma.stockItem.findMany({
      where: { branchId },
      select: { id: true, name: true, averageCost: true, onHandQuantity: true },
      orderBy: { name: 'asc' },
    });
  }
}
