import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementsService } from './disbursements.service';

@Module({
  imports: [PrismaModule, FundsModule],
  controllers: [DisbursementsController],
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
