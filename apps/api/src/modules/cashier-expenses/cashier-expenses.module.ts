import { Module } from '@nestjs/common';
import { CashierExpensesService } from './cashier-expenses.service.js';
import { CashierExpensesController } from './cashier-expenses.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';

@Module({
  imports: [PrismaModule, TreasuryModule],
  providers: [CashierExpensesService],
  controllers: [CashierExpensesController],
})
export class CashierExpensesModule {}
