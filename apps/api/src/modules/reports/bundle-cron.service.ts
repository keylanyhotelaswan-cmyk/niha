import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReportsAnalyticsService } from './reports-analytics.service.js';

const CRON_HOUR = 2;

@Injectable()
export class BundleCronService implements OnModuleInit {
  private readonly logger = new Logger(BundleCronService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunDateKey: string | null = null;

  constructor(private analytics: ReportsAnalyticsService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 15 * 60 * 1000);
    void this.tick();
  }

  private cairoDateKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private cairoHour() {
    return Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    );
  }

  private async tick() {
    const dateKey = this.cairoDateKey();
    const hour = this.cairoHour();
    if (hour < CRON_HOUR || this.lastRunDateKey === dateKey) return;

    this.lastRunDateKey = dateKey;
    try {
      const result = await this.analytics.refreshAllBranchBundles();
      this.logger.log(
        `Nightly bundle refresh: ${result.suggestions} suggestions across ${result.branches} branches`,
      );
    } catch (err) {
      this.logger.error('Nightly bundle refresh failed', err);
      this.lastRunDateKey = null;
    }
  }

  /** Manual trigger (also used after long idle). */
  async runNow() {
    return this.analytics.refreshAllBranchBundles();
  }
}
