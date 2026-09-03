import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryFundLedgerDto {
  @ApiPropertyOptional({
    description: 'Filter transactions by Fund ID',
    example: 'cuid...',
  })
  @IsString()
  @IsOptional()
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions by Fund Name',
    example: 'General Fund',
  })
  @IsString()
  @IsOptional()
  fundName?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    example: 'Inflow (Collection)',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction status (Posted, Pending)',
    example: 'Posted',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search by reference ID or description',
    example: 'TXN-5001',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Start date filter (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
