import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RecipeVersionsService } from './recipe-versions.service.js';
import { RecipeComponentsService } from './recipe-components.service.js';
import { CreateRecipeVersionDto, UpdateRecipeVersionDto, CreateRecipeComponentDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('recipes/:recipeId/versions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecipeVersionsController {
  constructor(
    private readonly recipeVersionsService: RecipeVersionsService,
    private readonly recipeComponentsService: RecipeComponentsService,
  ) {}

  @Post()
  @RequirePermissions('recipe-versions.create')
  create(@Param('recipeId') recipeId: string, @Body() createDto: CreateRecipeVersionDto) {
    return this.recipeVersionsService.create({ ...createDto, recipeId });
  }

  @Get()
  @RequirePermissions('recipe-versions.read')
  findAll(@Param('recipeId') recipeId: string) {
    return this.recipeVersionsService.findAll(recipeId);
  }

  @Get('active')
  @RequirePermissions('recipe-versions.read')
  findActive(@Param('recipeId') recipeId: string) {
    return this.recipeVersionsService.findActive(recipeId);
  }

  @Get(':id')
  @RequirePermissions('recipe-versions.read')
  findOne(@Param('id') id: string) {
    return this.recipeVersionsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('recipe-versions.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateRecipeVersionDto) {
    return this.recipeVersionsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('recipe-versions.delete')
  remove(@Param('id') id: string) {
    return this.recipeVersionsService.remove(id);
  }

  // Components nested endpoints
  @Post('components')
  @RequirePermissions('recipe-components.create')
  createComponent(@Param('id') versionId: string, @Body() createDto: CreateRecipeComponentDto) {
    return this.recipeComponentsService.create(versionId, createDto);
  }

  @Get('components')
  @RequirePermissions('recipe-components.read')
  findAllComponents(@Param('id') versionId: string) {
    return this.recipeComponentsService.findAll(versionId);
  }

  @Delete('components/:componentId')
  @RequirePermissions('recipe-components.delete')
  removeComponent(@Param('id') versionId: string, @Param('componentId') componentId: string) {
    return this.recipeComponentsService.remove(versionId, componentId);
  }
}