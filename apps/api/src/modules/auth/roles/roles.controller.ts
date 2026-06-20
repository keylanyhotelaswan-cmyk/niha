import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  // Allow any authenticated user to list roles (roles come from DB)
  findAll() {
    return this.rolesService.findAll();
  }
}
