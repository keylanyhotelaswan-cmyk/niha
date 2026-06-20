import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { PaymentMethodsService } from './payment-methods.service.js';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @RequirePermissions('pos.use')
  list(@Query('branchId') branchId: string) {
    return this.paymentMethodsService.listByBranch(branchId);
  }
}
