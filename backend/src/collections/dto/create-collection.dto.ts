import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * CPS-001: The system shall accept a collection submission only when the
 * Member ID, payment amount, payment date, payment method, and payment
 * reference are provided.
 */
export class CreateCollectionDto {
  @ApiProperty({ description: 'ID of the member submitting the payment' })
  @IsString()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @ApiProperty({ description: 'Payment amount (must be positive)', example: 500.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Payment amount must be a number' })
  @IsPositive({ message: 'Payment amount must be greater than zero' })
  paymentAmount: number;

  @ApiProperty({ description: 'Date of payment (ISO 8601)', example: '2026-09-01' })
  @IsDateString({}, { message: 'Payment date must be a valid date (e.g. 2026-09-01)' })
  paymentDate: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method used',
    example: PaymentMethod.GCASH,
  })
  @IsEnum(PaymentMethod, {
    message: `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment reference or transaction number', example: 'GCX-12345' })
  @IsString()
  @IsNotEmpty({ message: 'Payment reference is required' })
  paymentReference: string;

  @ApiPropertyOptional({ description: 'Optional notes about this collection' })
  @IsOptional()
  @IsString()
  description?: string;
}