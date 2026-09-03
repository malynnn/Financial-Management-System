import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateForecastDto } from './dto/generate-forecast.dto';

@Injectable()
export class ForecastingService {
  private readonly logger = new Logger(ForecastingService.name);

  private getPythonScriptPath(): string {
    const candidates = [
      path.resolve(__dirname, 'forecasting_engine.py'),
      path.resolve(process.cwd(), 'src/forecasting/forecasting_engine.py'),
      path.resolve(__dirname, '../../src/forecasting/forecasting_engine.py'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return candidates[0];
  }

  constructor(
    private readonly fundsService: FundsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * FAI-001 through FAI-011: Generate AI Forecast using Pandas DataFrames engine,
   * with optional database persistence.
   */
  async generateForecast(dto: GenerateForecastDto) {
    const fundCode = (dto.fundCode || 'ALL').toUpperCase();
    const horizon = dto.horizonMonths || 4;
    const targetPeriods = dto.targetPeriods;

    // FAI-001: Retrieve validated balances & posted transactions from Fund Management Module
    const validatedData = await this.fundsService.getForecastingReadyData();

    // Execute Python Pandas Forecasting Engine (FAI-002 through FAI-010)
    const forecastResult = await this.executePythonEngine(
      validatedData,
      fundCode,
      horizon,
      targetPeriods,
    );

    // FAI-011: Automatically persist generated forecast results to database
    if (dto.persistResults !== false && forecastResult?.storedForecastRecords?.length > 0) {
      const persisted = await this.storeForecastResults(forecastResult);
      forecastResult.storage = persisted;
    }

    return forecastResult;
  }

  /**
   * FAI-011: Store forecast results into database.
   * Rule: The system shall store the fund, forecast period, forecast value,
   * and generation date for each forecast result.
   */
  async storeForecastResults(forecastResult: any) {
    const records = forecastResult.storedForecastRecords || [];
    if (records.length === 0) {
      return { storedCount: 0, batchId: null };
    }

    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const generationDate = new Date();

    const dataToInsert = records.map((r: any) => ({
      batchId,
      fundId: r.fundId,
      fundCode: r.fundCode,
      fundName: r.fundName,
      forecastPeriod: r.forecastPeriod,
      forecastValue: new Prisma.Decimal(r.forecastValue),
      projectedInflow: new Prisma.Decimal(r.projectedInflow || 0),
      projectedOutflow: new Prisma.Decimal(r.projectedOutflow || 0),
      projectedNet: new Prisma.Decimal(r.projectedNet || 0),
      baselineBalance: new Prisma.Decimal(r.baselineBalance || 0),
      trendDirection: r.trendDirection || 'STABLE',
      isValid: true,
      generationDate,
    }));

    const result = await this.prisma.forecastRecord.createMany({
      data: dataToInsert,
    });

    this.logger.log(`FAI-011: Stored ${result.count} forecast records under Batch ${batchId}`);
    return {
      batchId,
      storedCount: result.count,
      generationDate: generationDate.toISOString(),
    };
  }

  /**
   * FAI-012: Provide forecasting results to the dashboard.
   * Rule: The system shall provide only valid stored forecast results to the Interactive Dashboard.
   */
  async getStoredForecasts(fundCode?: string, limit = 100) {
    const whereClause: Prisma.ForecastRecordWhereInput = {
      isValid: true, // Rule: ONLY valid stored forecast results
    };

    if (fundCode && fundCode !== 'ALL') {
      whereClause.fundCode = fundCode.toUpperCase();
    }

    const records = await this.prisma.forecastRecord.findMany({
      where: whereClause,
      orderBy: [{ generationDate: 'desc' }, { forecastPeriod: 'asc' }],
      take: limit,
      include: {
        fund: { select: { id: true, name: true, code: true, targetUtilization: true } },
      },
    });

    return {
      total: records.length,
      records: records.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        fundId: r.fundId,
        fundCode: r.fundCode,
        fundName: r.fundName,
        forecastPeriod: r.forecastPeriod,
        forecastValue: Number(r.forecastValue),
        projectedInflow: Number(r.projectedInflow),
        projectedOutflow: Number(r.projectedOutflow),
        projectedNet: Number(r.projectedNet),
        baselineBalance: Number(r.baselineBalance),
        trendDirection: r.trendDirection,
        isValid: r.isValid,
        generationDate: r.generationDate.toISOString(),
      })),
    };
  }

  /**
   * FAI-012: Retrieve the latest valid stored forecast batch formatted for Dashboard rendering.
   */
  async getLatestDashboardForecastData(fundCode?: string) {
    // Find the latest batchId that has valid records
    const latestRecord = await this.prisma.forecastRecord.findFirst({
      where: { isValid: true },
      orderBy: { generationDate: 'desc' },
      select: { batchId: true, generationDate: true },
    });

    const liveResult = await this.generateForecast({
      fundCode: fundCode || 'ALL',
      horizonMonths: 4,
      persistResults: !latestRecord,
    });

    if (latestRecord) {
      liveResult.batchId = latestRecord.batchId;
      liveResult.storedGenerationDate = latestRecord.generationDate.toISOString();
      liveResult.source = 'STORED_FORECAST_DATABASE (FAI-012)';
    }

    return liveResult;
  }

