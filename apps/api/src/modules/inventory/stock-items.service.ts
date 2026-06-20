import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockItemDto, UpdateStockItemDto, StockItem } from '@niha/contracts';

@Injectable()
export class StockItemsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStockItemDto): Promise<StockItem> {
    // تحقق من وجود المستودع
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // تحقق من وجود الوحدة
    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    // تحقق من عدم تكرار الكود داخل نفس المستودع
    const existing = await this.prisma.stockItem.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: dto.warehouseId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Stock item with this code already exists in the warehouse');
    }

    const item = await this.prisma.stockItem.create({
      data: {
        branchId: dto.branchId,
        warehouseId: dto.warehouseId,
        unitId: dto.unitId,
        name: dto.name,
        code: dto.code,
        reorderPoint: dto.reorderPoint ?? 0,
        onHandQuantity: dto.onHandQuantity ?? 0,
        averageCost: dto.averageCost ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      id: item.id,
      branchId: item.branchId,
      warehouseId: item.warehouseId,
      unitId: item.unitId,
      name: item.name,
      code: item.code,
      reorderPoint: Number(item.reorderPoint),
      onHandQuantity: Number(item.onHandQuantity),
      averageCost: Number(item.averageCost),
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async findAll(branchId: string, warehouseId?: string): Promise<StockItem[]> {
    const where: any = { branchId };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const items = await this.prisma.stockItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      branchId: item.branchId,
      warehouseId: item.warehouseId,
      unitId: item.unitId,
      name: item.name,
      code: item.code,
      reorderPoint: Number(item.reorderPoint),
      onHandQuantity: Number(item.onHandQuantity),
      averageCost: Number(item.averageCost),
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findOne(id: string): Promise<StockItem> {
    const item = await this.prisma.stockItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Stock item not found');
    }

    return {
      id: item.id,
      branchId: item.branchId,
      warehouseId: item.warehouseId,
      unitId: item.unitId,
      name: item.name,
      code: item.code,
      reorderPoint: Number(item.reorderPoint),
      onHandQuantity: Number(item.onHandQuantity),
      averageCost: Number(item.averageCost),
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async update(id: string, dto: UpdateStockItemDto): Promise<StockItem> {
    const item = await this.prisma.stockItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Stock item not found');
    }

    // لو عاوز تغير المستودع، تأكد إنه موجود
    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse) throw new NotFoundException('Warehouse not found');
    }

    // لو عاوز تغير الوحدة، تأكد إنها موجودة
    if (dto.unitId) {
      const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId } });
      if (!unit) throw new NotFoundException('Unit not found');
    }

    // تحقق من عدم تكرار الكود لو غيرته
    if (dto.code && dto.code !== item.code) {
      const targetWarehouseId = dto.warehouseId ?? item.warehouseId;
      const existing = await this.prisma.stockItem.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: targetWarehouseId,
            code: dto.code,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Stock item with this code already exists in the warehouse');
      }
    }

    const updated = await this.prisma.stockItem.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      warehouseId: updated.warehouseId,
      unitId: updated.unitId,
      name: updated.name,
      code: updated.code,
      reorderPoint: Number(updated.reorderPoint),
      onHandQuantity: Number(updated.onHandQuantity),
      averageCost: Number(updated.averageCost),
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string): Promise<void> {
    const item = await this.prisma.stockItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Stock item not found');
    }

    await this.prisma.stockItem.delete({ where: { id } });
  }
}