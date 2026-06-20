import { BadRequestException } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TreasuryService safe split', () => {
  const prismaMock = {
    dailySafeSplitSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    treasuryTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: TreasuryService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.treasuryTransaction.create.mockImplementation(({ data }) => Promise.resolve(data));
    prismaMock.treasuryTransaction.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) => Promise.all(ops));
    service = new TreasuryService(prismaMock as unknown as PrismaService);
  });

  it('splits sale receipts 50/50 by default', async () => {
    prismaMock.dailySafeSplitSetting.findUnique.mockResolvedValue(null);

    await service.recordSaleReceipt({
      branchId: 'b1',
      cashBoxId: 'cb1',
      orderId: 'o1',
      orderNumber: '1',
      amount: 10000,
      paymentMethod: 'CASH',
      collectionStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
      affectsCash: true,
    });

    expect(prismaMock.treasuryTransaction.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'EXPENSES', amount: 5000 }),
    }));
    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'PROFITS', amount: 5000 }),
    }));
  });

  it('uses the daily dynamic split percentage', async () => {
    prismaMock.dailySafeSplitSetting.findUnique.mockResolvedValue({
      expensesPercentage: 60,
      profitsPercentage: 40,
    });

    await service.recordSaleReceipt({
      branchId: 'b1',
      cashBoxId: 'cb1',
      orderId: 'o1',
      orderNumber: '1',
      amount: 10000,
      paymentMethod: 'CASH',
      collectionStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
      affectsCash: true,
    });

    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'EXPENSES', amount: 6000 }),
    }));
    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'PROFITS', amount: 4000 }),
    }));
  });

  it('prevents expense payments from profits safe', async () => {
    await expect(service.recordTransaction({
      branchId: 'b1',
      cashBoxId: 'cb1',
      safeType: 'PROFITS',
      transactionType: 'OPERATING_EXPENSE_PAYMENT',
      paymentMethod: 'CASH',
      amount: 100,
      sourceType: 'TEST',
      sourceId: 's1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps sale receipt split on the original payment method', async () => {
    prismaMock.dailySafeSplitSetting.findUnique.mockResolvedValue(null);

    await service.recordSaleReceipt({
      branchId: 'b1',
      cashBoxId: 'cb1',
      orderId: 'o1',
      orderNumber: '1',
      amount: 1000,
      paymentMethod: 'INSTAPAY',
      collectionStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
      affectsCash: false,
    });

    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'EXPENSES', paymentMethod: 'INSTAPAY', amount: 500 }),
    }));
    expect(prismaMock.treasuryTransaction.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ safeType: 'PROFITS', paymentMethod: 'INSTAPAY', amount: 500 }),
    }));
  });

  it('transfers between wallet and safe buckets', async () => {
    prismaMock.treasuryTransaction.findMany.mockResolvedValue([
      {
        amount: 1000,
        transactionType: 'SALE_RECEIPT',
        paymentMethod: 'CASH',
        safeType: 'PROFITS',
        sourceType: 'ORDER',
        affectsCash: true,
      },
    ]);

    await service.internalTransfer({
      branchId: 'b1',
      cashBoxId: 'cb1',
      fromSafeType: 'PROFITS',
      fromPaymentMethod: 'CASH',
      toSafeType: 'EXPENSES',
      toPaymentMethod: 'WALLET',
      amount: 300,
    });

    expect(prismaMock.treasuryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactionType: 'CASH_WITHDRAWAL',
        safeType: 'PROFITS',
        paymentMethod: 'CASH',
        sourceType: 'INTERNAL_WALLET_TRANSFER_OUT',
        amount: 300,
      }),
    }));
    expect(prismaMock.treasuryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactionType: 'CASH_DEPOSIT',
        safeType: 'EXPENSES',
        paymentMethod: 'WALLET',
        sourceType: 'INTERNAL_WALLET_TRANSFER_IN',
        amount: 300,
      }),
    }));
  });

  it('withdraws profits only from the selected profits wallet', async () => {
    prismaMock.treasuryTransaction.findMany.mockResolvedValue([
      {
        amount: 500,
        transactionType: 'SALE_RECEIPT',
        paymentMethod: 'INSTAPAY',
        safeType: 'PROFITS',
        sourceType: 'ORDER',
        affectsCash: false,
      },
    ]);

    await service.withdrawProfit({
      branchId: 'b1',
      cashBoxId: 'cb1',
      paymentMethod: 'INSTAPAY',
      amount: 200,
    });

    expect(prismaMock.treasuryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactionType: 'CASH_WITHDRAWAL',
        safeType: 'PROFITS',
        paymentMethod: 'INSTAPAY',
        amount: 200,
        sourceType: 'PROFIT_WITHDRAWAL',
      }),
    }));
  });

  it('prevents manual withdrawals from profits safe', async () => {
    await expect(service.recordTransaction({
      branchId: 'b1',
      cashBoxId: 'cb1',
      safeType: 'PROFITS',
      transactionType: 'CASH_WITHDRAWAL',
      paymentMethod: 'CASH',
      amount: 100,
      sourceType: 'TEST',
      sourceId: 's1',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
