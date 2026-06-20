import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWarehouseDto, UpdateWarehouseDto, Warehouse } from '@niha/contracts';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    const existing = await this.prisma.warehouse.findUnique({
      where: {
        branchId_code: {
          branchId: dto.branchId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Warehouse with this code already exists in the branch');
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
      },
    });

    return {
      id: warehouse.id,
      branchId: warehouse.branchId,
      name: warehouse.name,
      code: warehouse.code,
    };
  }

  async findAll(branchId: string): Promise<Warehouse[]> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });

    return warehouses.map((w) => ({
      id: w.id,
      branchId: w.branchId,
      name: w.name,
      code: w.code,
    }));
  }

  async findOne(id: string): Promise<Warehouse> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return {
      id: warehouse.id,
      branchId: warehouse.branchId,
      name: warehouse.name,
      code: warehouse.code,
    };
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (dto.code && dto.code !== warehouse.code) {
      const existing = await this.prisma.warehouse.findUnique({
        where: {
          branchId_code: {
            branchId: warehouse.branchId,
            code: dto.code,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Warehouse with this code already exists in the branch');
      }
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      name: updated.name,
      code: updated.code,
    };
  }

  async remove(id: string): Promise<void> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.prisma.warehouse.delete({ where: { id } });
  }
}