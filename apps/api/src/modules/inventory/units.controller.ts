import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { CreateUnitDto, UpdateUnitDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @RequirePermissions('units.create')
  create(@Body() createDto: CreateUnitDto) {
    return this.unitsService.create(createDto);
  }

  @Get()
  @RequirePermissions('units.read')
  findAll() {
    return this.unitsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('units.read')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('units.update')
  update(@Param('id') id: string, @Body() updateDto: UpdateUnitDto) {
    return this.unitsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions('units.delete')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}