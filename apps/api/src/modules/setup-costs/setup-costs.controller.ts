import { Body, Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { SetupCostsService } from './setup-costs.service.js';

@Controller('setup-costs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SetupCostsController {
  constructor(private readonly setupCostsService: SetupCostsService) {}

  @Get('categories')
  @RequirePermissions('setup_costs.manage')
  categories() {
    return this.setupCostsService.listCategories();
  }

  @Get()
  @RequirePermissions('setup_costs.manage')
  list(@Query('branchId') branchId: string, @Query('categoryId') categoryId?: string) {
    return this.setupCostsService.listItems(branchId, categoryId);
  }

  @Post()
  @RequirePermissions('setup_costs.manage')
  create(@Body() body: { branchId: string; categoryId: string; title: string; contractedAmount: number; vendorName?: string }) {
    return this.setupCostsService.createItem(body);
  }

  @Post('payments')
  @RequirePermissions('setup_costs.manage')
  addPayment(
    @Body() body: { setupCostItemId: string; branchId: string; paymentMethodId: string; cashBoxId?: string; amount: number; reference?: string },
    @Req() req: any,
  ) {
    return this.setupCostsService.addPayment({ ...body, createdById: req.user?.id });
  }
}
