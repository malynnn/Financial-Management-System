import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { FINANCIAL_PATTERNS } from './rabbitmq.constants';

@Controller()
export class RabbitMQController {
  private readonly logger = new Logger(RabbitMQController.name);

  /**
   * Listens for Posted Collections to trigger asynchronous ledger sync or notifications
   */
  @EventPattern(FINANCIAL_PATTERNS.COLLECTION_POSTED)
  async handleCollectionPosted(@Payload() payload: any, @Ctx() context: RmqContext) {
    this.logger.log(
      `[RabbitMQ Consumer] Received Collection Posted Event: Ref=${payload?.data?.collectionRefNo || payload?.data?.id || 'N/A'}, Amount=₱${payload?.data?.paymentAmount || payload?.data?.amount || 0}`,
    );
  }

  /**
   * Listens for Executed Disbursements
   */
  @EventPattern(FINANCIAL_PATTERNS.DISBURSEMENT_EXECUTED)
  async handleDisbursementExecuted(@Payload() payload: any, @Ctx() context: RmqContext) {
    this.logger.log(
      `[RabbitMQ Consumer] Received Disbursement Executed Event: Ref=${payload?.data?.disbursementRefNo || payload?.data?.id || 'N/A'}, Amount=₱${payload?.data?.amount || 0}`,
    );
  }

  /**
   * Listens for Fund Balance updates
   */
  @EventPattern(FINANCIAL_PATTERNS.FUND_BALANCE_CHANGED)
  async handleFundBalanceChanged(@Payload() payload: any, @Ctx() context: RmqContext) {
    this.logger.log(
      `[RabbitMQ Consumer] Received Fund Balance Changed Event: Fund=${payload?.data?.fundName || payload?.data?.fundId || 'N/A'}, NewBalance=₱${payload?.data?.newBalance || 0}`,
    );
  }

  /**
   * Listens for Insufficient Fund liquidity warnings
   */
  @EventPattern(FINANCIAL_PATTERNS.FUND_INSUFFICIENT_ALERT)
  async handleFundInsufficientAlert(@Payload() payload: any, @Ctx() context: RmqContext) {
    this.logger.warn(
      `[RabbitMQ Consumer Alert] Insufficient Liquidity: Fund=${payload?.data?.fundName || 'N/A'}, Deficit=₱${payload?.data?.deficit || 0}`,
    );
  }

  /**
   * Synchronous RPC health check pattern
   */
  @MessagePattern('financial.health.ping')
  handleHealthPing(@Payload() data: any) {
    return {
      status: 'OK',
      broker: 'RabbitMQ',
      timestamp: new Date().toISOString(),
      echo: data,
    };
  }
}
