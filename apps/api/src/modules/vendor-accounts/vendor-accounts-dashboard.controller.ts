import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { VendorAccountsDashboardService } from './vendor-accounts-dashboard.service.js';
import { VendorLedgerService } from './vendor-ledger.service.js';

@Controller('vendor-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorAccountsDashboardController {
  constructor(
    private readonly dashboard: VendorAccountsDashboardService,
    private readonly vendorLedger: VendorLedgerService,
  ) {}

  @Get('context')
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  context(
    @Query('branchId') branchId: string,
    @Query('cashBoxId') cashBoxId?: string,
  ) {
    return this.dashboard.getContext(branchId, cashBoxId);
  }

  @Post('adjustments')
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  adjustment(
    @Body()
    body: {
      branchId: string;
      vendorId: string;
      credit?: number;
      debit?: number;
      note?: string;
    },
    @Req() req: any,
  ) {
    return this.vendorLedger.postAdjustment({
      branchId: body.branchId,
      vendorId: body.vendorId,
      ...(body.credit != null && body.credit > 0 ? { credit: body.credit } : {}),
      ...(body.debit != null && body.debit > 0 ? { debit: body.debit } : {}),
      note: body.note ?? null,
      createdById: req.user?.id ?? null,
    });
  }
}
