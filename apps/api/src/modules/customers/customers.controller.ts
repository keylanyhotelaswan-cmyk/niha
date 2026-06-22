import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CustomersService } from './customers.service.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('search')
  @RequirePermissions('pos.use')
  search(
    @Query('branchId') branchId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(20, Math.max(1, Number(limit) || 12)) : 12;
    return this.customersService.search(branchId, q, parsedLimit);
  }

  @Get()
  @RequirePermissions('customers.read', 'treasury.manage', 'pos.use')
  list(
    @Query('branchId') branchId: string,
    @Query('q') q?: string,
    @Query('regularOnly') regularOnly?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.customersService.list({
      branchId,
      ...(q ? { q } : {}),
      ...(regularOnly === '1' || regularOnly === 'true' ? { regularOnly: true } : {}),
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }

  @Get(':id')
  @RequirePermissions('customers.read', 'treasury.manage', 'pos.use')
  getOne(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Put(':id')
  @RequirePermissions('customers.manage', 'treasury.manage')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
