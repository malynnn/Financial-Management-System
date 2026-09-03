import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FundsService } from './funds.service';

describe('FundsService (Sprint 3: FMS-001 - FMS-011)', () => {
  let service: FundsService;
  let prisma: PrismaService;

  const mockFund = {
    id: 'fnd-union-1',
    name: 'Union Fund',
    code: 'UNF',
    description: 'Core operational fund',
    openingBalance: new Prisma.Decimal(500000),
    currentBalance: new Prisma.Decimal(500000),
    targetUtilization: new Prisma.Decimal(80),
    status: 'Active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    transactions: [],
  };

  const mockInactiveFund = {
    id: 'fnd-legal-1',
    name: 'Legal Defense Fund',
    code: 'LDF',
    description: 'Inactive legal fund',
    openingBalance: new Prisma.Decimal(95000),
    currentBalance: new Prisma.Decimal(95000),
    targetUtilization: new Prisma.Decimal(30),
    status: 'Inactive',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    transactions: [],
  };

  const mockPrismaService = {
    fund: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fundTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    disbursement: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('FMS-001: Maintain Fund Records', () => {
    it('should successfully create a new fund with unique code and name', async () => {
      mockPrismaService.fund.count.mockResolvedValue(1);
      mockPrismaService.fund.findFirst.mockResolvedValue(null);
      mockPrismaService.fund.create.mockResolvedValue(mockFund);
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fund.update.mockResolvedValue(mockFund);
      mockPrismaService.disbursement.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.createFund({
        name: 'Union Fund',
        code: 'UNF',
        description: 'Core operational fund',
        openingBalance: 500000,
        targetUtilization: 80,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Union Fund');
      expect(result.code).toBe('UNF');
      expect(mockPrismaService.fund.create).toHaveBeenCalled();
    });

    it('should reject fund creation when fund name already exists (ConflictException)', async () => {
      mockPrismaService.fund.count.mockResolvedValue(1);
      mockPrismaService.fund.findFirst.mockResolvedValueOnce(mockFund);

      await expect(
        service.createFund({
          name: 'Union Fund',
          code: 'NEW',
          openingBalance: 100000,
          targetUtilization: 75,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject fund creation when fund code already exists (ConflictException)', async () => {
      mockPrismaService.fund.count.mockResolvedValue(1);
      mockPrismaService.fund.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFund);

      await expect(
        service.createFund({
          name: 'Different Name',
          code: 'UNF',
          openingBalance: 100000,
          targetUtilization: 75,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should edit fund configuration successfully', async () => {
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fund.findFirst.mockResolvedValue(null);
      mockPrismaService.fund.update.mockResolvedValue({
        ...mockFund,
        targetUtilization: new Prisma.Decimal(85),
      });
      mockPrismaService.disbursement.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.updateFund('fnd-union-1', {
        targetUtilization: 85,
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.fund.update).toHaveBeenCalled();
    });

    it('should activate/deactivate a fund (toggle status)', async () => {
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fund.update.mockResolvedValue({
        ...mockFund,
        status: 'Inactive',
      });
      mockPrismaService.disbursement.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.toggleFundStatus('fnd-union-1', {
        status: 'Inactive',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.fund.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fnd-union-1' },
          data: { status: 'Inactive' },
        }),
      );
    });
  });

  describe('FMS-005: Validate Fund Assignments', () => {
    it('should validate and return an active fund', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);

      const result = await service.validateFundAssignment('UNF');
      expect(result).toBeDefined();
      expect(result.id).toBe('fnd-union-1');
      expect(result.status).toBe('Active');
    });

    it('should reject a transaction when assigned fund does not exist (NotFoundException)', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(null);

      await expect(
        service.validateFundAssignment('NON_EXISTENT_FUND'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject a transaction when assigned fund is Inactive (BadRequestException)', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockInactiveFund);

      await expect(
        service.validateFundAssignment('LDF'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('FMS-003: Retrieve and Calculate Fund Balances', () => {
    it('should calculate fund balance using opening balance and posted transactions', async () => {
      const fundWithTx = {
        ...mockFund,
        openingBalance: new Prisma.Decimal(500000),
        transactions: [
          {
            transactionType: 'Opening Balance',
            amount: new Prisma.Decimal(500000),
            status: 'Posted',
            referenceType: 'OPENING_BALANCE',
          },
          {
            transactionType: 'Inflow (Collection)',
            amount: new Prisma.Decimal(50000),
            status: 'Posted',
            referenceType: 'COLLECTION',
          },
          {
            transactionType: 'Outflow (Disbursement)',
            amount: new Prisma.Decimal(20000),
            status: 'Posted',
            referenceType: 'DISBURSEMENT',
          },
        ],
      };

      mockPrismaService.fund.findUnique.mockResolvedValue(fundWithTx);

      const balance = await service.calculateFundBalance('fnd-union-1');
      expect(balance).toBe(530000);
    });

    it('should provide fund financial summary report for a date period', async () => {
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fund.update.mockResolvedValue(mockFund);
      mockPrismaService.disbursement.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(10000) } });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(20000) } });

      mockPrismaService.fundTransaction.findMany.mockResolvedValue([
        {
          transactionType: 'Inflow (Collection)',
          amount: new Prisma.Decimal(100000),
          status: 'Posted',
        },
        {
          transactionType: 'Outflow (Disbursement)',
          amount: new Prisma.Decimal(40000),
          status: 'Posted',
        },
      ]);

      const summary = await service.getFundFinancialSummary('fnd-union-1', {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });

      expect(summary).toBeDefined();
      expect(summary.summary.inflows).toBe(100000);
      expect(summary.summary.outflows).toBe(40000);
      expect(summary.summary.netFlow).toBe(60000);
    });
  });

  describe('FMS-004: Receive Posted Collections & Disbursements', () => {
    it('should record a posted transaction only for active funds', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);
      mockPrismaService.fundTransaction.create.mockResolvedValue({
        id: 'tx-1',
        fundId: mockFund.id,
        transactionRef: 'CR-2026-0001',
        transactionType: 'Inflow (Collection)',
        amount: new Prisma.Decimal(15000),
        status: 'Posted',
        referenceType: 'COLLECTION',
        date: new Date(),
      });
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fund.update.mockResolvedValue(mockFund);
      mockPrismaService.disbursement.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.recordPostedTransaction({
        fundIdOrName: 'Union Fund',
        transactionRef: 'CR-2026-0001',
        transactionType: 'Inflow (Collection)',
        amount: 15000,
        referenceType: 'COLLECTION',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.fundTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'Posted',
            transactionRef: 'CR-2026-0001',
          }),
        }),
      );
    });
  });

  describe('FMS-002: Fund Transaction Ledger', () => {
    it('should retrieve paginated fund transaction ledger with assigned fund metadata', async () => {
      mockPrismaService.fund.count.mockResolvedValue(1);
      mockPrismaService.fundTransaction.count.mockResolvedValue(1);
      mockPrismaService.fundTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          fundId: 'fnd-union-1',
          transactionRef: 'TXN-5001',
          transactionType: 'Inflow (Collection)',
          amount: new Prisma.Decimal(5000),
          status: 'Posted',
          date: new Date('2026-09-01'),
          description: 'Member dues collection',
          fund: { id: 'fnd-union-1', name: 'Union Fund', code: 'UNF' },
        },
      ]);

      const ledger = await service.getFundTransactionsLedger({ page: 1, limit: 10 });
      expect(ledger.data).toHaveLength(1);
      expect(ledger.data[0].fundName).toBe('Union Fund');
      expect(ledger.data[0].fundCode).toBe('UNF');
      expect(ledger.data[0].amount).toBe(5000);
    });
  });

  describe('FMS-006: Update Fund Balances on Posted Transactions', () => {
    it('should increase fund balance for inflow transactions', async () => {
      mockPrismaService.fund.findUnique.mockResolvedValue(mockFund);
      mockPrismaService.fund.update.mockResolvedValue({
        ...mockFund,
        currentBalance: new Prisma.Decimal(550000),
      });

      const result = await service.updateFundBalanceOnTransaction(
        'fnd-union-1',
        'Inflow (Collection)',
        50000,
      );

      expect(result.previousBalance).toBe(500000);
      expect(result.newBalance).toBe(550000);
      expect(mockPrismaService.fund.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentBalance: 550000 },
        }),
      );
    });

    it('should decrease fund balance for outflow transactions', async () => {
      mockPrismaService.fund.findUnique.mockResolvedValue(mockFund);
      mockPrismaService.fund.update.mockResolvedValue({
        ...mockFund,
        currentBalance: new Prisma.Decimal(475000),
      });

      const result = await service.updateFundBalanceOnTransaction(
        'fnd-union-1',
        'Outflow (Disbursement)',
        25000,
      );

      expect(result.previousBalance).toBe(500000);
      expect(result.newBalance).toBe(475000);
      expect(mockPrismaService.fund.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentBalance: 475000 },
        }),
      );
    });
  });

  describe('FMS-007: Calculate Fund Utilization', () => {
    it('should accurately calculate fund utilization percentage against posted outflows', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(125000) },
      });
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [
          {
            transactionType: 'Opening Balance',
            amount: new Prisma.Decimal(500000),
            status: 'Posted',
            referenceType: 'OPENING_BALANCE',
          },
          {
            transactionType: 'Outflow (Disbursement)',
            amount: new Prisma.Decimal(125000),
            status: 'Posted',
          },
        ],
      });

      const result = await service.calculateFundUtilization('UNF');
      expect(result).toBeDefined();
      expect(result.fundCode).toBe('UNF');
      expect(result.totalPostedOutflows).toBe(125000);
      expect(result.utilizationPercentage).toBeGreaterThan(0);
      expect(result.status).toBeDefined();
    });
  });

  describe('FMS-008: Check Fund Availability', () => {
    it('should confirm sufficient liquidity when balance is greater than required amount', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });

      const result = await service.checkFundAvailability({
        fundIdentifier: 'General Fund',
        requiredAmount: 50000,
      });

      expect(result.isSufficient).toBe(true);
      expect(result.deficit).toBe(0);
      expect(result.status).toBe('SUFFICIENT_FUNDS');
    });

    it('should identify fund as insufficient and calculate exact deficit when required amount exceeds balance', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue({
        ...mockFund,
        openingBalance: new Prisma.Decimal(20000),
        currentBalance: new Prisma.Decimal(20000),
      });
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        openingBalance: new Prisma.Decimal(20000),
        currentBalance: new Prisma.Decimal(20000),
        transactions: [],
      });

      const result = await service.checkFundAvailability({
        fundIdentifier: 'UNF',
        requiredAmount: 75000,
      });

      expect(result.isSufficient).toBe(false);
      expect(result.deficit).toBe(55000);
      expect(result.status).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('FMS-009: Maintain Fund Transaction History', () => {
    it('should retrieve full transaction history with metadata', async () => {
      mockPrismaService.fundTransaction.count.mockResolvedValue(1);
      mockPrismaService.fundTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          transactionRef: 'PAY-991001',
          fundId: 'fnd-union-1',
          fund: { id: 'fnd-union-1', name: 'Union Fund', code: 'UNF' },
          amount: new Prisma.Decimal(12000),
          transactionType: 'Outflow (Disbursement)',
          date: new Date('2026-09-01'),
          status: 'Posted',
          referenceType: 'DISBURSEMENT',
          referenceId: 'disb-1',
          description: 'Emergency loan disbursement',
          createdAt: new Date('2026-09-01'),
        },
      ]);

      const result = await service.getFundTransactionHistory();
      expect(result.history).toHaveLength(1);
      expect(result.history[0].transactionRef).toBe('PAY-991001');
      expect(result.history[0].fundCode).toBe('UNF');
    });
  });

  describe('FMS-010: Prevent Unauthorized Fund Balance Changes', () => {
    it('should allow authorized balance adjustment by Admin or Treasurer', async () => {
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);
      mockPrismaService.fund.findUnique.mockResolvedValue(mockFund);
      mockPrismaService.fundTransaction.create.mockResolvedValue({
        id: 'adj-1',
        transactionRef: 'ADJ-UNF-000001',
        transactionType: 'Authorized Adjustment (Increase)',
        amount: new Prisma.Decimal(25000),
        date: new Date(),
      });
      mockPrismaService.fund.update.mockResolvedValue({
        ...mockFund,
        currentBalance: new Prisma.Decimal(525000),
      });

      const result = await service.processAuthorizedAdjustment({
        fundIdentifier: 'UNF',
        amount: 25000,
        adjustmentType: 'INCREASE',
        reason: 'Board-approved subsidy addition',
        actorRole: 'ADMIN',
        actorName: 'System Administrator',
      });

      expect(result.success).toBe(true);
      expect(result.transaction.amount).toBe(25000);
      expect(mockPrismaService.fundTransaction.create).toHaveBeenCalled();
    });

    it('should reject unauthorized balance adjustment attempt (ForbiddenException)', async () => {
      await expect(
        service.processAuthorizedAdjustment({
          fundIdentifier: 'UNF',
          amount: 25000,
          adjustmentType: 'INCREASE',
          reason: 'Unauthorized attempt',
          actorRole: 'MEMBER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FMS-011: Prepare Validated Fund Data for AI Forecasting', () => {
    it('should provide forecasting dataset containing only validated funds and posted transactions', async () => {
      mockPrismaService.fund.count.mockResolvedValue(1);
      mockPrismaService.fund.findMany.mockResolvedValue([mockFund]);
      mockPrismaService.fundTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          transactionRef: 'CR-2026-0001',
          fundId: 'fnd-union-1',
          fund: { id: 'fnd-union-1', name: 'Union Fund', code: 'UNF' },
          amount: new Prisma.Decimal(30000),
          transactionType: 'Inflow (Collection)',
          date: new Date('2026-08-15'),
          status: 'Posted',
        },
        {
          id: 'tx-2',
          transactionRef: 'PAY-2026-0002',
          fundId: 'fnd-union-1',
          fund: { id: 'fnd-union-1', name: 'Union Fund', code: 'UNF' },
          amount: new Prisma.Decimal(10000),
          transactionType: 'Outflow (Disbursement)',
          date: new Date('2026-08-20'),
          status: 'Posted',
        },
      ]);
      mockPrismaService.fund.findFirst.mockResolvedValue(mockFund);
      mockPrismaService.fund.findUnique.mockResolvedValue({
        ...mockFund,
        transactions: [],
      });
      mockPrismaService.fundTransaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(10000) } });

      const forecastingData = await service.getForecastingReadyData();

      expect(forecastingData).toBeDefined();
      expect(forecastingData.metadata.filterCriteria.enforceStatus).toBe('POSTED_ONLY_VALIDATED');
      expect(forecastingData.historicalTimeSeries).toHaveLength(1);
      expect(forecastingData.historicalTimeSeries[0].inflows).toBe(30000);
      expect(forecastingData.historicalTimeSeries[0].outflows).toBe(10000);
      expect(forecastingData.historicalTimeSeries[0].netFlow).toBe(20000);
      expect(forecastingData.validatedFunds).toHaveLength(1);
    });
  });
});
