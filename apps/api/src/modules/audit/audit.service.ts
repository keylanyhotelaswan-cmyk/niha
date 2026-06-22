import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    organizationId: string;
    branchId?: string;
    actorUserId?: string;
    entityType: string;
    entityId: string;
    action: string;
    beforeData?: any;
    afterData?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId || null,
        actorUserId: params.actorUserId || null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action as any,
        beforeData: params.beforeData || null,
        afterData: params.afterData || null,
        ipAddress: params.ipAddress || null,
      },
    });
  }

  async findByEntity(organizationId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });
  }

  async findByOrganization(organizationId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: this.listInclude(),
    });
  }

  async findFiltered(params: {
    organizationId: string;
    branchId?: string;
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (params.from) {
      const from = new Date(params.from);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (params.to) {
      const to = new Date(params.to);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
    }

    return this.prisma.auditLog.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.entityType ? { entityType: params.entityType as any } : {}),
        ...(params.action ? { action: params.action as any } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 150,
      include: this.listInclude(),
    });
  }

  private listInclude() {
    return {
      actorUser: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    } as const;
  }

  async findByUser(organizationId: string, actorUserId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        actorUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }
}
