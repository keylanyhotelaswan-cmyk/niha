import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service.js';
import { ShiftsController } from './shifts.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SequenceModule } from '../sequence/sequence.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';

@Module({
  imports: [PrismaModule, SequenceModule, TreasuryModule],
  providers: [ShiftsService],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
