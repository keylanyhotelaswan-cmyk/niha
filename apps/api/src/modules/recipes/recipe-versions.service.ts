import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecipeVersionDto, UpdateRecipeVersionDto, RecipeVersion } from '@niha/contracts';
import { RecipeComponentsService } from './recipe-components.service.js';

@Injectable()
export class RecipeVersionsService {
  constructor(
    private prisma: PrismaService,
    private recipeComponentsService: RecipeComponentsService,
  ) {}

  async create(dto: CreateRecipeVersionDto) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: dto.recipeId } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    // Auto-increment versionNumber
    const lastVersion = await this.prisma.recipeVersion.findFirst({
      where: { recipeId: dto.recipeId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // لو فيه components مع الإصدار، احسب totalCost
    let totalCost = 0;
    if (dto.components && dto.components.length > 0) {
      const wastePercent = dto.wastePercent ?? 0;
      let subTotal = 0;
      for (const comp of dto.components) {
        const stockItem = await this.prisma.stockItem.findUnique({ where: { id: comp.stockItemId } });
        if (!stockItem) throw new NotFoundException(`Stock item ${comp.stockItemId} not found`);
        const unit = await this.prisma.unit.findUnique({ where: { id: comp.unitId } });
        if (!unit) throw new NotFoundException(`Unit ${comp.unitId} not found`);

        const compWaste = comp.wastePercent ?? 0;
        const costAmount = comp.quantity * Number(stockItem.averageCost) * (1 + compWaste / 100);
        subTotal += costAmount;
      }
      totalCost = subTotal * (1 + wastePercent / 100);
    }

    const version = await this.prisma.recipeVersion.create({
      data: {
        recipeId: dto.recipeId,
        versionNumber,
        yieldQuantity: dto.yieldQuantity ?? 1,
        yieldUnitId: dto.yieldUnitId ?? null,
        wastePercent: dto.wastePercent ?? 0,
        totalCost,
        effectiveFrom: dto.effectiveFrom ?? new Date(),
        effectiveTo: dto.effectiveTo ?? null,
      },
      include: { recipe: true },
    });

    // لو فيه components، أنشئهم في DB
    if (dto.components && dto.components.length > 0) {
      for (const comp of dto.components) {
        const stockItem = await this.prisma.stockItem.findUnique({ where: { id: comp.stockItemId } });
        const compWaste = comp.wastePercent ?? 0;
        const costAmount = comp.quantity * Number(stockItem!.averageCost) * (1 + compWaste / 100);

        await this.prisma.recipeComponent.create({
          data: {
            recipeVersionId: version.id,
            stockItemId: comp.stockItemId,
            unitId: comp.unitId,
            quantity: comp.quantity,
            wastePercent: compWaste,
            costAmount,
          },
        });
      }
    }

    // لو الإصدار الأول، خلّيه ACTIVE
    if (versionNumber === 1) {
      await this.prisma.recipeVersion.update({
        where: { id: version.id },
        data: { status: 'ACTIVE' },
      });
      // حدّث estimatedCost في المنتج
      await this.prisma.product.update({
        where: { id: version.recipe.productId },
        data: { estimatedCost: totalCost || 0 },
      });
    }

    return this.findOne(version.id);
  }

  async findAll(recipeId: string) {
    const versions = await this.prisma.recipeVersion.findMany({
      where: { recipeId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      recipeId: v.recipeId,
      versionNumber: v.versionNumber,
      yieldQuantity: Number(v.yieldQuantity),
      yieldUnitId: v.yieldUnitId,
      wastePercent: Number(v.wastePercent),
      totalCost: Number(v.totalCost),
      status: v.status,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo,
      createdById: v.createdById,
      createdAt: v.createdAt,
    }));
  }

  async findActive(recipeId: string) {
    const version = await this.prisma.recipeVersion.findFirst({
      where: { recipeId, status: 'ACTIVE' },
    });
    if (!version) throw new NotFoundException('No active version found for this recipe');
    return this.findOne(version.id);
  }

  async findOne(id: string) {
    const v = await this.prisma.recipeVersion.findUnique({
      where: { id },
      include: { components: { include: { stockItem: true, unit: true } } },
    });
    if (!v) throw new NotFoundException('Recipe version not found');

    return {
      id: v.id,
      recipeId: v.recipeId,
      versionNumber: v.versionNumber,
      yieldQuantity: Number(v.yieldQuantity),
      yieldUnitId: v.yieldUnitId,
      wastePercent: Number(v.wastePercent),
      totalCost: Number(v.totalCost),
      status: v.status,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo,
      createdById: v.createdById,
      createdAt: v.createdAt,
      components: v.components.map((c) => ({
        id: c.id,
        stockItemId: c.stockItemId,
        stockItemName: c.stockItem.name,
        unitId: c.unitId,
        unitName: c.unit.name,
        quantity: Number(c.quantity),
        wastePercent: Number(c.wastePercent),
        costAmount: Number(c.costAmount),
      })),
    };
  }

  async update(id: string, dto: UpdateRecipeVersionDto) {
    const v = await this.prisma.recipeVersion.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Recipe version not found');

    const updated = await this.prisma.recipeVersion.update({
      where: { id },
      data: dto,
      include: { recipe: true, components: { include: { stockItem: true } } },
    });

    // إعادة حساب totalCost لو تغير wastePercent
    if (dto.wastePercent !== undefined) {
      await this.recipeComponentsService.recalculateVersionTotalCost(id);
    }

    // لو صار ACTIVE، حدّث estimatedCost
    if (dto.status === 'ACTIVE') {
      await this.prisma.product.update({
        where: { id: updated.recipe.productId },
        data: { estimatedCost: Number(updated.totalCost) },
      });
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const v = await this.prisma.recipeVersion.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Recipe version not found');

    await this.prisma.recipeComponent.deleteMany({ where: { recipeVersionId: id } });
    await this.prisma.recipeVersion.delete({ where: { id } });
  }
}