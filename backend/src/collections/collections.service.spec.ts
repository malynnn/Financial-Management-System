import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CollectionStatus, PaymentMethod, Prisma } from '@prisma/client';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { CollectionsService } from './collections.service';

describe('CollectionsService (Sprint 1: CPS-001 — CPS-005)', () => {
  let service: CollectionsService;

  // ─── Mock Data ───────────────────────────────────────────

  const mockMember = {
    id: 'member-001',
    name: 'Juan Dela Cruz',
    email: 'juan@test.com',
    passwordHash: 'hashed',
    role: 'MEMBER',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockCollection = {
    id: 'col-001',
    collectionRefNo: null,
    memberId: 'member-001',
    paymentAmount: new Prisma.Decimal(1500),
    paymentDate: new Date('2026-09-15'),
    paymentMethod: PaymentMethod.GCASH,
    paymentReference: 'GCX-12345',
    description: 'Monthly dues',
    status: CollectionStatus.PENDING,
    rejectReason: null,
    proofOfPaymentPath: null,
    proofOfPaymentName: null,
    isReadyForReconciliation: false,
    reconciledAt: null,
    fundId: null,
    createdAt: new Date('2026-09-15'),
    updatedAt: new Date('2026-09-15'),
    member: { id: 'member-001', name: 'Juan Dela Cruz', email: 'juan@test.com' },
    auditTrail: [],
  };

  const mockCollectionForVerification = {
    ...mockCollection,
    id: 'col-002',
    status: CollectionStatus.FOR_VERIFICATION,
    proofOfPaymentPath: '/uploads/proofs/proof-123.jpg',
    proofOfPaymentName: 'receipt.jpg',
    member: mockMember,
  };

  const mockValidatedCollection = {
    ...mockCollection,
    id: 'col-003',
    status: CollectionStatus.VALIDATED,
    collectionRefNo: 'COL-2026-00001',
    proofOfPaymentPath: '/uploads/proofs/proof-123.jpg',
    proofOfPaymentName: 'receipt.jpg',
  };

  // ─── Mock Prisma Service ─────────────────────────────────

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    collection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    collectionApplication: {
      upsert: jest.fn(),
    },
    collectionAuditLog: {
      findMany: jest.fn(),
    },
    financialObligation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockFundsService = {
    recordPostedTransaction: jest.fn(),
  };

  // ─── Module Setup ────────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FundsService, useValue: mockFundsService },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-001: Submit Collection
  // ═══════════════════════════════════════════════════════════

  describe('CPS-001: Submit Collection', () => {
    const validDto = {
      memberId: 'member-001',
      paymentAmount: 1500,
      paymentDate: '2026-09-15',
      paymentMethod: PaymentMethod.GCASH,
      paymentReference: 'GCX-12345',
      description: 'Monthly dues',
    };

    it('should successfully submit a collection with all required fields', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);
      mockPrismaService.collection.create.mockResolvedValue(mockCollection);

      const result = await service.submitCollection(validDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-001' },
      });
      expect(mockPrismaService.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'member-001',
            paymentAmount: 1500,
            paymentMethod: PaymentMethod.GCASH,
            status: CollectionStatus.PENDING,
          }),
        }),
      );
    });

    it('should accept submission without paymentReference (optional per revision)', async () => {
      const dtoWithoutRef = { ...validDto, paymentReference: undefined };
      mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.collection.create.mockResolvedValue({
        ...mockCollection,
        paymentReference: '',
      });

      const result = await service.submitCollection(dtoWithoutRef);

      expect(result).toBeDefined();
      // Should NOT call findFirst for duplicate check when no reference
      expect(mockPrismaService.collection.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentReference: '',
          }),
        }),
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.submitCollection(validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitCollection(validDto)).rejects.toThrow(
        'Member with ID "member-001" not found',
      );
    });

    it('should throw ConflictException when duplicate reference exists for same member and method', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);

      await expect(service.submitCollection(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create audit trail entry on successful submission', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);
      mockPrismaService.collection.create.mockResolvedValue(mockCollection);

      await service.submitCollection(validDto);

      const createCall = mockPrismaService.collection.create.mock.calls[0][0];
      expect(createCall.data.auditTrail.create).toBeDefined();
      expect(createCall.data.auditTrail.create.action).toBe('Collection Record Created');
      expect(createCall.data.auditTrail.create.newStatus).toBe(CollectionStatus.PENDING);
      expect(createCall.data.auditTrail.create.role).toBe('Member');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-002: Upload Proof of Payment
  // ═══════════════════════════════════════════════════════════

  describe('CPS-002: Upload Proof of Payment', () => {
    const mockFile: Partial<Express.Multer.File> = {
      path: '/uploads/proofs/proof-123.jpg',
      originalname: 'receipt.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1 MB
    };

    it('should successfully upload proof and transition PENDING to FOR_VERIFICATION', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollection,
        status: CollectionStatus.FOR_VERIFICATION,
        proofOfPaymentPath: mockFile.path,
        proofOfPaymentName: mockFile.originalname,
      });

      const result = await service.uploadProof('col-001', mockFile as Express.Multer.File);

      expect(result.status).toBe(CollectionStatus.FOR_VERIFICATION);
      expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            proofOfPaymentPath: mockFile.path,
            proofOfPaymentName: mockFile.originalname,
            status: CollectionStatus.FOR_VERIFICATION,
          }),
        }),
      );
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        service.uploadProof('col-001', null as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadProof('col-001', null as any),
      ).rejects.toThrow('No proof file was uploaded.');
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/zip' };

      await expect(
        service.uploadProof('col-001', invalidFile as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadProof('col-001', invalidFile as Express.Multer.File),
      ).rejects.toThrow('File type not allowed');
    });

    it('should throw BadRequestException when file exceeds 5 MB', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 }; // 6 MB

      await expect(
        service.uploadProof('col-001', largeFile as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadProof('col-001', largeFile as Express.Multer.File),
      ).rejects.toThrow('File size exceeds the 5 MB limit');
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadProof('nonexistent', mockFile as Express.Multer.File),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not change status if collection is already past PENDING', async () => {
      const validatedCollection = {
        ...mockCollection,
        status: CollectionStatus.VALIDATED,
      };
      mockPrismaService.collection.findUnique.mockResolvedValue(validatedCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...validatedCollection,
        proofOfPaymentPath: mockFile.path,
      });

      await service.uploadProof('col-001', mockFile as Express.Multer.File);

      expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CollectionStatus.VALIDATED, // keeps existing status
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-003: Retrieve Pending Collection Queue
  // ═══════════════════════════════════════════════════════════

  describe('CPS-003: Retrieve Pending Collection Queue', () => {
    it('should return only PENDING and FOR_VERIFICATION collections', async () => {
      const pendingCollections = [
        { ...mockCollection, status: CollectionStatus.PENDING },
        { ...mockCollectionForVerification, status: CollectionStatus.FOR_VERIFICATION },
      ];
      mockPrismaService.collection.findMany.mockResolvedValue(pendingCollections);

      const result = await service.getPendingQueue();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: [CollectionStatus.PENDING, CollectionStatus.FOR_VERIFICATION] },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no pending collections exist', async () => {
      mockPrismaService.collection.findMany.mockResolvedValue([]);

      const result = await service.getPendingQueue();

      expect(result).toHaveLength(0);
    });

    it('should not include VALIDATED, POSTED, or REJECTED collections', async () => {
      mockPrismaService.collection.findMany.mockResolvedValue([]);

      await service.getPendingQueue();

      const queryArg = mockPrismaService.collection.findMany.mock.calls[0][0];
      const statusFilter = queryArg.where.status.in;
      expect(statusFilter).not.toContain(CollectionStatus.VALIDATED);
      expect(statusFilter).not.toContain(CollectionStatus.POSTED);
      expect(statusFilter).not.toContain(CollectionStatus.REJECTED);
    });

    it('should order results by createdAt descending (newest first)', async () => {
      mockPrismaService.collection.findMany.mockResolvedValue([]);

      await service.getPendingQueue();

      const queryArg = mockPrismaService.collection.findMany.mock.calls[0][0];
      expect(queryArg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-004: Validate Submitted Payment Details
  // ═══════════════════════════════════════════════════════════

  describe('CPS-004: Validate Submitted Payment Details', () => {
    it('should successfully validate a FOR_VERIFICATION collection with all fields', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollectionForVerification);
      mockPrismaService.collection.findFirst.mockResolvedValue(null); // no duplicate
      mockPrismaService.collection.count.mockResolvedValue(0);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollectionForVerification,
        status: CollectionStatus.VALIDATED,
        collectionRefNo: 'COL-2026-00001',
      });

      const result = await service.validateCollection('col-002');

      expect(result.status).toBe(CollectionStatus.VALIDATED);
      expect(result.collectionRefNo).toBe('COL-2026-00001');
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(null);

      await expect(service.validateCollection('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when collection is already POSTED (status guard)', async () => {
      const postedCollection = {
        ...mockCollection,
        status: CollectionStatus.POSTED,
        member: mockMember,
      };
      mockPrismaService.collection.findUnique.mockResolvedValue(postedCollection);

      await expect(service.validateCollection('col-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCollection('col-001')).rejects.toThrow(
        'Cannot validate collection with status',
      );
    });

    it('should throw BadRequestException when collection is REJECTED (status guard)', async () => {
      const rejectedCollection = {
        ...mockCollection,
        status: CollectionStatus.REJECTED,
        member: mockMember,
      };
      mockPrismaService.collection.findUnique.mockResolvedValue(rejectedCollection);

      await expect(service.validateCollection('col-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      const incompleteCollection = {
        ...mockCollection,
        status: CollectionStatus.FOR_VERIFICATION,
        paymentReference: '',
        proofOfPaymentPath: null,
        member: mockMember,
      };
      mockPrismaService.collection.findUnique.mockResolvedValue(incompleteCollection);

      await expect(service.validateCollection('col-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCollection('col-001')).rejects.toThrow(
        'Validation failed',
      );
    });

    it('should reject whitespace-only payment reference', async () => {
      const whitespaceRefCollection = {
        ...mockCollectionForVerification,
        paymentReference: '   ',
      };
      mockPrismaService.collection.findUnique.mockResolvedValue(whitespaceRefCollection);

      await expect(service.validateCollection('col-002')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCollection('col-002')).rejects.toThrow(
        'Payment Reference',
      );
    });

    it('should generate a unique collection reference number (COL-YYYY-NNNNN)', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollectionForVerification);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);
      mockPrismaService.collection.count.mockResolvedValue(5);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollectionForVerification,
        status: CollectionStatus.VALIDATED,
        collectionRefNo: `COL-${new Date().getFullYear()}-00006`,
      });

      await service.validateCollection('col-002');

      const updateCall = mockPrismaService.collection.update.mock.calls[0][0];
      expect(updateCall.data.collectionRefNo).toMatch(/^COL-\d{4}-\d{5}$/);
    });

    it('should create audit trail entry with actor info', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollectionForVerification);
      mockPrismaService.collection.findFirst.mockResolvedValue(null);
      mockPrismaService.collection.count.mockResolvedValue(0);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollectionForVerification,
        status: CollectionStatus.VALIDATED,
        collectionRefNo: 'COL-2026-00001',
      });

      await service.validateCollection('col-002', 'Maria Santos', 'Treasurer');

      const updateCall = mockPrismaService.collection.update.mock.calls[0][0];
      expect(updateCall.data.auditTrail.create.actor).toBe('Maria Santos');
      expect(updateCall.data.auditTrail.create.role).toBe('Treasurer');
      expect(updateCall.data.auditTrail.create.action).toBe('Collection Validated');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-005: Detect Duplicate Payments
  // ═══════════════════════════════════════════════════════════

  describe('CPS-005: Detect Duplicate Payments', () => {
    describe('checkDuplicate()', () => {
      it('should detect duplicate when same reference, member, and method exist', async () => {
        mockPrismaService.collection.findFirst.mockResolvedValue(mockCollection);

        const result = await service.checkDuplicate('GCX-12345', undefined, 'member-001', 'GCASH');

        expect(result.isDuplicate).toBe(true);
        expect(result.existingCollection).toBeDefined();
      });

      it('should NOT flag as duplicate when same reference but different member', async () => {
        mockPrismaService.collection.findFirst.mockResolvedValue(null);

        const result = await service.checkDuplicate('GCX-12345', undefined, 'member-999', 'GCASH');

        expect(result.isDuplicate).toBe(false);
        expect(result.existingCollection).toBeNull();
      });

      it('should NOT flag as duplicate when reference is from a REJECTED collection', async () => {
        mockPrismaService.collection.findFirst.mockResolvedValue(null);

        const result = await service.checkDuplicate('GCX-12345');

        expect(result.isDuplicate).toBe(false);
        expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: { not: CollectionStatus.REJECTED },
            }),
          }),
        );
      });

      it('should exclude specified collection ID from duplicate check', async () => {
        mockPrismaService.collection.findFirst.mockResolvedValue(null);

        await service.checkDuplicate('GCX-12345', 'col-001');

        expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: { not: 'col-001' },
            }),
          }),
        );
      });

      it('should pass memberId and paymentMethod to the query when provided', async () => {
        mockPrismaService.collection.findFirst.mockResolvedValue(null);

        await service.checkDuplicate('GCX-12345', undefined, 'member-001', 'GCASH');

        expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              paymentReference: 'GCX-12345',
              memberId: 'member-001',
              paymentMethod: 'GCASH',
            }),
          }),
        );
      });
    });

    describe('Duplicate detection during validateCollection()', () => {
      it('should reject collection and throw ConflictException when duplicate is detected', async () => {
        const existingDuplicate = {
          ...mockCollection,
          id: 'col-existing',
        };

        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollectionForVerification);
        mockPrismaService.collection.findFirst.mockResolvedValue(existingDuplicate);
        mockPrismaService.collection.update.mockResolvedValue({
          ...mockCollectionForVerification,
          status: CollectionStatus.REJECTED,
        });

        await expect(service.validateCollection('col-002')).rejects.toThrow(
          ConflictException,
        );

        // Should have updated collection to REJECTED with reason
        expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: CollectionStatus.REJECTED,
              rejectReason: expect.stringContaining('Duplicate payment reference'),
            }),
          }),
        );
      });

      it('should match on memberId and paymentMethod during validation duplicate check', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollectionForVerification);
        mockPrismaService.collection.findFirst.mockResolvedValue(null);
        mockPrismaService.collection.count.mockResolvedValue(0);
        mockPrismaService.collection.update.mockResolvedValue({
          ...mockCollectionForVerification,
          status: CollectionStatus.VALIDATED,
          collectionRefNo: 'COL-2026-00001',
        });

        await service.validateCollection('col-002');

        expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              memberId: mockCollectionForVerification.memberId,
              paymentMethod: mockCollectionForVerification.paymentMethod,
            }),
          }),
        );
      });
    });

    describe('Duplicate detection during submitCollection()', () => {
      it('should skip duplicate check when paymentReference is not provided', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
        mockPrismaService.collection.create.mockResolvedValue({
          ...mockCollection,
          paymentReference: '',
        });

        await service.submitCollection({
          memberId: 'member-001',
          paymentAmount: 1500,
          paymentDate: '2026-09-15',
          paymentMethod: PaymentMethod.GCASH,
        });

        expect(mockPrismaService.collection.findFirst).not.toHaveBeenCalled();
      });

      it('should check duplicate with memberId and paymentMethod when reference is provided', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockMember);
        mockPrismaService.collection.findFirst.mockResolvedValue(null);
        mockPrismaService.collection.create.mockResolvedValue(mockCollection);

        await service.submitCollection({
          memberId: 'member-001',
          paymentAmount: 1500,
          paymentDate: '2026-09-15',
          paymentMethod: PaymentMethod.GCASH,
          paymentReference: 'GCX-12345',
        });

        expect(mockPrismaService.collection.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              paymentReference: 'GCX-12345',
              memberId: 'member-001',
              paymentMethod: PaymentMethod.GCASH,
            }),
          }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-006: Classify Collection Category
  // ═══════════════════════════════════════════════════════════

  describe('CPS-006: Classify Collection Category', () => {
    it('should successfully classify a collection with a category', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollection,
        collectionCategory: 'Dues',
      });

      const result = await service.classifyCollection('col-001', { collectionCategory: 'Dues' });

      expect(result.collectionCategory).toBe('Dues');
      expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            collectionCategory: 'Dues',
          }),
        }),
      );
    });

    it('should create audit trail entry when classifying', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.collection.update.mockResolvedValue({
        ...mockCollection,
        collectionCategory: 'Loan Repayment',
      });

      await service.classifyCollection('col-001', { collectionCategory: 'Loan Repayment' });

      const updateCall = mockPrismaService.collection.update.mock.calls[0][0];
      expect(updateCall.data.auditTrail.create.action).toBe('Collection Classified');
      expect(updateCall.data.auditTrail.create.details).toContain('Loan Repayment');
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(null);

      await expect(
        service.classifyCollection('nonexistent', { collectionCategory: 'Dues' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when collection is already POSTED', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue({
        ...mockCollection,
        status: CollectionStatus.POSTED,
      });

      await expect(
        service.classifyCollection('col-001', { collectionCategory: 'Dues' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.classifyCollection('col-001', { collectionCategory: 'Dues' }),
      ).rejects.toThrow('Cannot reclassify a collection that has already been posted');
    });

    it('should throw BadRequestException when collection is REJECTED', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue({
        ...mockCollection,
        status: CollectionStatus.REJECTED,
      });

      await expect(
        service.classifyCollection('col-001', { collectionCategory: 'Dues' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.classifyCollection('col-001', { collectionCategory: 'Dues' }),
      ).rejects.toThrow('Cannot classify a rejected collection');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-007: Identify Related Financial Obligation
  // ═══════════════════════════════════════════════════════════

  describe('CPS-007: Identify Related Financial Obligation', () => {
    const mockObligation = {
      id: 'obl-001',
      memberId: 'member-001',
      obligationType: 'Annual Dues',
      originalAmount: new Prisma.Decimal(5000),
      outstandingBalance: new Prisma.Decimal(3000),
      status: 'UNPAID',
      member: { id: 'member-001', name: 'Juan Dela Cruz', email: 'juan@test.com' },
    };

    it('should successfully identify an eligible receivable', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);

      const result = await service.identifyReceivable('col-001', 'obl-001');

      expect(result.isEligible).toBe(true);
      expect(result.obligationId).toBe('obl-001');
      expect(result.obligationType).toBe('Annual Dues');
      expect(result.outstandingBalance).toBe(3000);
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(null);

      await expect(
        service.identifyReceivable('nonexistent', 'obl-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when obligation does not exist', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue(null);

      await expect(
        service.identifyReceivable('col-001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when obligation belongs to a different member', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue({
        ...mockObligation,
        memberId: 'member-999',
      });

      await expect(
        service.identifyReceivable('col-001', 'obl-001'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.identifyReceivable('col-001', 'obl-001'),
      ).rejects.toThrow('belongs to a different member');
    });

    it('should throw BadRequestException when obligation has zero outstanding balance', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue({
        ...mockObligation,
        outstandingBalance: new Prisma.Decimal(0),
      });

      await expect(
        service.identifyReceivable('col-001', 'obl-001'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.identifyReceivable('col-001', 'obl-001'),
      ).rejects.toThrow('has no outstanding balance');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-009: Payment Exception Classification
  // ═══════════════════════════════════════════════════════════

  describe('CPS-009: Payment Exception Classification', () => {
    const mockObligation = {
      id: 'obl-001',
      memberId: 'member-001',
      obligationType: 'Annual Dues',
      originalAmount: new Prisma.Decimal(5000),
      outstandingBalance: new Prisma.Decimal(3000),
      status: 'UNPAID',
    };

    describe('previewApplication()', () => {
      it('should classify as "Partial Payment" when amount < outstanding balance', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
        mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);

        const result = await service.previewApplication('col-001', {
          obligationId: 'obl-001',
          appliedAmount: 1000,
        });

        expect(result.exceptionStatus).toBe('Partial Payment');
        expect(result.remainingBalance).toBe(2000);
        expect(result.classificationReason).toContain('less than the outstanding balance');
      });

      it('should classify as "Exact Match" when amount === outstanding balance', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
        mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);

        const result = await service.previewApplication('col-001', {
          obligationId: 'obl-001',
          appliedAmount: 3000,
        });

        expect(result.exceptionStatus).toBe('Exact Match');
        expect(result.remainingBalance).toBe(0);
        expect(result.classificationReason).toContain('exactly matches');
      });

      it('should classify as "Overpayment" when amount > outstanding balance', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
        mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);

        const result = await service.previewApplication('col-001', {
          obligationId: 'obl-001',
          appliedAmount: 5000,
        });

        expect(result.exceptionStatus).toBe('Overpayment');
        expect(result.remainingBalance).toBe(0);
        expect(result.classificationReason).toContain('exceeds the outstanding balance');
      });

      it('should classify as "Unapplied" when no obligation is specified', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);

        const result = await service.previewApplication('col-001', {});

        expect(result.exceptionStatus).toBe('Unapplied');
        expect(result.classificationReason).toContain('No financial obligation was specified');
      });

      it('should classify as "Unapplied" when obligationId is "unapplied"', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);

        const result = await service.previewApplication('col-001', {
          obligationId: 'unapplied',
        });

        expect(result.exceptionStatus).toBe('Unapplied');
      });

      it('should classify as "Unapplied" when obligation has zero outstanding balance', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
        mockPrismaService.financialObligation.findUnique.mockResolvedValue({
          ...mockObligation,
          outstandingBalance: new Prisma.Decimal(0),
          status: 'Fully Paid',
        });

        const result = await service.previewApplication('col-001', {
          obligationId: 'obl-001',
          appliedAmount: 1000,
        });

        expect(result.exceptionStatus).toBe('Unapplied');
        expect(result.classificationReason).toContain('has no outstanding balance');
      });

      it('should include classificationReason in all responses', async () => {
        mockPrismaService.collection.findUnique.mockResolvedValue(mockCollection);
        mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);

        const result = await service.previewApplication('col-001', {
          obligationId: 'obl-001',
          appliedAmount: 1000,
        });

        expect(result.classificationReason).toBeDefined();
        expect(typeof result.classificationReason).toBe('string');
        expect(result.classificationReason.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-010: Update Outstanding Balance
  // ═══════════════════════════════════════════════════════════
  describe('CPS-010: Update Outstanding Balance', () => {
    it('should set obligation to Fully Paid when remaining balance is zero', async () => {
      const mockObligation = {
        id: 'obl-001',
        memberId: 'member-001',
        outstandingBalance: new Prisma.Decimal(5000),
      };
      const mockCol = { ...mockCollection, collectionCategory: 'Dues', status: CollectionStatus.VALIDATED };

      mockPrismaService.collection.findUnique.mockResolvedValue(mockCol);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);
      mockPrismaService.collection.update.mockResolvedValue({ ...mockCol, status: CollectionStatus.POSTED });

      await service.applyPayment('col-001', {
        obligationId: 'obl-001',
        appliedAmount: 5000,
      });

      expect(mockPrismaService.financialObligation.update).toHaveBeenCalledWith({
        where: { id: 'obl-001' },
        data: expect.objectContaining({
          outstandingBalance: 0,
          status: 'Fully Paid',
        }),
      });
    });

    it('should set obligation to PARTIALLY_PAID when remaining balance > 0', async () => {
      const mockObligation = {
        id: 'obl-001',
        memberId: 'member-001',
        outstandingBalance: new Prisma.Decimal(5000),
      };
      const mockCol = { ...mockCollection, collectionCategory: 'Dues', status: CollectionStatus.VALIDATED };

      mockPrismaService.collection.findUnique.mockResolvedValue(mockCol);
      mockPrismaService.financialObligation.findUnique.mockResolvedValue(mockObligation);
      mockPrismaService.collection.update.mockResolvedValue({ ...mockCol, status: CollectionStatus.POSTED });

      await service.applyPayment('col-001', {
        obligationId: 'obl-001',
        appliedAmount: 3000,
      });

      expect(mockPrismaService.financialObligation.update).toHaveBeenCalledWith({
        where: { id: 'obl-001' },
        data: expect.objectContaining({
          outstandingBalance: 2000,
          status: 'PARTIALLY_PAID',
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-011: Post Completed Collection
  // ═══════════════════════════════════════════════════════════
  describe('CPS-011: Post Completed Collection', () => {
    it('should post a validated collection successfully', async () => {
      const mockCol = { ...mockCollection, status: CollectionStatus.VALIDATED, collectionCategory: 'Dues', collectionRefNo: 'COL-123' };
      mockPrismaService.collection.findUnique.mockResolvedValue(mockCol);
      mockPrismaService.collection.update.mockResolvedValue({ ...mockCol, status: CollectionStatus.POSTED });

      const result = await service.applyPayment('col-001', { obligationId: 'unapplied' });

      expect(mockPrismaService.collection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CollectionStatus.POSTED,
          }),
        }),
      );
      expect(result.status).toBe(CollectionStatus.POSTED);
    });

    it('should prevent posting if collection is already POSTED', async () => {
      mockPrismaService.collection.findUnique.mockResolvedValue({
        ...mockCollection,
        status: CollectionStatus.POSTED,
      });

      await expect(service.applyPayment('col-001', {})).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-012: Maintain Collection Audit Trail
  // ═══════════════════════════════════════════════════════════
  describe('CPS-012: Maintain Collection Audit Trail', () => {
    it('should retrieve audit logs', async () => {
      const mockLogs = [
        { id: 'log1', collectionId: 'col-001', action: 'Payment Posted' },
      ];
      mockPrismaService.collectionAuditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('col-001');

      expect(mockPrismaService.collectionAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { collectionId: 'col-001' },
          orderBy: { timestamp: 'desc' },
        }),
      );
      expect(result).toEqual(mockLogs);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CPS-013: Monitor Collection Totals & Categories
  // ═══════════════════════════════════════════════════════════
  describe('CPS-013: Monitor Collection Totals & Categories', () => {
    it('should aggregate totals correctly and separate loan repayments', async () => {
      const mockCollections = [
        { id: 'col1', paymentAmount: new Prisma.Decimal(1000), collectionCategory: 'Dues' },
        { id: 'col2', paymentAmount: new Prisma.Decimal(500), collectionCategory: 'Loan Repayment' },
        { id: 'col3', paymentAmount: new Prisma.Decimal(200), collectionCategory: 'Dues' },
      ];

      mockPrismaService.collection.findMany.mockResolvedValue(mockCollections);

      const result = await service.getCollectionTotals({});

      expect(result.grandTotal).toBe(1700);
      expect(result.loanRepaymentsTotal).toBe(500);
      expect(result.byCategory['Dues']).toBe(1200);
      expect(result.byCategory['Loan Repayment']).toBe(500);
    });

    it('should apply filters to the query', async () => {
      mockPrismaService.collection.findMany.mockResolvedValue([]);

      await service.getCollectionTotals({
        category: 'Dues',
        memberId: 'mem1',
        source: 'CASH',
      });

      expect(mockPrismaService.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CollectionStatus.POSTED,
            collectionCategory: 'Dues',
            memberId: 'mem1',
            paymentMethod: 'CASH',
          }),
        }),
      );
    });
  });
});

