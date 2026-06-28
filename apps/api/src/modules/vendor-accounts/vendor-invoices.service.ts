import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { VendorLedgerService } from './vendor-ledger.service.js';

type InvoiceLineInput = {
  stockItemId?: string;
  description: string;
  quantity?: number;
  unitCost?: number;
  lineTotal: number;
};

@Injectable()
export class VendorInvoicesService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private vendorLedger: VendorLedgerService,
  ) {}

  list(branchId: string, vendorId?: string) {
    return this.prisma.vendorInvoice.findMany({
      where: { branchId, ...(vendorId ? { vendorId } : {}) },
      include: { vendor: true, lines: true, goodsReceipt: true },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  get(id: string) {
    return this.prisma.vendorInvoice.findUnique({
      where: { id },
      include: { vendor: true, lines: { include: { stockItem: true } }, goodsReceipt: true, payments: true },
    });
  }

  async createManual(data: {
    branchId: string;
    vendorId: string;
    invoiceDate?: Date;
    dueDate?: Date;
    taxAmount?: number;
    note?: string;
    lines: InvoiceLineInput[];
    createdById?: string;
    post?: boolean;
  }) {
    if (!data.lines.length) throw new BadRequestException('Invoice must have at least one line');
    const subtotal = data.lines.reduce((s, l) => s + l.lineTotal, 0);
    const taxAmount = data.taxAmount ?? 0;
    const totalAmount = subtotal + taxAmount;
    const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: data.branchId } });
    const invoiceNumber = await this.sequenceService.getNextNumber(branch.organizationId, 'VI', data.branchId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.vendorInvoice.create({
        data: {
          branchId: data.branchId,
          vendorId: data.vendorId,
          invoiceNumber,
          status: data.post ? 'POSTED' : 'DRAFT',
          invoiceDate: data.invoiceDate ?? new Date(),
          dueDate: data.dueDate ?? null,
          subtotal,
          taxAmount,
          totalAmount,
          note: data.note ?? null,
          createdById: data.createdById ?? null,
          lines: {
            create: data.lines.map((line) => ({
              stockItemId: line.stockItemId ?? null,
              description: line.description,
              quantity: line.quantity ?? null,
              unitCost: line.unitCost ?? null,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { lines: true, vendor: true },
      });

      if (data.post) {
        await this.vendorLedger.postInvoice(
          {
            branchId: data.branchId,
            vendorId: data.vendorId,
            invoiceId: invoice.id,
            amount: totalAmount,
            occurredAt: invoice.invoiceDate,
            note: `فاتورة ${invoice.invoiceNumber}`,
            createdById: data.createdById ?? null,
          },
          tx,
        );
      }

      return invoice;
    });
  }

  async createFromGoodsReceipt(
    tx: Prisma.TransactionClient,
    params: {
      receipt: {
        id: string;
        branchId: string;
        vendorId: string;
        receiptNumber: string;
        receivedAt: Date;
        lines: Array<{
          stockItemId: string;
          quantity: Prisma.Decimal | number;
          unitCost: Prisma.Decimal | number;
          lineTotal: Prisma.Decimal | number;
          stockItem?: { name: string } | null;
        }>;
      };
      organizationId: string;
      createdById?: string | null;
    },
  ) {
    const existing = await tx.vendorInvoice.findFirst({
      where: { goodsReceiptId: params.receipt.id },
    });
    if (existing) return existing;

    const invoiceNumber = await this.sequenceService.getNextNumber(
      params.organizationId,
      'VI',
      params.receipt.branchId,
    );
    const subtotal = params.receipt.lines.reduce((s, l) => s + Number(l.lineTotal), 0);
    const totalAmount = subtotal;

    const invoice = await tx.vendorInvoice.create({
      data: {
        branchId: params.receipt.branchId,
        vendorId: params.receipt.vendorId,
        goodsReceiptId: params.receipt.id,
        invoiceNumber,
        status: 'POSTED',
        invoiceDate: params.receipt.receivedAt,
        subtotal,
        taxAmount: 0,
        totalAmount,
        note: `من استلام ${params.receipt.receiptNumber}`,
        createdById: params.createdById ?? null,
        lines: {
          create: params.receipt.lines.map((line) => ({
            stockItemId: line.stockItemId,
            description: line.stockItem?.name ?? 'صنف مخزني',
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost),
            lineTotal: Number(line.lineTotal),
          })),
        },
      },
      include: { lines: true },
    });

    await this.vendorLedger.postInvoice(
      {
        branchId: params.receipt.branchId,
        vendorId: params.receipt.vendorId,
        invoiceId: invoice.id,
        amount: totalAmount,
        occurredAt: params.receipt.receivedAt,
        note: `فاتورة ${invoice.invoiceNumber} — ${params.receipt.receiptNumber}`,
        createdById: params.createdById ?? null,
      },
      tx,
    );

    return invoice;
  }

  async createFromReceiptId(goodsReceiptId: string, createdById?: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id: goodsReceiptId },
      include: {
        lines: { include: { stockItem: true } },
        branch: { select: { organizationId: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    if (receipt.status !== 'POSTED') throw new BadRequestException('Receipt must be posted');

    return this.prisma.$transaction(async (tx) =>
      this.createFromGoodsReceipt(tx, {
        receipt,
        organizationId: receipt.branch.organizationId,
        ...(createdById ? { createdById } : {}),
      }),
    );
  }

  async post(id: string, createdById?: string) {
    const invoice = await this.prisma.vendorInvoice.findUnique({ where: { id }, include: { lines: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorInvoice.update({
        where: { id },
        data: { status: 'POSTED' },
        include: { vendor: true, lines: true },
      });
      await this.vendorLedger.postInvoice(
        {
          branchId: invoice.branchId,
          vendorId: invoice.vendorId,
          invoiceId: invoice.id,
          amount: Number(invoice.totalAmount),
          occurredAt: invoice.invoiceDate,
          note: `فاتورة ${invoice.invoiceNumber}`,
          createdById: createdById ?? null,
        },
        tx,
      );
      return updated;
    });
  }

  async void(id: string, createdById?: string) {
    const invoice = await this.prisma.vendorInvoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'VOIDED') throw new BadRequestException('Invoice already voided');
    if (Number(invoice.paidAmount) > 0) throw new BadRequestException('Cannot void invoice with payments');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorInvoice.update({
        where: { id },
        data: { status: 'VOIDED' },
        include: { vendor: true, lines: true },
      });

      if (invoice.status === 'POSTED' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PAID') {
        await this.vendorLedger.postAdjustment(
          {
            branchId: invoice.branchId,
            vendorId: invoice.vendorId,
            debit: Number(invoice.totalAmount),
            sourceId: invoice.id,
            occurredAt: new Date(),
            note: `إلغاء فاتورة ${invoice.invoiceNumber}`,
            createdById: createdById ?? null,
          },
          tx,
        );
      }

      return updated;
    });
  }
}
