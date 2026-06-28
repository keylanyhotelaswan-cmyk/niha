import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { VendorInvoicesService } from './vendor-invoices.service.js';
import { VendorPaymentsService } from './vendor-payments.service.js';

@Controller('vendor-invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorInvoicesController {
  constructor(private readonly invoicesService: VendorInvoicesService) {}

  @Get()
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  list(@Query('branchId') branchId: string, @Query('vendorId') vendorId?: string) {
    return this.invoicesService.list(branchId, vendorId);
  }

  @Get(':id')
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  get(@Param('id') id: string) {
    return this.invoicesService.get(id);
  }

  @Post()
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  create(
    @Body()
    body: {
      branchId: string;
      vendorId: string;
      invoiceDate?: string;
      dueDate?: string;
      taxAmount?: number;
      note?: string;
      post?: boolean;
      lines: Array<{
        stockItemId?: string;
        description: string;
        quantity?: number;
        unitCost?: number;
        lineTotal: number;
      }>;
    },
    @Req() req: any,
  ) {
    return this.invoicesService.createManual({
      branchId: body.branchId,
      vendorId: body.vendorId,
      lines: body.lines,
      ...(body.taxAmount !== undefined ? { taxAmount: body.taxAmount } : {}),
      ...(body.note ? { note: body.note } : {}),
      ...(body.post !== undefined ? { post: body.post } : {}),
      ...(body.invoiceDate ? { invoiceDate: new Date(body.invoiceDate) } : {}),
      ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      ...(req.user?.id ? { createdById: req.user.id as string } : {}),
    });
  }

  @Post('from-receipt/:goodsReceiptId')
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  fromReceipt(@Param('goodsReceiptId') goodsReceiptId: string, @Req() req: any) {
    return this.invoicesService.createFromReceiptId(goodsReceiptId, req.user?.id);
  }

  @Post(':id/post')
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  post(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.post(id, req.user?.id);
  }

  @Post(':id/void')
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  voidInvoice(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.void(id, req.user?.id);
  }
}

@Controller('vendor-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorPaymentsController {
  constructor(private readonly paymentsService: VendorPaymentsService) {}

  @Get()
  @RequirePermissions('vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage')
  list(@Query('branchId') branchId: string, @Query('vendorId') vendorId?: string) {
    return this.paymentsService.list(branchId, vendorId);
  }

  @Post()
  @RequirePermissions('vendor_accounts.manage', 'inventory.manage')
  create(
    @Body()
    body: {
      branchId: string;
      vendorId: string;
      vendorInvoiceId?: string;
      paymentMethodId: string;
      cashBoxId?: string;
      amount: number;
      paidAt?: string;
      reference?: string;
    },
    @Req() req: any,
  ) {
    return this.paymentsService.create({
      branchId: body.branchId,
      vendorId: body.vendorId,
      paymentMethodId: body.paymentMethodId,
      amount: body.amount,
      ...(body.vendorInvoiceId ? { vendorInvoiceId: body.vendorInvoiceId } : {}),
      ...(body.cashBoxId ? { cashBoxId: body.cashBoxId } : {}),
      ...(body.reference ? { reference: body.reference } : {}),
      ...(body.paidAt ? { paidAt: new Date(body.paidAt) } : {}),
      ...(req.user?.id ? { createdById: req.user.id as string } : {}),
    });
  }
}
