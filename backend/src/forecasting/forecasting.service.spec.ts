import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForecastingService } from './forecasting.service';

describe('ForecastingService (Sprint 4: FAI-001 - FAI-012)', () => {
  let service: ForecastingService;
  let fundsService: FundsService;
  let prismaService: any;

  const mockForecastingData = {
    generatedAt: new Date().toISOString(),
    metadata: {
      filterCriteria: { fundId: 'ALL_ACTIVE_FUNDS' },
      activeFundsCount: 5,
      totalPostedTransactionsAnalyzed: 30,
    },
    validatedFunds: [
      { id: 'fnd-union-01', name: 'Union Fund', code: 'UNF', validatedBalance: 500000, targetUtilization: 80, currentUtilization: 45, status: 'Active' },
      { id: 'fnd-general-01', name: 'General Fund', code: 'GEN', validatedBalance: 250000, targetUtilization: 75, currentUtilization: 60, status: 'Active' },
      { id: 'fnd-death-01', name: 'Death Assistance Fund', code: 'DAF', validatedBalance: 150000, targetUtilization: 50, currentUtilization: 30, status: 'Active' },
      { id: 'fnd-foreign-01', name: 'Foreign Assistance Fund', code: 'FAF', validatedBalance: 80000, targetUtilization: 40, currentUtilization: 20, status: 'Active' },
      { id: 'fnd-loan-01', name: 'Loan Fund', code: 'LNF', validatedBalance: 850000, targetUtilization: 90, currentUtilization: 70, status: 'Active' },
    ],
    historicalTimeSeries: [],
    rawValidatedTransactions: [
      // UNF (4 periods: 2026-05, 2026-06, 2026-07, 2026-08)
      { ref: 'TX-UNF-01', fundCode: 'UNF', fundName: 'Union Fund', amount: 40000, type: 'Inflow', date: '2026-05-10', status: 'Posted' },
      { ref: 'TX-UNF-02', fundCode: 'UNF', fundName: 'Union Fund', amount: 15000, type: 'Outflow', date: '2026-05-20', status: 'Posted' },
      { ref: 'TX-UNF-03', fundCode: 'UNF', fundName: 'Union Fund', amount: 45000, type: 'Inflow', date: '2026-06-12', status: 'Posted' },
      { ref: 'TX-UNF-04', fundCode: 'UNF', fundName: 'Union Fund', amount: 20000, type: 'Outflow', date: '2026-06-25', status: 'Posted' },
      { ref: 'TX-UNF-05', fundCode: 'UNF', fundName: 'Union Fund', amount: 50000, type: 'Inflow', date: '2026-07-08', status: 'Posted' },
      { ref: 'TX-UNF-06', fundCode: 'UNF', fundName: 'Union Fund', amount: 18000, type: 'Outflow', date: '2026-07-22', status: 'Posted' },
      { ref: 'TX-UNF-07', fundCode: 'UNF', fundName: 'Union Fund', amount: 55000, type: 'Inflow', date: '2026-08-15', status: 'Posted' },
      { ref: 'TX-UNF-08', fundCode: 'UNF', fundName: 'Union Fund', amount: 22000, type: 'Outflow', date: '2026-08-28', status: 'Posted' },

      // GEN (4 periods: 2026-05, 2026-06, 2026-07, 2026-08)
      { ref: 'TX-GEN-01', fundCode: 'GEN', fundName: 'General Fund', amount: 30000, type: 'Inflow', date: '2026-05-05', status: 'Posted' },
      { ref: 'TX-GEN-02', fundCode: 'GEN', fundName: 'General Fund', amount: 25000, type: 'Outflow', date: '2026-05-18', status: 'Posted' },
      { ref: 'TX-GEN-03', fundCode: 'GEN', fundName: 'General Fund', amount: 32000, type: 'Inflow', date: '2026-06-10', status: 'Posted' },
      { ref: 'TX-GEN-04', fundCode: 'GEN', fundName: 'General Fund', amount: 28000, type: 'Outflow', date: '2026-06-20', status: 'Posted' },
      { ref: 'TX-GEN-05', fundCode: 'GEN', fundName: 'General Fund', amount: 29000, type: 'Inflow', date: '2026-07-07', status: 'Posted' },
      { ref: 'TX-GEN-06', fundCode: 'GEN', fundName: 'General Fund', amount: 27000, type: 'Outflow', date: '2026-07-19', status: 'Posted' },
      { ref: 'TX-GEN-07', fundCode: 'GEN', fundName: 'General Fund', amount: 35000, type: 'Inflow', date: '2026-08-12', status: 'Posted' },
      { ref: 'TX-GEN-08', fundCode: 'GEN', fundName: 'General Fund', amount: 30000, type: 'Outflow', date: '2026-08-25', status: 'Posted' },

      // DAF (3 periods: 2026-06, 2026-07, 2026-08)
      { ref: 'TX-DAF-01', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 20000, type: 'Inflow', date: '2026-06-15', status: 'Posted' },
      { ref: 'TX-DAF-02', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 8000, type: 'Outflow', date: '2026-06-28', status: 'Posted' },
      { ref: 'TX-DAF-03', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 22000, type: 'Inflow', date: '2026-07-14', status: 'Posted' },
      { ref: 'TX-DAF-04', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 10000, type: 'Outflow', date: '2026-07-27', status: 'Posted' },
      { ref: 'TX-DAF-05', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 25000, type: 'Inflow', date: '2026-08-16', status: 'Posted' },
      { ref: 'TX-DAF-06', fundCode: 'DAF', fundName: 'Death Assistance Fund', amount: 12000, type: 'Outflow', date: '2026-08-29', status: 'Posted' },

      // FAF (3 periods: 2026-06, 2026-07, 2026-08)
      { ref: 'TX-FAF-01', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 15000, type: 'Inflow', date: '2026-06-05', status: 'Posted' },
      { ref: 'TX-FAF-02', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 5000, type: 'Outflow', date: '2026-06-21', status: 'Posted' },
      { ref: 'TX-FAF-03', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 16000, type: 'Inflow', date: '2026-07-06', status: 'Posted' },
      { ref: 'TX-FAF-04', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 6000, type: 'Outflow', date: '2026-07-20', status: 'Posted' },
      { ref: 'TX-FAF-05', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 18000, type: 'Inflow', date: '2026-08-10', status: 'Posted' },
      { ref: 'TX-FAF-06', fundCode: 'FAF', fundName: 'Foreign Assistance Fund', amount: 7000, type: 'Outflow', date: '2026-08-26', status: 'Posted' },

      // LNF (3 periods: 2026-06, 2026-07, 2026-08)
      { ref: 'TX-LNF-01', fundCode: 'LNF', fundName: 'Loan Fund', amount: 80000, type: 'Inflow', date: '2026-06-08', status: 'Posted' },
      { ref: 'TX-LNF-02', fundCode: 'LNF', fundName: 'Loan Fund', amount: 50000, type: 'Outflow', date: '2026-06-24', status: 'Posted' },
      { ref: 'TX-LNF-03', fundCode: 'LNF', fundName: 'Loan Fund', amount: 85000, type: 'Inflow', date: '2026-07-11', status: 'Posted' },
      { ref: 'TX-LNF-04', fundCode: 'LNF', fundName: 'Loan Fund', amount: 55000, type: 'Outflow', date: '2026-07-25', status: 'Posted' },
      { ref: 'TX-LNF-05', fundCode: 'LNF', fundName: 'Loan Fund', amount: 90000, type: 'Inflow', date: '2026-08-14', status: 'Posted' },
      { ref: 'TX-LNF-06', fundCode: 'LNF', fundName: 'Loan Fund', amount: 60000, type: 'Outflow', date: '2026-08-27', status: 'Posted' },
    ],
  };

  const mockFundsService = {
    getForecastingReadyData: jest.fn().mockResolvedValue(mockForecastingData),
  };

  const mockPrismaService = {
    forecastRecord: {
      createMany: jest.fn().mockResolvedValue({ count: 12 }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'fc-1',
          batchId: 'BATCH-TEST-1',
          fundId: 'fnd-union-01',
          fundCode: 'UNF',
          fundName: 'Union Fund',
          forecastPeriod: '2026-09',
          forecastValue: 528500,
          projectedInflow: 48934,
          projectedOutflow: 18523,
          projectedNet: 30411,
          baselineBalance: 500000,
          trendDirection: 'UPWARD',
          isValid: true,
          generationDate: new Date('2026-09-01T00:00:00Z'),
          fund: { id: 'fnd-union-01', name: 'Union Fund', code: 'UNF' },
        },
      ]),
      findFirst: jest.fn().mockResolvedValue({
        batchId: 'BATCH-TEST-1',
        generationDate: new Date('2026-09-01T00:00:00Z'),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastingService,
        { provide: FundsService, useValue: mockFundsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ForecastingService>(ForecastingService);
    fundsService = module.get<FundsService>(FundsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FAI-001 through FAI-006: Core Forecast Processors', () => {
    it('should generate a valid forecast for Union Fund (FAI-004)', async () => {
      const forecast = await service.getFundForecast('UNF', 4);
      expect(forecast.fundCode).toBe('UNF');
      expect(forecast.taskReference).toBe('FAI-004');
    }, 15000);

    it('should generate a valid forecast for General Fund (FAI-005)', async () => {
      const forecast = await service.getFundForecast('GEN', 4);
      expect(forecast.fundCode).toBe('GEN');
      expect(forecast.taskReference).toBe('FAI-005');
    }, 15000);

    it('should generate a valid forecast for Death Assistance Fund (FAI-006)', async () => {
      const forecast = await service.getFundForecast('DAF', 4);
      expect(forecast.fundCode).toBe('DAF');
      expect(forecast.taskReference).toBe('FAI-006');
    }, 15000);
  });

  describe('FAI-007: Foreign Assistance Fund Forecasting', () => {
    it('should generate a valid forecast for Foreign Assistance Fund when sufficient data exists', async () => {
      const forecast = await service.getFundForecast('FAF', 4);

      expect(forecast).toBeDefined();
      expect(forecast.fundCode).toBe('FAF');
      expect(forecast.fundName).toBe('Foreign Assistance Fund');
      expect(forecast.baselineBalance).toBe(80000);
      expect(forecast.projectedBalance).toBeGreaterThan(0);
      expect(forecast.taskReference).toBe('FAI-007');
    }, 15000);
  });

  describe('FAI-008: Loan Fund Forecasting', () => {
    it('should generate a valid forecast for Loan Fund when sufficient data exists', async () => {
      const forecast = await service.getFundForecast('LNF', 4);

      expect(forecast).toBeDefined();
      expect(forecast.fundCode).toBe('LNF');
      expect(forecast.fundName).toBe('Loan Fund');
      expect(forecast.baselineBalance).toBe(850000);
      expect(forecast.projectedBalance).toBeGreaterThan(0);
      expect(forecast.taskReference).toBe('FAI-008');
    }, 15000);
  });

  describe('FAI-009: Dynamic Configured Funds without Code Changes', () => {
    it('should dynamically retrieve and evaluate active funds from Fund Master', async () => {
      const readiness = await service.getForecastingReadiness();
      expect(readiness.targetFundsCount).toBe(5);
      const codes = readiness.targetFunds.map((f) => f.fundCode);
      expect(codes).toContain('UNF');
      expect(codes).toContain('GEN');
      expect(codes).toContain('DAF');
      expect(codes).toContain('FAF');
      expect(codes).toContain('LNF');
    });

    it('should run forecast for all active funds dynamically', async () => {
      const result = await service.generateForecast({ fundCode: 'ALL', horizonMonths: 4 });
      expect(result.success).toBe(true);
      expect(result.processedFundsCount).toBe(5);
      expect(result.forecasts.FAF).toBeDefined();
      expect(result.forecasts.LNF).toBeDefined();
    }, 20000);
  });

  describe('FAI-010: Selected Valid Forecast Periods', () => {
    it('should generate forecast values strictly for the selected forecast periods', async () => {
      const targetPeriods = ['2026-09', '2026-10'];
      const result = await service.generateForecast({
        fundCode: 'UNF',
        targetPeriods,
      });

      const unfForecast = result.forecasts.UNF;
      expect(unfForecast.selectedPeriods).toEqual(targetPeriods);
      const projectedSeries = unfForecast.timeSeries.filter((p: any) => p.isProjected);
      expect(projectedSeries).toHaveLength(2);
      expect(projectedSeries.map((p: any) => p.period)).toEqual(targetPeriods);
    }, 15000);
  });

  describe('FAI-011: Store Forecast Results', () => {
    it('should store forecast records with fund, period, value, and generation date into database', async () => {
      await service.generateForecast({ fundCode: 'ALL', horizonMonths: 4, persistResults: true });
      expect(prismaService.forecastRecord.createMany).toHaveBeenCalled();
      const callArg = prismaService.forecastRecord.createMany.mock.calls[0][0];
      expect(callArg.data.length).toBeGreaterThan(0);
      const sample = callArg.data[0];
      expect(sample).toHaveProperty('fundId');
      expect(sample).toHaveProperty('fundCode');
      expect(sample).toHaveProperty('forecastPeriod');
      expect(sample).toHaveProperty('forecastValue');
      expect(sample).toHaveProperty('generationDate');
      expect(sample.isValid).toBe(true);
    }, 20000);
  });

  describe('FAI-012: Provide Forecasting Results to Interactive Dashboard', () => {
    it('should retrieve only valid stored forecast records for the dashboard', async () => {
      const stored = await service.getStoredForecasts('UNF');
      expect(prismaService.forecastRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isValid: true, fundCode: 'UNF' }),
        }),
      );
      expect(stored.records.length).toBeGreaterThan(0);
    });

    it('should return latest dashboard forecast dataset from stored database batch', async () => {
      const dashboardData = await service.getLatestDashboardForecastData('ALL');
      expect(dashboardData.success).toBe(true);
      expect(dashboardData.source).toContain('STORED_FORECAST_DATABASE');
      expect(dashboardData.forecasts.UNF).toBeDefined();
    });
  });
});
