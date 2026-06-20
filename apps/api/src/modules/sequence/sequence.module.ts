import { Module } from '@nestjs/common';
import { SequenceService } from './sequence.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}
