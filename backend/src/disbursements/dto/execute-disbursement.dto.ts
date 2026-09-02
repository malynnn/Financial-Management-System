import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExecuteDisbursementDto {
  @ApiPropertyOptional({ description: 'Payment execution reference (e.g. bank reference, check number)' })
  @IsOptional()
  @IsString()
  executionRefNo?: string;

  @ApiPropertyOptional({ description: 'Executor name', default: 'Treasurer' })
  @IsOptional()
  @IsString()
  executorName?: string;

  @ApiPropertyOptional({ description: 'Executor role', default: 'Treasurer' })
  @IsOptional()
  @IsString()
  executorRole?: string;

  @ApiPropertyOptional({ description: 'Execution notes or details' })
  @IsOptional()
  @IsString()
  details?: string;
}
