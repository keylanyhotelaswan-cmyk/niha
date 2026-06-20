import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  /** POS order numbers: 1, 2, 3… per shift (resets each new shift). */
  async getNextShiftOrderNumber(
    organizationId: string,
    branchId: string,
    shiftId: string,
  ): Promise<string> {
    const next = await this.bumpCounter(organizationId, 'ORDER', `shift:${shiftId}`, branchId);
    return String(next);
  }

  async getNextNumber(
    organizationId: string,
    code: string,
    branchId?: string,
  ): Promise<string> {
    const periodKey = this.getPeriodKey(new Date());
    const next = await this.bumpCounter(organizationId, code, periodKey, branchId);
    return `${code}-${periodKey}-${this.formatNumber(next)}`;
  }

  private async bumpCounter(
    organizationId: string,
    code: string,
    periodKey: string,
    branchId?: string,
  ): Promise<number> {
    const branchIdValue: string | null = branchId || null;

    const createData: {
      organizationId: string;
      code: string;
      periodKey: string;
      currentValue: number;
      branchId?: string;
    } = {
      organizationId,
      code,
      periodKey,
      currentValue: 1,
    };

    if (branchIdValue) {
      createData.branchId = branchIdValue;
    }

    const sequence = await this.prisma.sequence.upsert({
      where: {
        organizationId_branchId_code_periodKey: {
          organizationId,
          branchId: branchIdValue,
          code,
          periodKey,
        } as any,
      },
      create: createData,
      update: {
        currentValue: {
          increment: 1,
        },
      },
    });

    return sequence.currentValue;
  }

  private getPeriodKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  private formatNumber(num: number): string {
    return String(num).padStart(6, '0');
  }

  async getCurrentValue(
    organizationId: string,
    code: string,
    branchId?: string,
  ): Promise<number> {
    const now = new Date();
    const periodKey = this.getPeriodKey(now);
    const branchIdValue: string | null = branchId || null;

    const sequence = await this.prisma.sequence.findUnique({
      where: {
        organizationId_branchId_code_periodKey: {
          organizationId,
          branchId: branchIdValue,
          code,
          periodKey,
        } as any,
      },
    });

    return sequence ? sequence.currentValue : 0;
  }

  async resetSequence(
    organizationId: string,
    code: string,
    branchId?: string,
  ): Promise<void> {
    const now = new Date();
    const periodKey = this.getPeriodKey(now);
    const branchIdValue: string | null = branchId || null;

    await this.prisma.sequence.updateMany({
      where: {
        organizationId,
        branchId: branchIdValue,
        code,
        periodKey,
      },
      data: {
        currentValue: 0,
      },
    });
  }
}
