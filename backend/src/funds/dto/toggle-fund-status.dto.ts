import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ToggleFundStatusDto {
  @ApiProperty({
    description: 'New status for the fund',
    example: 'Inactive',
    enum: ['Active', 'Inactive'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Active', 'Inactive'], { message: 'Status must be either "Active" or "Inactive".' })
  status: 'Active' | 'Inactive';
}
