import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UnitsController } from './units.controller.js';
import { UnitsService } from './units.service.js';
import { UnitConversionsController } from './unit-conversions.controller.js';
import { UnitConversionsService } from './unit-conversions.service.js';
import { WarehousesController } from './warehouses.controller.js';
import { WarehousesService } from './warehouses.service.js';
import { StockItemsController } from './stock-items.controller.js';
import { StockItemsService } from './stock-items.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [UnitsController, UnitConversionsController, WarehousesController, StockItemsController],
  providers: [UnitsService, UnitConversionsService, WarehousesService, StockItemsService],
  exports: [UnitsService, UnitConversionsService, WarehousesService, StockItemsService],
})
export class InventoryModule {}