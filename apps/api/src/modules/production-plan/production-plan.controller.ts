import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { ProductionPlanService } from './production-plan.service.js';
import { UpsertProductionPlanDto } from './dto/upsert-production-plan.dto.js';

@Controller('production-plan')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionPlanController {
  constructor(private readonly productionPlanService: ProductionPlanService) {}

  @Get()
  @RequirePermissions('pos.use', 'products.read')
  getPlan(@Query('branchId') branchId: string, @Query('date') date?: string) {
    return this.productionPlanService.getDailyPlan(branchId, date);
  }

  @Post()
  @RequirePermissions('pos.use')
  savePlan(@Body() dto: UpsertProductionPlanDto, @Request() req: any) {
    return this.productionPlanService.upsertDailyPlan(dto, req.user?.id);
  }
}
