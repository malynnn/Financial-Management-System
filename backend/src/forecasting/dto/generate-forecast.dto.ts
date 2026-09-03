import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateForecastDto {
  @ApiPropertyOptional({
    description: 'Target fund code from Fund Master (e.g. UNF, GEN, DAF, FAF, LNF, or ALL for all active funds)',
    example: 'UNF',
    default: 'ALL',
  })
  @IsString()
  @IsOptional()
  fundCode?: string = 'ALL';

  @ApiPropertyOptional({
    description: 'Number of months to forecast ahead (between 1 and 12)',
    example: 4,
    default: 4,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(12)
  horizonMonths?: number = 4;

  @ApiPropertyOptional({
    description: 'FAI-010: Explicit selected valid forecast periods (array of YYYY-MM periods)',
    example: ['2026-09', '2026-10', '2026-11'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetPeriods?: string[];

  @ApiPropertyOptional({
    description: 'FAI-011: Automatically persist generated forecast records to database',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  persistResults?: boolean = true;
}
