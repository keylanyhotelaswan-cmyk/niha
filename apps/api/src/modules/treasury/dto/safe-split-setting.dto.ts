import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSafeSplitSettingDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsNumber()
  expensesPercentage: number;
}
