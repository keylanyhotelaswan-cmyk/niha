import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service.js';
import { TreasuryController } from './treasury.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [TreasuryService],
  controllers: [TreasuryController],
  exports: [TreasuryService],
})
export class TreasuryModule {}
