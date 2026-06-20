import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  dashboard(@Query('branchId') branchId: string) {
    return this.reportsService.dashboard(branchId);
  }

  @Get('operations')
  @RequirePermissions('reports.view')
  operations(@Query('branchId') branchId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.operations(branchId, from, to);
  }

  @Get('treasury')
  @RequirePermissions('reports.view')
  treasury(@Query('branchId') branchId: string, @Query('shiftId') shiftId?: string) {
    return this.reportsService.treasury(branchId, shiftId);
  }

  @Get('setup')
  @RequirePermissions('reports.view')
  setup(@Query('branchId') branchId: string) {
    return this.reportsService.setup(branchId);
  }

  @Get('inventory')
  @RequirePermissions('reports.view')
  inventory(@Query('branchId') branchId: string) {
    return this.reportsService.inventory(branchId);
  }
}
