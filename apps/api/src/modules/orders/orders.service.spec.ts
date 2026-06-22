import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { TreasuryService } from '../treasury/treasury.service';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { AuditService } from '../audit/audit.service';
import { CustomersService } from '../customers/customers.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock = {
    branch: { findUnique: jest.fn() },
    cashBox: { findFirst: jest.fn() },
    shift: { findFirst: jest.fn() },
    order: { create: jest.fn() },
    recipe: { findUnique: jest.fn(), findMany: jest.fn() },
    recipeVersion: { findFirst: jest.fn(), findMany: jest.fn() },
    stockItem: { update: jest.fn(), findUnique: jest.fn() },
    stockLedgerEntry: { create: jest.fn() },
  };

  const sequenceMock = {
    getNextNumber: jest.fn().mockResolvedValue('ORDER-202606-000001'),
    getNextShiftOrderNumber: jest.fn().mockResolvedValue('1'),
  };
  const treasuryMock = { recordSaleReceipt: jest.fn() };
  const paymentMethodsMock = { findByCode: jest.fn().mockResolvedValue({ id: 'pm-1', type: 'CASH' }) };
  const auditMock = { log: jest.fn().mockResolvedValue(undefined) };
  const customersMock = { syncFromOrder: jest.fn().mockResolvedValue(null) };

  beforeEach(() => {
    service = new OrdersService(
      prismaMock as unknown as PrismaService,
      sequenceMock as unknown as SequenceService,
      treasuryMock as unknown as TreasuryService,
      paymentMethodsMock as unknown as PaymentMethodsService,
      auditMock as unknown as AuditService,
      customersMock as unknown as CustomersService,
    );
    jest.clearAllMocks();
  });

  it('rejects empty order', async () => {
    await expect(
      service.create({ branchId: 'b1', items: [], total: 0, paymentMethod: 'CASH', orderType: 'DINE_IN' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates order and records treasury receipt', async () => {
    prismaMock.branch.findUnique.mockResolvedValue({ id: 'b1', organizationId: 'org-1' });
    prismaMock.cashBox.findFirst.mockResolvedValue({ id: 'cb-1' });
    prismaMock.shift.findFirst.mockResolvedValue({ id: 'shift-1' });
    prismaMock.order.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: '1',
      totalAmount: 100,
    });
    prismaMock.recipe.findUnique.mockResolvedValue(null);
    prismaMock.recipe.findMany.mockResolvedValue([]);

    const dto = {
      branchId: 'b1',
      items: [{ productId: 'p1', productName: 'شاورما', quantity: 1, unitPrice: 100 }],
      total: 100,
      paymentMethod: 'CASH' as const,
      orderType: 'DINE_IN' as const,
    };

    const result = await service.create(dto, 'user-1');

    expect(sequenceMock.getNextShiftOrderNumber).toHaveBeenCalled();
    expect(treasuryMock.recordSaleReceipt).toHaveBeenCalled();
    expect(result.id).toBe('order-1');
  });
});
