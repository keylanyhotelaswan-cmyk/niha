import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { PermissionsService } from './permissions/permissions.service';
import { LoginDto, JwtPayload } from '@niha/contracts';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
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
        },
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur: any) => ur.role);
    const permissions = roles.flatMap((role: any) =>
      role.permissions.map((rp: any) => rp.permission),
    );

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      organizationId: user.organizationId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        organizationId: user.organizationId,
        fullName: user.fullName,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      roles: roles.map((role: any) => ({
        id: role.id,
        name: role.name,
        code: role.code,
        createdAt: role.createdAt,
      })),
      permissions: permissions.map((perm: any) => ({
        id: perm.id,
        code: perm.code,
        label: perm.label,
        createdAt: perm.createdAt,
      })),
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const roles = user.userRoles.map((ur: any) => ur.role);
    const permissions = roles.flatMap((role: any) => role.permissions.map((rp: any) => rp.permission));

    return {
      user: {
        id: user.id,
        organizationId: user.organizationId,
        fullName: user.fullName,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      roles: roles.map((role: any) => ({ id: role.id, name: role.name, code: role.code, createdAt: role.createdAt })),
      permissions: permissions.map((perm: any) => ({ id: perm.id, code: perm.code, label: perm.label, createdAt: perm.createdAt })),
    };
  }
}
