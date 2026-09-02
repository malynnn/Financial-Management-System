import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectCollectionDto {
  @ApiProperty({ description: 'Reason for rejecting this collection', example: 'Attached proof of payment is blurry and unreadable.' })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  reason: string;

  @ApiPropertyOptional({ description: 'Name of the Treasurer rejecting this payment', example: 'Maria Santos' })
  @IsOptional()
  @IsString()
  actorName?: string;

  @ApiPropertyOptional({ description: 'Role of the actor', example: 'Treasurer' })
  @IsOptional()
  @IsString()
  actorRole?: string;
}