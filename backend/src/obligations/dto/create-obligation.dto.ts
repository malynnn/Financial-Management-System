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

  @ApiPropertyOptional({ description: 'Loan status (e.g. Pending, Approved)', example: 'Approved' })
  @IsOptional()
  @IsString()
  loanStatus?: string;

  @ApiPropertyOptional({ description: 'Approved loan amount', example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  approvedAmount?: number;

  @ApiPropertyOptional({ description: 'Beneficiary Name', example: 'Juan Dela Cruz' })
  @IsOptional()
  @IsString()
  beneficiaryName?: string;

  @ApiPropertyOptional({ description: 'Beneficiary Bank', example: 'BDO' })
  @IsOptional()
  @IsString()
  beneficiaryBank?: string;

  @ApiPropertyOptional({ description: 'Beneficiary Account Number', example: '00123456789' })
  @IsOptional()
  @IsString()
  beneficiaryAccount?: string;

  @ApiPropertyOptional({ description: 'Fund source', example: 'General Fund' })
  @IsOptional()
  @IsString()
  fundSource?: string;
}