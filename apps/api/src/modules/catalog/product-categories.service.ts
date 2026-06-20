import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductCategoryDto, UpdateProductCategoryDto, ProductCategory } from '@niha/contracts';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto): Promise<ProductCategory> {
    const existing = await this.prisma.productCategory.findUnique({
      where: {
        branchId_name: {
          branchId: dto.branchId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product category with this name already exists in the branch');
    }

    const category = await this.prisma.productCategory.create({
      data: {
        branchId: dto.branchId,
        name: dto.name,
      },
    });

    return {
      id: category.id,
      branchId: category.branchId,
      name: category.name,
      createdAt: category.createdAt,
    };
  }

  async findAll(branchId: string): Promise<ProductCategory[]> {
    const categories = await this.prisma.productCategory.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      branchId: cat.branchId,
      name: cat.name,
      createdAt: cat.createdAt,
    }));
  }

  async findOne(id: string): Promise<ProductCategory> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return {
      id: category.id,
      branchId: category.branchId,
      name: category.name,
      createdAt: category.createdAt,
    };
  }

  async update(id: string, dto: UpdateProductCategoryDto): Promise<ProductCategory> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.productCategory.findUnique({
        where: {
          branchId_name: {
            branchId: category.branchId,
            name: dto.name,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Product category with this name already exists in the branch');
      }
    }

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      branchId: updated.branchId,
      name: updated.name,
      createdAt: updated.createdAt,
    };
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    await this.prisma.productCategory.delete({
      where: { id },
    });
  }
}