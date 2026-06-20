import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecipeDto, UpdateRecipeDto, Recipe } from '@niha/contracts';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecipeDto): Promise<Recipe> {
    // تحقق من وجود المنتج
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // تحقق من عدم وجود وصفة لنفس المنتج في نفس الفرع
    const existing = await this.prisma.recipe.findUnique({
      where: {
        branchId_productId: {
          branchId: dto.branchId,
          productId: dto.productId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('A recipe already exists for this product in the branch');
    }

    const recipe = await this.prisma.recipe.create({
      data: {
        branchId: dto.branchId,
        productId: dto.productId,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      id: recipe.id,
      branchId: recipe.branchId,
      productId: recipe.productId,
      name: recipe.name,
      isActive: recipe.isActive,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    };
  }

  async findAll(branchId: string): Promise<Recipe[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });

    return recipes.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      productId: r.productId,
      name: r.name,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    return {
      id: recipe.id,
      branchId: recipe.branchId,
      productId: recipe.productId,
      name: recipe.name,
      isActive: recipe.isActive,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    };
  }

  async update(id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const updated = await this.prisma.recipe.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      productId: updated.productId,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    await this.prisma.recipe.delete({ where: { id } });
  }
}