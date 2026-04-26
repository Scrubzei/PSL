import { IsArray, IsNumber, IsOptional, IsString, Max, Min, ArrayMinSize } from 'class-validator';

export class UpdatePendingMatchDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  bestOf?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedMaps: string[];
}
