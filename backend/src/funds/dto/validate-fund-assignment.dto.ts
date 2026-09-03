import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateFundAssignmentDto {
  @ApiProperty({
    description: 'Fund ID, Name, or Code to validate for transaction assignment',
    example: 'General Fund',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fund identifier is required.' })
  fundIdentifier: string;
}
