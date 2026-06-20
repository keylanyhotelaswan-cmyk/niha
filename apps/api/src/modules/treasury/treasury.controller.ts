import { Controller, Post, Body, UseGuards, Request, Get, Query, Param } from '@nestjs/common';
import { TreasuryService, type WorkspaceSection } from './treasury.service.js';
import { TransferDto } from './dto/transfer.dto.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { BatchApproveDto } from './dto/batch-approve.dto.js';
import { InternalTransferDto } from './dto/internal-transfer.dto.js';
import { UpdateSafeSplitSettingDto } from './dto/safe-split-setting.dto.js';
import { ProfitWithdrawalDto } from './dto/profit-withdrawal.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';

@Controller('treasury')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('workspace')
  @RequirePermissions('shifts.access')
  workspace(
    @Request() req: any,
    @Query('branchId') branchId: string,
    @Query('cashBoxId') cashBoxId: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sections') sections?: string,
  ) {
    const sectionList = sections
      ? sections.split(',').map((s) => s.trim()).filter(Boolean) as WorkspaceSection[]
      : undefined;
    const fromDate = from ?? date;
    const toDate = to ?? date ?? from;
    return this.treasuryService.getWorkspace({
      branchId,
      cashBoxId,
      userId: req.user?.id,
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(sectionList ? { sections: sectionList } : {}),
    });
  }

  @Post('transfer')
  @RequirePermissions('treasury.manage')
  transfer(@Body() dto: TransferDto, @Request() req: any) {
    return this.treasuryService.transferToTreasury(dto, req.user?.id);
  }

  @Get('safe-split-setting')
  @RequirePermissions('treasury.manage')
  safeSplitSetting(@Query('branchId') branchId: string, @Query('date') date?: string) {
    return this.treasuryService.getSafeSplitSetting(branchId, date);
  }

  @Post('safe-split-setting')
  @RequirePermissions('treasury.manage')
  updateSafeSplitSetting(@Body() dto: UpdateSafeSplitSettingDto, @Request() req: any) {
    return this.treasuryService.updateSafeSplitSetting({
      branchId: dto.branchId,
      expensesPercentage: dto.expensesPercentage,
      updatedById: req.user?.id,
      ...(dto.date ? { date: dto.date } : {}),
    });
  }

  @Post('internal-transfer')
  @RequirePermissions('treasury.manage')
  internalTransfer(@Body() dto: InternalTransferDto) {
    return this.treasuryService.internalTransfer(dto);
  }

  @Post('profit-withdrawals')
  @RequirePermissions('treasury.manage')
  profitWithdrawal(@Body() dto: ProfitWithdrawalDto) {
    return this.treasuryService.withdrawProfit(dto);
  }

  @Post('movements')
  @RequirePermissions('treasury.manage')
  createMovement(@Body() dto: CreateMovementDto) {
    return this.treasuryService.createMovement(dto);
  }

  @Post('transactions/:id/approve')
  @RequirePermissions('orders.approve_collection')
  approve(@Param('id') id: string) {
    return this.treasuryService.approveTransaction(id);
  }

  @Post('transactions/:id/reject')
  @RequirePermissions('orders.approve_collection')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.treasuryService.rejectTransaction(id, body?.reason);
  }

  @Post('transactions/batch-approve')
  @RequirePermissions('orders.approve_collection')
  batchApprove(@Body() dto: BatchApproveDto) {
    return this.treasuryService.batchApproveTransactions(dto.ids);
  }

  @Get('transactions')
  @RequirePermissions('shifts.access')
  list(
    @Request() req: any,
    @Query('branchId') branchId?: string,
    @Query('cashBoxId') cashBoxId?: string,
    @Query('shiftId') shiftId?: string,
  ) {
    return this.treasuryService.listTransactionsWithScope({
      userId: req.user?.id,
      ...(branchId ? { branchId } : {}),
      ...(cashBoxId ? { cashBoxId } : {}),
      ...(shiftId ? { shiftId } : {}),
    });
  }

  @Get('summary')
  @RequirePermissions('shifts.access')
  summary(@Query('shiftId') shiftId: string) {
    return this.treasuryService.getShiftSummary(shiftId);
  }

  @Get('balance')
  @RequirePermissions('treasury.manage')
  balance(@Query('branchId') branchId: string) {
    return this.treasuryService.getBranchTreasuryBalance(branchId);
  }
}
