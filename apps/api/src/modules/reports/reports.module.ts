import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { ReportsAnalyticsService } from './reports-analytics.service.js';
import { BundleCronService } from './bundle-cron.service.js';

@Module({
  imports: [PrismaModule, TreasuryModule],
  providers: [ReportsService, ReportsAnalyticsService, BundleCronService],
  controllers: [ReportsController],
})
export class ReportsModule {}
