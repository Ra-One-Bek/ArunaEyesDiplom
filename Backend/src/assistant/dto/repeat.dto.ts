import { IsString, MinLength } from 'class-validator';

export class RepeatDto {
  @IsString()
  @MinLength(1)
  lastInstruction: string;
}