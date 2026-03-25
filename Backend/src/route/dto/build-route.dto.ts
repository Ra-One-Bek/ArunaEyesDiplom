import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BuildRouteDto {
  @IsLatitude()
  startLatitude: number;

  @IsLongitude()
  startLongitude: number;

  @IsLatitude()
  endLatitude: number;

  @IsLongitude()
  endLongitude: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  destinationName?: string;
}