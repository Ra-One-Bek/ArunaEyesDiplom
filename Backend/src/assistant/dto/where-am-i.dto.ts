import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class WhereAmIDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  placeName?: string;
}