  /**
   * Retrieve AI Forecast for a single fund (FAI-004 to FAI-009).
   */
  async getFundForecast(fundCode: string, horizon = 4, targetPeriods?: string[]) {
    const code = (fundCode || '').toUpperCase();
    const validatedData = await this.fundsService.getForecastingReadyData();
    const fundExists = validatedData.validatedFunds.some((f) => f.code === code);

    if (!fundExists && !['UNF', 'GEN', 'DAF', 'FAF', 'LNF'].includes(code)) {
      throw new BadRequestException(
        `FAI-003: Fund code '${code}' not found in active funds from Fund Master.`,
      );
    }

    const result = await this.generateForecast({
      fundCode: code,
      horizonMonths: horizon,
      targetPeriods,
    });

    if (result.forecasts && result.forecasts[code]) {
      return result.forecasts[code];
    }

    if (result.errors && result.errors[code]) {
      throw new BadRequestException(result.errors[code].error);
    }

    throw new NotFoundException(`Forecast data not generated for fund '${code}'.`);
  }

  /**
   * FAI-009: Dynamically evaluate data readiness and sufficiency for ALL active funds from Fund Master
   * without requiring fund-specific code changes.
   */
  async getForecastingReadiness() {
    const validatedData = await this.fundsService.getForecastingReadyData();
    const activeFunds = validatedData.validatedFunds || [];

    // Group posted transactions by fundCode and month (YYYY-MM)
    const periodCounts: Record<string, Set<string>> = {};
    for (const f of activeFunds) {
      periodCounts[f.code.toUpperCase()] = new Set();
    }

    for (const tx of validatedData.rawValidatedTransactions) {
      const code = tx.fundCode.toUpperCase();
      if (!periodCounts[code]) {
        periodCounts[code] = new Set();
      }
      if (tx.date) {
        const period = tx.date.slice(0, 7);
        periodCounts[code].add(period);
      }
    }

    const taskMap: Record<string, string> = {
      UNF: 'FAI-004',
      GEN: 'FAI-005',
      DAF: 'FAI-006',
      FAF: 'FAI-007',
      LNF: 'FAI-008',
    };

    const readiness = activeFunds.map((fund) => {
      const code = fund.code.toUpperCase();
      const periodsCount = periodCounts[code]?.size || 0;
      const isSufficient = periodsCount >= 3;
      const taskReference = taskMap[code] || 'FAI-009';

      return {
        fundId: fund.id,
        fundCode: code,
        fundName: fund.name,
        taskReference,
        validatedBalance: fund.validatedBalance || 0,
        availablePeriods: periodsCount,
        requiredMinimumPeriods: 3,
        isSufficient,
        status: isSufficient ? 'READY_FOR_FORECAST' : 'INSUFFICIENT_HISTORICAL_DATA',
        message: isSufficient
          ? `Fund has ${periodsCount} valid periods. Ready for AI forecasting.`
          : `Fund has only ${periodsCount} period(s). Requires at least 3 distinct monthly periods.`,
      };
    });

    return {
      evaluatedAt: new Date().toISOString(),
      targetFundsCount: readiness.length,
      targetFunds: readiness,
    };
  }

  /**
   * Spawns Python process to run forecasting_engine.py with Pandas DataFrames.
   */
  private executePythonEngine(
    inputData: any,
    fundCode: string,
    horizon: number,
    targetPeriods?: string[],
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonExecutable = process.platform === 'win32' ? 'py' : 'python3';
      const scriptPath = this.getPythonScriptPath();
      const args = [scriptPath, '--fund', fundCode, '--horizon', String(horizon)];

      if (targetPeriods && targetPeriods.length > 0) {
        args.push('--periods', targetPeriods.join(','));
      }

      const child = spawn(pythonExecutable, args, {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString('utf-8');
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString('utf-8');
      });

      child.on('error', (err) => {
        this.logger.error(`Failed to launch Python engine: ${err.message}`);
        reject(
          new InternalServerErrorException(
            `Failed to start Python forecasting engine: ${err.message}`,
          ),
        );
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            resolve(parsed);
          } catch (e) {
            this.logger.error(`Failed to parse Python engine output: ${stdoutData}`);
            reject(
              new InternalServerErrorException(
                'Invalid response payload returned by Python forecasting engine.',
              ),
            );
          }
        } else {
          this.logger.warn(`Python engine exited with code ${code}: ${stderrData}`);
          let parsedError: any = null;
          try {
            parsedError = JSON.parse(stderrData.trim());
          } catch {
            // Not JSON formatted
          }

          const errorMsg =
            parsedError?.error || stderrData || `Forecasting engine failed with exit code ${code}`;
          reject(new BadRequestException(errorMsg));
        }
      });

      child.stdin.write(JSON.stringify(inputData));
      child.stdin.end();
    });
  }
}
