import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { RemittanceController } from './remittance.controller';
import { RemittanceService } from './remittance.service';

@Module({
  imports: [PrismaModule, FundsModule],
  controllers: [CollectionsController, RemittanceController],
  providers: [CollectionsService, RemittanceService],
  exports: [CollectionsService, RemittanceService],
})
export class CollectionsModule {}