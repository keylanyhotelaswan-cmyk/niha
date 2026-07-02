import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { TreasuryService } from '../treasury/treasury.service';
import { ProductionPlanService } from '../production-plan/production-plan.service';
import { OrdersService } from '../orders/orders.service';

describe('ShiftsService', () => {
  let service: ShiftsService;

  const prismaMock = {
    shift: { findFirst: jest.fn() },
    branch: { findUnique: jest.fn() },
    $transaction: jest.fn((fn) => fn({
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'shift-1', openingFloat: 100, cashBox: {}, openedBy: {} }),
      },
      shiftOpening: { create: jest.fn() },
      shiftCashHandoff: { findFirst: jest.fn().mockResolvedValue(null) },
    })),
  };

  const sequenceMock = { getNextNumber: jest.fn().mockResolvedValue('SHIFT-202606-000001') };
  const treasuryMock = { recordTransaction: jest.fn() };
  const productionPlanMock = { getSummaryMap: jest.fn().mockResolvedValue(new Map()) };
  const ordersMock = {
    listSuspended: jest.fn().mockResolvedValue([]),
    listClosedForShift: jest.fn().mockResolvedValue({ orders: [], nextCursor: null }),
  };

  beforeEach(() => {
    service = new ShiftsService(
      prismaMock as unknown as PrismaService,
      sequenceMock as unknown as SequenceService,
      treasuryMock as unknown as TreasuryService,
      productionPlanMock as unknown as ProductionPlanService,
      ordersMock as unknown as OrdersService,
    );
    jest.clearAllMocks();
  });

  it('rejects opening when shift already open', async () => {
    prismaMock.$transaction.mockImplementationOnce((fn) => fn({
      shift: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
        create: jest.fn(),
      },
      shiftOpening: { create: jest.fn() },
    }));
    prismaMock.branch.findUnique.mockResolvedValue({ id: 'b1', organizationId: 'org-1' });

    await expect(
      service.openShift({ branchId: 'b1', cashBoxId: 'cb1', openingFloat: 100 }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('opens shift with sequence number', async () => {
    prismaMock.branch.findUnique.mockResolvedValue({ id: 'b1', organizationId: 'org-1' });

    const result = await service.openShift({ branchId: 'b1', cashBoxId: 'cb1', openingFloat: 0 }, 'user-1');

    expect(sequenceMock.getNextNumber).toHaveBeenCalledWith('org-1', 'SHIFT', 'b1');
    expect(result).toEqual(expect.objectContaining({ id: 'shift-1', openingFloat: 100 }));
  });
});
