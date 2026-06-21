import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBranchDto, UpdateBranchDto, Branch, BranchStatus } from '@niha/contracts';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        organizationId: createBranchDto.organizationId,
        code: createBranchDto.code,
      },
    });

    if (existingBranch) {
      throw new ConflictException('Branch with this code already exists in the organization');
    }

    const branch = await this.prisma.branch.create({
      data: {
        organizationId: createBranchDto.organizationId,
        name: createBranchDto.name,
        code: createBranchDto.code,
        status: BranchStatus.ACTIVE,
      },
    });

    return {
      id: branch.id,
      organizationId: branch.organizationId,
      name: branch.name,
      code: branch.code,
      status: branch.status as BranchStatus,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  async findAll(organizationId: string): Promise<Branch[]> {
    const branches = await this.prisma.branch.findMany({
      where: { organizationId },
    });

    return branches.map((branch) => ({
      id: branch.id,
      organizationId: branch.organizationId,
      name: branch.name,
      code: branch.code,
      status: branch.status as BranchStatus,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    }));
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      id: branch.id,
      organizationId: branch.organizationId,
      name: branch.name,
      code: branch.code,
      status: branch.status as BranchStatus,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });

    return {
      id: branch.id,
      organizationId: branch.organizationId,
      name: branch.name,
      code: branch.code,
      status: branch.status as BranchStatus,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  async remove(id: string): Promise<void> {
    await this.prisma.branch.delete({
      where: { id },
    });
  }

  async getReceiptSettings(branchId: string): Promise<{ settings: Record<string, unknown> | null }> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { receiptSettings: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const settings = branch.receiptSettings;
    return {
      settings: settings && typeof settings === 'object' && !Array.isArray(settings)
        ? (settings as Record<string, unknown>)
        : null,
    };
  }

  async updateReceiptSettings(branchId: string, settings: Record<string, unknown>) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    await this.prisma.branch.update({
      where: { id: branchId },
      data: { receiptSettings: settings as Prisma.InputJsonValue },
    });

    return { settings };
  }
}
