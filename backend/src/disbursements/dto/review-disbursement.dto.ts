import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewDisbursementDto {
  @ApiProperty({ enum: ReviewAction, description: 'Review action (APPROVE or REJECT)' })
  @IsEnum(ReviewAction, { message: 'action must be either APPROVE or REJECT' })
  action: ReviewAction;

  @ApiPropertyOptional({ description: 'Rejection reason if rejected' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Reviewer name', default: 'Admin Approver' })
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @ApiPropertyOptional({ description: 'Reviewer role', default: 'Approver' })
  @IsOptional()
  @IsString()
  reviewerRole?: string;
}
