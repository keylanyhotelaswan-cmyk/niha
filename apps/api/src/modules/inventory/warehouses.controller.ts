import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { CreateWarehouseDto, UpdateWarehouseDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @RequirePermissions('warehouses.create')
  create(@Body() createDto: CreateWarehouseDto) {
    return this.warehousesService.create(createDto);
  }

  @Get()
  @RequirePermissions('warehouses.read')
  findAll(@Query('branchId') branchId: string) {
    return this.warehousesService.findAll(branchId);
  }

  @Get(':id')
  @RequirePermissions('warehouses.read')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('warehouses.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('warehouses.delete')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
}