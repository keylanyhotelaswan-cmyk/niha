import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const EXPENSE_PAYMENT_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'] as const;

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

  /** طريقة الدفع التي خُصم منها المصروف (نقدي / انستاباي / محفظة) */
  @IsOptional()
  @IsIn(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: (typeof EXPENSE_PAYMENT_METHODS)[number];
}
