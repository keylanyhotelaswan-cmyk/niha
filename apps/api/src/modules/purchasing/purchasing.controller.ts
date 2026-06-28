import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { VendorStatementService } from '../vendor-accounts/vendor-statement.service.js';
import { PurchaseOrdersService, VendorsService } from './purchasing.service.js';

@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly statementService: VendorStatementService,
  ) {}

  @Get()
  @RequirePermissions('inventory.manage', 'vendor_accounts.view', 'vendor_accounts.manage')
  list(@Query('branchId') branchId: string, @Query('withBalance') withBalance?: string) {
    return this.vendorsService.list(branchId, withBalance === 'true');
  }

  @Get(':id/balance')
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  balance(@Param('id') id: string) {
    return this.statementService.getBalance(id);
  }

  @Get(':id/statement')
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  statement(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    return this.statementService.getStatement(id, fromDate, toDate);
  }

  @Post()
  @RequirePermissions('inventory.manage')
  create(
    @Body()
    body: {
      branchId: string;
      name: string;
      code: string;
      phone?: string;
      openingBalance?: number;
      taxId?: string;
      address?: string;
      note?: string;
    },
  ) {
    return this.vendorsService.create(body);
  }

  @Put(':id')
  @RequirePermissions('inventory.manage')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      openingBalance?: number;
      taxId?: string;
      address?: string;
      note?: string;
      isActive?: boolean;
    },
  ) {
    return this.vendorsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage')
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('inventory.manage')
  list(@Query('branchId') branchId: string) {
    return this.purchaseOrdersService.list(branchId);
  }

  @Post()
  @RequirePermissions('inventory.manage')
  create(
    @Body() body: { branchId: string; vendorId: string; lines: Array<{ stockItemId: string; quantity: number; unitCost: number }>; note?: string },
    @Req() req: any,
  ) {
    return this.purchaseOrdersService.create({ ...body, createdById: req.user?.id });
  }

  @Post(':id/receive')
  @RequirePermissions('inventory.manage')
  receive(@Param('id') id: string, @Body() body: { warehouseId: string }, @Req() req: any) {
    return this.purchaseOrdersService.receive(id, { warehouseId: body.warehouseId, receivedById: req.user?.id });
  }
}
