import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CloseShiftDto {
  @IsString()
  shiftId: string;

  @Type(() => Number)
  @IsNumber()
  countedCash: number;

  @IsOptional()
  @IsString()
  note?: string;
}
