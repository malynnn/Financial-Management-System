import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollectionsModule } from './collections/collections.module';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { ForecastingModule } from './forecasting/forecasting.module';
import { FundsModule } from './funds/funds.module';
import { ObligationsModule } from './obligations/obligations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    FundsModule,
    CollectionsModule,
    ObligationsModule,
    DisbursementsModule,
    ForecastingModule,
    RabbitMQModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}