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

  /**
   * defer — إغلاق + تسليم النقد للكاشير التالي (بدون فتح وردية) + الطلبات غير المحصلة تبقى على الخزنة
   * existing — نقل الطلبات لوردية مفتوحة
   * treasury — تسليم النقد للإدارة + إغلاق
   * successor — فتح وردية جديدة (فقط إن لم توجد وردية مفتوحة على الخزنة)
   */
  @IsOptional()
  @IsIn(['defer', 'existing', 'treasury', 'successor'])
  handoffMode?: 'defer' | 'existing' | 'treasury' | 'successor';

  @IsOptional()
  @IsString()
  targetShiftId?: string;

  @IsOptional()
  @IsString()
  successorCashBoxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  successorOpeningFloat?: number;
}
