import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethodType, SafeType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  branchId: string;

  @IsString()
  cashBoxId: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsString()
  movementType: 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'OPERATING_EXPENSE';

  @IsOptional()
  @IsEnum(SafeType)
  safeType?: SafeType;

  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @IsNumber()
  amount: number;

  @IsString()
  note: string;

  @IsOptional()
  @IsBoolean()
  affectsCash?: boolean;
}
