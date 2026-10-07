import { Module } from '@nestjs/common';
import { LifespanController } from './lifespan.controller';
import { LifespanService } from './lifespan.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FundsModule } from '../funds/funds.module';

@Module({
  imports: [PrismaModule, FundsModule],
  controllers: [LifespanController],
  providers: [LifespanService],
  exports: [LifespanService],
})
export class LifespanModule {}
