import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChequeStatus } from '@prisma/client';

export class UpdateChequeStatusDto {
  @IsEnum(ChequeStatus)
  @IsNotEmpty()
  status: ChequeStatus;
}
