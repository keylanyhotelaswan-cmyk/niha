import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ProductionPlanItemDto {
  @IsString()
  productId!: string;

  /** null أو ≤0 يحذف الخطة لهذا الصنف */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  plannedQuantity?: number | null;
}

export class UpsertProductionPlanDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  dateKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionPlanItemDto)
  items!: ProductionPlanItemDto[];
}
