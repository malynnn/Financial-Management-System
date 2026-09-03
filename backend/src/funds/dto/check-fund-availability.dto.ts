import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CheckFundAvailabilityDto {
  @ApiProperty({
    description: 'Fund ID, Name, or Code to check availability for',
    example: 'General Fund',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fund identifier is required.' })
  fundIdentifier: string;

  @ApiProperty({
    description: 'Required amount for disbursement or operation',
    example: 75000,
  })
  @IsNumber({}, { message: 'Required amount must be a valid number.' })
  @Min(0.01, { message: 'Required amount must be greater than zero.' })
  requiredAmount: number;
}
