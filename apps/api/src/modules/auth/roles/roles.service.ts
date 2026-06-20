import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateRoleDto, Role } from '@niha/contracts';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ name: createRoleDto.name }, { code: createRoleDto.code }],
      },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name or code already exists');
    }

    const role = await this.prisma.role.create({
      data: createRoleDto,
    });

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      createdAt: role.createdAt,
    };
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      createdAt: role.createdAt,
    }));
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      createdAt: role.createdAt,
    };
  }

  async update(id: string, updateRoleDto: Partial<CreateRoleDto>): Promise<Role> {
    const role = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      createdAt: role.createdAt,
    };
  }

  async remove(id: string): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  async getRolePermissions(roleId: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  }
}
