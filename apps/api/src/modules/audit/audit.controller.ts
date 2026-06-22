import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @RequirePermissions('treasury.manage')
  listLogs(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return [];
    }
    const parsedLimit = limit ? Math.min(500, Math.max(1, Number(limit) || 100)) : 150;
    return this.auditService.findFiltered({
      organizationId,
      ...(branchId ? { branchId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit: parsedLimit,
    });
  }
}
