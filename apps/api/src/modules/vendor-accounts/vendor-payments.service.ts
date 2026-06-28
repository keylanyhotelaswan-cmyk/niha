import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { VendorLedgerService } from './vendor-ledger.service.js';

@Injectable()
export class VendorPaymentsService {
  constructor(
    private prisma: PrismaService,
    private treasuryService: TreasuryService,
    private vendorLedger: VendorLedgerService,
  ) {}

  list(branchId: string, vendorId?: string) {
    return this.prisma.vendorPayment.findMany({
      where: { branchId, ...(vendorId ? { vendorId } : {}) },
      include: { vendor: true, vendorInvoice: true, paymentMethod: true },
      orderBy: { paidAt: 'desc' },
    });
  }

  async create(data: {
    branchId: string;
    vendorId: string;
    vendorInvoiceId?: string;
    paymentMethodId: string;
    cashBoxId?: string;
    amount: number;
    paidAt?: Date;
    reference?: string;
    createdById?: string;
  }) {
    if (data.amount <= 0) throw new BadRequestException('Payment amount must be positive');

    const vendor = await this.prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor || vendor.branchId !== data.branchId) throw new NotFoundException('Vendor not found');

    let invoice: { id: string; totalAmount: unknown; paidAmount: unknown; status: string } | null = null;
    if (data.vendorInvoiceId) {
      invoice = await this.prisma.vendorInvoice.findUnique({ where: { id: data.vendorInvoiceId } });
      if (!invoice || invoice.status === 'VOIDED' || invoice.status === 'DRAFT') {
        throw new BadRequestException('Invalid invoice for payment');
      }
      const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      if (data.amount > remaining + 0.01) {
        throw new BadRequestException('Payment exceeds invoice remaining balance');
      }
    }

    const paymentMethod = await this.prisma.paymentMethod.findUnique({ where: { id: data.paymentMethodId } });
    if (!paymentMethod || paymentMethod.branchId !== data.branchId) {
      throw new NotFoundException('Payment method not found');
    }

    const cashBox = data.cashBoxId
      ? await this.prisma.cashBox.findUnique({ where: { id: data.cashBoxId } })
      : await this.prisma.cashBox.findFirst({ where: { branchId: data.branchId }, orderBy: { name: 'asc' } });
    if (!cashBox) throw new BadRequestException('Cash box not found');

    const treasuryBalance = await this.treasuryService.getBranchTreasuryBalance(data.branchId, cashBox.id);
    const methodType = paymentMethod.type as 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
    const expensesAvailable = treasuryBalance.walletBalances[methodType]?.EXPENSES ?? 0;
    if (expensesAvailable < data.amount - 0.01) {
      throw new BadRequestException(
        `رصيد خزينة المصروفات (${paymentMethod.name ?? methodType}) غير كافٍ. المتاح: ${expensesAvailable.toFixed(2)} ج.م`,
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vendorPayment.create({
        data: {
          branchId: data.branchId,
          vendorId: data.vendorId,
          vendorInvoiceId: data.vendorInvoiceId ?? null,
          paymentMethodId: data.paymentMethodId,
          amount: data.amount,
          paidAt: data.paidAt ?? new Date(),
          reference: data.reference ?? null,
          createdById: data.createdById ?? null,
          approvalStatus: 'APPROVED',
          affectsCash: paymentMethod.type === 'CASH',
        },
        include: { vendor: true, vendorInvoice: true, paymentMethod: true },
      });

      await this.vendorLedger.postPayment(
        {
          branchId: data.branchId,
          vendorId: data.vendorId,
          paymentId: created.id,
          amount: data.amount,
          occurredAt: created.paidAt,
          note: data.reference ? `دفعة: ${data.reference}` : 'دفعة مورد',
          createdById: data.createdById ?? null,
        },
        tx,
      );

      if (invoice) {
        const newPaid = Number(invoice.paidAmount) + data.amount;
        const total = Number(invoice.totalAmount);
        const status = newPaid >= total - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
        await tx.vendorInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, status: status as any },
        });
      }

      return created;
    });

    await this.treasuryService.recordTransaction({
      branchId: data.branchId,
      cashBoxId: cashBox.id,
      shiftId: null,
      safeType: 'EXPENSES',
      transactionType: 'VENDOR_PAYMENT',
      paymentMethod: paymentMethod.type,
      paymentMethodId: paymentMethod.id,
      amount: data.amount,
      sourceType: 'VENDOR_PAYMENT',
      sourceId: payment.id,
      note: data.reference ? `دفعة مورد: ${data.reference}` : `دفعة مورد ${vendor.name}`,
      affectsCash: paymentMethod.type === 'CASH',
      approvalStatus: 'APPROVED',
      collectionStatus: 'APPROVED',
    });

    return payment;
  }
}
