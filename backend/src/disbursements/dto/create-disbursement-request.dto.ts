import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, DisbursementType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
  IsDateString,
  IsIn,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChequeDto } from './cheque.dto';
import { DISBURSEMENT_CATEGORIES } from '../disbursement.config';

export class CreateDisbursementRequestDto {
  @ApiProperty({ enum: DisbursementType, description: 'Type of disbursement' })
  @IsEnum(DisbursementType)
  @IsNotEmpty()
  type: DisbursementType;

  @ApiProperty({ description: 'Category of disbursement' })
  @IsIn(DISBURSEMENT_CATEGORIES as any)
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Specific purpose of the disbursement' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiPropertyOptional({ description: 'Disbursement date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Reference to supporting document' })
  @IsOptional()
  @IsString()
  supportingDocRef?: string;

  @ApiProperty({ description: 'ID of the approved financial obligation/loan (required for LOAN_RELEASE)' })
  @ValidateIf(o => o.type === DisbursementType.LOAN_RELEASE)
  @IsString()
  @IsNotEmpty({ message: 'obligationId (linked loan) is required for Loan Release' })
  obligationId?: string;

  @ApiProperty({ description: 'ID of the member receiving disbursement (required for LOAN_RELEASE)' })
  @ValidateIf(o => o.type === DisbursementType.LOAN_RELEASE)
  @IsString()
  @IsNotEmpty({ message: 'memberId is required for Loan Release' })
  memberId?: string;

  @ApiProperty({ description: 'Requested disbursement amount' })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a valid number' })
  @IsPositive({ message: 'amount must be greater than zero' })
  @Min(0.01, { message: 'amount must be at least 0.01' })
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Disbursement payment method' })
  @IsEnum(PaymentMethod, { message: 'paymentMethod must be CASH, GCASH, BANK_TRANSFER, CHECK, or OTHER' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Cheque details (required if method is CHECK)' })
  @ValidateIf(o => o.paymentMethod === PaymentMethod.CHECK)
  @ValidateNested()
  @Type(() => ChequeDto)
  @IsNotEmpty({ message: 'Cheque details are required when payment method is CHECK' })
  cheque?: ChequeDto;

  @ApiProperty({ description: 'Source fund to draw from' })
  @IsString()
  @IsNotEmpty({ message: 'fundSource is required' })
  fundSource: string;

  @ApiProperty({ description: 'Beneficiary full name' })
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

  @ApiPropertyOptional({ description: 'Explicit exception approval flag to bypass fund balance check (DPS-006)' })
  @IsOptional()
  @IsBoolean()
  allowFundException?: boolean;
}
