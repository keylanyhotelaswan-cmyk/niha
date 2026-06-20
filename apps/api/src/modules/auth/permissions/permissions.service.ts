import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePermissionDto, Permission } from '@niha/contracts';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const existingPermission = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });

    if (existingPermission) {
      throw new ConflictException('Permission with this code already exists');
    }

    const permission = await this.prisma.permission.create({
      data: createPermissionDto,
    });

    return {
      id: permission.id,
      code: permission.code,
      label: permission.label,
      createdAt: permission.createdAt,
    };
  }

  async findAll(): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany();

    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      label: permission.label,
      createdAt: permission.createdAt,
    }));
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return {
      id: permission.id,
      code: permission.code,
      label: permission.label,
      createdAt: permission.createdAt,
    };
  }

  async update(id: string, updatePermissionDto: Partial<CreatePermissionDto>): Promise<Permission> {
    const permission = await this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });

    return {
      id: permission.id,
      code: permission.code,
      label: permission.label,
      createdAt: permission.createdAt,
    };
  }

  async remove(id: string): Promise<void> {
    await this.prisma.permission.delete({
      where: { id },
    });
  }
}
