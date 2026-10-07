import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CollectionStatus } from '@prisma/client';
import { FundsService } from '../funds/funds.service';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_METHOD_CONFIG } from './collections.config';
import { ApplyPaymentDto } from './dto/apply-payment.dto';
import { ClassifyCollectionDto } from './dto/classify-collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { RejectCollectionDto } from './dto/reject-collection.dto';

// CPS-002: allowed file types and configurable max size
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — configurable limit (can be moved to env/config)

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly fundsService?: FundsService,
  ) {}

  /**
   * CPS-001 – CPS-005 & CPS-012: Create a collection record.
   * - CPS-003: reject empty/invalid inputs (amount <= 0, blank fields, future date)
   * - CPS-004: only configured payment methods are accepted
   * - CPS-005: payment reference required when the method requires one
   * - CPS-002: a unique Collection Reference Number is generated on creation
   * Also rejects duplicate payment references.
   */
  async assertValidMember(memberId: string) {
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role !== 'MEMBER') throw new BadRequestException('User is not a member');
    if (!member.isActive) throw new BadRequestException('Member is inactive');
    return member;
  }

  async assertValidObligation(obligationId: string, memberId: string) {
    const ob = await this.prisma.financialObligation.findUnique({ where: { id: obligationId } });
    if (!ob) throw new NotFoundException('Obligation not found');
    if (ob.memberId !== memberId) throw new BadRequestException('Obligation does not belong to member');
    if (Number(ob.outstandingBalance) <= 0) throw new BadRequestException('Obligation has no outstanding balance');
    return ob;
  }

  async findPostedDuplicate(memberId: string, paymentReference: string | undefined, paymentAmount: number) {
    return this.prisma.collection.findFirst({
      where: {
        memberId,
        paymentAmount,
        status: CollectionStatus.POSTED,
        ...(paymentReference ? { paymentReference } : {}),
      }
    });
  }

  async submitCollection(dto: CreateCollectionDto) {
    // CPS-003: input validation (defence in depth beyond the DTO)
    const errors: { field: string; message: string }[] = [];
    if (!dto.memberId?.trim()) errors.push({ field: 'memberId', message: 'Member ID is required' });
    if (!dto.paymentAmount || Number(dto.paymentAmount) <= 0)
      errors.push({ field: 'paymentAmount', message: 'Payment amount must be greater than zero' });
    if (!dto.description?.trim())
      errors.push({ field: 'description', message: 'Purpose or description is required' });
    if (!dto.collectionCategory?.trim())
      errors.push({ field: 'collectionCategory', message: 'Collection category is required' });
    const paymentDate = new Date(dto.paymentDate);
    if (!dto.paymentDate || isNaN(paymentDate.getTime())) {
      errors.push({ field: 'paymentDate', message: 'Payment date is required and must be valid' });
    } else if (paymentDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      errors.push({ field: 'paymentDate', message: 'Payment date cannot be in the future' });
    }

    // CPS-004: only configured payment methods
    const methodConfig = PAYMENT_METHOD_CONFIG[dto.paymentMethod];
    if (!methodConfig || !methodConfig.enabled) {
      errors.push({
        field: 'paymentMethod',
        message: `Payment method "${dto.paymentMethod}" is not configured in the system`,
      });
    } else if (methodConfig.requiresReference && !dto.paymentReference?.trim()) {
      // CPS-005: reference required for this method
      errors.push({
        field: 'paymentReference',
        message: `Payment reference is required for payment method ${dto.paymentMethod}`,
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        valid: false,
        message: errors.map((e) => e.message).join('; '),
        errors,
      });
    }

    // 1. Verify member exists
    const member = await this.assertValidMember(dto.memberId);

    // 2. Duplicate Check (only when paymentReference is provided)
    // Matches payment reference + source/member transaction details
    if (dto.paymentReference) {
      const duplicate = await this.prisma.collection.findFirst({
        where: {
          paymentReference: dto.paymentReference,
          memberId: dto.memberId,
          paymentMethod: dto.paymentMethod,
          status: { not: CollectionStatus.REJECTED },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Duplicate payment reference detected. A collection with reference "${dto.paymentReference}" already exists for this member.`,
        );
      }
    }

    // 3. CPS-002: Generate unique Collection Reference Number on creation
    const collectionRefNo = await this.generateUniqueCollectionRef();

    // 4. Create collection record with detailed audit trail (CPS-012)
    const collection = await this.prisma.collection.create({
      data: {
        collectionRefNo,
        memberId: dto.memberId,
        paymentAmount: dto.paymentAmount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference?.trim() || '',
        description: dto.description,
        collectionCategory: dto.collectionCategory,
        status: CollectionStatus.PENDING,
        auditTrail: {
          create: {
            userId: dto.memberId,
            collectionRefNo,
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Collecting Officer',
            role: 'Collecting Officer',
            details: `Collecting Officer recorded collection ${collectionRefNo} for ${member.name || dto.memberId}: ₱${Number(dto.paymentAmount).toLocaleString()} via ${dto.paymentMethod}${dto.paymentReference ? ` (Ref: ${dto.paymentReference})` : ''}, category "${dto.collectionCategory}".`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: true,
      },
    });

    return collection;
  }

  /**
   * CPS-002 & CPS-012: Attach proof of payment to an existing collection.
   * Validates format and 5MB size limit.
   */
  async uploadProof(collectionId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No proof file was uploaded.');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Accepted formats: jpg, jpeg, png, pdf`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the 5 MB limit (received ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      );
    }

    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection with ID "${collectionId}" not found`);
    }

    const prevStatus = collection.status;
    const newStatus =
      collection.status === CollectionStatus.PENDING
        ? CollectionStatus.FOR_VERIFICATION
        : collection.status;

    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        proofOfPaymentPath: file.path,
        proofOfPaymentName: file.originalname,
        status: newStatus,
        auditTrail: {
          create: {
            userId: collection.memberId,
            collectionRefNo: collection.collectionRefNo,
            action: 'Proof of Payment Uploaded',
            previousStatus: prevStatus,
            newStatus: newStatus,
            actor: 'System',
            role: 'Automated',
            details: `Proof of payment file "${file.originalname}" was attached successfully.`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: true,
      },
    });

    return updated;
  }

  /**
   * CPS-003: Retrieve pending collection submissions (Queue).
   * Returns records with status 'PENDING' or 'FOR_VERIFICATION'.
   */
  async getPendingQueue() {
    return this.prisma.collection.findMany({
      where: {
        status: { in: [CollectionStatus.PENDING, CollectionStatus.FOR_VERIFICATION] },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * CPS-004, CPS-005, CPS-007, CPS-012: Validate submitted collection details.
   */
  async validateCollection(id: string, actorName = 'Treasurer', actorRole = 'Treasurer', actorUserId?: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    // 0. CPS-004: Status guard — only PENDING or FOR_VERIFICATION can be validated
    const allowedStatuses: CollectionStatus[] = [CollectionStatus.PENDING, CollectionStatus.FOR_VERIFICATION];
    if (!allowedStatuses.includes(collection.status)) {
      throw new BadRequestException(
        `Cannot validate collection with status "${collection.status}". Only Pending or For Verification collections can be validated.`,
      );
    }

    // 1. CPS-004: Validate required fields completeness
    const missingFields: string[] = [];
    if (!collection.memberId) missingFields.push('Member ID');
    if (
      PAYMENT_METHOD_CONFIG[collection.paymentMethod]?.requiresReference &&
      (!collection.paymentReference || !collection.paymentReference.trim())
    ) {
      missingFields.push('Payment Reference');
    }
    if (!collection.paymentAmount || Number(collection.paymentAmount) <= 0) missingFields.push('Valid Payment Amount');
    if (!collection.paymentDate) missingFields.push('Payment Date');
    if (!collection.paymentMethod) missingFields.push('Payment Method');
    if (!collection.proofOfPaymentPath) missingFields.push('Required Proof of Payment');

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Validation failed. Missing or invalid required details: ${missingFields.join(', ')}`,
      );
    }

    // 2. CPS-005: Enhanced Duplicate Check — matches payment reference + source/member transaction details
    const duplicate = !collection.paymentReference?.trim() ? null : await this.prisma.collection.findFirst({
      where: {
        id: { not: id },
        paymentReference: collection.paymentReference,
        memberId: collection.memberId,
        paymentMethod: collection.paymentMethod,
        status: { not: CollectionStatus.REJECTED },
      },
    });

    if (duplicate) {
      await this.prisma.collection.update({
        where: { id },
        data: {
          status: CollectionStatus.REJECTED,
          rejectReason: `Duplicate payment reference detected: "${collection.paymentReference}" matches existing collection ${duplicate.id}`,
          auditTrail: {
            create: {
              userId: actorUserId || collection.memberId,
              collectionRefNo: collection.collectionRefNo,
              action: 'Duplicate Payment Detected',
              previousStatus: collection.status,
              newStatus: CollectionStatus.REJECTED,
              actor: actorName,
              role: actorRole,
              details: `Collection rejected because payment reference "${collection.paymentReference}" is already used in collection ${duplicate.id}.`,
            },
          },
        },
      });

      throw new ConflictException(
        `Duplicate payment detected. Collection has been rejected as reference "${collection.paymentReference}" is already recorded.`,
      );
    }

    // 3. CPS-007: Generate Unique Collection Reference Number
    let refNo = collection.collectionRefNo;
    if (!refNo) {
      refNo = await this.generateUniqueCollectionRef();
    }

    const prevStatus = collection.status;

    // 4. Mark as Validated with full audit log (CPS-012)
    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.VALIDATED,
        collectionRefNo: refNo,
        auditTrail: {
          create: {
            userId: actorUserId || collection.memberId,
            collectionRefNo: refNo,
            action: 'Collection Validated',
            previousStatus: prevStatus,
            newStatus: CollectionStatus.VALIDATED,
            actor: actorName,
            role: actorRole,
            details: `Payment details and proof of transaction were validated. Generated Collection Reference Number: ${refNo}.`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    return updated;
  }

  /**
   * CPS-005: Enhanced Duplicate check helper endpoint
   * Matches payment reference + optional source/member transaction details
   */
  async checkDuplicate(paymentReference: string, excludeId?: string, memberId?: string, paymentMethod?: string) {
    const existing = await this.prisma.collection.findFirst({
      where: {
        paymentReference,
        id: excludeId ? { not: excludeId } : undefined,
        memberId: memberId || undefined,
        paymentMethod: paymentMethod ? (paymentMethod as any) : undefined,
        status: { not: CollectionStatus.REJECTED },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      isDuplicate: !!existing,
      existingCollection: existing || null,
    };
  }
  /**
   * CPS-006: Classify a collection with a configured category.
   * Required before the transaction can be finalized (posted).
   */
  async classifyCollection(id: string, dto: ClassifyCollectionDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    if (collection.status === CollectionStatus.POSTED) {
      throw new BadRequestException('Cannot reclassify a collection that has already been posted.');
    }

    if (collection.status === CollectionStatus.REJECTED) {
      throw new BadRequestException('Cannot classify a rejected collection.');
    }

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        collectionCategory: dto.collectionCategory,
        auditTrail: {
          create: {
            userId: collection.memberId,
            collectionRefNo: collection.collectionRefNo,
            action: 'Collection Classified',
            previousStatus: collection.status,
            newStatus: collection.status,
            actor: 'Treasurer',
            role: 'Treasurer',
            details: `Collection classified as "${dto.collectionCategory}".`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    return updated;
  }

  /**
   * CPS-007: Identify and validate the related financial obligation.
   * Returns the receivable only when it exists, belongs to the same member,
   * and has an outstanding balance greater than zero.
   */
  async identifyReceivable(collectionId: string, obligationId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${collectionId}" not found`);
    }

    const obligation = await this.prisma.financialObligation.findUnique({
      where: { id: obligationId },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    if (!obligation) {
      throw new NotFoundException(`Financial obligation with ID "${obligationId}" not found`);
    }

    // CPS-007: Verify obligation belongs to the same member
    if (obligation.memberId !== collection.memberId) {
      throw new BadRequestException(
        `Obligation "${obligation.obligationType}" belongs to a different member. Cannot apply to this collection.`,
      );
    }

    // CPS-007: Verify outstanding balance > 0
    if (Number(obligation.outstandingBalance) <= 0) {
      throw new BadRequestException(
        `Obligation "${obligation.obligationType}" has no outstanding balance. Cannot apply payment.`,
      );
    }

    return {
      obligationId: obligation.id,
      obligationType: obligation.obligationType,
      memberId: obligation.memberId,
      memberName: obligation.member?.name,
      originalAmount: Number(obligation.originalAmount),
      outstandingBalance: Number(obligation.outstandingBalance),
      status: obligation.status,
      isEligible: true,
    };
  }

  /**
   * CPS-009: Preview payment application math & exception classification
   */
  async previewApplication(id: string, dto: ApplyPaymentDto) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException(`Collection with ID "${id}" not found`);

    const appliedAmount = dto.appliedAmount ? Number(dto.appliedAmount) : Number(collection.paymentAmount);
    if (!dto.obligationId || dto.obligationId === 'unapplied') {
      throw new BadRequestException('Unapplied payments are not supported in strict mode');
    }

    const obligation = await this.assertValidObligation(dto.obligationId, collection.memberId);
    const originalBalance = Number(obligation.outstandingBalance);

    if (appliedAmount > originalBalance) {
      throw new BadRequestException('Overpayments are not allowed. Applied amount cannot exceed outstanding balance.');
    }

    const remainingBalance = originalBalance - appliedAmount;
    return {
      obligationId: obligation.id,
      obligationType: obligation.obligationType,
      originalBalance,
      appliedAmount,
      remainingBalance,
      exceptionStatus: remainingBalance === 0 ? 'Exact Match' : 'Partial Payment',
      classificationReason: null,
      newObligationStatus: remainingBalance === 0 ? 'Fully Paid' : 'PARTIALLY_PAID',
    };
  }

  async applyPayment(id: string, dto: ApplyPaymentDto) {
    let collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    if (collection.status === CollectionStatus.POSTED) {
      throw new BadRequestException('This collection is already posted.');
    }

    if (collection.status === CollectionStatus.REJECTED) {
      throw new BadRequestException('Cannot apply payment for a rejected collection.');
    }

    // CPS-011: Posting requires Validated status
    if (collection.status !== CollectionStatus.VALIDATED) {
      // Validate first if not yet marked as validated
      collection = (await this.validateCollection(
        id,
        dto.actorName || 'Treasurer',
        dto.actorRole || 'Treasurer',
      )) as any;
    }

    // CPS-006: Set collection category from DTO if provided
    if (dto.collectionCategory && !collection.collectionCategory) {
      await this.prisma.collection.update({
        where: { id },
        data: { collectionCategory: dto.collectionCategory },
      });
      (collection as any).collectionCategory = dto.collectionCategory;
    }

    // CPS-006: Guard — collection must have a category before posting
    if (!(collection as any).collectionCategory) {
      throw new BadRequestException(
        'CPS-006: Collection must be classified with a valid category before the transaction can be finalized. Use POST /collections/:id/classify first.',
      );
    }

    const appliedAmount = dto.appliedAmount
      ? Number(dto.appliedAmount)
      : Number(collection.paymentAmount);

    const actorName = dto.actorName || 'Treasurer';
    const actorRole = dto.actorRole || 'Treasurer';
    const prevStatus = collection.status;

    let originalBalance = 0;
    let remainingBalance = 0;
    let exceptionStatus = 'Unapplied'; // CPS-009 default
    let obligationId: string | null = null;
    let obligationType = 'Unapplied / Deposit';

    // Ensure Collection Reference Number exists (CPS-007)
    let collectionRefNo = collection.collectionRefNo;
    if (!collectionRefNo) {
      collectionRefNo = await this.generateUniqueCollectionRef();
    }

    return await this.prisma.$transaction(async (tx) => {
      // CPS-007: Target obligation resolution
    if (dto.obligationId && dto.obligationId !== 'unapplied') {
      const obligation = await tx.financialObligation.findUnique({
        where: { id: dto.obligationId },
      });

      if (!obligation) {
        throw new NotFoundException(`Financial obligation with ID "${dto.obligationId}" not found.`);
      }

      // CPS-007: Verify obligation belongs to the same member
      if (obligation.memberId !== collection.memberId) {
        throw new BadRequestException(
          `Obligation "${obligation.obligationType}" belongs to a different member. Cannot apply to this collection.`,
        );
      }

      // CPS-009: Zero balance → classify as Unapplied instead of throwing
      if (Number(obligation.outstandingBalance) <= 0) {
        obligationId = obligation.id;
        obligationType = obligation.obligationType;
        exceptionStatus = 'Unapplied';
        // Skip obligation update, proceed with Unapplied classification
      } else {
        obligationId = obligation.id;
        obligationType = obligation.obligationType;
        originalBalance = Number(obligation.outstandingBalance);

        // CPS-008 & CPS-009 Application Math:
        const balanceDifference = originalBalance - appliedAmount;

        if (balanceDifference > 0) {
          // CPS-009: Partial Payment
          remainingBalance = balanceDifference;
          exceptionStatus = 'Partial Payment';
        } else if (balanceDifference === 0) {
          // CPS-009: Exact Match
          remainingBalance = 0;
          exceptionStatus = 'Exact Match';
        } else {
          // CPS-009: Overpayment
          remainingBalance = 0;
          exceptionStatus = 'Overpayment';
        }

        // CPS-010: Update Financial Obligation balance
        const newObligationStatus = remainingBalance === 0 ? 'Fully Paid' : 'PARTIALLY_PAID';
        await tx.financialObligation.update({
          where: { id: obligation.id },
          data: {
            outstandingBalance: remainingBalance,
            status: newObligationStatus,
          },
        });
      }
    }

    // CPS-011: Ensure valid payment application or approved exception classification before posting
    const validExceptions = ['Exact Match', 'Partial Payment', 'Overpayment', 'Unapplied'];
    if (!validExceptions.includes(exceptionStatus)) {
      throw new BadRequestException(
        `CPS-011: Cannot post collection. Invalid exception classification "${exceptionStatus}".`,
      );
    }

    // Upsert Collection Application Record (CPS-008, CPS-009)
    await tx.collectionApplication.upsert({
      where: { collectionId: id },
      create: {
        collectionId: id,
        obligationId,
        originalBalance,
        appliedAmount,
        remainingBalance,
        exceptionStatus,
      },
      update: {
        obligationId,
        originalBalance,
        appliedAmount,
        remainingBalance,
        exceptionStatus,
      },
    });

    // CPS-014: Determine if collection is Ready for Reconciliation
    // Criteria: Posted, valid collectionRefNo, paymentReference, paymentAmount > 0, valid paymentDate
    const isReadyForReconciliation =
      !!collectionRefNo &&
      !!collection.paymentReference &&
      Number(collection.paymentAmount) > 0 &&
      !!collection.paymentDate;

    // CPS-011 & CPS-012: Post collection and record comprehensive audit trail
    const updatedCollection = await tx.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.POSTED,
        collectionRefNo,
        isReadyForReconciliation,
        auditTrail: {
          create: {
            userId: collection.memberId,
            collectionRefNo,
            action: 'Payment Posted',
            previousStatus: prevStatus,
            newStatus: CollectionStatus.POSTED,
            actor: actorName,
            role: actorRole,
            details: `Payment of ₱${appliedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} was successfully posted and applied to ${obligationType}. Exception Status: ${exceptionStatus}. Ready for Reconciliation: ${isReadyForReconciliation ? 'Yes' : 'No'}.`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        application: {
          include: {
            obligation: true,
          },
        },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    // FMS-003: Record posted fund transaction
    if (this.fundsService) {
      try {
        const assignedFund = (collection as any).fundId || 'General Fund';
        await this.fundsService.recordPostedTransaction({
          fundIdOrName: assignedFund,
          transactionRef: collectionRefNo,
          transactionType: 'Inflow (Collection)',
          amount: appliedAmount,
          referenceType: 'COLLECTION',
          referenceId: collection.id,
          description: `Collection posted from ${updatedCollection.member?.name || 'Member'}: ${obligationType}`,
          date: collection.paymentDate || new Date(),
        }, tx);
      } catch (e) {
        if (e instanceof ConflictException) throw e;
        // Fallback gracefully if funds not yet initialized
      }
    }

    return updatedCollection;
      });
  }

  /**
   * CPS-014: Explicit endpoint to verify and mark collection as ready for reconciliation
   */
  async markReadyForReconciliation(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    if (collection.status !== CollectionStatus.POSTED) {
      throw new BadRequestException(
        'CPS-014: Collection must be in Posted status to be marked as Ready for Reconciliation.',
      );
    }

    if (!collection.collectionRefNo || !collection.paymentReference || Number(collection.paymentAmount) <= 0 || !collection.paymentDate) {
      throw new BadRequestException(
        'CPS-014: Collection must contain a valid Collection Reference, Payment Reference, Amount, and Payment Date.',
      );
    }

    return this.prisma.collection.update({
      where: { id },
      data: {
        isReadyForReconciliation: true,
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        application: { include: { obligation: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  /**
   * Reject a collection with reason and detailed audit log (CPS-012)
   */
  async rejectCollection(id: string, dto: RejectCollectionDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    const actorName = dto.actorName || 'Treasurer';
    const actorRole = dto.actorRole || 'Treasurer';
    const prevStatus = collection.status;

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.REJECTED,
        rejectReason: dto.reason,
        auditTrail: {
          create: {
            userId: collection.memberId,
            collectionRefNo: collection.collectionRefNo,
            action: 'Collection Rejected',
            previousStatus: prevStatus,
            newStatus: CollectionStatus.REJECTED,
            actor: actorName,
            role: actorRole,
            details: `Collection was rejected by ${actorName}. Reason: ${dto.reason}`,
          },
        },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    return updated;
  }

  /**
   * CPS-012 & CPS-013: Retrieve complete audit trail logs
   */
  async getAuditLogs(collectionId?: string) {
    return this.prisma.collectionAuditLog.findMany({
      where: collectionId ? { collectionId } : undefined,
      orderBy: { timestamp: 'desc' },
      include: {
        collection: {
          select: {
            id: true,
            collectionRefNo: true,
            paymentReference: true,
            status: true,
            member: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * Get all collections with optional filtering (CPS-013 compatible read-only)
   */
  async findAll(status?: CollectionStatus, memberId?: string, search?: string) {
    return this.prisma.collection.findMany({
      where: {
        status: status ? status : undefined,
        memberId: memberId ? memberId : undefined,
        OR: search
          ? [
              { collectionRefNo: { contains: search, mode: 'insensitive' } },
              { paymentReference: { contains: search, mode: 'insensitive' } },
              { member: { name: { contains: search, mode: 'insensitive' } } },
              { memberId: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
        application: {
          include: {
            obligation: true,
          },
        },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single collection by ID
   */
  async findOne(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, name: true, email: true } },
        application: {
          include: {
            obligation: true,
          },
        },
        auditTrail: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    return collection;
  }

  /**
   * CPS-013: Monitor collection totals and categories for financial reporting.
   * Calculates totals by date, category, member, and source, separately identifying loan repayments.
   */
  async getCollectionTotals(filters: {
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    memberId?: string;
    source?: string;
  }) {
    const where: any = {
      status: CollectionStatus.POSTED,
    };

    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) where.paymentDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.paymentDate.lte = new Date(filters.dateTo);
    }

    if (filters.category) where.collectionCategory = filters.category;
    if (filters.memberId) where.memberId = filters.memberId;
    // For source, we can map it to paymentMethod if it aligns with the application logic
    if (filters.source) where.paymentMethod = filters.source;

    const collections = await this.prisma.collection.findMany({
      where,
      include: {
        member: { select: { id: true, name: true } },
      },
    });

    let grandTotal = 0;
    let loanRepaymentsTotal = 0;
    const byCategory: Record<string, number> = {};

    collections.forEach((col) => {
      const amount = Number(col.paymentAmount);
      grandTotal += amount;

      const cat = col.collectionCategory || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + amount;

      // CPS-013: Separately identify loan repayments
      if (cat.toLowerCase().includes('loan')) {
        loanRepaymentsTotal += amount;
      }
    });

    return {
      filters,
      totalCollections: collections.length,
      grandTotal,
      loanRepaymentsTotal,
      byCategory,
      collections: collections.map((col) => ({
        id: col.id,
        collectionRefNo: col.collectionRefNo,
        paymentDate: col.paymentDate,
        amount: Number(col.paymentAmount),
        category: col.collectionCategory,
        member: col.member?.name,
        source: col.paymentMethod,
      })),
    };
  }

  /**
   * Helper (CPS-002): Generate unique reference number like COL-2026-00001.
   * Uses an atomic per-year counter so concurrent requests never collide.
   */
  private async generateUniqueCollectionRef(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.prisma.collectionSequence.upsert({
      where: { year },
      update: { last: { increment: 1 } },
      create: { year, last: 1 },
    });
    return `COL-${year}-${String(seq.last).padStart(5, '0')}`;
  }
}

