import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemInputDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOpenOrderDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  cashBoxId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @IsEnum(['DINE_IN', 'TAKEAWAY', 'DELIVERY'])
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  orderNote?: string;

  @IsOptional()
  @IsString()
  orderOwnerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  captainName?: string;
}

export class AddPaymentDto {
  @IsString()
  paymentMethodCode: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED'])
  approvalStatus?: 'PENDING' | 'APPROVED';
}

export class SuspendOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VoidOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelOrderRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AmendOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  captainName?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];
}
