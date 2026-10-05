import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DisbursementStatus, PaymentMethod, Prisma, DisbursementType, ChequeStatus } from '@prisma/client';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import { ExecuteDisbursementDto } from './dto/execute-disbursement.dto';
import { QueryDisbursementDto } from './dto/query-disbursement.dto';
import { ReviewAction, ReviewDisbursementDto } from './dto/review-disbursement.dto';
import { UpdateChequeStatusDto } from './dto/update-cheque-status.dto';
import { REQUIRES_SUPPORTING_DOC } from './disbursement.config';

@Injectable()
export class DisbursementsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly fundsService?: FundsService,
  ) {}

  /**
   * DMP-002: Generate Sequential Reference No
   */
  async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await tx.disbursementSequence.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `DSB-${year}-${seq.last.toString().padStart(5, '0')}`;
  }

  async getFundBalance(fundName: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    const fund = await prismaClient.fund.findUnique({
      where: { name: fundName },
    });
    if (!fund) {
      throw new BadRequestException(`DMP-005: Fund "${fundName}" is not configured or does not exist.`);
    }
    if (fund.status !== 'Active') {
      throw new BadRequestException(`DMP-005: Fund "${fundName}" is not Active.`);
    }
    return fund;
  }

  async getAllFundsSummary() {
    const funds = await this.prisma.fund.findMany({ where: { status: 'Active' } });
    return funds.map((f) => ({
      name: f.name,
      totalBalance: Number(f.openingBalance) + Number(f.currentBalance), // assuming current is the live
      availableBalance: Number(f.currentBalance),
      reservedBalance: 0,
    }));
  }

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
        
        let availableFund = 0;
        try {
          const fund = await this.getFundBalance(fundSource);
          availableFund = Number(fund.currentBalance);
        } catch {
          // Ignore if missing fund, let it be 0 for view
        }

        return {
          id: loan.id,
          memberId: loan.memberId,
          member: loan.member?.name || 'Unknown Member',
          memberEmail: loan.member?.email,
          obligationType: loan.obligationType,
          loanStatus: loan.loanStatus || 'Approved',
          approvedAmount,
          disbursedAmount,
          remainingAmount,
          fundSource,
          availableFund,
          beneficiary: {
            name: loan.beneficiaryName || loan.member?.name || '',
            bank: loan.beneficiaryBank || '',
            account: loan.beneficiaryAccount || '',
          },
        };
      }),
    );
  }

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
        `DMP-004: Member ID mismatch. Requested member does not own loan obligation.`,
      );
    }

    const approvedBeneficiary = (loan.beneficiaryName || loan.member?.name || '').trim().toLowerCase();
    const cleanRequested = (requestedBeneficiaryName || '').trim().toLowerCase();

    if (!cleanRequested) {
      throw new BadRequestException('DMP-004: Beneficiary name is required.');
    }

    const isMatch = (approvedBeneficiary && cleanRequested && (approvedBeneficiary.includes(cleanRequested) || cleanRequested.includes(approvedBeneficiary)));

    if (!isMatch) {
      throw new BadRequestException(
        `DMP-004: Beneficiary verification failed. Beneficiary "${requestedBeneficiaryName}" does not match.`,
      );
    }
    return true;
  }

  async createDisbursementRequest(dto: CreateDisbursementRequestDto, userId?: string) {
    if (REQUIRES_SUPPORTING_DOC[dto.type] && !dto.supportingDocRef) {
      throw new BadRequestException(`DMP-004: A supporting document is required for ${dto.type}.`);
    }

    return await this.prisma.$transaction(async (tx) => {
      const fund = await this.getFundBalance(dto.fundSource, tx);
      if (Number(fund.currentBalance) < dto.amount) {
        throw new BadRequestException(`DMP-012: Insufficient fund balance. Available: ${fund.currentBalance}, Requested: ${dto.amount}`);
      }

      let obligation = null;
      let approvedLoanAmount = null;

      if (dto.type === DisbursementType.LOAN_RELEASE) {
        obligation = await tx.financialObligation.findUnique({
          where: { id: dto.obligationId },
          include: { member: true },
        });
        if (!obligation) throw new NotFoundException('Loan obligation not found.');
        
        const loanStatus = (obligation.loanStatus || obligation.status || '').toLowerCase();
        if (loanStatus !== 'approved' && loanStatus !== 'partially disbursed') {
          throw new BadRequestException(`DMP-001: Loan must be Approved.`);
        }
        
        this.verifyBeneficiary(obligation, dto.beneficiaryName, dto.memberId);

        approvedLoanAmount = Number(obligation.approvedAmount ?? obligation.originalAmount);
        const disbursedAmount = Number(obligation.disbursedAmount ?? 0);
        const remainingLoanAmount = Number(obligation.remainingLoanAmount ?? (approvedLoanAmount - disbursedAmount));

        if (dto.amount > remainingLoanAmount) {
          throw new BadRequestException(`DMP-008: Requested amount exceeds remaining loan balance.`);
        }
      }

      const refNo = await this.nextReference(tx);
      
      const disbursementData: Prisma.DisbursementCreateInput = {
        disbursementRefNo: refNo,
        type: dto.type,
        category: dto.category,
        purpose: dto.purpose,
        supportingDocRef: dto.supportingDocRef,
        amount: new Prisma.Decimal(dto.amount),
        fundSource: dto.fundSource,
        paymentMethod: dto.paymentMethod,
        beneficiaryName: dto.beneficiaryName,
        beneficiaryBank: dto.beneficiaryBank,
        beneficiaryAccount: dto.beneficiaryAccount,
        description: dto.description,
        status: DisbursementStatus.PENDING_APPROVAL,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: userId ? { connect: { id: userId } } : undefined,
        auditTrail: {
          create: {
            disbursementRefNo: refNo,
            action: 'Disbursement Requested',
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            userId: userId,
            details: `Requested ${dto.type} of ₱${dto.amount} via ${dto.paymentMethod}.`,
          },
        },
      };

      if (dto.memberId) disbursementData.memberId = dto.memberId;
      if (dto.obligationId) disbursementData.obligation = { connect: { id: dto.obligationId } };
      if (approvedLoanAmount !== null) disbursementData.approvedLoanAmount = new Prisma.Decimal(approvedLoanAmount);
      if (fund.id) disbursementData.fund = { connect: { id: fund.id } };

      const disbursement = await tx.disbursement.create({ data: disbursementData });

      if (dto.paymentMethod === PaymentMethod.CHECK && dto.cheque) {
        if (dto.cheque.amount !== dto.amount) {
          throw new BadRequestException('Cheque amount must match disbursement amount.');
        }
        await tx.chequeRecord.create({
          data: {
            disbursementId: disbursement.id,
            chequeNumber: dto.cheque.chequeNumber,
            chequeDate: new Date(dto.cheque.chequeDate),
            payee: dto.cheque.payee,
            amount: new Prisma.Decimal(dto.cheque.amount),
            purpose: dto.cheque.purpose,
            relatedRef: refNo,
          }
        });
      }

      return await tx.disbursement.findUnique({
        where: { id: disbursement.id },
        include: { obligation: true, auditTrail: true, cheque: true },
      });
    });
  }

  async reviewDisbursement(id: string, dto: ReviewDisbursementDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const disbursement = await tx.disbursement.findUnique({
        where: { id },
        include: { obligation: true },
      });

      if (!disbursement) throw new NotFoundException('Disbursement not found.');
      if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
        throw new BadRequestException(`Disbursement is ${disbursement.status}.`);
      }

      if (disbursement.obligation) {
        const approvedAmount = Number(disbursement.obligation.approvedAmount ?? disbursement.obligation.originalAmount);
        const disbursedAmount = Number(disbursement.obligation.disbursedAmount ?? 0);
        const remainingLoanAmount = Number(disbursement.obligation.remainingLoanAmount ?? (approvedAmount - disbursedAmount));
        if (Number(disbursement.amount) > remainingLoanAmount) {
          throw new BadRequestException('Requested amount exceeds remaining loan balance.');
        }
      }

      if (dto.action === ReviewAction.APPROVE) {
        const fund = await this.getFundBalance(disbursement.fundSource, tx);
        if (Number(fund.currentBalance) < Number(disbursement.amount)) {
          throw new BadRequestException('Insufficient fund balance.');
        }
      }

      const newStatus = dto.action === ReviewAction.APPROVE ? DisbursementStatus.APPROVED : DisbursementStatus.REJECTED;

      return await tx.disbursement.update({
        where: { id },
        data: {
          status: newStatus,
          rejectionReason: dto.action === ReviewAction.REJECT ? dto.rejectionReason : null,
          auditTrail: {
            create: {
              disbursementRefNo: disbursement.disbursementRefNo,
              action: dto.action === ReviewAction.APPROVE ? 'Request Approved' : 'Request Rejected',
              previousStatus: disbursement.status,
              newStatus,
              userId: userId,
              details: `Request ${dto.action === ReviewAction.APPROVE ? 'approved' : 'rejected'}.`,
            },
          },
        },
        include: { obligation: true, auditTrail: { orderBy: { timestamp: 'asc' } }, cheque: true },
      });
    });
  }

  async executeDisbursement(id: string, dto: ExecuteDisbursementDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const disbursement = await tx.disbursement.findUnique({
        where: { id },
        include: { obligation: true, cheque: true },
      });

      if (!disbursement) throw new NotFoundException('Disbursement not found.');
      if (disbursement.status !== DisbursementStatus.APPROVED) {
        throw new BadRequestException('Disbursement must be APPROVED to execute.');
      }

      if (disbursement.paymentMethod === PaymentMethod.CHECK && disbursement.cheque?.status === ChequeStatus.CANCELLED_VOID) {
        throw new BadRequestException('Cannot execute because the cheque is cancelled/void.');
      }

      const amountNum = Number(disbursement.amount);
      const executionRefNo = dto.executionRefNo || `PAY-${Math.floor(Math.random() * 900000) + 100000}`;

      const fund = await this.getFundBalance(disbursement.fundSource, tx);
      if (Number(fund.currentBalance) < amountNum) {
        throw new BadRequestException('Insufficient fund balance.');
      }

      await tx.fund.update({
        where: { id: fund.id },
        data: {
          currentBalance: { decrement: amountNum }
        }
      });
      
      const fundAccount = await tx.fundAccount.findUnique({ where: { name: disbursement.fundSource } });
      if (fundAccount) {
        await tx.fundAccount.update({
          where: { name: disbursement.fundSource },
          data: {
            availableBalance: { decrement: amountNum },
            totalBalance: { decrement: amountNum }
          }
        });
      }

      if (disbursement.obligationId && disbursement.obligation) {
        const currentDisbursed = Number(disbursement.obligation.disbursedAmount ?? 0);
        const approvedTotal = Number(disbursement.obligation.approvedAmount ?? disbursement.obligation.originalAmount);
        const newDisbursed = currentDisbursed + amountNum;
        const newRemaining = approvedTotal - newDisbursed; // No max(0) silent clamp
        if (newRemaining < 0) {
          throw new BadRequestException('Execution exceeds approved loan amount.');
        }

        await tx.financialObligation.update({
          where: { id: disbursement.obligationId },
          data: {
            disbursedAmount: new Prisma.Decimal(newDisbursed),
            remainingLoanAmount: new Prisma.Decimal(newRemaining),
            loanStatus: newRemaining === 0 ? 'Fully Disbursed' : 'Partially Disbursed',
          },
        });
      }

      return await tx.disbursement.update({
        where: { id },
        data: {
          status: DisbursementStatus.EXECUTED,
          executionRefNo,
          disbursedBy: userId ? { connect: { id: userId } } : undefined,
          isReadyForReconciliation: true,
          auditTrail: {
            create: {
              disbursementRefNo: disbursement.disbursementRefNo,
              action: 'Payment Executed',
              previousStatus: DisbursementStatus.APPROVED,
              newStatus: DisbursementStatus.EXECUTED,
              userId: userId,
              details: `Funds released. Ref: ${executionRefNo}.`,
            },
          },
        },
        include: { obligation: true, auditTrail: { orderBy: { timestamp: 'asc' } }, cheque: true },
      });
    });
  }

  async updateChequeStatus(id: string, dto: UpdateChequeStatusDto, userId?: string) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: { cheque: true },
    });
    if (!disbursement || !disbursement.cheque) throw new NotFoundException('Cheque not found.');

    return await this.prisma.$transaction(async (tx) => {
      await tx.chequeRecord.update({
        where: { disbursementId: id },
        data: { status: dto.status },
      });

      return await tx.disbursement.update({
        where: { id },
        data: {
          auditTrail: {
            create: {
              disbursementRefNo: disbursement.disbursementRefNo,
              action: `Cheque Status Updated to ${dto.status}`,
              userId: userId,
              details: `Cheque ${disbursement.cheque.chequeNumber} status changed from ${disbursement.cheque.status} to ${dto.status}.`,
            }
          }
        },
        include: { cheque: true, auditTrail: true }
      });
    });
  }

  // FindAll and FindOne are simplified here for brevity, keeping all required fields
  async findAll(query: QueryDisbursementDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DisbursementWhereInput = {};
    if (query.status && query.status !== 'All') {
      const mappedStatus = Object.values(DisbursementStatus).find(s => s.toLowerCase() === query.status?.toLowerCase().replace(' ', '_'));
      if (mappedStatus) where.status = mappedStatus;
    }
    if (query.type) where.type = query.type as DisbursementType;
    if (query.category) where.category = query.category;
    if (query.fundSource) where.fundSource = query.fundSource;
    if (query.chequeStatus) {
      where.cheque = { status: query.chequeStatus as ChequeStatus };
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
          obligation: { include: { member: true } },
          auditTrail: { orderBy: { timestamp: 'asc' } },
          cheque: true,
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
        type: d.type,
        category: d.category,
        amount: Number(d.amount),
        status: d.status,
        date: d.date.toISOString().split('T')[0],
        beneficiary: {
          name: d.beneficiaryName,
          bank: d.beneficiaryBank || '',
          account: d.beneficiaryAccount || '',
        },
        fundSource: d.fundSource,
        method: d.paymentMethod.replace('_', ' '),
        executionRef: d.executionRefNo,
        chequeStatus: d.cheque?.status,
        chequeNumber: d.cheque?.chequeNumber,
        auditTrail: d.auditTrail.map((at) => ({
          action: at.action,
          timestamp: at.timestamp.toISOString(),
          details: at.details,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  async findOne(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id },
      include: {
        obligation: { include: { member: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
        cheque: true,
      },
    });
    if (!disbursement) throw new NotFoundException('Not found');
    return disbursement;
  }
}
