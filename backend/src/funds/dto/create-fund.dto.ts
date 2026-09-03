import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateFundDto {
  @ApiProperty({
    description: 'Unique name of the fund',
    example: 'Union Fund',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fund name is required.' })
  name: string;

  @ApiProperty({
    description: 'Unique uppercase code between 2 and 6 characters',
    example: 'UNF',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fund code is required.' })
  @Length(2, 6, { message: 'Fund code must be strictly between 2 and 6 characters.' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Fund code must consist of uppercase alphanumeric characters only.' })
  code: string;

  @ApiPropertyOptional({
    description: 'Brief description of the fund purpose',
    example: 'Core operational fund for union activities.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Initial opening ledger balance',
    example: 500000,
    default: 0,
  })
  @IsNumber({}, { message: 'Opening balance must be a valid number.' })
  @Min(0, { message: 'Opening balance cannot be negative.' })
  openingBalance: number;

  @ApiProperty({
    description: 'Target utilization percentage (1-100)',
    example: 80,
    default: 80,
  })
  @IsNumber({}, { message: 'Target utilization must be a valid number.' })
  @Min(1, { message: 'Target utilization must be at least 1%.' })
  @Max(100, { message: 'Target utilization cannot exceed 100%.' })
  targetUtilization: number;

  @ApiPropertyOptional({
    description: 'Initial fund status',
    example: 'Active',
    enum: ['Active', 'Inactive'],
    default: 'Active',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
