import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AuthorizedBalanceAdjustmentDto {
  @ApiProperty({
    description: 'Fund ID, Name, or Code to adjust',
    example: 'General Fund',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fund identifier is required.' })
  fundIdentifier: string;

  @ApiProperty({
    description: 'Amount to adjust',
    example: 10000,
  })
  @IsNumber({}, { message: 'Adjustment amount must be a number.' })
  @Min(0.01, { message: 'Adjustment amount must be greater than zero.' })
  amount: number;

  @ApiProperty({
    description: 'Adjustment type (INCREASE / DECREASE)',
    example: 'INCREASE',
    enum: ['INCREASE', 'DECREASE'],
  })
  @IsString()
  @IsIn(['INCREASE', 'DECREASE'], { message: 'Adjustment type must be either INCREASE or DECREASE.' })
  adjustmentType: 'INCREASE' | 'DECREASE';

  @ApiProperty({
    description: 'Authorized justification / reason for audit trail',
    example: 'Board-approved dividend allocation for union operations',
  })
  @IsString()
  @IsNotEmpty({ message: 'Authorization reason is required.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Role of authorizing officer (ADMIN or TREASURER required)',
    example: 'ADMIN',
  })
  @IsString()
  @IsOptional()
  actorRole?: string;

  @ApiPropertyOptional({
    description: 'Name of authorizing officer',
    example: 'Finance Administrator',
  })
  @IsString()
  @IsOptional()
  actorName?: string;
}
