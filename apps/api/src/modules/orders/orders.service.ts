import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType, Prisma } from '@prisma/client';
import { CreateOrderDto } from '@niha/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service.js';
import { AddPaymentDto, AmendOrderDto, CancelOrderRequestDto, CreateOpenOrderDto, SuspendOrderDto, VoidOrderDto } from './dto/order-lifecycle.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { isValidCustomerPhone, normalizeCustomerPhone } from '../customers/customer-phone.util.js';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
    private treasuryService: TreasuryService,
    private paymentMethodsService: PaymentMethodsService,
    private auditService: AuditService,
    private customersService: CustomersService,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    this.assertTakeawayCustomer(this.mapOrderType(dto.orderType), dto.orderOwnerName, dto.customerPhone);

    const paymentCode = this.mapPaymentMethodCode(dto.paymentMethod);
    const [branch, paymentMethod, { shiftId, cashBoxId }] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.paymentMethodsService.findByCode(dto.branchId, paymentCode),
      this.resolveShiftContext(dto.branchId, dto.shiftId, dto.cashBoxId),
    ]);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    if (!paymentMethod) {
      throw new BadRequestException(`Payment method ${paymentCode} not found`);
    }

    const orderNumber = await this.allocateOrderNumber(branch.organizationId, dto.branchId, shiftId);
    const subtotal = dto.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const customerId = await this.customersService.syncFromOrder({
      branchId: dto.branchId,
      phone: dto.customerPhone ?? null,
      name: dto.orderOwnerName ?? null,
      address: dto.customerAddress ?? null,
      orderTotal: totalAmount,
      orderAt: new Date(),
      incrementStats: true,
    });

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
        customerPhone: this.formatCustomerPhone(dto.customerPhone),
        customerAddress: dto.customerAddress ?? null,
        captainName: dto.captainName ?? null,
        ...(customerId ? { customerId } : {}),
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
          create: dto.items.map((item) => this.orderItemCreateData(item)),
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

    void this.logOrderAudit({
      branchId: dto.branchId,
      organizationId: branch.organizationId,
      actorUserId: userId,
      orderId: order.id,
      action: 'CREATE',
      afterData: {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        captainName: order.captainName,
        collectionStatus: order.collectionStatus,
        paymentStatus: order.paymentStatus,
        note: order.note,
        items: this.snapshotDtoItems(dto.items),
      },
    }).catch(() => {});

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

    this.assertTakeawayCustomer(dto.orderType, dto.orderOwnerName, dto.customerPhone);

    const { shiftId, cashBoxId } = await this.resolveShiftContext(dto.branchId, dto.shiftId, dto.cashBoxId);
    const orderNumber = await this.allocateOrderNumber(branch.organizationId, dto.branchId, shiftId);
    const subtotal = dto.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const customerId = await this.customersService.syncFromOrder({
      branchId: dto.branchId,
      phone: dto.customerPhone ?? null,
      name: dto.orderOwnerName ?? null,
      address: dto.customerAddress ?? null,
      incrementStats: false,
    });

    const created = await this.prisma.order.create({
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
        customerPhone: this.formatCustomerPhone(dto.customerPhone),
        customerAddress: dto.customerAddress ?? null,
        captainName: dto.captainName ?? null,
        ...(customerId ? { customerId } : {}),
        subtotal,
        discountAmount,
        totalAmount,
        amountDue: totalAmount,
        amountPaid: 0,
        note: dto.orderNote ?? null,
        createdById: userId,
        items: {
          create: dto.items.map((item) => this.orderItemCreateData(item)),
        },
      },
      include: { items: { include: { product: true, notes: true } } },
    });

    void this.logOrderAudit({
      branchId: dto.branchId,
      actorUserId: userId,
      orderId: created.id,
      action: 'CREATE',
      afterData: {
        orderNumber: created.orderNumber,
        orderType: created.orderType,
        status: created.status,
        totalAmount: Number(created.totalAmount),
        customerName: created.customerName,
        items: this.snapshotOrderItems(created.items),
      },
    });

    return created;
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
        include: { items: { include: { product: true } }, suspension: true },
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

      await this.logOrderAudit({
        branchId: order.branchId,
        actorUserId: userId,
        orderId,
        action: 'UPDATE',
        beforeData: { status: order.status },
        afterData: {
          status: 'SUSPENDED',
          reason: dto.reason ?? null,
          orderNumber: order.orderNumber,
        },
      });

      return updated;
    });
  }

  async amendClosedOrder(orderId: string, dto: AmendOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'CLOSED') {
      throw new BadRequestException('Only closed orders can be amended');
    }

    const nextCustomerName = dto.customerName !== undefined ? dto.customerName : order.customerName ?? '';
    const nextCustomerPhone = dto.customerPhone !== undefined ? dto.customerPhone : order.customerPhone ?? '';
    if (order.orderType === 'TAKEAWAY') {
      this.assertTakeawayCustomer(order.orderType, nextCustomerName, nextCustomerPhone);
    }

    if (dto.items !== undefined) {
      const normalizedItems = dto.items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));
      if (!normalizedItems.length) {
        throw new BadRequestException('Order must have at least one item');
      }
    }

    const beforeData = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      captainName: order.captainName,
      note: order.note,
      subtotal: Number(order.subtotal),
      totalAmount: Number(order.totalAmount),
      items: this.snapshotOrderItems(order.items),
    };

    const oldItemQty = order.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));

    let subtotal = Number(order.subtotal);
    let totalAmount = Number(order.totalAmount);

    if (dto.items !== undefined) {
      const normalizedItems = dto.items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        }));
      subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      totalAmount = Math.max(0, subtotal - Number(order.discountAmount));
    }

    const amountPaid = Number(order.amountPaid);
    const amountDue = Math.max(0, totalAmount - amountPaid);
    const paymentStatus =
      amountDue <= 0 && amountPaid > 0
        ? 'PAID'
        : amountPaid > 0 && amountDue > 0
          ? 'PARTIAL'
          : order.paymentStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        const normalizedItems = dto.items
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity,
          }));

        const itemIds = order.items.map((item) => item.id);
        if (itemIds.length) {
          await tx.orderItemNote.deleteMany({ where: { orderItemId: { in: itemIds } } });
          await tx.orderItem.deleteMany({ where: { orderId } });
        }

        const itemsWithNotes = dto.items.filter((item) => item.quantity > 0);
        for (const item of itemsWithNotes) {
          await tx.orderItem.create({
            data: {
              orderId,
              ...this.orderItemCreateData(item),
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          ...(dto.customerName !== undefined ? { customerName: dto.customerName.trim() || null } : {}),
          ...(dto.customerPhone !== undefined ? { customerPhone: this.formatCustomerPhone(dto.customerPhone) } : {}),
          ...(dto.customerAddress !== undefined ? { customerAddress: dto.customerAddress.trim() || null } : {}),
          ...(dto.captainName !== undefined ? { captainName: dto.captainName.trim() || null } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
          ...(dto.items !== undefined
            ? {
                subtotal,
                totalAmount,
                amountDue,
                paymentStatus,
              }
            : {}),
        },
        include: { items: { include: { product: true, notes: true } } },
      });
    });

    if (dto.items !== undefined) {
      const newItemQty = dto.items
        .filter((item) => item.quantity > 0)
        .map((item) => ({ productId: item.productId, quantity: item.quantity }));
      await this.adjustInventoryDelta(oldItemQty, newItemQty, order.branchId, order.id, order.orderNumber);
    }

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'UPDATE',
      beforeData,
      afterData: {
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        customerAddress: updated.customerAddress,
        captainName: updated.captainName,
        note: updated.note,
        subtotal: Number(updated.subtotal),
        totalAmount: Number(updated.totalAmount),
        items: this.snapshotOrderItems(updated.items),
      },
    });

    const customerId = await this.customersService.syncFromOrder({
      branchId: order.branchId,
      phone: updated.customerPhone,
      name: updated.customerName,
      address: updated.customerAddress,
      incrementStats: false,
    });
    if (customerId && customerId !== updated.customerId) {
      await this.prisma.order.update({ where: { id: orderId }, data: { customerId } });
    }

    return updated;
  }

  async getAuditLogs(orderId: string) {
    const order = await this.findOrderOrThrow(orderId);
    const branch = await this.prisma.branch.findUnique({
      where: { id: order.branchId },
      select: { organizationId: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return this.auditService.findByEntity(branch.organizationId, 'ORDER', orderId);
  }

  async uncollectClosedOrder(orderId: string, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status !== 'CLOSED') {
      throw new BadRequestException('Only closed orders can be uncollected');
    }
    if (order.collectionStatus !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Can only revert to unpaid before manager approval');
    }
    if (order.cancelRequestedAt) {
      throw new BadRequestException('Cannot uncollect while cancellation is pending');
    }

    const beforeData = {
      collectionStatus: order.collectionStatus,
      paymentStatus: order.paymentStatus,
      amountPaid: Number(order.amountPaid),
    };

    await this.rejectPendingTreasuryForOrder(orderId, 'تراجع عن التحصيل من نقطة البيع');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        collectionStatus: 'UNCOLLECTED',
        approvalStatus: 'PENDING',
        paymentStatus: 'PENDING',
        amountPaid: 0,
        amountDue: Number(order.totalAmount),
      },
      include: { items: { include: { product: true } } },
    });

    await this.prisma.orderPayment.updateMany({
      where: { orderId },
      data: { approvalStatus: 'REJECTED', affectsCash: false },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'UPDATE',
      beforeData,
      afterData: {
        orderNumber: order.orderNumber,
        collectionStatus: updated.collectionStatus,
        paymentStatus: updated.paymentStatus,
        amountPaid: 0,
        note: 'تراجع — غير مدفوع',
      },
    });

    return updated;
  }

  /** إلغاء فوري — طلب غير محصل أو لم يُعتمد تحصيله بعد */
  async cancelClosedOrder(orderId: string, userId: string, dto: CancelOrderRequestDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'CLOSED') {
      throw new BadRequestException('Only closed orders can be cancelled');
    }
    if (order.cancelRequestedAt) {
      throw new BadRequestException('Cancellation already pending');
    }
    if (order.collectionStatus === 'APPROVED') {
      throw new BadRequestException('Approved orders require manager cancellation approval');
    }

    return this.finalizeOrderCancellation(order, userId, dto.reason ?? 'إلغاء من نقطة البيع', {
      rejectTreasury: order.collectionStatus === 'PENDING_APPROVAL',
    });
  }

  /** طلب إلغاء — بعد اعتماد المدير للتحصيل */
  async requestCancelClosedOrder(orderId: string, userId: string, dto: CancelOrderRequestDto) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status !== 'CLOSED') {
      throw new BadRequestException('Only closed orders can be cancelled');
    }
    if (order.collectionStatus !== 'APPROVED') {
      throw new BadRequestException('Use direct cancel for uncollected or pending orders');
    }
    if (order.cancelRequestedAt) {
      throw new BadRequestException('Cancellation already requested');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        cancelRequestedAt: new Date(),
        cancelRequestedById: userId,
        cancellationReason: dto.reason?.trim() || 'طلب إلغاء',
      },
      include: { items: { include: { product: true } } },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'CANCEL',
      afterData: {
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        collectionStatus: order.collectionStatus,
        status: 'CANCEL_REQUESTED',
        reason: updated.cancellationReason,
      },
    });

    return updated;
  }

  async withdrawCancelRequest(orderId: string, userId: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (!order.cancelRequestedAt) {
      throw new BadRequestException('No pending cancellation request');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        cancelRequestedAt: null,
        cancelRequestedById: null,
        cancellationReason: null,
      },
      include: { items: { include: { product: true } } },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'UPDATE',
      afterData: { status: 'CANCEL_WITHDRAWN' },
    });

    return updated;
  }

  async approveOrderCancellation(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.cancelRequestedAt) {
      throw new BadRequestException('No pending cancellation request');
    }

    return this.finalizeOrderCancellation(order, userId, order.cancellationReason ?? 'اعتماد إلغاء من الإدارة', {
      rejectTreasury: false,
    });
  }

  async rejectOrderCancellation(orderId: string, userId: string, reason?: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (!order.cancelRequestedAt) {
      throw new BadRequestException('No pending cancellation request');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        cancelRequestedAt: null,
        cancelRequestedById: null,
        cancellationReason: null,
      },
      include: { items: { include: { product: true } } },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'UPDATE',
      afterData: {
        status: 'CANCEL_REJECTED',
        ...(reason ? { reason } : {}),
      },
    });

    return updated;
  }

  async listPendingCancellations(branchId: string, shiftId?: string) {
    return this.prisma.order.findMany({
      where: {
        branchId,
        status: 'CLOSED',
        cancelRequestedAt: { not: null },
        ...(shiftId ? { shiftId } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        collectionStatus: true,
        cancelRequestedAt: true,
        cancellationReason: true,
        cancelRequestedById: true,
        createdBy: { select: { fullName: true, username: true } },
      },
      orderBy: { cancelRequestedAt: 'desc' },
      take: 100,
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

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'OPEN' },
        include: { items: { include: { product: true } }, suspension: true },
      });

      await this.logOrderAudit({
        branchId: order.branchId,
        actorUserId: userId,
        orderId,
        action: 'UPDATE',
        beforeData: { status: order.status },
        afterData: { status: 'OPEN', orderNumber: order.orderNumber },
      });

      return updated;
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
    if (order.collectionStatus === 'PENDING_APPROVAL') {
      throw new BadRequestException('Order is already waiting for treasury approval');
    }
    if (!order.cashBoxId) {
      throw new BadRequestException('Order has no cash box');
    }

    const paymentMethod = await this.paymentMethodsService.findByCode(order.branchId, dto.paymentMethodCode);
    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    const pendingTreasury = await this.prisma.treasuryTransaction.count({
      where: {
        sourceType: 'ORDER',
        sourceId: orderId,
        transactionType: 'SALE_RECEIPT',
        approvalStatus: 'PENDING',
      },
    });
    if (pendingTreasury > 0) {
      throw new BadRequestException('Order already has a pending treasury receipt');
    }

    const isCash = paymentMethod.type === 'CASH';
    const amount = dto.amount ?? Number(order.totalAmount);
    const collectionShiftId = await this.resolveCollectionShiftId(order);

    await this.treasuryService.recordSaleReceipt({
      branchId: order.branchId,
      cashBoxId: order.cashBoxId,
      shiftId: collectionShiftId,
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
        ...(collectionShiftId && collectionShiftId !== order.shiftId ? { shiftId: collectionShiftId } : {}),
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
        data: {
          affectsCash: true,
          approvalStatus: 'PENDING',
          ...(collectionShiftId ? { shiftId: collectionShiftId } : {}),
        },
      });
    } else if (collectionShiftId) {
      await this.prisma.orderPayment.updateMany({
        where: { orderId },
        data: { shiftId: collectionShiftId },
      });
    }

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'UPDATE',
      beforeData: { collectionStatus: order.collectionStatus, paymentStatus: order.paymentStatus },
      afterData: {
        orderNumber: order.orderNumber,
        collectionStatus: updated.collectionStatus,
        paymentStatus: updated.paymentStatus,
        amountPaid: amount,
      },
    }).catch(() => {});

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
      include: { items: { include: { product: true } }, payments: true },
    });

    const items = closed.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    await this.deductInventoryForOrder(items, closed.branchId, closed.id, closed.orderNumber);

    await this.logOrderAudit({
      branchId: closed.branchId,
      actorUserId: userId,
      orderId,
      action: 'CLOSE',
      beforeData: { status: order.status },
      afterData: {
        status: 'CLOSED',
        orderNumber: closed.orderNumber,
        totalAmount: Number(closed.totalAmount),
        items: this.snapshotOrderItems(closed.items),
      },
    });

    return closed;
  }

  async void(orderId: string, userId: string, dto: VoidOrderDto) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === 'CLOSED') {
      throw new BadRequestException('Cannot void closed order');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'VOIDED',
        note: dto.reason ? `${order.note ?? ''} [VOID: ${dto.reason}]` : order.note,
      },
      include: { items: { include: { product: true } } },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId,
      action: 'CANCEL',
      beforeData: {
        status: order.status,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
      },
      afterData: {
        status: 'CANCELLED',
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        reason: dto.reason ?? null,
      },
    });

    return updated;
  }

  async listSuspended(branchId: string) {
    return this.prisma.order.findMany({
      where: { branchId, status: 'SUSPENDED' },
      include: {
        items: { include: { product: true, notes: true } },
        suspension: true,
        createdBy: { select: { fullName: true, username: true } },
      },
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
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      select: { branchId: true, cashBoxId: true },
    });
    if (!shift?.cashBoxId) {
      return this.prisma.order.findMany({
        where: { shiftId, status: 'CLOSED' },
        select: this.closedOrderSelect(),
        orderBy: { closedAt: 'desc' },
      });
    }

    return this.prisma.order.findMany({
      where: {
        branchId: shift.branchId,
        cashBoxId: shift.cashBoxId,
        status: 'CLOSED',
        OR: [
          { shiftId },
          {
            OR: [{ collectionStatus: 'UNCOLLECTED' }, { paymentStatus: 'PENDING' }],
            shift: { status: 'CLOSED', cashBoxId: shift.cashBoxId },
          },
        ],
      },
      select: this.closedOrderSelect(),
      orderBy: { closedAt: 'desc' },
    });
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: this.closedOrderSelect(),
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private closedOrderSelect() {
    return {
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
      items: { include: { product: true, notes: true } },
    } satisfies Prisma.OrderSelect;
  }

  private async resolveCollectionShiftId(order: { branchId: string; cashBoxId: string | null; shiftId: string | null }) {
    if (order.shiftId) {
      const linked = await this.prisma.shift.findUnique({
        where: { id: order.shiftId },
        select: { status: true },
      });
      if (linked?.status === 'OPEN') return order.shiftId;
    }
    if (order.cashBoxId) {
      const open = await this.prisma.shift.findFirst({
        where: { branchId: order.branchId, cashBoxId: order.cashBoxId, status: 'OPEN' },
        select: { id: true },
        orderBy: { openedAt: 'desc' },
      });
      if (open) return open.id;
    }
    return order.shiftId;
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
      await Promise.all(
        [...stockDecrements.entries()].map(([stockItemId, deductQty]) =>
          tx.stockItem.update({
            where: { id: stockItemId },
            data: { onHandQuantity: { decrement: deductQty } },
          }),
        ),
      );
      if (ledgerRows.length) {
        await tx.stockLedgerEntry.createMany({ data: ledgerRows });
      }
    });
  }

  private async rejectPendingTreasuryForOrder(orderId: string, reason: string) {
    const pendingTx = await this.prisma.treasuryTransaction.findFirst({
      where: {
        sourceType: 'ORDER',
        sourceId: orderId,
        transactionType: 'SALE_RECEIPT',
        approvalStatus: 'PENDING',
      },
    });
    if (pendingTx) {
      await this.treasuryService.rejectTransaction(pendingTx.id, reason);
    }
  }

  private async finalizeOrderCancellation(
    order: {
      id: string;
      branchId: string;
      orderNumber: string;
      note: string | null;
      totalAmount: unknown;
      collectionStatus?: string;
      items: Array<{ productId: string; quantity: unknown }>;
    },
    userId: string,
    reason: string,
    opts: { rejectTreasury: boolean },
  ) {
    if (opts.rejectTreasury) {
      await this.rejectPendingTreasuryForOrder(order.id, reason);
    }

    const itemQty = order.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));
    if (itemQty.length) {
      await this.restoreInventoryForOrder(itemQty, order.branchId, order.id, order.orderNumber);
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'VOIDED',
        collectionStatus: 'UNCOLLECTED',
        cancelRequestedAt: null,
        cancelRequestedById: null,
        cancellationReason: null,
        note: order.note ? `${order.note} [ملغى: ${reason}]` : `[ملغى: ${reason}]`,
      },
      include: { items: { include: { product: true } } },
    });

    await this.prisma.orderPayment.updateMany({
      where: { orderId: order.id },
      data: { approvalStatus: 'REJECTED', affectsCash: false },
    });

    await this.logOrderAudit({
      branchId: order.branchId,
      actorUserId: userId,
      orderId: order.id,
      action: 'CANCEL',
      beforeData: {
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        collectionStatus: order.collectionStatus,
      },
      afterData: {
        status: 'CANCELLED',
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        reason,
      },
    });

    return updated;
  }

  private orderItemCreateData(item: {
    productId: string;
    quantity: number;
    unitPrice: number;
    note?: string | null;
  }) {
    const trimmed = item.note?.trim();
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
      ...(trimmed
        ? { notes: { create: [{ note: trimmed }] } }
        : {}),
    };
  }

  private snapshotOrderItems(
    items: Array<{
      productId: string;
      quantity: unknown;
      unitPrice: unknown;
      product?: { name?: string | null } | null;
    }>,
  ) {
    return items.map((item) => ({
      productId: item.productId,
      name: item.product?.name ?? item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
  }

  private computeProductQtyMap(items: Array<{ productId: string; quantity: number }>) {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }

  private async adjustInventoryDelta(
    oldItems: Array<{ productId: string; quantity: number }>,
    newItems: Array<{ productId: string; quantity: number }>,
    branchId: string,
    orderId: string,
    orderCode: string,
  ) {
    const oldMap = this.computeProductQtyMap(oldItems);
    const newMap = this.computeProductQtyMap(newItems);
    const toDeduct: Array<{ productId: string; quantity: number }> = [];
    const toRestore: Array<{ productId: string; quantity: number }> = [];

    for (const [productId, newQty] of newMap) {
      const delta = newQty - (oldMap.get(productId) ?? 0);
      if (delta > 0) toDeduct.push({ productId, quantity: delta });
      else if (delta < 0) toRestore.push({ productId, quantity: -delta });
      oldMap.delete(productId);
    }
    for (const [productId, oldQty] of oldMap) {
      toRestore.push({ productId, quantity: oldQty });
    }

    if (toDeduct.length) {
      await this.deductInventoryForOrder(toDeduct, branchId, orderId, orderCode);
    }
    if (toRestore.length) {
      await this.restoreInventoryForOrder(toRestore, branchId, orderId, orderCode);
    }
  }

  private async restoreInventoryForOrder(
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

    const stockIncrements = new Map<string, number>();
    const ledgerRows: Prisma.StockLedgerEntryCreateManyInput[] = [];
    const stockItemIds = new Set<string>();

    for (const item of items) {
      const version = versionByProductId.get(item.productId);
      if (!version) continue;

      for (const component of version.components) {
        const wasteMultiplier = 1 + (Number(component.wastePercent) || 0) / 100;
        const restoreQty = Number(component.quantity) * item.quantity * wasteMultiplier;
        stockIncrements.set(
          component.stockItemId,
          (stockIncrements.get(component.stockItemId) ?? 0) + restoreQty,
        );
        stockItemIds.add(component.stockItemId);
      }
    }

    if (!stockIncrements.size) return;

    const stockItems = await this.prisma.stockItem.findMany({
      where: { id: { in: [...stockItemIds] } },
      select: { id: true, warehouseId: true },
    });
    const warehouseByStockId = new Map(stockItems.map((s) => [s.id, s.warehouseId]));

    for (const [stockItemId, restoreQty] of stockIncrements) {
      ledgerRows.push({
        branchId,
        warehouseId: warehouseByStockId.get(stockItemId) ?? '',
        stockItemId,
        direction: 'IN',
        quantity: restoreQty,
        unitCost: 0,
        totalCost: 0,
        sourceType: 'ORDER',
        sourceId: orderId,
        occurredAt: new Date(),
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [stockItemId, restoreQty] of stockIncrements) {
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: { onHandQuantity: { increment: restoreQty } },
        });
      }
      if (ledgerRows.length) {
        await tx.stockLedgerEntry.createMany({ data: ledgerRows });
      }
    });
  }

  private assertTakeawayCustomer(
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
    customerName?: string | null,
    customerPhone?: string | null,
  ) {
    if (orderType !== 'TAKEAWAY') return;
    if (!customerName?.trim()) {
      throw new BadRequestException('Customer name is required for takeaway orders');
    }
    if (!isValidCustomerPhone(customerPhone)) {
      throw new BadRequestException('Valid customer phone is required for takeaway orders');
    }
  }

  async searchDeliveryCaptains(branchId: string, query?: string, limit = 12) {
    const q = query?.trim() ?? '';
    const take = Math.min(20, Math.max(1, limit));

    const groups = await this.prisma.order.groupBy({
      by: ['captainName'],
      where: {
        branchId,
        captainName: { not: null },
        NOT: { captainName: '' },
        ...(q.length >= 1 ? { captainName: { contains: q, mode: 'insensitive' } } : {}),
      },
      _count: { _all: true },
      _max: { closedAt: true },
      orderBy: { _max: { closedAt: 'desc' } },
      take,
    });

    return groups
      .filter((g): g is typeof g & { captainName: string } => Boolean(g.captainName?.trim()))
      .map((g) => ({
        name: g.captainName.trim(),
        orderCount: g._count._all,
        lastOrderAt: g._max.closedAt?.toISOString() ?? null,
      }));
  }

  private formatCustomerPhone(raw?: string | null) {
    return normalizeCustomerPhone(raw) ?? raw?.trim() ?? null;
  }

  private snapshotDtoItems(
    items: Array<{ productId: string; productName?: string; quantity: number; unitPrice: number }>,
  ) {
    return items.map((item) => ({
      productId: item.productId,
      name: item.productName ?? item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }

  private async logOrderAudit(params: {
    branchId: string;
    organizationId?: string;
    actorUserId: string;
    orderId: string;
    action: 'CREATE' | 'UPDATE' | 'CLOSE' | 'CANCEL' | 'APPROVE';
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
  }) {
    let organizationId = params.organizationId;
    if (!organizationId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: params.branchId },
        select: { organizationId: true },
      });
      if (!branch) return;
      organizationId = branch.organizationId;
    }

    await this.auditService.log({
      organizationId,
      branchId: params.branchId,
      actorUserId: params.actorUserId,
      entityType: 'ORDER',
      entityId: params.orderId,
      action: params.action,
      beforeData: params.beforeData ?? null,
      afterData: params.afterData ?? null,
    });
  }
}
