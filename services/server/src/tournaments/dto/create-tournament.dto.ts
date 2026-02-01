import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreateTournamentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

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
}
