import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DisbursementStatus, PaymentMethod, Prisma } from '@prisma/client';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import { ExecuteDisbursementDto } from './dto/execute-disbursement.dto';
import { QueryDisbursementDto } from './dto/query-disbursement.dto';
import { ReviewAction, ReviewDisbursementDto } from './dto/review-disbursement.dto';

// Default mock fund balance values if table is unseeded
const DEFAULT_FUNDS = [
  { name: 'General Fund', totalBalance: 500000, availableBalance: 450000, reservedBalance: 50000 },
  { name: 'Emergency Fund', totalBalance: 300000, availableBalance: 280000, reservedBalance: 20000 },
  { name: 'Educational Fund', totalBalance: 200000, availableBalance: 180000, reservedBalance: 20000 },
  { name: 'Calamity Fund', totalBalance: 250000, availableBalance: 250000, reservedBalance: 0 },
];

@Injectable()
export class DisbursementsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly fundsService?: FundsService,
  ) {}

  /**
   * DMP-001: Retrieve approved loan information
   * The system shall allow disbursement processing only when the linked loan has an Approved status.
   */
  async getEligibleApprovedLoans() {
    const loans = await this.prisma.financialObligation.findMany({
      where: {
        OR: [
          { loanStatus: { equals: 'Approved', mode: 'insensitive' } },
          { status: { equals: 'APPROVED', mode: 'insensitive' } },
        ],
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      loans.map(async (loan) => {
        const approvedAmount = Number(loan.approvedAmount ?? loan.originalAmount);
        const disbursedAmount = Number(loan.disbursedAmount ?? 0);
        const remainingAmount = Number(loan.remainingLoanAmount ?? (approvedAmount - disbursedAmount));
        const fundSource = loan.fundSource || 'General Fund';

        const fund = await this.getFundBalance(fundSource);

        return {
          id: loan.id,
          memberId: loan.memberId,
          member: loan.member?.name || 'Unknown Member',
          memberEmail: loan.member?.email,
          obligationType: loan.obligationType,
          loanStatus: loan.loanStatus || 'Approved',
          approvedAmount,
          disbursedAmount,
          remainingAmount: Math.max(0, remainingAmount),
          fundSource,
          availableFund: fund.availableBalance,
          beneficiary: {
            name: loan.beneficiaryName || loan.member?.name || '',
            bank: loan.beneficiaryBank || 'BDO',
            account: loan.beneficiaryAccount || '00123456789',
          },
        };
      }),
    );
  }

  /**
   * DMP-004: Beneficiary Verification Rule
   */
  verifyBeneficiary(
    loan: {
      member?: { name: string };
      beneficiaryName?: string | null;
      memberId: string;
    },
    requestedBeneficiaryName: string,
    requestedMemberId?: string,
  ) {
    if (requestedMemberId && requestedMemberId !== loan.memberId) {
      throw new BadRequestException(
        `DMP-004: Member ID mismatch. Requested member does not own loan obligation "${loan.memberId}".`,
      );
    }

    const approvedBeneficiary = (loan.beneficiaryName || loan.member?.name || '').trim().toLowerCase();
    const cleanRequested = (requestedBeneficiaryName || '').trim().toLowerCase();

    if (!cleanRequested) {
      throw new BadRequestException('DMP-004: Beneficiary name is required.');
    }

    const isMatch = approvedBeneficiary === cleanRequested ||
      approvedBeneficiary.includes(cleanRequested) ||
      cleanRequested.includes(approvedBeneficiary);

    if (!isMatch) {
      throw new BadRequestException(
        `DMP-004: Beneficiary verification failed. Beneficiary "${requestedBeneficiaryName}" does not match approved record name "${loan.beneficiaryName || loan.member?.name}".`,
      );
    }

    return true;
  }

  /**
   * DMP-005: Verify approved loan amount limit
   */
  verifyLoanAmount(remainingLoanAmount: number, requestedAmount: number) {
    if (requestedAmount <= 0) {
      throw new BadRequestException('DMP-005: Disbursement amount must be greater than zero.');
    }

    if (requestedAmount > remainingLoanAmount) {
      throw new BadRequestException(
        `DMP-005: Requested disbursement amount (₱${requestedAmount.toLocaleString()}) exceeds the approved remaining loan balance (₱${remainingLoanAmount.toLocaleString()}).`,
      );
    }

    return true;
  }

  /**
   * DMP-006: Verify fund balance availability
   */
  async verifyFundAvailability(fundSource: string, requestedAmount: number) {
    const fund = await this.getFundBalance(fundSource);

    if (fund.availableBalance < requestedAmount) {
      throw new BadRequestException(
        `DMP-006: Insufficient fund balance in "${fundSource}". Available fund is ₱${fund.availableBalance.toLocaleString()}, but requested disbursement is ₱${requestedAmount.toLocaleString()}.`,
      );
    }

    return fund;
  }

  /**
   * DMP-007: Final Amount Validation Rule
   */
  async validateFinalDisbursementAmount(
    remainingLoanAmount: number,
    fundSource: string,
    requestedAmount: number,
  ) {
    this.verifyLoanAmount(remainingLoanAmount, requestedAmount);
    const fund = await this.verifyFundAvailability(fundSource, requestedAmount);

    return {
      isValid: true,
      remainingLoanAmount,
      availableFund: fund.availableBalance,
      disbursementAmount: requestedAmount,
    };
  }

  /**
   * DMP-002 & DMP-003: Create a disbursement request with full validation
   */
  async createDisbursementRequest(dto: CreateDisbursementRequestDto) {
    if (!dto.obligationId || !dto.memberId || !dto.amount || !dto.paymentMethod || !dto.fundSource || !dto.beneficiaryName) {
      throw new BadRequestException('DMP-003: Incomplete disbursement request. All required fields must be provided.');
    }

    const obligation = await this.prisma.financialObligation.findUnique({
      where: { id: dto.obligationId },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
    });

    if (!obligation) {
      throw new NotFoundException(`Loan obligation with ID "${dto.obligationId}" not found.`);
    }

    const loanStatus = (obligation.loanStatus || obligation.status || '').toLowerCase();
    if (loanStatus !== 'approved' && loanStatus !== 'partially disbursed') {
      throw new BadRequestException(
        `DMP-001: Cannot create disbursement. Linked loan obligation status is "${obligation.loanStatus || obligation.status}", but only "Approved" loans are eligible.`,
      );
    }

    this.verifyBeneficiary(obligation, dto.beneficiaryName, dto.memberId);

    const approvedAmount = Number(obligation.approvedAmount ?? obligation.originalAmount);
    const disbursedAmount = Number(obligation.disbursedAmount ?? 0);
    const remainingLoanAmount = Number(obligation.remainingLoanAmount ?? (approvedAmount - disbursedAmount));

    await this.validateFinalDisbursementAmount(remainingLoanAmount, dto.fundSource, dto.amount);

    const disbursementRefNo = `REQ-${Math.floor(Math.random() * 9000) + 1000}`;

    return this.prisma.disbursement.create({
      data: {
        disbursementRefNo,
        obligationId: obligation.id,
        memberId: obligation.memberId,
        amount: new Prisma.Decimal(dto.amount),
        fundSource: dto.fundSource,
        paymentMethod: dto.paymentMethod,
        beneficiaryName: dto.beneficiaryName,
        beneficiaryBank: dto.beneficiaryBank,
        beneficiaryAccount: dto.beneficiaryAccount,
        description: dto.description,
        status: DisbursementStatus.PENDING_APPROVAL,
        isReadyForReconciliation: false,
        auditTrail: {
          create: {
            disbursementRefNo,
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: dto.actorName || 'Treasurer',
            role: dto.actorRole || 'Treasurer',
            details: `Requested disbursement of ₱${dto.amount.toLocaleString()} for ${obligation.obligationType} via ${dto.paymentMethod}.`,
          },
        },
      },
      include: {
        obligation: true,
        auditTrail: true,
      },
    });
  }

  /**
   * DMP-008: Authorized Approval Rule & DMP-012: Audit Trail
   * The system shall allow approval only when the disbursement request has passed all required validation
   * and fund availability checks.
   */
  async reviewDisbursement(id: string, dto: ReviewDisbursementDto) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: { obligation: true },
    });

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID "${id}" not found.`);
    }

    if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Disbursement cannot be reviewed because its current status is "${disbursement.status}". Only "PENDING_APPROVAL" can be reviewed.`,
      );
    }

    // DMP-008: Check fund availability before approval
    if (dto.action === ReviewAction.APPROVE) {
      const fund = await this.getFundBalance(disbursement.fundSource);
      if (fund.availableBalance < Number(disbursement.amount)) {
        throw new BadRequestException(
          `DMP-008: Cannot approve disbursement. Insufficient fund balance in "${disbursement.fundSource}". Available fund is ₱${fund.availableBalance.toLocaleString()}, required: ₱${Number(disbursement.amount).toLocaleString()}.`,
        );
      }
    }

    const newStatus =
      dto.action === ReviewAction.APPROVE
        ? DisbursementStatus.APPROVED
        : DisbursementStatus.REJECTED;

    const actionText = dto.action === ReviewAction.APPROVE ? 'Request Approved' : 'Request Rejected';
    const detailText =
      dto.action === ReviewAction.APPROVE
        ? `Disbursement request approved for fund release of ₱${Number(disbursement.amount).toLocaleString()}.`
        : `Disbursement request rejected. Reason: ${dto.rejectionReason || 'Not specified'}`;

    // DMP-012: Record audit trail for status change
    return this.prisma.disbursement.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: dto.action === ReviewAction.REJECT ? dto.rejectionReason : null,
        auditTrail: {
          create: {
            disbursementRefNo: disbursement.disbursementRefNo,
            action: actionText,
            previousStatus: disbursement.status,
            newStatus,
            actor: dto.reviewerName || 'Admin Approver',
            role: dto.reviewerRole || 'Approver',
            details: detailText,
          },
        },
      },
      include: {
        obligation: true,
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  /**
   * DMP-009, DMP-010, DMP-011, DMP-012, DMP-014: Payment Execution & Recording
   * - DMP-009: Allow payment execution only when status is Approved.
   * - DMP-010: Record completed disbursement in financial records.
   * - DMP-011: Reduce Available Fund by the confirmed amount.
   * - DMP-012: Maintain audit log with user, action, transaction ref, status change, timestamp.
   * - DMP-014: Mark disbursement as Ready for Reconciliation after execution.
   */
  async executeDisbursement(id: string, dto: ExecuteDisbursementDto) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: { obligation: true },
    });

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID "${id}" not found.`);
    }

    // DMP-009: Allow payment execution ONLY when status is APPROVED
    if (disbursement.status !== DisbursementStatus.APPROVED) {
      throw new BadRequestException(
        `DMP-009: Payment execution is allowed only when disbursement status is Approved. Current status is "${disbursement.status}".`,
      );
    }

    const amountNum = Number(disbursement.amount);
    const executionRefNo = dto.executionRefNo || `PAY-${Math.floor(Math.random() * 900000) + 100000}`;

    // DMP-011: Reduce Available Fund balance
    await this.deductFundBalance(disbursement.fundSource, amountNum);

    // Update loan balance
    if (disbursement.obligationId && disbursement.obligation) {
      const currentDisbursed = Number(disbursement.obligation.disbursedAmount ?? 0);
      const approvedTotal = Number(disbursement.obligation.approvedAmount ?? disbursement.obligation.originalAmount);
      const newDisbursed = currentDisbursed + amountNum;
      const newRemaining = Math.max(0, approvedTotal - newDisbursed);
      const newLoanStatus = newRemaining === 0 ? 'Fully Disbursed' : 'Partially Disbursed';

      await this.prisma.financialObligation.update({
        where: { id: disbursement.obligationId },
        data: {
          disbursedAmount: new Prisma.Decimal(newDisbursed),
          remainingLoanAmount: new Prisma.Decimal(newRemaining),
          loanStatus: newLoanStatus,
        },
      });
    }

    // DMP-010, DMP-012, DMP-014: Record completed disbursement, mark ready for reconciliation
    const executedDisbursement = await this.prisma.disbursement.update({
      where: { id },
      data: {
        status: DisbursementStatus.EXECUTED,
        executionRefNo,
        isReadyForReconciliation: true, // DMP-014
        auditTrail: {
          create: {
            disbursementRefNo: disbursement.disbursementRefNo,
            action: 'Payment Executed',
            previousStatus: DisbursementStatus.APPROVED,
            newStatus: DisbursementStatus.EXECUTED,
            actor: dto.executorName || 'Treasurer',
            role: dto.executorRole || 'Treasurer',
            details: `Funds successfully released (₱${amountNum.toLocaleString()}) with payment reference "${executionRefNo}". Transaction marked Ready for Reconciliation. ${dto.details || ''}`.trim(),
          },
        },
      },
      include: {
        obligation: true,
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    // FMS-004: Record posted fund outflow transaction
    if (this.fundsService) {
      try {
        const assignedFund = disbursement.fundSource || 'General Fund';
        await this.fundsService.recordPostedTransaction({
          fundIdOrName: assignedFund,
          transactionRef: executionRefNo,
          transactionType: 'Outflow (Disbursement)',
          amount: amountNum,
          referenceType: 'DISBURSEMENT',
          referenceId: disbursement.id,
          description: `Disbursement released to ${disbursement.beneficiaryName}: ${disbursement.description || 'Loan release'}`,
          date: disbursement.date || new Date(),
        });
      } catch (e) {
        // Fallback gracefully if funds not yet initialized
      }
    }

    return executedDisbursement;
  }

  /**
   * DMP-013: View disbursement status and transaction history
   */
  async getDisbursementHistory(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: {
        obligation: {
          include: { member: { select: { id: true, name: true, email: true } } },
        },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID "${id}" not found.`);
    }

    return {
      id: disbursement.id,
      ref: disbursement.disbursementRefNo || disbursement.id,
      status: this.formatStatusForUI(disbursement.status),
      amount: Number(disbursement.amount),
      fundSource: disbursement.fundSource,
      isReadyForReconciliation: disbursement.isReadyForReconciliation,
      reconciledAt: disbursement.reconciledAt,
      beneficiary: {
        name: disbursement.beneficiaryName,
        bank: disbursement.beneficiaryBank || 'BDO',
        account: disbursement.beneficiaryAccount || '00123456789',
      },
      history: disbursement.auditTrail.map((at) => ({
        id: at.id,
        action: at.action,
        previousStatus: at.previousStatus,
        newStatus: at.newStatus,
        actor: at.actor,
        role: at.role,
        timestamp: at.timestamp.toISOString(),
        details: at.details,
      })),
    };
  }

  /**
   * DMP-014: Get all disbursements that are Ready for Bank Reconciliation
   */
  async getReconciliationReadyDisbursements() {
    const records = await this.prisma.disbursement.findMany({
      where: {
        status: DisbursementStatus.EXECUTED,
        isReadyForReconciliation: true,
      },
      include: {
        obligation: {
          include: { member: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((d) => ({
      id: d.id,
      disbursementRefNo: d.disbursementRefNo,
      executionRefNo: d.executionRefNo,
      member: d.obligation?.member?.name || d.beneficiaryName,
      amount: Number(d.amount),
      fundSource: d.fundSource,
      isReconciled: !!d.reconciledAt,
      reconciledAt: d.reconciledAt,
      date: d.date.toISOString().split('T')[0],
    }));
  }

  /**
   * DMP-014: Mark disbursement as reconciled by Bank Reconciliation Module
   */
  async markReconciled(id: string, actorName: string = 'Auditor') {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
    });

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID "${id}" not found.`);
    }

    if (disbursement.status !== DisbursementStatus.EXECUTED) {
      throw new BadRequestException(
        `DMP-014: Only EXECUTED disbursements can be marked as reconciled. Current status is "${disbursement.status}".`,
      );
    }

    return this.prisma.disbursement.update({
      where: { id },
      data: {
        reconciledAt: new Date(),
        auditTrail: {
          create: {
            disbursementRefNo: disbursement.disbursementRefNo,
            action: 'Bank Reconciled',
            previousStatus: disbursement.status,
            newStatus: disbursement.status,
            actor: actorName,
            role: 'Auditor',
            details: `Disbursement reconciled against bank statement records.`,
          },
        },
      },
      include: { auditTrail: { orderBy: { timestamp: 'asc' } } },
    });
  }

  /**
   * Find All Disbursements with Search, Filtering, and Pagination (DMP-013 & DMP-014)
   */
  async findAll(query: QueryDisbursementDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DisbursementWhereInput = {};

    if (query.status && query.status !== 'All') {
      const mappedStatus = Object.values(DisbursementStatus).find(
        (s) => s.toLowerCase() === query.status?.toLowerCase() || s.replace('_', ' ').toLowerCase() === query.status?.toLowerCase(),
      );
      if (mappedStatus) {
        where.status = mappedStatus;
      }
    }

    if (query.search) {
      where.OR = [
        { disbursementRefNo: { contains: query.search, mode: 'insensitive' } },
        { beneficiaryName: { contains: query.search, mode: 'insensitive' } },
        { executionRefNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const [disbursements, total] = await Promise.all([
      this.prisma.disbursement.findMany({
        where,
        include: {
          obligation: {
            include: { member: { select: { id: true, name: true, email: true } } },
          },
          auditTrail: { orderBy: { timestamp: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.disbursement.count({ where }),
    ]);

    return {
      data: disbursements.map((d) => ({
        id: d.id,
        ref: d.disbursementRefNo || d.id,
        member: d.obligation?.member?.name || d.beneficiaryName,
        loanType: d.obligation?.obligationType || 'Loan',
        amount: Number(d.amount),
        status: this.formatStatusForUI(d.status),
        date: d.date.toISOString().split('T')[0],
        beneficiary: {
          name: d.beneficiaryName,
          bank: d.beneficiaryBank || 'BDO',
          account: d.beneficiaryAccount || '00123456789',
        },
        fundSource: d.fundSource,
        method: d.paymentMethod.replace('_', ' '),
        executionRef: d.executionRefNo,
        isReadyForReconciliation: d.isReadyForReconciliation, // DMP-014
        reconciledAt: d.reconciledAt,
        rejectionReason: d.rejectionReason,
        auditTrail: d.auditTrail.map((at) => ({
          id: at.id,
          action: at.action,
          actor: at.actor,
          role: at.role,
          timestamp: at.timestamp.toISOString(),
          details: at.details,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Find Single Disbursement by ID
   */
  async findOne(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: {
        obligation: {
          include: { member: { select: { id: true, name: true, email: true } } },
        },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!disbursement) {
      throw new NotFoundException(`Disbursement with ID "${id}" not found.`);
    }

    return disbursement;
  }

  /**
   * Fund Balance Helpers (DMP-006, DMP-011)
   */
  async getFundBalance(fundName: string) {
    const fund = await this.prisma.fundAccount.findUnique({
      where: { name: fundName },
    });

    if (fund) {
      return {
        name: fund.name,
        totalBalance: Number(fund.totalBalance),
        availableBalance: Number(fund.availableBalance),
        reservedBalance: Number(fund.reservedBalance),
      };
    }

    const defaultFund = DEFAULT_FUNDS.find((f) => f.name.toLowerCase() === fundName.toLowerCase()) || {
      name: fundName,
      totalBalance: 500000,
      availableBalance: 450000,
      reservedBalance: 50000,
    };

    return defaultFund;
  }

  async getAllFundsSummary() {
    const fundsInDb = await this.prisma.fundAccount.findMany();
    if (fundsInDb.length > 0) {
      return fundsInDb.map((f) => ({
        name: f.name,
        totalBalance: Number(f.totalBalance),
        availableBalance: Number(f.availableBalance),
        reservedBalance: Number(f.reservedBalance),
      }));
    }
    return DEFAULT_FUNDS;
  }

  private async deductFundBalance(fundName: string, amount: number) {
    const fund = await this.prisma.fundAccount.findUnique({
      where: { name: fundName },
    });

    if (fund) {
      const currentAvailable = Number(fund.availableBalance);
      const currentTotal = Number(fund.totalBalance);
      await this.prisma.fundAccount.update({
        where: { name: fundName },
        data: {
          availableBalance: new Prisma.Decimal(Math.max(0, currentAvailable - amount)),
          totalBalance: new Prisma.Decimal(Math.max(0, currentTotal - amount)),
        },
      });
    }
  }

  private formatStatusForUI(status: DisbursementStatus): string {
    switch (status) {
      case DisbursementStatus.PENDING_APPROVAL:
        return 'Pending Approval';
      case DisbursementStatus.APPROVED:
        return 'Approved';
      case DisbursementStatus.EXECUTED:
        return 'Executed';
      case DisbursementStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Pending Approval';
    }
  }
}
