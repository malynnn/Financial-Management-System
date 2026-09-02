import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDisbursementRequestDto {
  @ApiProperty({ description: 'ID of the approved financial obligation/loan (DMP-001, DMP-002)' })
  @IsString()
  @IsNotEmpty({ message: 'obligationId (linked loan) is required' })
  obligationId: string;

  @ApiProperty({ description: 'ID of the member receiving disbursement (DMP-002, DMP-004)' })
  @IsString()
  @IsNotEmpty({ message: 'memberId is required' })
  memberId: string;

  @ApiProperty({ description: 'Requested disbursement amount (DMP-002, DMP-005, DMP-007)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a valid number' })
  @IsPositive({ message: 'amount must be greater than zero' })
  @Min(0.01, { message: 'amount must be at least 0.01' })
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Disbursement payment method (DMP-002)' })
  @IsEnum(PaymentMethod, { message: 'paymentMethod must be CASH, GCASH, BANK_TRANSFER, CHECK, or OTHER' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Source fund to draw from (DMP-006)' })
  @IsString()
  @IsNotEmpty({ message: 'fundSource is required' })
  fundSource: string;

  @ApiProperty({ description: 'Beneficiary full name for verification (DMP-004)' })
  @IsString()
  @IsNotEmpty({ message: 'beneficiaryName is required' })
  beneficiaryName: string;

  @ApiPropertyOptional({ description: 'Beneficiary bank name' })
  @IsOptional()
  @IsString()
  beneficiaryBank?: string;

  @ApiPropertyOptional({ description: 'Beneficiary account number' })
  @IsOptional()
  @IsString()
  beneficiaryAccount?: string;

  @ApiPropertyOptional({ description: 'Optional description or notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Actor name submitting the request', default: 'Treasurer' })
  @IsOptional()
  @IsString()
  actorName?: string;

  @ApiPropertyOptional({ description: 'Role of actor submitting the request', default: 'Treasurer' })
  @IsOptional()
  @IsString()
  actorRole?: string;
}
