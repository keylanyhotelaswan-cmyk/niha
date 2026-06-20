import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service.js';
import { CreateRecipeDto, UpdateRecipeDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('recipes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @RequirePermissions('recipes.create')
  create(@Body() createDto: CreateRecipeDto) {
    return this.recipesService.create(createDto);
  }

  @Get()
  @RequirePermissions('recipes.read')
  findAll(@Query('branchId') branchId: string) {
    return this.recipesService.findAll(branchId);
  }

  @Get(':id')
  @RequirePermissions('recipes.read')
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('recipes.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateRecipeDto) {
    return this.recipesService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('recipes.delete')
  remove(@Param('id') id: string) {
    return this.recipesService.remove(id);
  }
}