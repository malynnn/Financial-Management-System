import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * CPS-006: DTO for classifying a collection's category
 * before the transaction can be finalized.
 */
export class ClassifyCollectionDto {
  @ApiProperty({
    description: 'Collection category classification (e.g., "Dues", "Loan Repayment", "Donation", "Penalty")',
    example: 'Dues',
  })
  @IsString()
  @IsNotEmpty({ message: 'Collection category is required' })
  collectionCategory: string;
}
