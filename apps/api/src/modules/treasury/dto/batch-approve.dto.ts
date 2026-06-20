import { IsArray, IsString } from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
