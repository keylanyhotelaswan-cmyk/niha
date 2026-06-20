import { IsString, IsNumber, IsOptional } from 'class-validator';

export class OpenShiftDto {
  @IsString()
  branchId: string;

  @IsString()
  cashBoxId: string;

  @IsOptional()
  @IsNumber()
  openingFloat?: number;
}
