import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service.js';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('product-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) {}

  @Post()
  @RequirePermissions('product-categories.create')
  create(@Body() createDto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(createDto);
  }

  @Get()
  @RequirePermissions('pos.use', 'inventory.manage')
  findAll(@Query('branchId') branchId: string) {
    return this.productCategoriesService.findAll(branchId);
  }

  @Get(':id')
  @RequirePermissions('product-categories.read')
  findOne(@Param('id') id: string) {
    return this.productCategoriesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('product-categories.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateProductCategoryDto) {
    return this.productCategoriesService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('product-categories.delete')
  remove(@Param('id') id: string) {
    return this.productCategoriesService.remove(id);
  }
}