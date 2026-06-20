import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CashBoxesService } from './cash-boxes.service.js';

@Controller('cash-boxes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashBoxesController {
  constructor(private readonly cashBoxesService: CashBoxesService) {}

  @Get()
  @RequirePermissions('shifts.access')
  list(@Query('branchId') branchId: string) {
    return this.cashBoxesService.listByBranch(branchId);
  }
}
