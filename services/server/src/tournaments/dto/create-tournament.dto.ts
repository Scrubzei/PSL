import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsEnum,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoundDeadlineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  deadline: string | null;
}

export class PrizeEntryDto {
  @IsNumber()
  place: number;

  @IsString()
  prize: string;
}

export class CreateTournamentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens (e.g., "summer-cup-2024")',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  gameId: string;

  @IsNotEmpty()
  @IsUUID()
  platformId: string;

  @IsNotEmpty()
  @IsEnum(['SINGLE_ELIMINATION'])
  format: 'SINGLE_ELIMINATION';

  @IsNotEmpty()
  @IsNumber()
  @Min(4)
  @Max(64)
  maxParticipants: number;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundDeadlineDto)
  roundDeadlines?: RoundDeadlineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeEntryDto)
  prizePool?: PrizeEntryDto[];

  @IsOptional()
  @IsString()
  howItWorks?: string;

  @IsOptional()
  @IsArray()
  sponsors?: { name: string; url?: string }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disqualifications?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
