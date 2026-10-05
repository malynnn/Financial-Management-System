import { IsString, IsNotEmpty, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { ChequeStatus } from '@prisma/client';

export class ChequeDto {
  @IsString()
  @IsNotEmpty()
  chequeNumber: string;

  @IsDateString()
  @IsNotEmpty()
  chequeDate: string;

  @IsString()
  @IsNotEmpty()
  payee: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  purpose: string;
}
