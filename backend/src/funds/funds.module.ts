import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';

@Module({
  imports: [PrismaModule],
  controllers: [FundsController],
  providers: [FundsService],
  exports: [FundsService],
})
export class FundsModule {}
