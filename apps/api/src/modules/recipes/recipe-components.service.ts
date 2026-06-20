import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecipeComponentDto } from '@niha/contracts';

@Injectable()
export class RecipeComponentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * حساب تكلفة المكون: quantity × averageCost × (1 + wastePercent/100)
   */
  private calculateCostAmount(averageCost: number, quantity: number, wastePercent: number): number {
    return quantity * averageCost * (1 + wastePercent / 100);
  }

  /**
   * إعادة حساب totalCost لإصدار وصفة بالكامل
   */
  async recalculateVersionTotalCost(versionId: string): Promise<number> {
    const components = await this.prisma.recipeComponent.findMany({
      where: { recipeVersionId: versionId },
      include: { stockItem: true },
    });

    const subTotal = components.reduce((sum, c) => {
      return sum + Number(c.costAmount);
    }, 0);

    const version = await this.prisma.recipeVersion.findUnique({
      where: { id: versionId },
      include: { recipe: true },
    });
    if (!version) throw new NotFoundException('Recipe version not found');

    // إضافة هالك الإنتاج
    const totalCost = subTotal * (1 + Number(version.wastePercent) / 100);

    // تحديث totalCost في الإصدار
    await this.prisma.recipeVersion.update({
      where: { id: versionId },
      data: { totalCost },
    });

    // لو الإصدار ACTIVE → تحديث estimatedCost في المنتج
    if (version.status === 'ACTIVE') {
      await this.prisma.product.update({
        where: { id: version.recipe.productId },
        data: { estimatedCost: totalCost },
      });
    }

    return Number(totalCost);
  }

  async create(versionId: string, dto: CreateRecipeComponentDto) {
    // تحقق من وجود الإصدار
    const version = await this.prisma.recipeVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Recipe version not found');

    // تحقق من وجود العنصر المخزني
    const stockItem = await this.prisma.stockItem.findUnique({ where: { id: dto.stockItemId } });
    if (!stockItem) throw new NotFoundException('Stock item not found');

    // تحقق من وجود الوحدة
    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    const wastePercent = dto.wastePercent ?? 0;
    const costAmount = this.calculateCostAmount(
      Number(stockItem.averageCost),
      dto.quantity,
      wastePercent,
    );

    const component = await this.prisma.recipeComponent.create({
      data: {
        recipeVersionId: versionId,
        stockItemId: dto.stockItemId,
        unitId: dto.unitId,
        quantity: dto.quantity,
        wastePercent,
        costAmount,
      },
    });

    // إعادة حساب totalCost للإصدار
    await this.recalculateVersionTotalCost(versionId);

    return {
      id: component.id,
      recipeVersionId: component.recipeVersionId,
      stockItemId: component.stockItemId,
      unitId: component.unitId,
      quantity: Number(component.quantity),
      wastePercent: Number(component.wastePercent),
      costAmount: Number(component.costAmount),
    };
  }

  async findAll(versionId: string) {
    const components = await this.prisma.recipeComponent.findMany({
      where: { recipeVersionId: versionId },
      include: {
        stockItem: { select: { name: true, code: true, averageCost: true } },
        unit: { select: { name: true, code: true } },
      },
    });

    return components.map((c) => ({
      id: c.id,
      recipeVersionId: c.recipeVersionId,
      stockItemId: c.stockItemId,
      stockItemName: c.stockItem.name,
      stockItemCode: c.stockItem.code,
      stockItemAvgCost: Number(c.stockItem.averageCost),
      unitId: c.unitId,
      unitName: c.unit.name,
      unitCode: c.unit.code,
      quantity: Number(c.quantity),
      wastePercent: Number(c.wastePercent),
      costAmount: Number(c.costAmount),
    }));
  }

  async remove(versionId: string, componentId: string): Promise<void> {
    const component = await this.prisma.recipeComponent.findUnique({
      where: { id: componentId },
    });
    if (!component || component.recipeVersionId !== versionId) {
      throw new NotFoundException('Recipe component not found');
    }

    await this.prisma.recipeComponent.delete({ where: { id: componentId } });

    // إعادة حساب totalCost للإصدار بعد الحذف
    await this.recalculateVersionTotalCost(versionId);
  }
}