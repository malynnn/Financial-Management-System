import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizedBalanceAdjustmentDto } from './dto/authorized-balance-adjustment.dto';
import { CheckFundAvailabilityDto } from './dto/check-fund-availability.dto';
import { CreateFundDto } from './dto/create-fund.dto';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';
import { FundSummaryQueryDto } from './dto/fund-summary-query.dto';
import { QueryFundLedgerDto } from './dto/query-fund-ledger.dto';
import { ToggleFundStatusDto } from './dto/toggle-fund-status.dto';
import { UpdateFundDto } from './dto/update-fund.dto';

export const INITIAL_DEFAULT_FUNDS = [
  {
    name: 'Union Fund',
    code: 'UNF',
    description: 'Core operational fund for union activities.',
    openingBalance: 500000,
    targetUtilization: 80,
    status: 'Active',
  },
  {
    name: 'General Fund',
    code: 'GEN',
    description: 'Unrestricted assets for general management.',
    openingBalance: 250000,
    targetUtilization: 75,
    status: 'Active',
  },
  {
    name: 'Death Assistance Fund',
    code: 'DAF',
    description: 'Restricted fund for member bereavement support.',
    openingBalance: 150000,
    targetUtilization: 50,
    status: 'Active',
  },
  {
    name: 'Loan Fund',
    code: 'LNF',
    description: 'Revolving fund for member credit facilities.',
    openingBalance: 850000,
    targetUtilization: 90,
    status: 'Active',
  },
  {
    name: 'Calamity Fund',
    code: 'CAL',
    description: 'Emergency reserves for natural disasters.',
    openingBalance: 300000,
    targetUtilization: 60,
    status: 'Active',
  },
  {
    name: 'Legal Defense Fund',
    code: 'LDF',
    description: 'Retainer for union legal counsel.',
    openingBalance: 95000,
    targetUtilization: 30,
    status: 'Inactive',
  },
];

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure default funds exist in the database if unseeded.
   */
  async ensureSeedFunds() {
    const count = await this.prisma.fund.count();
    if (count === 0) {
      for (const def of INITIAL_DEFAULT_FUNDS) {
        const fund = await this.prisma.fund.create({
          data: {
            name: def.name,
            code: def.code,
            description: def.description,
            openingBalance: def.openingBalance,
            currentBalance: def.openingBalance,
            targetUtilization: def.targetUtilization,
            status: def.status,
          },
        });

        if (def.openingBalance > 0) {
          await this.prisma.fundTransaction.create({
            data: {
              fundId: fund.id,
              transactionRef: `OB-${fund.code}-${Date.now().toString().slice(-4)}`,
              transactionType: 'Opening Balance',
              amount: def.openingBalance,
              status: 'Posted',
              referenceType: 'OPENING_BALANCE',
              description: `Initial opening balance configured for ${fund.name}.`,
            },
          });
        }
      }
    }
  }

  /**
   * FMS-001: Register a new fund record.
   * Rule: Unique fund code and fund name required.
   */
  async createFund(dto: CreateFundDto) {
    await this.ensureSeedFunds();

    const cleanName = dto.name.trim();
    const cleanCode = dto.code.trim().toUpperCase();

    // Check duplicate name
    const existingName = await this.prisma.fund.findFirst({
      where: { name: { equals: cleanName, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new ConflictException(`A fund with the name "${cleanName}" already exists.`);
    }

    // Check duplicate code
    const existingCode = await this.prisma.fund.findFirst({
      where: { code: { equals: cleanCode, mode: 'insensitive' } },
    });
    if (existingCode) {
      throw new ConflictException(`The fund code "${cleanCode}" is already in use.`);
    }

    const openingBalanceNum = Number(dto.openingBalance) || 0;

    const fund = await this.prisma.fund.create({
      data: {
        name: cleanName,
        code: cleanCode,
        description: dto.description?.trim() || null,
        openingBalance: openingBalanceNum,
        currentBalance: openingBalanceNum,
        targetUtilization: Number(dto.targetUtilization) || 80,
        status: dto.status || 'Active',
      },
    });

    // Record initial Opening Balance transaction if openingBalance > 0
    if (openingBalanceNum > 0) {
      await this.prisma.fundTransaction.create({
        data: {
          fundId: fund.id,
          transactionRef: `OB-${fund.code}-${Date.now().toString().slice(-4)}`,
          transactionType: 'Opening Balance',
          amount: openingBalanceNum,
          status: 'Posted',
          referenceType: 'OPENING_BALANCE',
          description: `Initial opening ledger balance for ${fund.name}.`,
        },
      });
    }

    return this.getFundWithCalculatedBalance(fund.id);
  }

  /**
   * FMS-001: Edit an existing fund configuration.
   */
  async updateFund(id: string, dto: UpdateFundDto) {
    const fund = await this.prisma.fund.findUnique({ where: { id } });
    if (!fund) {
      throw new NotFoundException(`Fund with ID "${id}" not found.`);
    }

    const dataToUpdate: Prisma.FundUpdateInput = {};

    if (dto.name) {
      const cleanName = dto.name.trim();
      const duplicateName = await this.prisma.fund.findFirst({
        where: {
          id: { not: id },
          name: { equals: cleanName, mode: 'insensitive' },
        },
      });
      if (duplicateName) {
        throw new ConflictException(`A fund with the name "${cleanName}" already exists.`);
      }
      dataToUpdate.name = cleanName;
    }

    if (dto.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const duplicateCode = await this.prisma.fund.findFirst({
        where: {
          id: { not: id },
          code: { equals: cleanCode, mode: 'insensitive' },
        },
      });
      if (duplicateCode) {
        throw new ConflictException(`The fund code "${cleanCode}" is already in use.`);
      }
      dataToUpdate.code = cleanCode;
    }

    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description.trim() || null;
    }

    if (dto.targetUtilization !== undefined) {
      dataToUpdate.targetUtilization = Number(dto.targetUtilization);
    }

    await this.prisma.fund.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.getFundWithCalculatedBalance(id);
  }

  /**
   * FMS-001: Activate or deactivate a fund.
   */
  async toggleFundStatus(id: string, dto: ToggleFundStatusDto) {
    const fund = await this.prisma.fund.findUnique({ where: { id } });
    if (!fund) {
      throw new NotFoundException(`Fund with ID "${id}" not found.`);
    }

    const updated = await this.prisma.fund.update({
      where: { id },
      data: { status: dto.status },
    });

    return this.getFundWithCalculatedBalance(updated.id);
  }

  /**
   * FMS-005: Validate fund assignments.
   * Rule: The system shall reject a transaction when the assigned fund does not exist, is inactive, or is invalid.
   */
  async validateFundAssignment(fundIdentifier: string) {
    if (!fundIdentifier || !fundIdentifier.trim()) {
      throw new BadRequestException('FMS-005: Valid fund assignment is required.');
    }

    const cleanId = fundIdentifier.trim();
    const fund = await this.prisma.fund.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { code: { equals: cleanId, mode: 'insensitive' } },
          { name: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    if (!fund) {
      throw new NotFoundException(
        `FMS-005: Assigned fund "${cleanId}" does not exist in the system.`,
      );
    }

    if (fund.status !== 'Active') {
      throw new BadRequestException(
        `FMS-005: Assigned fund "${fund.name}" (${fund.code}) is inactive and cannot receive or process transactions.`,
      );
    }

    return fund;
  }

  /**
   * FMS-003: Calculate fund balance using opening balance and all valid posted fund transactions.
   */
  async calculateFundBalance(fundId: string, asOfDate?: Date): Promise<number> {
    const fund = await this.prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        transactions: {
          where: {
            status: 'Posted',
            ...(asOfDate ? { date: { lte: asOfDate } } : {}),
          },
        },
      },
    });

    if (!fund) {
      throw new NotFoundException(`Fund with ID "${fundId}" not found.`);
    }

    let balance = 0;
    const hasOpeningBalanceTxn = fund.transactions.some(
      (t) => t.referenceType === 'OPENING_BALANCE' || t.transactionType === 'Opening Balance',
    );

    if (!hasOpeningBalanceTxn) {
      balance += Number(fund.openingBalance);
    }

    for (const tx of fund.transactions) {
      const amount = Number(tx.amount);
      const type = tx.transactionType.toLowerCase();

      if (type.includes('inflow') || type.includes('collection') || type.includes('opening') || type.includes('transfer in')) {
        balance += amount;
      } else if (type.includes('outflow') || type.includes('disbursement') || type.includes('transfer out')) {
        balance -= amount;
      }
    }

    return Math.max(0, balance);
  }

  /**
   * FMS-003: Helper to return fund data with computed dynamic balance and pending disbursements.
   */
  async getFundWithCalculatedBalance(fundId: string) {
    const fund = await this.prisma.fund.findUnique({
      where: { id: fundId },
    });

    if (!fund) {
      throw new NotFoundException(`Fund with ID "${fundId}" not found.`);
    }

    const calculatedBalance = await this.calculateFundBalance(fund.id);

    // Sync calculated balance with stored currentBalance
    await this.prisma.fund.update({
      where: { id: fund.id },
      data: { currentBalance: calculatedBalance },
    });

    // Compute pending disbursements
    const pendingDisbursementsAgg = await this.prisma.disbursement.aggregate({
      where: {
        OR: [
          { fundId: fund.id },
          { fundSource: { equals: fund.name, mode: 'insensitive' } },
        ],
        status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
      },
      _sum: { amount: true },
    });

    const pendingDisbursements = Number(pendingDisbursementsAgg._sum.amount || 0);

    // Calculate dynamic utilization: posted outflows vs (current balance + posted outflows)
    const outflowsAgg = await this.prisma.fundTransaction.aggregate({
      where: {
        fundId: fund.id,
        status: 'Posted',
        transactionType: { in: ['Outflow (Disbursement)', 'Transfer Out', 'OUTFLOW'] },
      },
      _sum: { amount: true },
    });
    const totalOutflows = Number(outflowsAgg._sum.amount || 0);
    const totalCapacity = calculatedBalance + totalOutflows;
    const currentUtilization = totalCapacity > 0 ? Math.min(100, Math.round((totalOutflows / totalCapacity) * 100)) : 0;

    return {
      id: fund.id,
      name: fund.name,
      code: fund.code,
      description: fund.description || '',
      balance: calculatedBalance,
      openingBalance: Number(fund.openingBalance),
      targetUtilization: Number(fund.targetUtilization),
      currentUtilization,
      pendingDisbursements,
      status: fund.status,
      createdAt: fund.createdAt,
      updatedAt: fund.updatedAt,
    };
  }

  /**
   * FMS-001 & FMS-003: Retrieve all funds with balances and status filters.
   */
  async getAllFunds(query?: { search?: string; status?: string }) {
    await this.ensureSeedFunds();

    const where: Prisma.FundWhereInput = {};

    if (query?.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const funds = await this.prisma.fund.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const results = await Promise.all(
      funds.map((f) => this.getFundWithCalculatedBalance(f.id)),
    );

    const totalSystemBalance = results.reduce((sum, f) => sum + f.balance, 0);
    const activeFundsCount = results.filter((f) => f.status === 'Active').length;

    return {
      funds: results,
      totalSystemBalance,
      activeFundsCount,
      totalFundsCount: results.length,
    };
  }

  /**
   * FMS-003: Fund Financial Summary Report with custom date range.
   */
  async getFundFinancialSummary(fundId: string, query?: FundSummaryQueryDto) {
    const fund = await this.getFundWithCalculatedBalance(fundId);

    const dateFilter: Prisma.DateTimeFilter = {};
    if (query?.startDate) {
      dateFilter.gte = new Date(query.startDate);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const transactions = await this.prisma.fundTransaction.findMany({
      where: {
        fundId,
        status: 'Posted',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
    });

    let inflows = 0;
    let outflows = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const type = tx.transactionType.toLowerCase();

      if (type.includes('inflow') || type.includes('collection') || type.includes('opening') || type.includes('transfer in')) {
        inflows += amount;
      } else if (type.includes('outflow') || type.includes('disbursement') || type.includes('transfer out')) {
        outflows += amount;
      }
    }

    const netFlow = inflows - outflows;
    const utilizationBase = fund.balance + outflows;
    const utilizationPercent = utilizationBase > 0 ? Math.min(100, (outflows / utilizationBase) * 100) : 0;

    return {
      fund: {
        id: fund.id,
        name: fund.name,
        code: fund.code,
        balance: fund.balance,
        pendingDisbursements: fund.pendingDisbursements,
      },
      period: {
        startDate: query?.startDate || null,
        endDate: query?.endDate || null,
      },
      summary: {
        inflows,
        outflows,
        netFlow,
        utilizationPercent: Number(utilizationPercent.toFixed(1)),
      },
    };
  }

  /**
   * FMS-004: Record posted transaction to fund ledger.
   * Rule: The system shall update the applicable fund only when the collection or disbursement has a Posted status.
   */
  async recordPostedTransaction(data: {
    fundIdOrName: string;
    transactionRef: string;
    transactionType: 'Inflow (Collection)' | 'Outflow (Disbursement)' | 'Opening Balance' | 'Transfer In' | 'Transfer Out';
    amount: number;
    referenceType?: 'COLLECTION' | 'DISBURSEMENT' | 'OPENING_BALANCE' | 'TRANSFER';
    referenceId?: string;
    description?: string;
    date?: Date;
  }) {
    // FMS-005: Validate fund assignment
    const activeFund = await this.validateFundAssignment(data.fundIdOrName);

    // Create FundTransaction
    const tx = await this.prisma.fundTransaction.create({
      data: {
        fundId: activeFund.id,
        transactionRef: data.transactionRef,
        transactionType: data.transactionType,
        amount: data.amount,
        status: 'Posted',
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description || null,
        date: data.date || new Date(),
      },
    });

    // Refresh dynamic balance
    await this.getFundWithCalculatedBalance(activeFund.id);

    return tx;
  }

  /**
   * FMS-002 & FMS-003: Retrieve Global Fund Transaction Ledger with filter support.
   */
  async getFundTransactionsLedger(query?: QueryFundLedgerDto) {
    await this.ensureSeedFunds();

    const where: Prisma.FundTransactionWhereInput = {};

    if (query?.fundId) {
      where.fundId = query.fundId;
    } else if (query?.fundName && query.fundName !== 'All') {
      const targetFund = await this.prisma.fund.findFirst({
        where: { name: { equals: query.fundName, mode: 'insensitive' } },
      });
      if (targetFund) {
        where.fundId = targetFund.id;
      }
    }

    if (query?.type && query.type !== 'All') {
      where.transactionType = query.type;
    }

    if (query?.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { transactionRef: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (query?.startDate) {
      dateFilter.gte = new Date(query.startDate);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      this.prisma.fundTransaction.count({ where }),
      this.prisma.fundTransaction.findMany({
        where,
        include: {
          fund: { select: { id: true, name: true, code: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: transactions.map((t) => ({
        id: t.transactionRef,
        fundId: t.fundId,
        fundName: t.fund.name,
        fundCode: t.fund.code,
        amount: Number(t.amount),
        type: t.transactionType,
        date: t.date.toISOString().split('T')[0],
        status: t.status,
        description: t.description,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * FMS-006: Increase or decrease fund balance after posted transaction.
   * Rule: The system shall increase or decrease the assigned fund balance according to the posted transaction type and amount.
   */
  async updateFundBalanceOnTransaction(
    fundId: string,
    transactionType: string,
    amount: number,
  ) {
    const fund = await this.prisma.fund.findUnique({ where: { id: fundId } });
    if (!fund) {
      throw new NotFoundException(`Fund with ID "${fundId}" not found.`);
    }

    const currentBal = Number(fund.currentBalance);
    const amountNum = Number(amount);
    const typeLower = transactionType.toLowerCase();

    let newBalance = currentBal;
    if (
      typeLower.includes('inflow') ||
      typeLower.includes('collection') ||
      typeLower.includes('opening') ||
      typeLower.includes('transfer in') ||
      typeLower.includes('increase')
    ) {
      newBalance = currentBal + amountNum;
    } else if (
      typeLower.includes('outflow') ||
      typeLower.includes('disbursement') ||
      typeLower.includes('transfer out') ||
      typeLower.includes('decrease')
    ) {
      newBalance = Math.max(0, currentBal - amountNum);
    }

    const updated = await this.prisma.fund.update({
      where: { id: fundId },
      data: { currentBalance: newBalance },
    });

    return {
      fundId: updated.id,
      fundName: updated.name,
      previousBalance: currentBal,
      newBalance: Number(updated.currentBalance),
      transactionType,
      amount: amountNum,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * FMS-007: Calculate fund utilization.
   * Rule: The system shall calculate fund utilization based on the configured fund balance and posted fund outflows.
   */
  async calculateFundUtilization(fundIdentifier: string) {
    const activeFund = await this.validateFundAssignment(fundIdentifier);

    // Compute posted outflows
    const outflowsAgg = await this.prisma.fundTransaction.aggregate({
      where: {
        fundId: activeFund.id,
        status: 'Posted',
        transactionType: { in: ['Outflow (Disbursement)', 'Transfer Out', 'OUTFLOW', 'Authorized Adjustment (Decrease)'] },
      },
      _sum: { amount: true },
    });

    const totalOutflows = Number(outflowsAgg._sum.amount || 0);
    const currentBalance = await this.calculateFundBalance(activeFund.id);
    const configuredCapacity = currentBalance + totalOutflows;

    const utilizationPercentage =
      configuredCapacity > 0
        ? Number(((totalOutflows / configuredCapacity) * 100).toFixed(2))
        : 0;

    const targetUtilization = Number(activeFund.targetUtilization);

    let status: 'Normal' | 'Approaching Limit' | 'Critical' = 'Normal';
    if (utilizationPercentage >= targetUtilization || utilizationPercentage >= 85) {
      status = 'Critical';
    } else if (utilizationPercentage >= targetUtilization * 0.8) {
      status = 'Approaching Limit';
    }

    return {
      fundId: activeFund.id,
      fundName: activeFund.name,
      fundCode: activeFund.code,
      currentBalance,
      openingBalance: Number(activeFund.openingBalance),
      totalPostedOutflows: totalOutflows,
      totalConfiguredCapacity: configuredCapacity,
      utilizationPercentage,
      targetUtilizationPercentage: targetUtilization,
      status,
      remainingCapacity: Math.max(0, configuredCapacity - totalOutflows),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * FMS-008: Check fund availability before controlled fund release.
   * Rule: The system shall identify a fund as insufficient when the required amount is greater than the available fund balance.
   */
  async checkFundAvailability(dto: CheckFundAvailabilityDto) {
    const activeFund = await this.validateFundAssignment(dto.fundIdentifier);
    const availableBalance = await this.calculateFundBalance(activeFund.id);
    const requiredAmount = Number(dto.requiredAmount);

    const isSufficient = availableBalance >= requiredAmount;
    const deficit = isSufficient ? 0 : Number((requiredAmount - availableBalance).toFixed(2));

    return {
      fundId: activeFund.id,
      fundName: activeFund.name,
      fundCode: activeFund.code,
      availableBalance,
      requiredAmount,
      isSufficient,
      deficit,
      status: isSufficient ? 'SUFFICIENT_FUNDS' : 'INSUFFICIENT_FUNDS',
      message: isSufficient
        ? `Sufficient liquidity available. ₱${requiredAmount.toLocaleString()} can be released from ${activeFund.name}.`
        : `Insufficient funds. Available balance (₱${availableBalance.toLocaleString()}) is less than required (₱${requiredAmount.toLocaleString()}). Deficit: ₱${deficit.toLocaleString()}.`,
    };
  }

  /**
   * FMS-009: Maintain fund transaction history so that all fund movements can be traced.
   * Rule: The system shall record each posted fund transaction with its reference, fund, amount, transaction type, date, and status.
   */
  async getFundTransactionHistory(fundIdentifier?: string, page = 1, limit = 50) {
    const where: Prisma.FundTransactionWhereInput = {};

    if (fundIdentifier && fundIdentifier !== 'All') {
      const fund = await this.prisma.fund.findFirst({
        where: {
          OR: [
            { id: fundIdentifier },
            { code: { equals: fundIdentifier, mode: 'insensitive' } },
            { name: { equals: fundIdentifier, mode: 'insensitive' } },
          ],
        },
      });
      if (fund) {
        where.fundId = fund.id;
      }
    }

    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.fundTransaction.count({ where }),
      this.prisma.fundTransaction.findMany({
        where,
        include: {
          fund: { select: { id: true, name: true, code: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      history: records.map((r) => ({
        id: r.id,
        transactionRef: r.transactionRef,
        fundId: r.fundId,
        fundName: r.fund.name,
        fundCode: r.fund.code,
        amount: Number(r.amount),
        transactionType: r.transactionType,
        date: r.date.toISOString(),
        status: r.status,
        referenceType: r.referenceType || 'N/A',
        referenceId: r.referenceId || null,
        description: r.description || '',
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * FMS-010: Prevent unauthorized fund balance changes.
   * Rule: The system shall allow fund balance changes only through authorized financial transactions and shall reject direct unauthorized balance updates.
   */
  async processAuthorizedAdjustment(dto: AuthorizedBalanceAdjustmentDto) {
    const role = (dto.actorRole || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'TREASURER') {
      throw new ForbiddenException(
        'FMS-010: Unauthorized fund balance modification attempt. Only authorized Admins or Treasurers may execute balance adjustments.',
      );
    }

    const activeFund = await this.validateFundAssignment(dto.fundIdentifier);
    const amountNum = Number(dto.amount);
    const isIncrease = dto.adjustmentType === 'INCREASE';

    if (!isIncrease) {
      const currentBalance = await this.calculateFundBalance(activeFund.id);
      if (currentBalance < amountNum) {
        throw new BadRequestException(
          `FMS-010: Cannot perform balance reduction of ₱${amountNum.toLocaleString()}. Available fund balance is only ₱${currentBalance.toLocaleString()}.`,
        );
      }
    }

    const transactionType = isIncrease
      ? 'Authorized Adjustment (Increase)'
      : 'Authorized Adjustment (Decrease)';
    const transactionRef = `ADJ-${activeFund.code}-${Date.now().toString().slice(-6)}`;

    const tx = await this.prisma.fundTransaction.create({
      data: {
        fundId: activeFund.id,
        transactionRef,
        transactionType,
        amount: amountNum,
        status: 'Posted',
        referenceType: 'AUTHORIZED_ADJUSTMENT',
        description: `Authorized adjustment by ${dto.actorName || role}: ${dto.reason}`,
      },
    });

    const updatedBalanceInfo = await this.updateFundBalanceOnTransaction(
      activeFund.id,
      transactionType,
      amountNum,
    );

    return {
      success: true,
      message: `Fund balance adjusted successfully by ₱${amountNum.toLocaleString()}.`,
      transaction: {
        id: tx.id,
        ref: tx.transactionRef,
        type: tx.transactionType,
        amount: Number(tx.amount),
        authorizedBy: dto.actorName || role,
        reason: dto.reason,
        date: tx.date.toISOString(),
      },
      fund: updatedBalanceInfo,
    };
  }

  /**
   * FMS-011: Prepare validated fund data for AI Forecasting Module.
   * Rule: The system shall provide only validated fund balances and posted fund transactions as forecasting inputs.
   */
  async getForecastingReadyData(query?: ForecastingQueryDto) {
    await this.ensureSeedFunds();

    const whereFund: Prisma.FundWhereInput = { status: 'Active' };
    if (query?.fundId) {
      whereFund.id = query.fundId;
    } else if (query?.fundName && query.fundName !== 'All') {
      whereFund.name = { equals: query.fundName, mode: 'insensitive' };
    }

    const activeFunds = await this.prisma.fund.findMany({
      where: whereFund,
      select: {
        id: true,
        name: true,
        code: true,
        openingBalance: true,
        currentBalance: true,
        targetUtilization: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    const dateFilter: Prisma.DateTimeFilter = {};
    if (query?.startDate) {
      dateFilter.gte = new Date(query.startDate);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // FMS-011: ONLY Posted transactions from valid active funds
    const fundIds = activeFunds.map((f) => f.id);
    const postedTransactions = await this.prisma.fundTransaction.findMany({
      where: {
        fundId: { in: fundIds },
        status: 'Posted',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: {
        fund: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate time-series by month (YYYY-MM)
    const monthlyBuckets: Record<
      string,
      { period: string; inflows: number; outflows: number; netFlow: number; transactionCount: number }
    > = {};

    for (const tx of postedTransactions) {
      const periodKey = tx.date.toISOString().slice(0, 7); // e.g. "2026-09"
      if (!monthlyBuckets[periodKey]) {
        monthlyBuckets[periodKey] = {
          period: periodKey,
          inflows: 0,
          outflows: 0,
          netFlow: 0,
          transactionCount: 0,
        };
      }

      const amount = Number(tx.amount);
      const typeLower = tx.transactionType.toLowerCase();

      if (
        typeLower.includes('inflow') ||
        typeLower.includes('collection') ||
        typeLower.includes('opening') ||
        typeLower.includes('transfer in') ||
        typeLower.includes('increase')
      ) {
        monthlyBuckets[periodKey].inflows += amount;
        monthlyBuckets[periodKey].netFlow += amount;
      } else if (
        typeLower.includes('outflow') ||
        typeLower.includes('disbursement') ||
        typeLower.includes('transfer out') ||
        typeLower.includes('decrease')
      ) {
        monthlyBuckets[periodKey].outflows += amount;
        monthlyBuckets[periodKey].netFlow -= amount;
      }

      monthlyBuckets[periodKey].transactionCount += 1;
    }

    const timeSeries = Object.values(monthlyBuckets).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const validatedFundsSummary = await Promise.all(
      activeFunds.map(async (f) => {
        const balance = await this.calculateFundBalance(f.id);
        const utilization = await this.calculateFundUtilization(f.id);
        return {
          id: f.id,
          name: f.name,
          code: f.code,
          validatedBalance: balance,
          targetUtilization: Number(f.targetUtilization),
          currentUtilization: utilization.utilizationPercentage,
          status: f.status,
        };
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      metadata: {
        filterCriteria: {
          fundId: query?.fundId || 'ALL_ACTIVE_FUNDS',
          startDate: query?.startDate || 'ALL_TIME',
          endDate: query?.endDate || 'PRESENT',
          enforceStatus: 'POSTED_ONLY_VALIDATED',
        },
        activeFundsCount: activeFunds.length,
        totalPostedTransactionsAnalyzed: postedTransactions.length,
      },
      validatedFunds: validatedFundsSummary,
      historicalTimeSeries: timeSeries,
      rawValidatedTransactions: postedTransactions.map((t) => ({
        ref: t.transactionRef,
        fundCode: t.fund.code,
        fundName: t.fund.name,
        amount: Number(t.amount),
        type: t.transactionType,
        date: t.date.toISOString().split('T')[0],
        status: t.status,
      })),
    };
  }
}
