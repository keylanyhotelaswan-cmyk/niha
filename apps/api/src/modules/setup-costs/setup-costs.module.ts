import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';
import { SetupCostsController } from './setup-costs.controller.js';
import { SetupCostsService } from './setup-costs.service.js';

@Module({
  imports: [PrismaModule, TreasuryModule],
  providers: [SetupCostsService],
  controllers: [SetupCostsController],
})
export class SetupCostsModule {}
