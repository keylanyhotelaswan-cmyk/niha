import { PaymentMethodType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProfitWithdrawalDto {
  @IsString()
  branchId: string;

  @IsString()
  cashBoxId: string;

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
