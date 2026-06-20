import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto, UpdateProductDto, Product } from '@niha/contracts';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    if (dto.sku) {
      const existing = await this.prisma.product.findUnique({
        where: {
          branchId_sku: {
            branchId: dto.branchId,
            sku: dto.sku,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Product with this SKU already exists in the branch');
      }
    }

    const product = await this.prisma.product.create({
      data: {
        branchId: dto.branchId,
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku ?? null,
        salePrice: dto.salePrice,
        estimatedCost: dto.estimatedCost ?? null,
        isAvailable: dto.isAvailable ?? true,
      },
    });

    return {
      id: product.id,
      branchId: product.branchId,
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      salePrice: Number(product.salePrice),
      estimatedCost: product.estimatedCost ? Number(product.estimatedCost) : null,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
    };
  }

  async findAll(branchId: string, categoryId?: string): Promise<Product[]> {
    const where: any = { branchId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return products.map((product) => ({
      id: product.id,
      branchId: product.branchId,
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      salePrice: Number(product.salePrice),
      estimatedCost: product.estimatedCost ? Number(product.estimatedCost) : null,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
    }));
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      branchId: product.branchId,
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      salePrice: Number(product.salePrice),
      estimatedCost: product.estimatedCost ? Number(product.estimatedCost) : null,
      isAvailable: product.isAvailable,
      createdAt: product.createdAt,
    };
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Product category not found');
      }
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findUnique({
        where: {
          branchId_sku: {
            branchId: product.branchId,
            sku: dto.sku,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Product with this SKU already exists in the branch');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      categoryId: updated.categoryId,
      name: updated.name,
      sku: updated.sku,
      salePrice: Number(updated.salePrice),
      estimatedCost: updated.estimatedCost ? Number(updated.estimatedCost) : null,
      isAvailable: updated.isAvailable,
      createdAt: updated.createdAt,
    };
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }
}