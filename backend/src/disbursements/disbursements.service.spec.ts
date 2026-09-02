import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DisbursementsService } from './disbursements.service';
import { ReviewAction } from './dto/review-disbursement.dto';

describe('DisbursementsService (Sprint 2: DMP-001 - DMP-014)', () => {
  let service: DisbursementsService;
  let prisma: PrismaService;

  const mockApprovedObligation = {
    id: 'obl-loan-1',
    memberId: 'user-member-1',
    obligationType: 'Emergency Loan',
    originalAmount: new Prisma.Decimal(50000),
    outstandingBalance: new Prisma.Decimal(50000),
    status: 'APPROVED',
    loanStatus: 'Approved',
    approvedAmount: new Prisma.Decimal(50000),
    disbursedAmount: new Prisma.Decimal(0),
    remainingLoanAmount: new Prisma.Decimal(50000),
    beneficiaryName: 'Juan Dela Cruz',
    beneficiaryBank: 'BDO',
    beneficiaryAccount: '00123456789',
    fundSource: 'General Fund',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'user-member-1',
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
    },
  };

  const mockFundAccount = {
    id: 'fund-gen-1',
    name: 'General Fund',
    totalBalance: new Prisma.Decimal(500000),
    availableBalance: new Prisma.Decimal(450000),
    reservedBalance: new Prisma.Decimal(50000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    financialObligation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fundAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    disbursement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisbursementsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DisbursementsService>(DisbursementsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('DMP-001: Retrieve approved loan information', () => {
    it('should retrieve only approved loan obligations eligible for disbursement', async () => {
      mockPrismaService.financialObligation.findMany.mockResolvedValue([mockApprovedObligation]);
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);

      const result = await service.getEligibleApprovedLoans();

      expect(prisma.financialObligation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { loanStatus: { equals: 'Approved', mode: 'insensitive' } },
              { status: { equals: 'APPROVED', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('obl-loan-1');
      expect(result[0].member).toBe('Juan Dela Cruz');
      expect(result[0].approvedAmount).toBe(50000);
      expect(result[0].remainingAmount).toBe(50000);
      expect(result[0].availableFund).toBe(450000);
    });
  });

  describe('DMP-004: Beneficiary Verification Rule', () => {
    it('should pass when beneficiary name matches approved member/loan data', () => {
      expect(() => {
        service.verifyBeneficiary(
          { memberId: 'user-member-1', beneficiaryName: 'Juan Dela Cruz', member: { name: 'Juan Dela Cruz' } },
          'Juan Dela Cruz',
          'user-member-1',
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when member ID does not match linked loan', () => {
      expect(() => {
        service.verifyBeneficiary(
          { memberId: 'user-member-1', beneficiaryName: 'Juan Dela Cruz', member: { name: 'Juan Dela Cruz' } },
          'Juan Dela Cruz',
          'user-member-different',
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when beneficiary name does not match approved record', () => {
      expect(() => {
        service.verifyBeneficiary(
          { memberId: 'user-member-1', beneficiaryName: 'Juan Dela Cruz', member: { name: 'Juan Dela Cruz' } },
          'Maria Santos',
          'user-member-1',
        );
      }).toThrow(BadRequestException);
    });
  });

  describe('DMP-005: Verify approved loan amount limit', () => {
    it('should pass when requested amount is less than or equal to remaining loan amount', () => {
      expect(() => {
        service.verifyLoanAmount(50000, 25000);
      }).not.toThrow();
    });

    it('should throw BadRequestException when requested amount exceeds remaining loan amount', () => {
      expect(() => {
        service.verifyLoanAmount(50000, 60000);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when requested amount is zero or negative', () => {
      expect(() => {
        service.verifyLoanAmount(50000, 0);
      }).toThrow(BadRequestException);
    });
  });

  describe('DMP-006: Verify fund balance availability', () => {
    it('should allow disbursement when Available Fund >= requested amount', async () => {
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);

      const fund = await service.verifyFundAvailability('General Fund', 100000);
      expect(fund.availableBalance).toBe(450000);
    });

    it('should reject disbursement when Available Fund < requested amount', async () => {
      mockPrismaService.fundAccount.findUnique.mockResolvedValue({
        ...mockFundAccount,
        availableBalance: new Prisma.Decimal(30000),
      });

      await expect(service.verifyFundAvailability('General Fund', 50000)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('DMP-007: Final Amount Validation Rule', () => {
    it('should validate successfully when amount is within both remaining loan and available fund', async () => {
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);

      const result = await service.validateFinalDisbursementAmount(50000, 'General Fund', 25000);
      expect(result.isValid).toBe(true);
      expect(result.disbursementAmount).toBe(25000);
    });

    it('should reject when requested amount exceeds remaining loan amount', async () => {
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);

      await expect(
        service.validateFinalDisbursementAmount(20000, 'General Fund', 25000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when requested amount exceeds available fund balance', async () => {
      mockPrismaService.fundAccount.findUnique.mockResolvedValue({
        ...mockFundAccount,
        availableBalance: new Prisma.Decimal(10000),
      });

      await expect(
        service.validateFinalDisbursementAmount(50000, 'General Fund', 25000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DMP-002 & DMP-003: Create disbursement request', () => {
    it('should create disbursement request with PENDING_APPROVAL status and audit trail', async () => {
      mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockApprovedObligation);
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);
      mockPrismaService.disbursement.create.mockImplementation((args) => ({
        id: 'disb-test-1',
        ...args.data,
      }));

      const dto = {
        obligationId: 'obl-loan-1',
        memberId: 'user-member-1',
        amount: 30000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        fundSource: 'General Fund',
        beneficiaryName: 'Juan Dela Cruz',
        beneficiaryBank: 'BDO',
        beneficiaryAccount: '00123456789',
        description: 'First loan tranche',
      };

      const result = await service.createDisbursementRequest(dto);

      expect(result.status).toBe(DisbursementStatus.PENDING_APPROVAL);
      expect(prisma.disbursement.create).toHaveBeenCalled();
    });

    it('should reject creation if loan obligation status is not Approved', async () => {
      mockPrismaService.financialObligation.findUnique.mockResolvedValue({
        ...mockApprovedObligation,
        status: 'REJECTED',
        loanStatus: 'Rejected',
      });

      const dto = {
        obligationId: 'obl-loan-1',
        memberId: 'user-member-1',
        amount: 30000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        fundSource: 'General Fund',
        beneficiaryName: 'Juan Dela Cruz',
      };

      await expect(service.createDisbursementRequest(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('DMP-008: Authorized Approval Rule', () => {
    it('should allow approval when disbursement passes fund availability check', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.PENDING_APPROVAL,
        amount: new Prisma.Decimal(25000),
        fundSource: 'General Fund',
        disbursementRefNo: 'REQ-1001',
      });
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);
      mockPrismaService.disbursement.update.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.APPROVED,
      });

      const result = await service.reviewDisbursement('disb-1', {
        action: ReviewAction.APPROVE,
        reviewerName: 'Admin Officer',
      });

      expect(result.status).toBe(DisbursementStatus.APPROVED);
    });

    it('should reject approval if Available Fund is less than requested amount', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.PENDING_APPROVAL,
        amount: new Prisma.Decimal(500000),
        fundSource: 'General Fund',
        disbursementRefNo: 'REQ-1001',
      });
      mockPrismaService.fundAccount.findUnique.mockResolvedValue({
        ...mockFundAccount,
        availableBalance: new Prisma.Decimal(100000),
      });

      await expect(
        service.reviewDisbursement('disb-1', {
          action: ReviewAction.APPROVE,
          reviewerName: 'Admin Officer',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DMP-009, DMP-010, DMP-011, DMP-012, DMP-014: Payment Execution & Recording', () => {
    it('DMP-009: should reject payment execution if status is not Approved (e.g. PENDING_APPROVAL)', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.PENDING_APPROVAL,
        amount: new Prisma.Decimal(25000),
      });

      await expect(
        service.executeDisbursement('disb-1', { executionRefNo: 'PAY-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('DMP-010, DMP-011, DMP-012, DMP-014: should execute payment, update balances, record audit trail, and mark ready for reconciliation', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.APPROVED,
        amount: new Prisma.Decimal(25000),
        disbursementRefNo: 'REQ-1001',
        fundSource: 'General Fund',
        obligationId: 'obl-loan-1',
        obligation: {
          id: 'obl-loan-1',
          approvedAmount: new Prisma.Decimal(50000),
          disbursedAmount: new Prisma.Decimal(0),
          originalAmount: new Prisma.Decimal(50000),
        },
      });
      mockPrismaService.fundAccount.findUnique.mockResolvedValue(mockFundAccount);
      mockPrismaService.fundAccount.update.mockResolvedValue(mockFundAccount);
      mockPrismaService.financialObligation.update.mockResolvedValue({});
      mockPrismaService.disbursement.update.mockImplementation((args) => ({
        id: 'disb-1',
        ...args.data,
      }));

      const result = await service.executeDisbursement('disb-1', {
        executionRefNo: 'PAY-991234',
        executorName: 'Treasurer Colinares',
      });

      expect(result.status).toBe(DisbursementStatus.EXECUTED);
      expect(result.isReadyForReconciliation).toBe(true);
      expect(result.executionRefNo).toBe('PAY-991234');
      expect(prisma.fundAccount.update).toHaveBeenCalled();
      expect(prisma.financialObligation.update).toHaveBeenCalled();
    });
  });

  describe('DMP-013: Status & Transaction History', () => {
    it('should return complete status history and audit trail timeline', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        disbursementRefNo: 'REQ-1001',
        status: DisbursementStatus.EXECUTED,
        amount: new Prisma.Decimal(25000),
        fundSource: 'General Fund',
        beneficiaryName: 'Juan Dela Cruz',
        isReadyForReconciliation: true,
        auditTrail: [
          {
            id: 'at-1',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Treasurer',
            role: 'Treasurer',
            timestamp: new Date(),
            details: 'Requested ₱25,000',
          },
          {
            id: 'at-2',
            action: 'Payment Executed',
            previousStatus: DisbursementStatus.APPROVED,
            newStatus: DisbursementStatus.EXECUTED,
            actor: 'Treasurer',
            role: 'Treasurer',
            timestamp: new Date(),
            details: 'Funds released with ref PAY-991234',
          },
        ],
      });

      const result = await service.getDisbursementHistory('disb-1');

      expect(result.id).toBe('disb-1');
      expect(result.status).toBe('Executed');
      expect(result.isReadyForReconciliation).toBe(true);
      expect(result.history).toHaveLength(2);
    });
  });

  describe('DMP-014: Bank Reconciliation Readiness', () => {
    it('should retrieve all completed disbursements ready for reconciliation', async () => {
      mockPrismaService.disbursement.findMany.mockResolvedValue([
        {
          id: 'disb-1',
          disbursementRefNo: 'REQ-1001',
          executionRefNo: 'PAY-991234',
          amount: new Prisma.Decimal(25000),
          fundSource: 'General Fund',
          beneficiaryName: 'Juan Dela Cruz',
          status: DisbursementStatus.EXECUTED,
          isReadyForReconciliation: true,
          reconciledAt: null,
          date: new Date(),
          obligation: { member: { name: 'Juan Dela Cruz' } },
        },
      ]);

      const records = await service.getReconciliationReadyDisbursements();

      expect(records).toHaveLength(1);
      expect(records[0].disbursementRefNo).toBe('REQ-1001');
      expect(records[0].isReconciled).toBe(false);
    });

    it('should mark executed disbursement as reconciled', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.EXECUTED,
        disbursementRefNo: 'REQ-1001',
      });
      mockPrismaService.disbursement.update.mockResolvedValue({
        id: 'disb-1',
        reconciledAt: new Date(),
      });

      const res = await service.markReconciled('disb-1', 'Auditor Santos');
      expect(prisma.disbursement.update).toHaveBeenCalled();
    });

    it('should throw error if attempting to reconcile non-executed disbursement', async () => {
      mockPrismaService.disbursement.findUnique.mockResolvedValue({
        id: 'disb-1',
        status: DisbursementStatus.PENDING_APPROVAL,
      });

      await expect(service.markReconciled('disb-1')).rejects.toThrow(BadRequestException);
    });
  });
});
