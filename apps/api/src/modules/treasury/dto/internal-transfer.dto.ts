import { PaymentMethodType, SafeType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class InternalTransferDto {
  @IsString()
  branchId: string;

  @IsString()
  cashBoxId: string;

  @IsEnum(SafeType)
  fromSafeType: SafeType;

  @IsEnum(PaymentMethodType)
  fromPaymentMethod: PaymentMethodType;

  @IsEnum(SafeType)
  toSafeType: SafeType;

  @IsEnum(PaymentMethodType)
  toPaymentMethod: PaymentMethodType;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
