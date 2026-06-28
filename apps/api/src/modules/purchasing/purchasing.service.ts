import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { VendorInvoicesService } from '../vendor-accounts/vendor-invoices.service.js';
import { VendorLedgerService } from '../vendor-accounts/vendor-ledger.service.js';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private vendorLedger: VendorLedgerService,
  ) {}

  async list(branchId: string, withBalance = false) {
    if (!branchId?.trim()) {
      throw new BadRequestException('branchId is required');
    }
    const vendors = await this.prisma.vendor.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
    if (!withBalance) return vendors;
    const balances = await Promise.all(vendors.map((v) => this.vendorLedger.getBalance(v.id)));
    return vendors.map((v, i) => ({ ...v, currentBalance: balances[i] }));
  }

  create(data: {
    branchId: string;
    name: string;
    code: string;
    phone?: string;
    openingBalance?: number;
    taxId?: string;
    address?: string;
    note?: string;
  }) {
    return this.prisma.vendor.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        code: data.code,
        phone: data.phone ?? null,
        openingBalance: data.openingBalance ?? 0,
        openingBalanceAt: data.openingBalance ? new Date() : null,
        taxId: data.taxId ?? null,
        address: data.address ?? null,
        note: data.note ?? null,
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      openingBalance?: number;
      taxId?: string;
      address?: string;
      note?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.taxId !== undefined ? { taxId: data.taxId } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.openingBalance !== undefined
          ? { openingBalance: data.openingBalance, openingBalanceAt: new Date() }
          : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.vendor.delete({ where: { id } });
  }
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private vendorInvoicesService: VendorInvoicesService,
  ) {}

  list(branchId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { branchId },
      include: { vendor: true, lines: { include: { stockItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    branchId: string;
    vendorId: string;
    lines: Array<{ stockItemId: string; quantity: number; unitCost: number }>;
    note?: string;
    createdById?: string;
  }) {
    const branch = await this.prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const orderNumber = await this.sequenceService.getNextNumber(branch.organizationId, 'PO', data.branchId);

    return this.prisma.purchaseOrder.create({
      data: {
        branchId: data.branchId,
        vendorId: data.vendorId,
        orderNumber,
        note: data.note ?? null,
        createdById: data.createdById ?? null,
        lines: {
          create: data.lines.map((line) => ({
            stockItemId: line.stockItemId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            lineTotal: line.quantity * line.unitCost,
          })),
        },
      },
      include: { vendor: true, lines: { include: { stockItem: true } } },
    });
  }

  async receive(poId: string, data: { warehouseId: string; receivedById?: string }) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: { include: { stockItem: true } }, vendor: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const branch = await this.prisma.branch.findUnique({ where: { id: po.branchId } });
    const receiptNumber = await this.sequenceService.getNextNumber(branch!.organizationId, 'GR', po.branchId);

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({
        data: {
          branchId: po.branchId,
          vendorId: po.vendorId,
          purchaseOrderId: po.id,
          warehouseId: data.warehouseId,
          receiptNumber,
          status: 'POSTED',
          receivedAt: new Date(),
          createdById: data.receivedById ?? null,
          lines: {
            create: po.lines.map((line) => ({
              stockItemId: line.stockItemId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              lineTotal: Number(line.lineTotal),
            })),
          },
        },
        include: { lines: { include: { stockItem: true } } },
      });

      for (const line of po.lines) {
        const qty = Number(line.quantity);
        await tx.stockItem.update({
          where: { id: line.stockItemId },
          data: {
            onHandQuantity: { increment: qty },
            averageCost: line.unitCost,
          },
        });

        await tx.stockLedgerEntry.create({
          data: {
            branchId: po.branchId,
            warehouseId: data.warehouseId,
            stockItemId: line.stockItemId,
            direction: 'IN',
            quantity: qty,
            unitCost: Number(line.unitCost),
            totalCost: Number(line.lineTotal),
            sourceType: 'GOODS_RECEIPT',
            sourceId: receipt.id,
            occurredAt: new Date(),
          },
        });
      }

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' },
      });

      await this.vendorInvoicesService.createFromGoodsReceipt(tx, {
        receipt,
        organizationId: branch!.organizationId,
        ...(data.receivedById ? { createdById: data.receivedById } : {}),
      });

      return receipt;
    });
  }
}
