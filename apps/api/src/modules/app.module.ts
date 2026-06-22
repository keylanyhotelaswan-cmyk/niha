import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { SequenceModule } from './sequence/sequence.module.js';
import { AuditModule } from './audit/audit.module.js';
import { ShiftsModule } from './shifts/shifts.module.js';
import { TreasuryModule } from './treasury/treasury.module.js';
import { CashierExpensesModule } from './cashier-expenses/cashier-expenses.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { CashBoxesModule } from './cash-boxes/cash-boxes.module.js';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module.js';
import { SetupCostsModule } from './setup-costs/setup-costs.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { PurchasingModule } from './purchasing/purchasing.module.js';
import { CustomersModule } from './customers/customers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
      load: [
        () => ({
          port: Number(process.env.PORT ?? 4000),
          appUrl: process.env.APP_URL ?? 'http://localhost:5173',
          appUrls: (process.env.APP_URLS ?? process.env.APP_URL ?? 'http://localhost:5173')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          databaseUrl: process.env.DATABASE_URL,
          defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'EGP',
          defaultTimezone: process.env.DEFAULT_TIMEZONE ?? 'Africa/Cairo',
          jwtSecret: process.env.JWT_SECRET ?? 'niha-secret-key',
          jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
        }),
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    BranchesModule,
    SequenceModule,
    AuditModule,
    ShiftsModule,
    TreasuryModule,
    CashierExpensesModule,
    CatalogModule,
    InventoryModule,
    RecipesModule,
    OrdersModule,
    CashBoxesModule,
    PaymentMethodsModule,
    SetupCostsModule,
    ReportsModule,
    PurchasingModule,
    CustomersModule,
  ],
})
export class AppModule {}
