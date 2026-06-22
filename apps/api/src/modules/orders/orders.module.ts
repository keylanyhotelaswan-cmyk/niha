import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SequenceModule } from '../sequence/sequence.module.js';
import { TreasuryModule } from '../treasury/treasury.module.js';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [PrismaModule, SequenceModule, TreasuryModule, PaymentMethodsModule, AuditModule, CustomersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
