import { Controller, Post, Body, UseGuards, Req, Get, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from '@niha/contracts';
import { AddPaymentDto, AmendOrderDto, CancelOrderRequestDto, CreateOpenOrderDto, SuspendOrderDto, VoidOrderDto } from './dto/order-lifecycle.dto.js';

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
  listByShift(
    @Query('shiftId') shiftId: string,
    @Query('view') view?: string,
    @Query('filter') filter?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedFilter =
      filter === 'uncollected' || filter === 'collected' ? filter : 'all';
    const parsedTake = take ? Number(take) : undefined;
    return this.ordersService.listClosedForShift(shiftId, {
      view: view === 'full' ? 'full' : 'list',
      filter: parsedFilter,
      ...(parsedTake != null && Number.isFinite(parsedTake) ? { take: parsedTake } : {}),
      ...(cursor?.trim() ? { cursor: cursor.trim() } : {}),
    });
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

  @Get('delivery-captains/search')
  @RequirePermissions('pos.use')
  searchDeliveryCaptains(
    @Query('branchId') branchId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(20, Math.max(1, Number(limit) || 12)) : 12;
    return this.ordersService.searchDeliveryCaptains(branchId, q, parsedLimit);
  }

  @Get('pending-cancellations')
  @RequirePermissions('orders.approve_collection')
  listPendingCancellations(@Query('branchId') branchId: string, @Query('shiftId') shiftId?: string) {
    return this.ordersService.listPendingCancellations(branchId, shiftId);
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

  @Get(':id/audit-logs')
  @RequirePermissions('pos.use')
  getAuditLogs(@Param('id') id: string) {
    return this.ordersService.getAuditLogs(id);
  }

  @Post(':id/amend')
  @RequirePermissions('pos.use')
  amend(@Param('id') id: string, @Body() dto: AmendOrderDto, @Req() req: any) {
    return this.ordersService.amendClosedOrder(id, dto, req.user?.id);
  }

  @Post(':id/uncollect')
  @RequirePermissions('pos.use')
  uncollect(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.uncollectClosedOrder(id, req.user?.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('pos.use')
  cancelClosed(@Param('id') id: string, @Body() dto: CancelOrderRequestDto, @Req() req: any) {
    return this.ordersService.cancelClosedOrder(id, req.user?.id, dto);
  }

  @Post(':id/cancel-request')
  @RequirePermissions('pos.use')
  requestCancel(@Param('id') id: string, @Body() dto: CancelOrderRequestDto, @Req() req: any) {
    return this.ordersService.requestCancelClosedOrder(id, req.user?.id, dto);
  }

  @Post(':id/cancel-request/withdraw')
  @RequirePermissions('pos.use')
  withdrawCancel(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.withdrawCancelRequest(id, req.user?.id);
  }

  @Get(':id')
  @RequirePermissions('pos.use', 'shifts.access')
  getById(@Param('id') id: string) {
    return this.ordersService.getOrderDetail(id);
  }

  @Post(':id/cancel-request/approve')
  @RequirePermissions('orders.approve_collection')
  approveCancel(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.approveOrderCancellation(id, req.user?.id);
  }

  @Post(':id/cancel-request/reject')
  @RequirePermissions('orders.approve_collection')
  rejectCancel(@Param('id') id: string, @Body() dto: CancelOrderRequestDto, @Req() req: any) {
    return this.ordersService.rejectOrderCancellation(id, req.user?.id, dto.reason);
  }
}
