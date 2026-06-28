import { BadRequestException, Injectable } from '@nestjs/common';
import { VendorLedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class VendorLedgerService {
  constructor(private prisma: PrismaService) {}

  roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  async getBalance(vendorId: string, client: DbClient = this.prisma) {
    const vendor = await client.vendor.findUniqueOrThrow({ where: { id: vendorId } });
    const last = await client.vendorLedgerEntry.findFirst({
      where: { vendorId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (last) return this.roundMoney(Number(last.balanceAfter));
    return this.roundMoney(Number(vendor.openingBalance));
  }

  private assertApSource(sourceType: string) {
    if (sourceType === 'ORDER' || sourceType === 'SALE_RECEIPT') {
      throw new BadRequestException('Vendor ledger cannot reference sales transactions');
    }
  }

  async postEntry(
    params: {
      branchId: string;
      vendorId: string;
      entryType: VendorLedgerEntryType;
      sourceType: string;
      sourceId?: string | null;
      credit?: number;
      debit?: number;
      occurredAt?: Date;
      note?: string | null;
      createdById?: string | null;
    },
    client: DbClient = this.prisma,
  ) {
    this.assertApSource(params.sourceType);
    const credit = this.roundMoney(params.credit ?? 0);
    const debit = this.roundMoney(params.debit ?? 0);
    if (credit < 0 || debit < 0) {
      throw new BadRequestException('Ledger amounts must be non-negative');
    }
    if (credit === 0 && debit === 0) {
      throw new BadRequestException('Ledger entry must have credit or debit');
    }

    const balance = await this.getBalance(params.vendorId, client);
    const balanceAfter = this.roundMoney(balance + credit - debit);

    return client.vendorLedgerEntry.create({
      data: {
        branchId: params.branchId,
        vendorId: params.vendorId,
        entryType: params.entryType,
        sourceType: params.sourceType,
        sourceId: params.sourceId ?? null,
        credit,
        debit,
        balanceAfter,
        occurredAt: params.occurredAt ?? new Date(),
        note: params.note ?? null,
        createdById: params.createdById ?? null,
      },
    });
  }

  async postInvoice(
    params: {
      branchId: string;
      vendorId: string;
      invoiceId: string;
      amount: number;
      occurredAt?: Date;
      note?: string | null;
      createdById?: string | null;
    },
    client: DbClient = this.prisma,
  ) {
    return this.postEntry(
      {
        branchId: params.branchId,
        vendorId: params.vendorId,
        entryType: 'INVOICE',
        sourceType: 'VENDOR_INVOICE',
        sourceId: params.invoiceId,
        credit: params.amount,
        debit: 0,
        occurredAt: params.occurredAt ?? new Date(),
        note: params.note ?? null,
        createdById: params.createdById ?? null,
      },
      client,
    );
  }

  async postPayment(
    params: {
      branchId: string;
      vendorId: string;
      paymentId: string;
      amount: number;
      occurredAt?: Date;
      note?: string | null;
      createdById?: string | null;
    },
    client: DbClient = this.prisma,
  ) {
    return this.postEntry(
      {
        branchId: params.branchId,
        vendorId: params.vendorId,
        entryType: 'PAYMENT',
        sourceType: 'VENDOR_PAYMENT',
        sourceId: params.paymentId,
        credit: 0,
        debit: params.amount,
        occurredAt: params.occurredAt ?? new Date(),
        note: params.note ?? null,
        createdById: params.createdById ?? null,
      },
      client,
    );
  }

  async postAdjustment(
    params: {
      branchId: string;
      vendorId: string;
      credit?: number;
      debit?: number;
      sourceId?: string | null;
      occurredAt?: Date;
      note?: string | null;
      createdById?: string | null;
    },
    client: DbClient = this.prisma,
  ) {
    return this.postEntry(
      {
        branchId: params.branchId,
        vendorId: params.vendorId,
        entryType: 'ADJUSTMENT',
        sourceType: 'MANUAL',
        sourceId: params.sourceId ?? null,
        credit: params.credit ?? 0,
        debit: params.debit ?? 0,
        occurredAt: params.occurredAt ?? new Date(),
        note: params.note ?? null,
        createdById: params.createdById ?? null,
      },
      client,
    );
  }
}
