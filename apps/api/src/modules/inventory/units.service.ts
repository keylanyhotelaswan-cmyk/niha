import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUnitDto, UpdateUnitDto, Unit } from '@niha/contracts';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnitDto): Promise<Unit> {
    const existing = await this.prisma.unit.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Unit with this code already exists');
    }

    const unit = await this.prisma.unit.create({
      data: {
        code: dto.code,
        name: dto.name,
        precision: dto.precision ?? 2,
      },
    });

    return {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      precision: unit.precision,
    };
  }

  async findAll(): Promise<Unit[]> {
    const units = await this.prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });

    return units.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.name,
      precision: u.precision,
    }));
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.prisma.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      precision: unit.precision,
    };
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.prisma.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const updated = await this.prisma.unit.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      precision: updated.precision,
    };
  }

  async remove(id: string): Promise<void> {
    const unit = await this.prisma.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.prisma.unit.delete({ where: { id } });
  }
}