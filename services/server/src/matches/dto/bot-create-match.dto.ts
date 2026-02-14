import { IsNotEmpty, IsString, IsEnum, IsNumber, Min, Max, IsArray, ArrayMinSize, IsOptional } from 'class-validator';

export class BotCreateMatchDto {
  @IsNotEmpty()
  @IsString()
  challengerDiscordId: string;

  @IsNotEmpty()
  @IsString()
  challengeeDiscordId: string;

  @IsNotEmpty()
  @IsString()
  game: string;

  @IsNotEmpty()
  @IsString()
  platform: string;

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
  @IsString()
  message?: string;
}
