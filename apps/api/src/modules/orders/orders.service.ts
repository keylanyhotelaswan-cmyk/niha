import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType, Prisma } from '@prisma/client';
import { CreateOrderDto } from '@niha/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service.js';
import { AddPaymentDto, CreateOpenOrderDto, SuspendOrderDto, VoidOrderDto } from './dto/order-lifecycle.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private treasuryService: TreasuryService,
    private paymentMethodsService: PaymentMethodsService,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const { shiftId, cashBoxId } = await this.resolveShiftContext(dto.branchId, dto.shiftId, dto.cashBoxId);
    const orderNumber = await this.allocateOrderNumber(branch.organizationId, dto.branchId, shiftId);
    const subtotal = dto.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const paymentCode = this.mapPaymentMethodCode(dto.paymentMethod);
    const paymentMethod = await this.paymentMethodsService.findByCode(dto.branchId, paymentCode);
    if (!paymentMethod) {
      throw new BadRequestException(`Payment method ${paymentCode} not found`);
    }

    const isCash = paymentMethod.type === 'CASH';
    const isUncollected = dto.collectionStatus === 'UNCOLLECTED';
    const orderCollectionStatus = isUncollected ? 'UNCOLLECTED' : 'PENDING_APPROVAL';
    const orderApprovalStatus = 'PENDING';

    const order = await this.prisma.order.create({
      data: {
        branchId: dto.branchId,
        shiftId,
        cashBoxId,
        orderNumber,
        orderType: this.mapOrderType(dto.orderType),
        status: 'CLOSED',
        paymentStatus: isUncollected ? 'PENDING' : 'PAID',
        collectionStatus: orderCollectionStatus as any,
        approvalStatus: orderApprovalStatus as any,
        customerName: dto.orderOwnerName ?? null,
        customerPhone: dto.customerPhone ?? null,
        customerAddress: dto.customerAddress ?? null,
        captainName: dto.captainName ?? null,
        subtotal,
        discountAmount,
        taxAmount: 0,
        serviceAmount: 0,
        totalAmount,
        amountPaid: isUncollected ? 0 : totalAmount,
        amountDue: isUncollected ? totalAmount : 0,
        note: dto.orderNote ?? null,
        openedAt: new Date(),
        closedAt: new Date(),
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity,
          })),
        },
        payments: {
          create: {
            paymentMethodId: paymentMethod.id,
            shiftId,
            collectedById: userId,
            amount: totalAmount,
            approvalStatus: orderApprovalStatus as any,
            affectsCash: isCash && !isUncollected,
          },
        },
      },
      include: { items: true, payments: true },
    });

    await this.deductInventoryForOrder(dto.items, dto.branchId, order.id, orderNumber);

    if (cashBoxId && !isUncollected) {
      await this.treasuryService.recordSaleReceipt({
        branchId: dto.branchId,
        cashBoxId,
        shiftId,
        orderId: order.id,
        orderNumber,
        amount: totalAmount,
        paymentMethod: paymentMethod.type,
        paymentMethodId: paymentMethod.id,
        collectionStatus: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        affectsCash: isCash,
        note: `تحصيل طلب ${orderNumber}`,
      });
    }

    return order;
  }

  async createOpen(dto: CreateOpenOrderDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const { shiftId, cashBoxId } = await this.resolveShiftContext(dto.branchId, dto.shiftId, dto.cashBoxId);
    const orderNumber = await this.allocateOrderNumber(branch.organizationId, dto.branchId, shiftId);
    const subtotal = dto.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    return this.prisma.order.create({
      data: {
        branchId: dto.branchId,
        shiftId,
        cashBoxId,
        orderNumber,
        orderType: dto.orderType,
        status: 'OPEN',
        paymentStatus: 'PENDING',
        collectionStatus: 'UNCOLLECTED',
        approvalStatus: 'PENDING',
        customerName: dto.orderOwnerName ?? null,
        customerPhone: dto.customerPhone ?? null,
        customerAddress: dto.customerAddress ?? null,
        captainName: dto.captainName ?? null,
        subtotal,
        discountAmount,
        totalAmount,
        amountDue: totalAmount,
        amountPaid: 0,
        note: dto.orderNote ?? null,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  async suspend(orderId: string, userId: string, dto: SuspendOrderDto) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status !== 'OPEN') {
      throw new BadRequestException('Only open orders can be suspended');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'SUSPENDED' },
        include: { items: true, suspension: true },
      });

      await tx.suspendedOrder.upsert({
        where: { orderId },
        create: {
          orderId,
          suspendedById: userId,
          reason: dto.reason ?? null,
        },
        update: {
          suspendedById: userId,
          reason: dto.reason ?? null,
          suspendedAt: new Date(),
          resumedAt: null,
          resumedById: null,
        },
      });

      return updated;
    });
  }

  async resume(orderId: string, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended orders can be resumed');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.suspendedOrder.update({
        where: { orderId },
        data: { resumedById: userId, resumedAt: new Date() },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'OPEN' },
        include: { items: true, suspension: true },
      });
    });
  }

  async addPayment(orderId: string, dto: AddPaymentDto, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot add payment to closed or cancelled order');
    }

    const paymentMethod = await this.paymentMethodsService.findByCode(order.branchId, dto.paymentMethodCode);
    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    const isCash = paymentMethod.type === 'CASH';
    const approvalStatus = dto.approvalStatus ?? 'APPROVED';
    const amountPaid = Number(order.amountPaid) + dto.amount;
    const amountDue = Math.max(0, Number(order.totalAmount) - amountPaid);
    const paymentStatus = amountDue <= 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';

    const payment = await this.prisma.orderPayment.create({
      data: {
        orderId,
        paymentMethodId: paymentMethod.id,
        shiftId: order.shiftId,
        collectedById: userId,
        amount: dto.amount,
        approvalStatus: approvalStatus as any,
        affectsCash: isCash && approvalStatus === 'APPROVED',
      },
    });

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        amountPaid,
        amountDue,
        paymentStatus,
        collectionStatus: approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : 'APPROVED',
        approvalStatus: approvalStatus as any,
      },
      include: { items: true, payments: true },
    });

    if (order.cashBoxId && approvalStatus === 'APPROVED') {
      await this.treasuryService.recordSaleReceipt({
        branchId: order.branchId,
        cashBoxId: order.cashBoxId,
        shiftId: order.shiftId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: dto.amount,
        paymentMethod: paymentMethod.type,
        paymentMethodId: paymentMethod.id,
        collectionStatus: 'APPROVED',
        approvalStatus: 'APPROVED',
        affectsCash: isCash,
        note: `دفعة جزئية للطلب ${order.orderNumber}`,
      });
    }

    return { order: updated, payment };
  }

  async collectClosedOrder(orderId: string, dto: AddPaymentDto, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status !== 'CLOSED') {
      throw new BadRequestException('Only closed orders can be collected from POS');
    }
    if (order.collectionStatus === 'APPROVED') {
      throw new BadRequestException('Order is already collected');
    }
    if (!order.cashBoxId) {
      throw new BadRequestException('Order has no cash box');
    }

    const paymentMethod = await this.paymentMethodsService.findByCode(order.branchId, dto.paymentMethodCode);
    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    const isCash = paymentMethod.type === 'CASH';
    const amount = dto.amount ?? Number(order.totalAmount);

    await this.treasuryService.recordSaleReceipt({
      branchId: order.branchId,
      cashBoxId: order.cashBoxId,
      shiftId: order.shiftId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      paymentMethod: paymentMethod.type,
      paymentMethodId: paymentMethod.id,
      collectionStatus: 'PENDING_APPROVAL',
      approvalStatus: 'PENDING',
      affectsCash: isCash,
      note: `تحصيل طلب ${order.orderNumber}`,
    });

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        collectionStatus: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        paymentStatus: 'PAID',
        amountPaid: amount,
        amountDue: 0,
      },
      include: { items: true, payments: true },
    });

    if (isCash) {
      await this.prisma.orderPayment.updateMany({
        where: { orderId },
        data: { affectsCash: true, approvalStatus: 'PENDING' },
      });
    }

    return updated;
  }

  async close(orderId: string, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === 'CLOSED') {
      throw new BadRequestException('Order is already closed');
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot close cancelled order');
    }

    if (Number(order.amountDue) > 0) {
      throw new BadRequestException('Order has outstanding balance');
    }

    const closed = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CLOSED', closedAt: new Date(), paymentStatus: 'PAID' },
      include: { items: true, payments: true },
    });

    const items = closed.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    await this.deductInventoryForOrder(items, closed.branchId, closed.id, closed.orderNumber);

    return closed;
  }

  async void(orderId: string, userId: string, dto: VoidOrderDto) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === 'CLOSED') {
      throw new BadRequestException('Cannot void closed order');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'VOIDED',
        note: dto.reason ? `${order.note ?? ''} [VOID: ${dto.reason}]` : order.note,
      },
      include: { items: true },
    });
  }

  async listSuspended(branchId: string) {
    return this.prisma.order.findMany({
      where: { branchId, status: 'SUSPENDED' },
      include: { items: { include: { product: true } }, suspension: true },
      orderBy: { openedAt: 'desc' },
    });
  }

  async list(branchId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        branchId,
        ...(status ? { status: status as any } : {}),
      },
      include: { items: true, payments: true },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async listClosedForShift(shiftId: string) {
    return this.prisma.order.findMany({
      where: { shiftId, status: 'CLOSED' },
      select: {
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
        closedAt: true,
        openedAt: true,
        items: { include: { product: true } },
      },
      orderBy: { closedAt: 'desc' },
    });
  }

  private async findOrderOrThrow(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private async resolveShiftContext(
    branchId: string,
    shiftId?: string | null,
    cashBoxId?: string | null,
  ): Promise<{ shiftId: string | null; cashBoxId: string | null }> {
    let resolvedShiftId = shiftId ?? null;
    let resolvedCashBoxId = cashBoxId ?? null;

    if (!resolvedCashBoxId) {
      const cashBox = await this.prisma.cashBox.findFirst({ where: { branchId } });
      resolvedCashBoxId = cashBox?.id ?? null;
    }

    if (!resolvedShiftId && resolvedCashBoxId) {
      const shift = await this.prisma.shift.findFirst({
        where: { branchId, cashBoxId: resolvedCashBoxId, status: 'OPEN' },
      });
      resolvedShiftId = shift?.id ?? null;
    }

    return { shiftId: resolvedShiftId, cashBoxId: resolvedCashBoxId };
  }

  private async allocateOrderNumber(
    organizationId: string,
    branchId: string,
    shiftId: string | null,
  ): Promise<string> {
    if (shiftId) {
      return this.sequenceService.getNextShiftOrderNumber(organizationId, branchId, shiftId);
    }
    return this.sequenceService.getNextNumber(organizationId, 'ORDER', branchId);
  }

  private mapPaymentMethodCode(method: CreateOrderDto['paymentMethod']): string {
    if (method === 'CASH') return 'CASH';
    if (method === 'CARD') return 'CARD';
    if (method === 'INSTAPAY') return 'INSTAPAY';
    if (method === 'WALLET') return 'WALLET';
    return 'CASH';
  }

  private mapOrderType(orderType: CreateOrderDto['orderType']): 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' {
    if (orderType === 'EAT_IN' || orderType === 'DINE_IN') return 'DINE_IN';
    if (orderType === 'TAKEAWAY') return 'TAKEAWAY';
    return 'DINE_IN';
  }

  private async deductInventoryForOrder(
    items: Array<{ productId: string; quantity: number }>,
    branchId: string,
    orderId: string,
    orderCode: string,
  ) {
    const productIds = [...new Set(items.map((item) => item.productId))];
    if (!productIds.length) return;

    const recipes = await this.prisma.recipe.findMany({
      where: { branchId, productId: { in: productIds } },
    });
    if (!recipes.length) return;

    const recipeIds = recipes.map((r) => r.id);
    const versions = await this.prisma.recipeVersion.findMany({
      where: { recipeId: { in: recipeIds }, status: 'ACTIVE' },
      include: { components: true },
    });
    const versionByProductId = new Map<string, typeof versions[0]>();
    for (const recipe of recipes) {
      const version = versions.find((v) => v.recipeId === recipe.id);
      if (version?.components.length) versionByProductId.set(recipe.productId, version);
    }

    const stockDecrements = new Map<string, number>();
    const ledgerRows: Prisma.StockLedgerEntryCreateManyInput[] = [];
    const stockItemIds = new Set<string>();

    for (const item of items) {
      const version = versionByProductId.get(item.productId);
      if (!version) continue;

      for (const component of version.components) {
        const wasteMultiplier = 1 + (Number(component.wastePercent) || 0) / 100;
        const deductQty = Number(component.quantity) * item.quantity * wasteMultiplier;
        stockDecrements.set(
          component.stockItemId,
          (stockDecrements.get(component.stockItemId) ?? 0) + deductQty,
        );
        stockItemIds.add(component.stockItemId);
      }
    }

    if (!stockDecrements.size) return;

    const stockItems = await this.prisma.stockItem.findMany({
      where: { id: { in: [...stockItemIds] } },
      select: { id: true, warehouseId: true },
    });
    const warehouseByStockId = new Map(stockItems.map((s) => [s.id, s.warehouseId]));

    for (const [stockItemId, deductQty] of stockDecrements) {
      ledgerRows.push({
        branchId,
        warehouseId: warehouseByStockId.get(stockItemId) ?? '',
        stockItemId,
        direction: 'OUT',
        quantity: deductQty,
        unitCost: 0,
        totalCost: 0,
        sourceType: 'ORDER',
        sourceId: orderId,
        occurredAt: new Date(),
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [stockItemId, deductQty] of stockDecrements) {
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: { onHandQuantity: { decrement: deductQty } },
        });
      }
      if (ledgerRows.length) {
        await tx.stockLedgerEntry.createMany({ data: ledgerRows });
      }
    });
  }
}
