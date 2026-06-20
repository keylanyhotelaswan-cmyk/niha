import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StockItemsService } from './stock-items.service.js';
import { CreateStockItemDto, UpdateStockItemDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('stock-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockItemsController {
  constructor(private readonly stockItemsService: StockItemsService) {}

  @Post()
  @RequirePermissions('stock-items.create')
  create(@Body() createDto: CreateStockItemDto) {
    return this.stockItemsService.create(createDto);
  }

  @Get()
  @RequirePermissions('stock-items.read')
  findAll(
    @Query('branchId') branchId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.stockItemsService.findAll(branchId, warehouseId);
  }

  @Get(':id')
  @RequirePermissions('stock-items.read')
  findOne(@Param('id') id: string) {
    return this.stockItemsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('stock-items.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateStockItemDto) {
    return this.stockItemsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('stock-items.delete')
  remove(@Param('id') id: string) {
    return this.stockItemsService.remove(id);
  }
}