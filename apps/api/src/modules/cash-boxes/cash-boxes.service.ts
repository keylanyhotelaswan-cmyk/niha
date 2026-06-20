import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CashBoxesService {
  constructor(private prisma: PrismaService) {}

  listByBranch(branchId: string) {
    return this.prisma.cashBox.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
  }
}
