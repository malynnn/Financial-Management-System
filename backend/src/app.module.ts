import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollectionsModule } from './collections/collections.module';
import { ObligationsModule } from './obligations/obligations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CollectionsModule,
    ObligationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}