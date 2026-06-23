import { Controller, Post, Body, UseGuards, Request, Get, Query, BadRequestException } from '@nestjs/common';
import { ShiftsService } from './shifts.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { ShiftWalletTransferDto } from './dto/shift-wallet-transfer.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('shifts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @RequirePermissions('treasury.manage')
  open(@Body() dto: OpenShiftDto, @Request() req: any) {
    return this.shiftsService.openShift(dto, req.user?.id);
  }

  @Post('auto-open')
  @RequirePermissions('shifts.access')
  autoOpen(@Body() dto: OpenShiftDto, @Request() req: any) {
    return this.shiftsService.autoOpenShift(dto, req.user?.id);
  }

  @Post('close')
  @RequirePermissions('shifts.access')
  close(@Body() dto: CloseShiftDto, @Request() req: any) {
    return this.shiftsService.closeShift(dto, req.user?.id);
  }

  @Get('pending-handoff')
  @RequirePermissions('shifts.access')
  pendingHandoff(@Query('cashBoxId') cashBoxId: string) {
    if (!cashBoxId?.trim()) {
      throw new BadRequestException('cashBoxId مطلوب');
    }
    return this.shiftsService.getPendingCashHandoff(cashBoxId.trim());
  }

  @Get('handoff-options')
  @RequirePermissions('shifts.access')
  handoffOptions(@Query('shiftId') shiftId: string) {
    if (!shiftId?.trim()) {
      throw new BadRequestException('shiftId مطلوب');
    }
    return this.shiftsService.getHandoffOptions(shiftId.trim());
  }

  @Post('wallet-transfer')
  @RequirePermissions('shifts.access', 'pos.use')
  walletTransfer(@Body() dto: ShiftWalletTransferDto, @Request() req: any) {
    return this.shiftsService.transferShiftWallet(dto, req.user?.id);
  }

  @Get('pos-context')
  @RequirePermissions('pos.use')
  posContext(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization not found for user');
    }
    return this.shiftsService.getPosContext(organizationId, req.user?.id);
  }

  @Get('pos-catalog')
  @RequirePermissions('pos.use')
  posCatalog(@Query('branchId') branchId: string) {
    return this.shiftsService.getPosCatalog(branchId);
  }

  @Get('pos-summary')
  @RequirePermissions('pos.use')
  posSummary(@Query('shiftId') shiftId: string) {
    return this.shiftsService.getPosShiftSummary(shiftId, { includeOrders: false });
  }

  @Get('current')
  @RequirePermissions('shifts.access')
  current(@Query('branchId') branchId: string, @Query('cashBoxId') cashBoxId: string, @Request() req: any) {
    return this.shiftsService.currentShiftForCashBox(branchId, cashBoxId, req.user?.id);
  }

  @Get('list')
  @RequirePermissions('shifts.access')
  list(
    @Request() req: any,
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user?.id;
    return this.shiftsService.listShiftsForUser(branchId, from, to, userId);
  }

  @Get('collector-summary')
  @RequirePermissions('treasury.manage')
  collectorSummary(@Query('branchId') branchId: string, @Query('date') date?: string) {
    return this.shiftsService.collectorDailySummary(branchId, date);
  }
}
