import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ForecastingQueryDto {
  @ApiPropertyOptional({
    description: 'Filter forecasting dataset by specific Fund ID',
    example: 'fnd-123...',
  })
  @IsString()
  @IsOptional()
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter forecasting dataset by specific Fund Code or Name',
    example: 'General Fund',
  })
  @IsString()
  @IsOptional()
  fundName?: string;

  @ApiPropertyOptional({
    description: 'Historical start date for forecasting training data (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Historical end date for forecasting training data (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
