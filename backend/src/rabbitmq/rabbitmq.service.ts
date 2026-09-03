import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { FINANCIAL_PATTERNS, RABBITMQ_SERVICE } from './rabbitmq.constants';

export interface FinancialEventPayload<T = any> {
  eventId: string;
  eventType: string;
  timestamp: string;
  actor?: string;
  data: T;
}

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(
    @Optional()
    @Inject(RABBITMQ_SERVICE)
    private readonly client?: ClientProxy,
  ) {}

  /**
   * Publishes an asynchronous event to RabbitMQ
   */
  async publishEvent<T = any>(pattern: string, data: T, actor = 'System'): Promise<boolean> {
    const payload: FinancialEventPayload<T> = {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      eventType: pattern,
      timestamp: new Date().toISOString(),
      actor,
      data,
    };

    if (!this.client) {
      this.logger.debug(`[Local/Offline] Event "${pattern}" emitted in memory: ${JSON.stringify(payload.data)}`);
      return true;
    }

    try {
      this.client.emit(pattern, payload);
      this.logger.log(`[RabbitMQ Event Published] ${pattern} (Event ID: ${payload.eventId})`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to publish RabbitMQ event "${pattern}": ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Sends a synchronous RPC message via RabbitMQ and awaits response
   */
  async sendRpcMessage<TResult = any, TInput = any>(
    pattern: string,
    data: TInput,
    timeoutMs = 5000,
  ): Promise<TResult | null> {
    if (!this.client) {
      this.logger.warn(`RabbitMQ client unavailable for RPC pattern "${pattern}".`);
      return null;
    }

    try {
      const response$ = this.client.send<TResult, TInput>(pattern, data).pipe(timeout(timeoutMs));
      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.warn(`RPC message for "${pattern}" failed: ${(error as Error).message}`);
      return null;
    }
  }

  // --- Convenience Financial Event Producers ---

  async emitCollectionPosted(collectionData: any, actor?: string) {
    return this.publishEvent(FINANCIAL_PATTERNS.COLLECTION_POSTED, collectionData, actor);
  }

  async emitDisbursementExecuted(disbursementData: any, actor?: string) {
    return this.publishEvent(FINANCIAL_PATTERNS.DISBURSEMENT_EXECUTED, disbursementData, actor);
  }

  async emitFundBalanceChanged(fundData: any, actor?: string) {
    return this.publishEvent(FINANCIAL_PATTERNS.FUND_BALANCE_CHANGED, fundData, actor);
  }

  async emitFundInsufficientAlert(alertData: any, actor?: string) {
    return this.publishEvent(FINANCIAL_PATTERNS.FUND_INSUFFICIENT_ALERT, alertData, actor);
  }

  async emitFundUtilizationWarning(utilizationData: any, actor?: string) {
    return this.publishEvent(FINANCIAL_PATTERNS.FUND_UTILIZATION_WARNING, utilizationData, actor);
  }
}
