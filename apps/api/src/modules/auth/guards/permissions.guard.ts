import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';

type CachedAccess = {
  roleNames: string[];
  permissions: string[];
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;

@Injectable()
export class PermissionsGuard implements CanActivate {
  private static accessCache = new Map<string, CachedAccess>();

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private async loadAccess(userId: string): Promise<CachedAccess> {
    const now = Date.now();
    const cached = PermissionsGuard.accessCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached;
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);
    const permissions = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.code),
    );

    const entry: CachedAccess = {
      roleNames,
      permissions,
      expiresAt: now + CACHE_TTL_MS,
    };
    PermissionsGuard.accessCache.set(userId, entry);
    return entry;
  }

  private matchesPermission(required: string, userPermissions: string[]) {
    if (userPermissions.includes(required)) return true;
    const parts = required.split('.');
    if (parts.length >= 1) {
      const resourceManage = `${parts[0]}.manage`;
      if (userPermissions.includes(resourceManage)) return true;
    }
    return false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { roleNames, permissions: userPermissions } = await this.loadAccess(user.id);

    const bypassRoles = ['Admin', 'Super Admin', 'Manager'];
    const isBypass = roleNames.some((name) =>
      bypassRoles.some((bypass) => name.toLowerCase().includes(bypass.toLowerCase())),
    );
    if (isBypass) {
      return true;
    }

    const hasPermission = requiredPermissions.some((permission) =>
      this.matchesPermission(permission, userPermissions),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
