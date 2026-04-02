import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class CreateMatchDto {
  /** Required unless openListing is true (XP open match on matchfinder). */
  @ValidateIf((o) => !o.openListing)
  @IsNotEmpty()
  @IsUUID()
  challengeeId?: string;

  /** When true, creates an XP listing with no opponent until someone accepts (challengeeId must be omitted). */
  @IsOptional()
  @IsBoolean()
  openListing?: boolean;

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
