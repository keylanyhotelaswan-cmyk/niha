import { Controller, Get, Post, Body, UseGuards, Request, Param, Delete, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { RequirePermissions } from '../decorators/permissions.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  findAll(@Query('organizationId') organizationId: string) {
    return this.usersService.findAll(organizationId);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('users.update')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
