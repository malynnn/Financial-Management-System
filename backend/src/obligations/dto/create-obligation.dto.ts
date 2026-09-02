import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateObligationDto {
  @ApiProperty({ description: 'Member ID this financial obligation belongs to', example: 'test-member-001' })
  @IsString()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @ApiProperty({ description: 'Obligation Type', example: 'Annual Dues' })
  @IsString()
  @IsNotEmpty({ message: 'Obligation type is required' })
  obligationType: string;

  @ApiProperty({ description: 'Original amount of obligation', example: 1500.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Original amount must be a number' })
  @IsPositive({ message: 'Original amount must be greater than zero' })
  originalAmount: number;

  @ApiPropertyOptional({ description: 'Due date of the obligation', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}