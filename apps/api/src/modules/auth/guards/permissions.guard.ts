import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

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

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
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

    // Bypass permission check for Admin / Manager roles
    const roleNames = userRoles.map((ur) => ur.role.name);
    const bypassRoles = ['Admin', 'Super Admin', 'Manager'];
    const isBypass = roleNames.some((name) =>
      bypassRoles.some((bypass) => name.toLowerCase().includes(bypass.toLowerCase())),
    );
    if (isBypass) {
      return true;
    }

    const userPermissions = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.code),
    );

    // Allow if user has all required permissions OR has a resource-level "manage" permission
    const hasPermission = requiredPermissions.every((permission) => {
      if (userPermissions.includes(permission)) return true;
      const parts = permission.split('.');
      if (parts.length >= 1) {
        const resourceManage = `${parts[0]}.manage`;
        if (userPermissions.includes(resourceManage)) return true;
      }
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
