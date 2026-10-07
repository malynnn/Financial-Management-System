import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { COLLECTION_CATEGORIES } from '../collections.config';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * CPS-001 / CPS-003: The system shall accept a collection only when the
 * Member ID, payment amount, payment date, payment method, purpose/description
 * and collection category are provided and valid. The payment reference is
 * required conditionally per payment method (CPS-005, enforced in the service).
 */
export class CreateCollectionDto {
  @ApiProperty({ description: 'ID of the member the payment belongs to' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @ApiProperty({ description: 'Payment amount (must be greater than zero)', example: 500.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Payment amount must be a number with at most 2 decimal places' })
  @IsPositive({ message: 'Payment amount must be greater than zero' })
  @Max(100000000, { message: 'Payment amount is too large' })
  paymentAmount: number;

  @ApiProperty({ description: 'Date of payment (ISO 8601)', example: '2026-09-01' })
  @IsNotEmpty({ message: 'Payment date is required' })
  @IsDateString({}, { message: 'Payment date must be a valid date (e.g. 2026-09-01)' })
  paymentDate: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method used (must be a configured method)',
    example: PaymentMethod.GCASH,
  })
  @IsEnum(PaymentMethod, {
    message: `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference / transaction number. Required when the payment method requires one.',
    example: 'GCX-12345',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  paymentReference?: string;

  @ApiProperty({ description: 'Purpose / description of the collection' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Purpose or description is required' })
  description: string;

  @ApiProperty({ description: 'Collection category', enum: COLLECTION_CATEGORIES })
  @Transform(trim)
  @IsNotEmpty({ message: 'Collection category is required' })
  @IsIn(COLLECTION_CATEGORIES, {
    message: `Collection category must be one of: ${COLLECTION_CATEGORIES.join(', ')}`,
  })
  collectionCategory: string;
}