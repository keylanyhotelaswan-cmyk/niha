import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCashierExpenseDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsEnum(['ITEM', 'GENERAL'])
  kind!: 'ITEM' | 'GENERAL';

  @IsOptional()
  @IsString()
  stockItemId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
