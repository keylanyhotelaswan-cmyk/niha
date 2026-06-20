import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UnitConversionsService } from './unit-conversions.service.js';
import { CreateUnitConversionDto, UpdateUnitConversionDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('unit-conversions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitConversionsController {
  constructor(private readonly unitConversionsService: UnitConversionsService) {}

  @Post()
  @RequirePermissions('unit-conversions.create')
  create(@Body() createDto: CreateUnitConversionDto) {
    return this.unitConversionsService.create(createDto);
  }

  @Get()
  @RequirePermissions('unit-conversions.read')
  findAll() {
    return this.unitConversionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('unit-conversions.read')
  findOne(@Param('id') id: string) {
    return this.unitConversionsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('unit-conversions.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateUnitConversionDto) {
    return this.unitConversionsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('unit-conversions.delete')
  remove(@Param('id') id: string) {
    return this.unitConversionsService.remove(id);
  }
}