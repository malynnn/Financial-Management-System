import { Injectable, Logger, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LifespanService {
  private readonly logger = new Logger(LifespanService.name);

  constructor(
    private readonly fundsService: FundsService,
    private readonly prisma: PrismaService,
  ) {}

  private getPythonScriptPath(): string {
    return path.join(__dirname, 'lifespan_engine.py');
  }

  /**
   * Predicts lifespan for a specific fund or all funds using Pandas engine.
   */
  async predictLifespan(fundCode: string, horizon: number = 12, save: boolean = false) {
    const code = fundCode ? fundCode.toUpperCase() : 'ALL';
    
    // Uses the same data retrieval logic that returns validated funds and posted transactions
    const validatedData = await this.fundsService.getForecastingReadyData();

    let targetFundId = '';
    if (code !== 'ALL') {
      const fund = validatedData.validatedFunds.find((f) => f.code === code);
      if (!fund && !['UNF', 'GEN', 'DAF', 'FAF', 'LNF'].includes(code)) {
        throw new BadRequestException(`Fund code '${code}' not found in active funds from Fund Master.`);
      }
      if (fund) targetFundId = fund.id;
    }

    try {
      const result = await this.executePythonEngine(validatedData, code, horizon);

      // AI-FLP-015, 017, 018: Store predictions, create alerts, log audits
      if (save) {
        if (code !== 'ALL' && result.predictions && result.predictions[code]) {
          await this.savePredictionAndLog(result.predictions[code], targetFundId);
        } else if (code === 'ALL' && result.predictions) {
          for (const key of Object.keys(result.predictions)) {
            const fund = validatedData.validatedFunds.find((f) => f.code === key);
            if (fund) {
               await this.savePredictionAndLog(result.predictions[key], fund.id);
            }
          }
        }
      } else {
         // Even if not saving prediction, log the audit trail (AI-FLP-018)
         if (code !== 'ALL') {
            await this.logAudit(code, result.predictions && result.predictions[code] && result.predictions[code].isSufficient ? 'SUCCESS' : 'INSUFFICIENT_DATA');
         } else {
            await this.logAudit('ALL', 'SUCCESS');
         }
      }

      if (code !== 'ALL') {
        if (result.predictions && result.predictions[code]) {
          return result.predictions[code];
        }
        if (result.errors && result.errors[code]) {
          throw new BadRequestException(result.errors[code].error);
        }
        throw new NotFoundException(`Lifespan prediction not generated for fund '${code}'.`);
      }

      return result;
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Lifespan prediction failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to process lifespan prediction.');
    }
  }

  private executePythonEngine(inputData: any, fundCode: string, horizon: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonExecutable = process.platform === 'win32' ? 'py' : 'python3';
      const scriptPath = this.getPythonScriptPath();
      const args = [scriptPath, '--fund', fundCode, '--horizon', horizon.toString()];

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
            `Failed to start Python lifespan engine: ${err.message}`,
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
                'Invalid response payload returned by Python lifespan engine.',
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
            parsedError?.error || stderrData || `Lifespan engine failed with exit code ${code}`;
          reject(new BadRequestException(errorMsg));
        }
      });

      child.stdin.write(JSON.stringify(inputData));
      child.stdin.end();
    });
  }

  private async savePredictionAndLog(prediction: any, fundId: string) {
    if (!prediction.isSufficient) {
      await this.logAudit(prediction.fundCode, 'INSUFFICIENT_DATA');
      return;
    }

    try {
      const saved = await this.prisma.lifespanPrediction.create({
        data: {
          fundId,
          fundCode: prediction.fundCode,
          historicalPeriodsUsed: prediction.periodsCount,
          startingBalance: prediction.currentBalance,
          averageNetMovement: prediction.averageNetMovement,
          depletionRate: prediction.depletionRate,
          estimatedLifespanMonths: prediction.estimatedLifespanMonths,
          projectedDepletionDate: prediction.projectedDepletionDate,
          fundCondition: prediction.fundCondition,
          confidenceLevel: prediction.confidenceLevel,
        },
      });

      // AI-FLP-017: Create alert if At Risk or Projected to Deplete
      if (prediction.fundCondition === 'At Risk' || prediction.fundCondition === 'Projected to Deplete') {
        await this.prisma.lifespanAlert.create({
          data: {
            predictionId: saved.id,
            fundCode: prediction.fundCode,
            alertLevel: prediction.fundCondition === 'Projected to Deplete' ? 'CRITICAL' : 'WARNING',
            message: `Fund ${prediction.fundCode} is ${prediction.fundCondition}. Depletion estimated in ${prediction.estimatedLifespanMonths} months.`,
          },
        });
      }

      await this.logAudit(prediction.fundCode, 'SUCCESS', prediction.periodsCount.toString());
    } catch (e) {
      this.logger.error(`Failed to save prediction to DB: ${e.message}`);
    }
  }

  private async logAudit(fundCode: string, status: string, sourceDataPeriod: string = 'N/A') {
    try {
      await this.prisma.lifespanAuditLog.create({
        data: {
          action: 'GENERATE_PREDICTION',
          fundCode,
          modelVersion: '1.0.0',
          sourceDataPeriod,
          predictionStatus: status,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to create audit log: ${e.message}`);
    }
  }
}
