import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { splitPosCatalogProducts } from '../shifts/pos-catalog-sauces.js';
import { UpsertProductionPlanDto } from './dto/upsert-production-plan.dto.js';

export type ProductionPlanRow = {
  productId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  plannedQuantity: number | null;
  soldQuantity: number;
};

@Injectable()
export class ProductionPlanService {
  constructor(private prisma: PrismaService) {}

  resolveDateKey(dateKey?: string) {
    if (dateKey?.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey.trim())) {
        throw new BadRequestException('dateKey يجب أن يكون بصيغة YYYY-MM-DD');
      }
      return dateKey.trim();
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dayBounds(dateKey: string) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const start = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
    const end = new Date(y!, m! - 1, d!, 23, 59, 59, 999);
    return { start, end };
  }

  private async loadMenuProducts(branchId: string) {
    const [categories, products] = await Promise.all([
      this.prisma.productCategory.findMany({ where: { branchId }, orderBy: { name: 'asc' } }),
      this.prisma.product.findMany({ where: { branchId }, orderBy: { name: 'asc' } }),
    ]);
    const mapped = products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      sku: p.sku,
      salePrice: Number(p.salePrice),
      isAvailable: p.isAvailable,
    }));
    const { menuProducts } = splitPosCatalogProducts(mapped, categories);
    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
    return menuProducts.map((p) => ({
      ...p,
      categoryName: categoryNameMap.get(p.categoryId) ?? '',
    }));
  }

  private async soldQuantitiesForDay(branchId: string, dateKey: string) {
    const { start, end } = this.dayBounds(dateKey);
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          branchId,
          status: 'CLOSED',
          closedAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true },
    });
    const out = new Map<string, number>();
    for (const row of rows) {
      out.set(row.productId, Number(row._sum.quantity ?? 0));
    }
    return out;
  }

  async getDailyPlan(branchId: string, dateKey?: string) {
    const key = this.resolveDateKey(dateKey);
    const [menuProducts, plans, soldMap] = await Promise.all([
      this.loadMenuProducts(branchId),
      this.prisma.productDailyPlan.findMany({
        where: { branchId, dateKey: key },
        select: { productId: true, plannedQuantity: true },
      }),
      this.soldQuantitiesForDay(branchId, key),
    ]);
    const planMap = new Map(plans.map((p) => [p.productId, p.plannedQuantity]));
    const items: ProductionPlanRow[] = menuProducts.map((p) => ({
      productId: p.id,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      plannedQuantity: planMap.get(p.id) ?? null,
      soldQuantity: soldMap.get(p.id) ?? 0,
    }));
    return { dateKey: key, items };
  }

  /** خريطة سريعة للـ POS — أصناف لها خطة فقط */
  async getSummaryMap(branchId: string, dateKey?: string) {
    const { items } = await this.getDailyPlan(branchId, dateKey);
    const map = new Map<string, { planned: number; sold: number }>();
    for (const item of items) {
      if (item.plannedQuantity != null && item.plannedQuantity > 0) {
        map.set(item.productId, { planned: item.plannedQuantity, sold: item.soldQuantity });
      }
    }
    return map;
  }

  async upsertDailyPlan(dto: UpsertProductionPlanDto, userId?: string) {
    const dateKey = this.resolveDateKey(dto.dateKey);
    const productIds = new Set(
      (await this.loadMenuProducts(dto.branchId)).map((p) => p.id),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        if (!productIds.has(item.productId)) continue;
        const qty = item.plannedQuantity == null ? null : Math.floor(Number(item.plannedQuantity));
        if (qty == null || qty <= 0) {
          await tx.productDailyPlan.deleteMany({
            where: {
              branchId: dto.branchId,
              productId: item.productId,
              dateKey,
            },
          });
          continue;
        }
        await tx.productDailyPlan.upsert({
          where: {
            branchId_productId_dateKey: {
              branchId: dto.branchId,
              productId: item.productId,
              dateKey,
            },
          },
          create: {
            branchId: dto.branchId,
            productId: item.productId,
            dateKey,
            plannedQuantity: qty,
            updatedById: userId ?? null,
          },
          update: {
            plannedQuantity: qty,
            updatedById: userId ?? null,
          },
        });
      }
    });

    return this.getDailyPlan(dto.branchId, dateKey);
  }
}
