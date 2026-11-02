import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CompanyRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  careerUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  industry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CompanyListRequest {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;

  @IsOptional()
  @IsString()
  q?: string;
}
