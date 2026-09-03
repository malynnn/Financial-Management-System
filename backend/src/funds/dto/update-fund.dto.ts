import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateFundDto {
  @ApiPropertyOptional({
    description: 'Unique name of the fund',
    example: 'Union Fund',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique uppercase code between 2 and 6 characters',
    example: 'UNF',
  })
  @IsString()
  @IsOptional()
  @Length(2, 6, { message: 'Fund code must be strictly between 2 and 6 characters.' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Fund code must consist of uppercase alphanumeric characters only.' })
  code?: string;

  @ApiPropertyOptional({
    description: 'Brief description of the fund purpose',
    example: 'Core operational fund for union activities.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target utilization percentage (1-100)',
    example: 85,
  })
  @IsNumber({}, { message: 'Target utilization must be a valid number.' })
  @Min(1, { message: 'Target utilization must be at least 1%.' })
  @Max(100, { message: 'Target utilization cannot exceed 100%.' })
  @IsOptional()
  targetUtilization?: number;
}
