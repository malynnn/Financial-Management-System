import { IsNotEmpty, IsString, IsNumber, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { DeductionType } from '@prisma/client';

export class CreatePayrollScheduleDto {
  @IsString()
  @IsNotEmpty()
  payrollPeriod: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsEnum(DeductionType)
  @IsNotEmpty()
  deductionType: DeductionType;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  expectedAmount: number;

  @IsString()
  @IsOptional()
  obligationId?: string;
}
