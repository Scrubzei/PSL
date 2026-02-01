import { IsNotEmpty, IsUUID, IsEnum, IsNumber, Min, Max, IsArray, ArrayMinSize, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateMatchDto {
  @IsNotEmpty()
  @IsUUID()
  challengeeId: string;

  @IsNotEmpty()
  @IsUUID()
  leaderboardId: string;

  @IsNotEmpty()
  @IsEnum(['XP', 'RANKED'])
  type: 'XP' | 'RANKED';

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(9)
  bestOf: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedMaps: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  wagerAmount?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  linkOnly?: boolean;
}
