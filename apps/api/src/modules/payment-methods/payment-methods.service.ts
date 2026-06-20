import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  listByBranch(branchId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { branchId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByCode(branchId: string, code: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { branchId_code: { branchId, code } },
    });
  }
}
