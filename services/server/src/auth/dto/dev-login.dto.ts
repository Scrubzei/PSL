import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DevLoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  username: string;
}
