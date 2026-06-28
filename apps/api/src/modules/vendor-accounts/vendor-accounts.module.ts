import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SequenceModule } from '../sequence/sequence.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';
import { VendorInvoicesController, VendorPaymentsController } from './vendor-accounts.controller.js';
import { VendorAccountsDashboardController } from './vendor-accounts-dashboard.controller.js';
import { VendorAccountsDashboardService } from './vendor-accounts-dashboard.service.js';
import { VendorInvoicesService } from './vendor-invoices.service.js';
import { VendorLedgerService } from './vendor-ledger.service.js';
import { VendorPaymentsService } from './vendor-payments.service.js';
import { VendorStatementService } from './vendor-statement.service.js';

@Module({
  imports: [PrismaModule, SequenceModule, TreasuryModule],
  providers: [
    VendorLedgerService,
    VendorInvoicesService,
    VendorPaymentsService,
    VendorStatementService,
    VendorAccountsDashboardService,
  ],
  controllers: [VendorInvoicesController, VendorPaymentsController, VendorAccountsDashboardController],
  exports: [VendorLedgerService, VendorInvoicesService, VendorPaymentsService, VendorStatementService],
})
export class VendorAccountsModule {}
