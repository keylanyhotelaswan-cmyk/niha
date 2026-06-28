import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SequenceModule } from '../sequence/sequence.module.js';
import { VendorAccountsModule } from '../vendor-accounts/vendor-accounts.module.js';
import { PurchaseOrdersController, VendorsController } from './purchasing.controller.js';
import { PurchaseOrdersService, VendorsService } from './purchasing.service.js';

@Module({
  imports: [PrismaModule, SequenceModule, VendorAccountsModule],
  providers: [VendorsService, PurchaseOrdersService],
  controllers: [VendorsController, PurchaseOrdersController],
})
export class PurchasingModule {}
