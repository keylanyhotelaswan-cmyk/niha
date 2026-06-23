import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductionPlanController } from './production-plan.controller.js';
import { ProductionPlanService } from './production-plan.service.js';

@Module({
  imports: [PrismaModule],
  providers: [ProductionPlanService],
  controllers: [ProductionPlanController],
  exports: [ProductionPlanService],
})
export class ProductionPlanModule {}
