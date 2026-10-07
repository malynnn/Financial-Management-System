import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadRemittanceDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileHash: string;

  @IsString()
  @IsNotEmpty()
  payrollPeriod: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;
}

export class RemittanceLineDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  obligationId: string;

  @IsNumber()
  amount: number;
}
