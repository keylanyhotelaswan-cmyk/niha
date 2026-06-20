import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUnitConversionDto, UpdateUnitConversionDto, UnitConversion } from '@niha/contracts';

@Injectable()
export class UnitConversionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnitConversionDto): Promise<UnitConversion> {
    // تحقق من وجود الوحدتين
    const [fromUnit, toUnit] = await Promise.all([
      this.prisma.unit.findUnique({ where: { id: dto.fromUnitId } }),
      this.prisma.unit.findUnique({ where: { id: dto.toUnitId } }),
    ]);

    if (!fromUnit) throw new NotFoundException('From-unit not found');
    if (!toUnit) throw new NotFoundException('To-unit not found');

    // منع إضافة تحويل من الوحدة لنفسها
    if (dto.fromUnitId === dto.toUnitId) {
      throw new ConflictException('Cannot create conversion from a unit to itself');
    }

    // منع التكرار
    const existing = await this.prisma.unitConversion.findUnique({
      where: {
        fromUnitId_toUnitId: {
          fromUnitId: dto.fromUnitId,
          toUnitId: dto.toUnitId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This conversion already exists');
    }

    const conversion = await this.prisma.unitConversion.create({
      data: {
        fromUnitId: dto.fromUnitId,
        toUnitId: dto.toUnitId,
        factor: dto.factor,
      },
    });

    return {
      id: conversion.id,
      fromUnitId: conversion.fromUnitId,
      toUnitId: conversion.toUnitId,
      factor: Number(conversion.factor),
    };
  }

  async findAll(): Promise<UnitConversion[]> {
    const conversions = await this.prisma.unitConversion.findMany();

    return conversions.map((c) => ({
      id: c.id,
      fromUnitId: c.fromUnitId,
      toUnitId: c.toUnitId,
      factor: Number(c.factor),
    }));
  }

  async findOne(id: string): Promise<UnitConversion> {
    const conversion = await this.prisma.unitConversion.findUnique({ where: { id } });

    if (!conversion) {
      throw new NotFoundException('Unit conversion not found');
    }

    return {
      id: conversion.id,
      fromUnitId: conversion.fromUnitId,
      toUnitId: conversion.toUnitId,
      factor: Number(conversion.factor),
    };
  }

  async update(id: string, dto: UpdateUnitConversionDto): Promise<UnitConversion> {
    const conversion = await this.prisma.unitConversion.findUnique({ where: { id } });

    if (!conversion) {
      throw new NotFoundException('Unit conversion not found');
    }

    const updated = await this.prisma.unitConversion.update({
      where: { id },
      data: dto,
    });

    return {
      id: updated.id,
      fromUnitId: updated.fromUnitId,
      toUnitId: updated.toUnitId,
      factor: Number(updated.factor),
    };
  }

  async remove(id: string): Promise<void> {
    const conversion = await this.prisma.unitConversion.findUnique({ where: { id } });

    if (!conversion) {
      throw new NotFoundException('Unit conversion not found');
    }

    await this.prisma.unitConversion.delete({ where: { id } });
  }
}