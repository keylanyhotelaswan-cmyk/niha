import { IsString, IsNumber } from 'class-validator';

export class TransferDto {
  @IsString()
  branchId: string;

  @IsString()
  cashBoxId: string;

  @IsString()
  treasuryId: string;

  @IsNumber()
  amount: number;

  @IsString()
  note: string;
}
