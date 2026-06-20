import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
  ) {}

  list(branchId: string) {
    return this.prisma.vendor.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
  }

  create(data: { branchId: string; name: string; code: string; phone?: string }) {
    return this.prisma.vendor.create({ data });
  }

  update(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.vendor.update({ where: { id }, data });
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
      include: { lines: true, vendor: true },
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
        include: { lines: true },
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

      return receipt;
    });
  }
}
