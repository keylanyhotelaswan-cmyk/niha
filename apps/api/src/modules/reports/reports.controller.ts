import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { ReportsService } from './reports.service.js';
import { ReportsAnalyticsService } from './reports-analytics.service.js';
import { BundleCronService } from './bundle-cron.service.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly analytics: ReportsAnalyticsService,
    private readonly bundleCron: BundleCronService,
  ) {}

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

  @Get('product-day-matrix')
  @RequirePermissions('reports.view')
  productDayMatrix(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('top') top?: string,
  ) {
    const topPerDay = top != null && Number.isFinite(Number(top)) ? Number(top) : 10;
    return this.analytics.getProductDayMatrix(branchId, from, to, topPerDay);
  }

  @Get('week-over-week')
  @RequirePermissions('reports.view')
  weekOverWeek(
    @Query('branchId') branchId: string,
    @Query('weeks') weeks?: string,
  ) {
    const n = weeks != null && Number.isFinite(Number(weeks)) ? Number(weeks) : 8;
    return this.analytics.getWeekOverWeek(branchId, n);
  }

  @Get('bundle-suggestions')
  @RequirePermissions('reports.view')
  bundleSuggestions(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getBundleSuggestions(branchId, 24, from, to);
  }

  @Post('bundle-suggestions/refresh')
  @RequirePermissions('reports.view')
  refreshBundleSuggestions(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.computeBundleSuggestions(branchId, from, to);
  }

  @Post('bundle-suggestions/refresh-all')
  @RequirePermissions('reports.view')
  refreshAllBundles() {
    return this.bundleCron.runNow();
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
