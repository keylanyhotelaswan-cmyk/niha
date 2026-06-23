import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const SHIFT_WALLET_METHODS = ['CASH', 'INSTAPAY', 'WALLET'] as const;

export class ShiftWalletTransferDto {
  @IsString()
  shiftId!: string;

  @IsIn(SHIFT_WALLET_METHODS)
  fromPaymentMethod!: (typeof SHIFT_WALLET_METHODS)[number];

  @IsIn(SHIFT_WALLET_METHODS)
  toPaymentMethod!: (typeof SHIFT_WALLET_METHODS)[number];

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
