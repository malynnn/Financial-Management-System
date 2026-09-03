import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ForecastingController } from './forecasting.controller';
import { ForecastingService } from './forecasting.service';

@Module({
  imports: [PrismaModule, FundsModule],
  controllers: [ForecastingController],
  providers: [ForecastingService],
  exports: [ForecastingService],
})
export class ForecastingModule {}
