import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class FundSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for financial summary (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for financial summary (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
