import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { PurchaseOrdersService, VendorsService } from './purchasing.service.js';

@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @RequirePermissions('inventory.manage')
  list(@Query('branchId') branchId: string) {
    return this.vendorsService.list(branchId);
  }

  @Post()
  @RequirePermissions('inventory.manage')
  create(@Body() body: { branchId: string; name: string; code: string; phone?: string }) {
    return this.vendorsService.create(body);
  }

  @Put(':id')
  @RequirePermissions('inventory.manage')
  update(@Param('id') id: string, @Body() body: { name?: string; phone?: string }) {
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
