import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';
import { RecipeVersionsController } from './recipe-versions.controller.js';
import { RecipeVersionsService } from './recipe-versions.service.js';
import { RecipeComponentsService } from './recipe-components.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RecipesController, RecipeVersionsController],
  providers: [RecipesService, RecipeVersionsService, RecipeComponentsService],
  exports: [RecipesService, RecipeVersionsService, RecipeComponentsService],
})
export class RecipesModule {}