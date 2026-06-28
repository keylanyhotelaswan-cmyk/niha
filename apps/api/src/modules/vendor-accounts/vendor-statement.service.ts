import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class VendorStatementService {
  constructor(private prisma: PrismaService) {}

  async getBalance(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const last = await this.prisma.vendorLedgerEntry.findFirst({
      where: { vendorId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    const balance = last ? Number(last.balanceAfter) : Number(vendor.openingBalance);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCode: vendor.code,
      openingBalance: Number(vendor.openingBalance),
      currentBalance: balance,
    };
  }

  async getStatement(vendorId: string, from: Date, to: Date) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const endOfTo = new Date(to);
    endOfTo.setHours(23, 59, 59, 999);

    const entries = await this.prisma.vendorLedgerEntry.findMany({
      where: { vendorId, occurredAt: { lte: endOfTo } },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });

    const before = entries.filter((e) => e.occurredAt < from);
    const opening =
      Number(vendor.openingBalance) +
      before.reduce((s, e) => s + Number(e.credit) - Number(e.debit), 0);

    const period = entries.filter((e) => e.occurredAt >= from && e.occurredAt <= endOfTo);

    const purchases = period
      .filter((e) => e.entryType === 'INVOICE')
      .reduce((s, e) => s + Number(e.credit), 0);
    const payments = period
      .filter((e) => e.entryType === 'PAYMENT')
      .reduce((s, e) => s + Number(e.debit), 0);

    const closing = opening + purchases - payments;

    const invoiceIds = period
      .filter((e) => e.sourceType === 'VENDOR_INVOICE' && e.sourceId)
      .map((e) => e.sourceId as string);
    const paymentIds = period
      .filter((e) => e.sourceType === 'VENDOR_PAYMENT' && e.sourceId)
      .map((e) => e.sourceId as string);

    const [invoices, paymentsRows] = await Promise.all([
      invoiceIds.length
        ? this.prisma.vendorInvoice.findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true },
          })
        : [],
      paymentIds.length
        ? this.prisma.vendorPayment.findMany({
            where: { id: { in: paymentIds } },
            select: { id: true, reference: true },
          })
        : [],
    ]);

    const invoiceMap = Object.fromEntries(invoices.map((i) => [i.id, i.invoiceNumber]));
    const paymentMap = Object.fromEntries(paymentsRows.map((p) => [p.id, p.reference]));

    return {
      vendor: { id: vendor.id, name: vendor.name, code: vendor.code },
      from: from.toISOString(),
      to: endOfTo.toISOString(),
      summary: {
        openingBalance: Number(opening.toFixed(2)),
        purchases: Number(purchases.toFixed(2)),
        payments: Number(payments.toFixed(2)),
        closingBalance: Number(closing.toFixed(2)),
      },
      lines: period.map((e) => ({
        id: e.id,
        date: e.occurredAt,
        type: e.entryType,
        sourceType: e.sourceType,
        reference:
          e.sourceType === 'VENDOR_INVOICE' && e.sourceId
            ? invoiceMap[e.sourceId] ?? e.sourceId
            : e.sourceType === 'VENDOR_PAYMENT' && e.sourceId
              ? paymentMap[e.sourceId] ?? e.sourceId
              : e.sourceId,
        credit: Number(e.credit),
        debit: Number(e.debit),
        balanceAfter: Number(e.balanceAfter),
        note: e.note,
      })),
    };
  }
}
