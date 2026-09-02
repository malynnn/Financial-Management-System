import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ApplyPaymentDto {
  @ApiPropertyOptional({
    description: 'ID of the financial obligation to apply payment to. Omit or pass "unapplied" to record as unapplied deposit.',
    example: 'clx...obligationId',
  })
  @IsOptional()
  @IsString()
  obligationId?: string;

  @ApiPropertyOptional({
    description: 'Custom applied amount (defaults to the full collection payment amount)',
    example: 1000.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Applied amount must be a number' })
  @IsPositive({ message: 'Applied amount must be greater than zero' })
  appliedAmount?: number;

  @ApiPropertyOptional({ description: 'Name of the Treasurer performing this action', example: 'Maria Santos' })
  @IsOptional()
  @IsString()
  actorName?: string;

  @ApiPropertyOptional({ description: 'Role of the actor', example: 'Treasurer' })
  @IsOptional()
  @IsString()
  actorRole?: string;
}