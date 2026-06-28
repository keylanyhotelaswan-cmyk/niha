import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from '@niha/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('branches.create')
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  @RequirePermissions(
    'branches.read',
    'inventory.manage',
    'vendor_accounts.view',
    'vendor_accounts.manage',
    'pos.use',
    'treasury.manage',
    'reports.view',
  )
  findAll(@Query('organizationId') organizationId: string) {
    return this.branchesService.findAll(organizationId);
  }

  @Get(':id/receipt-settings')
  @RequirePermissions('pos.use')
  getReceiptSettings(@Param('id') id: string) {
    return this.branchesService.getReceiptSettings(id);
  }

  @Put(':id/receipt-settings')
  @RequirePermissions('treasury.manage')
  updateReceiptSettings(@Param('id') id: string, @Body() body: { settings: Record<string, unknown> }) {
    return this.branchesService.updateReceiptSettings(id, body.settings ?? {});
  }

  @Get(':id')
  @RequirePermissions('branches.read')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('branches.update')
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @RequirePermissions('branches.delete')
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
