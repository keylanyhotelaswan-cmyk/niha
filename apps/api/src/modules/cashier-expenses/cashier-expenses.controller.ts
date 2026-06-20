import { Controller, Post, Body, Req, UseGuards, Get, Query } from '@nestjs/common';
import { CashierExpensesService } from './cashier-expenses.service.js';
import { CreateCashierExpenseDto } from './dto/create-cashier-expense.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('cashier-expenses')
export class CashierExpensesController {
  constructor(private svc: CashierExpensesService) {}

  @Post()
  async create(@Body() dto: CreateCashierExpenseDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Get('stock-items')
  async stockItems(@Query('branchId') branchId: string) {
    return this.svc.listStockItemsForExpense(branchId);
  }

  @Get()
  async list(@Query('branchId') branchId: string, @Query('shiftId') shiftId: string) {
    return this.svc.listForShift(branchId, shiftId);
  }
}
