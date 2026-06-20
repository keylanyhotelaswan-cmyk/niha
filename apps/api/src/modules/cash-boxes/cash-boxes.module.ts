import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CashBoxesController } from './cash-boxes.controller.js';
import { CashBoxesService } from './cash-boxes.service.js';

@Module({
  imports: [PrismaModule],
  providers: [CashBoxesService],
  controllers: [CashBoxesController],
  exports: [CashBoxesService],
})
export class CashBoxesModule {}
