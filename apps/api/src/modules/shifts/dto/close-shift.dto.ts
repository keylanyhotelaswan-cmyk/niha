import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CloseShiftDto {
  @IsString()
  shiftId: string;

  @Type(() => Number)
  @IsNumber()
  countedCash: number;

  @IsOptional()
  @IsString()
  note?: string;

  /** نقل الطلبات المعلّقة و/أو فتح وردية خلفية */
  @IsOptional()
  @IsIn(['successor', 'existing'])
  handoffMode?: 'successor' | 'existing';

  /** وردية مفتوحة مستلمة — مطلوب مع handoffMode=existing */
  @IsOptional()
  @IsString()
  targetShiftId?: string;

  /** خزنة الوردية الجديدة — الافتراضي نفس خزنة الوردية الحالية */
  @IsOptional()
  @IsString()
  successorCashBoxId?: string;

  /** رصيد افتتاح الوردية الجديدة — الافتراضي العهدة المعدّة */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  successorOpeningFloat?: number;
}
