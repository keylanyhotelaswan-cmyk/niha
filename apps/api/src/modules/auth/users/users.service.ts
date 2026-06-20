import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto, User, UserStatus } from '@niha/contracts';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        organizationId: createUserDto.organizationId,
        fullName: createUserDto.fullName,
        username: createUserDto.username,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    const roleCodes: string[] = (createUserDto as any).roleCodes ?? (createUserDto as any).roles ?? [];
    if (Array.isArray(roleCodes) && roleCodes.length > 0) {
      const roles = await this.prisma.role.findMany({ where: { code: { in: roleCodes } } });
      for (const role of roles) {
        await this.prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
      }
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      fullName: user.fullName,
      username: user.username,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findAll(organizationId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: { userRoles: { include: { role: true } } },
    });

    return users.map((user) => ({
      id: user.id,
      organizationId: user.organizationId,
      fullName: user.fullName,
      username: user.username,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles?.map((ur: any) => ({ id: ur.role.id, name: ur.role.name, code: ur.role.code })) ?? [],
    } as any));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      fullName: user.fullName,
      username: user.username,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      fullName: user.fullName,
      username: user.username,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const data: any = {};

    if (updateUserDto.fullName) {
      data.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateUserDto.username },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already in use');
      }

      data.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.status) {
      data.status = updateUserDto.status;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    const roleCodes: string[] = (updateUserDto as any).roleCodes ?? (updateUserDto as any).roles ?? [];
    if (Array.isArray(roleCodes)) {
      const roles = await this.prisma.role.findMany({ where: { code: { in: roleCodes } } });
      const roleIds = roles.map((r) => r.id);
      if (roleIds.length > 0) {
        await this.prisma.userRole.deleteMany({ where: { userId: id, roleId: { notIn: roleIds } } });
      } else {
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
      }
      for (const role of roles) {
        await this.prisma.userRole.upsert({ where: { userId_roleId: { userId: id, roleId: role.id } }, update: {}, create: { userId: id, roleId: role.id } });
      }
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      fullName: user.fullName,
      username: user.username,
      status: user.status as UserStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
