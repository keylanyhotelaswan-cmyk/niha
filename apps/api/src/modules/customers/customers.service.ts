import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { isValidCustomerPhone, normalizeCustomerPhone } from './customer-phone.util.js';

export type CustomerSearchHit = {
  id: string;
  phone: string;
  name: string | null;
  address: string | null;
  isRegular: boolean;
  orderCount: number;
  lastOrderAt: string | null;
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async search(branchId: string, query?: string, limit = 12): Promise<CustomerSearchHit[]> {
    const q = query?.trim() ?? '';
    const phoneDigits = q.replace(/\D/g, '');
    const take = Math.min(20, Math.max(1, limit));

    const rows = await this.prisma.customer.findMany({
      where: {
        branchId,
        ...(q
          ? {
              OR: [
                ...(phoneDigits.length >= 3 ? [{ phone: { contains: phoneDigits } }] : []),
                ...(q.length >= 2 ? [{ name: { contains: q, mode: 'insensitive' as const } }] : []),
              ],
            }
          : {}),
      },
      orderBy: [{ isRegular: 'desc' }, { lastOrderAt: 'desc' }, { orderCount: 'desc' }],
      take,
      select: {
        id: true,
        phone: true,
        name: true,
        address: true,
        isRegular: true,
        orderCount: true,
        lastOrderAt: true,
      },
    });

    return rows.map((row) => ({
      ...row,
      lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
    }));
  }

  async list(params: {
    branchId: string;
    q?: string;
    regularOnly?: boolean;
    skip?: number;
    take?: number;
  }) {
    const q = params.q?.trim();
    const phoneDigits = q?.replace(/\D/g, '') ?? '';
    const take = Math.min(100, Math.max(1, params.take ?? 50));
    const skip = Math.max(0, params.skip ?? 0);

    const where = {
      branchId: params.branchId,
      ...(params.regularOnly ? { isRegular: true } : {}),
      ...(q
        ? {
            OR: [
              ...(phoneDigits.length >= 3 ? [{ phone: { contains: phoneDigits } }] : []),
              ...(q.length >= 2 ? [{ name: { contains: q, mode: 'insensitive' as const } }] : []),
              { address: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ isRegular: 'desc' }, { lastOrderAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map((row) => ({
        ...row,
        totalSpent: Number(row.totalSpent),
        lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
      })),
      total,
    };
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { openedAt: 'desc' },
          take: 15,
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            status: true,
            totalAmount: true,
            openedAt: true,
            closedAt: true,
          },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return {
      ...customer,
      totalSpent: Number(customer.totalSpent),
      lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
      orders: customer.orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        openedAt: o.openedAt.toISOString(),
        closedAt: o.closedAt?.toISOString() ?? null,
      })),
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.getById(id);
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.isRegular !== undefined ? { isRegular: dto.isRegular } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
    return {
      ...updated,
      totalSpent: Number(updated.totalSpent),
      lastOrderAt: updated.lastOrderAt?.toISOString() ?? null,
    };
  }

  /** Link order to customer profile; creates or updates stats when incrementStats is true. */
  async syncFromOrder(params: {
    branchId: string;
    phone?: string | null;
    name?: string | null;
    address?: string | null;
    orderTotal?: number;
    orderAt?: Date;
    incrementStats?: boolean;
  }): Promise<string | null> {
    const phone = normalizeCustomerPhone(params.phone);
    if (!phone || !isValidCustomerPhone(phone)) return null;

    const orderAt = params.orderAt ?? new Date();
    const name = params.name?.trim() || null;
    const address = params.address?.trim() || null;
    const incrementStats = params.incrementStats !== false;
    const orderTotal = params.orderTotal ?? 0;

    const existing = await this.prisma.customer.findUnique({
      where: { branchId_phone: { branchId: params.branchId, phone } },
    });

    if (existing) {
      const updated = await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(name ? { name } : {}),
          ...(address ? { address } : {}),
          ...(incrementStats
            ? {
                orderCount: { increment: 1 },
                totalSpent: { increment: orderTotal },
                lastOrderAt: orderAt,
              }
            : {}),
        },
      });
      return updated.id;
    }

    const created = await this.prisma.customer.create({
      data: {
        branchId: params.branchId,
        phone,
        name,
        address,
        orderCount: incrementStats ? 1 : 0,
        totalSpent: incrementStats ? orderTotal : 0,
        lastOrderAt: incrementStats ? orderAt : null,
      },
    });
    return created.id;
  }
}
