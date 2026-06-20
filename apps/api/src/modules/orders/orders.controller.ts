import { Controller, Post, Body, UseGuards, Req, Get, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from '@niha/contracts';
import { AddPaymentDto, CreateOpenOrderDto, SuspendOrderDto, VoidOrderDto } from './dto/order-lifecycle.dto.js';

@Controller('orders')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @RequirePermissions('pos.use')
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(dto, req.user?.id);
  }

  @Post('open')
  @RequirePermissions('pos.use')
  createOpen(@Body() dto: CreateOpenOrderDto, @Req() req: any) {
    return this.ordersService.createOpen(dto, req.user?.id);
  }

  @Get('by-shift')
  @RequirePermissions('pos.use')
  listByShift(@Query('shiftId') shiftId: string) {
    return this.ordersService.listClosedForShift(shiftId);
  }

  @Get()
  @RequirePermissions('pos.use')
  list(@Query('branchId') branchId: string, @Query('status') status?: string) {
    return this.ordersService.list(branchId, status);
  }

  @Get('suspended')
  @RequirePermissions('pos.use')
  listSuspended(@Query('branchId') branchId: string) {
    return this.ordersService.listSuspended(branchId);
  }

  @Post(':id/suspend')
  @RequirePermissions('pos.use')
  suspend(@Param('id') id: string, @Body() dto: SuspendOrderDto, @Req() req: any) {
    return this.ordersService.suspend(id, req.user?.id, dto);
  }

  @Post(':id/resume')
  @RequirePermissions('pos.use')
  resume(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.resume(id, req.user?.id);
  }

  @Post(':id/payments')
  @RequirePermissions('pos.use')
  addPayment(@Param('id') id: string, @Body() dto: AddPaymentDto, @Req() req: any) {
    return this.ordersService.addPayment(id, dto, req.user?.id);
  }

  @Post(':id/collect')
  @RequirePermissions('pos.use')
  collectClosed(@Param('id') id: string, @Body() dto: AddPaymentDto, @Req() req: any) {
    return this.ordersService.collectClosedOrder(id, dto, req.user?.id);
  }

  @Post(':id/close')
  @RequirePermissions('pos.use')
  close(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.close(id, req.user?.id);
  }

  @Post(':id/void')
  @RequirePermissions('pos.use')
  void(@Param('id') id: string, @Body() dto: VoidOrderDto, @Req() req: any) {
    return this.ordersService.void(id, req.user?.id, dto);
  }
}
