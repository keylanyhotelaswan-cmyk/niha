import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'niha-api',
      timezone: this.config.get<string>('defaultTimezone'),
      currency: this.config.get<string>('defaultCurrency'),
    };
  }
}
