import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductCategoriesController } from './product-categories.controller.js';
import { ProductCategoriesService } from './product-categories.service.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoriesController, ProductsController],
  providers: [ProductCategoriesService, ProductsService],
  exports: [ProductCategoriesService, ProductsService],
})
export class CatalogModule {}