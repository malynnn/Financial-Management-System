import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollectionStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPaymentDto } from './dto/apply-payment.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { RejectCollectionDto } from './dto/reject-collection.dto';

// CPS-002: allowed file types and max size
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CPS-001: Submit payment information as a collection.
   * Also checks for duplicate payment reference (CPS-005).
   */
  async submitCollection(dto: CreateCollectionDto) {
    // 1. Verify member exists
    const member = await this.prisma.user.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID "${dto.memberId}" not found`);
    }

    // 2. CPS-005: Duplicate Check
    const duplicate = await this.prisma.collection.findFirst({
      where: {
        paymentReference: dto.paymentReference,
        status: { not: CollectionStatus.REJECTED },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `Duplicate payment reference detected. A collection with reference "${dto.paymentReference}" already exists.`,
      );
    }

    // 3. Create collection record
    const collection = await this.prisma.collection.create({
      data: {
        memberId: dto.memberId,
        paymentAmount: dto.paymentAmount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        description: dto.description,
        status: CollectionStatus.PENDING,
        auditTrail: {
          create: {
            action: 'Collection Record Created',
            actor: member.name || 'Member',
            role: 'Member',
            details: `Member submitted payment details for ₱${Number(dto.paymentAmount).toLocaleString()} via ${dto.paymentMethod} (Ref: ${dto.paymentReference}).`,
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
   * CPS-002: Attach proof of payment to an existing collection.
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

    // Transition to FOR_VERIFICATION if currently PENDING
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
            action: 'Proof of Payment Uploaded',
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
   * CPS-004, CPS-005, CPS-007: Validate submitted collection details.
   * - Checks all required fields & attached proof of payment.
   * - Detects duplicates.
   * - Generates unique Collection Reference Number.
   * - Sets status to VALIDATED.
   */
  async validateCollection(id: string, actorName = 'Treasurer', actorRole = 'Treasurer') {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }

    // 1. CPS-004: Validate required fields completeness
    const missingFields: string[] = [];
    if (!collection.memberId) missingFields.push('Member ID');
    if (!collection.paymentReference) missingFields.push('Payment Reference');
    if (!collection.paymentAmount || Number(collection.paymentAmount) <= 0) missingFields.push('Valid Payment Amount');
    if (!collection.paymentDate) missingFields.push('Payment Date');
    if (!collection.paymentMethod) missingFields.push('Payment Method');
    if (!collection.proofOfPaymentPath) missingFields.push('Required Proof of Payment');

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Validation failed. Missing or invalid required details: ${missingFields.join(', ')}`,
      );
    }

    // 2. CPS-005: Duplicate Check
    const duplicate = await this.prisma.collection.findFirst({
      where: {
        id: { not: id },
        paymentReference: collection.paymentReference,
        status: { not: CollectionStatus.REJECTED },
      },
    });

    if (duplicate) {
      // Auto-reject due to duplicate
      await this.prisma.collection.update({
        where: { id },
        data: {
          status: CollectionStatus.REJECTED,
          rejectReason: `Duplicate payment reference detected: "${collection.paymentReference}" matches existing collection ${duplicate.id}`,
          auditTrail: {
            create: {
              action: 'Duplicate Payment Detected',
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

    // 4. Mark as Validated
    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.VALIDATED,
        collectionRefNo: refNo,
        auditTrail: {
          create: {
            action: 'Collection Validated',
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
   * CPS-005: Explicit Duplicate check helper endpoint
   */
  async checkDuplicate(paymentReference: string, excludeId?: string) {
    const existing = await this.prisma.collection.findFirst({
      where: {
        paymentReference,
        id: excludeId ? { not: excludeId } : undefined,
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
   * CPS-006 & CPS-008: Apply payment to related financial obligation.
   * Calculates remaining balance & exception status (Exact Match, Partial Payment, Overpayment, Unapplied).
   * Updates obligation balance and sets collection status to POSTED.
   */
  async applyPayment(id: string, dto: ApplyPaymentDto) {
    const collection = await this.prisma.collection.findUnique({
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

    const appliedAmount = dto.appliedAmount
      ? Number(dto.appliedAmount)
      : Number(collection.paymentAmount);

    const actorName = dto.actorName || 'Treasurer';
    const actorRole = dto.actorRole || 'Treasurer';

    let originalBalance = 0;
    let remainingBalance = 0;
    let exceptionStatus = 'Unapplied';
    let obligationId: string | null = null;
    let obligationType = 'Unapplied / Deposit';

    // Ensure Collection Reference Number exists (CPS-007)
    let collectionRefNo = collection.collectionRefNo;
    if (!collectionRefNo) {
      collectionRefNo = await this.generateUniqueCollectionRef();
    }

    // CPS-006: If target obligation is provided
    if (dto.obligationId && dto.obligationId !== 'unapplied') {
      const obligation = await this.prisma.financialObligation.findUnique({
        where: { id: dto.obligationId },
      });

      if (!obligation) {
        throw new NotFoundException(`Financial obligation with ID "${dto.obligationId}" not found.`);
      }

      // CPS-006 Criteria: Must have outstanding balance > 0
      if (Number(obligation.outstandingBalance) <= 0) {
        throw new BadRequestException(
          `Cannot apply payment to obligation "${obligation.obligationType}". Outstanding balance is already zero.`,
        );
      }

      obligationId = obligation.id;
      obligationType = obligation.obligationType;
      originalBalance = Number(obligation.outstandingBalance);

      // CPS-008 Application Math:
      const balanceDifference = originalBalance - appliedAmount;

      if (balanceDifference > 0) {
        // Partial payment
        remainingBalance = balanceDifference;
        exceptionStatus = 'Partial Payment';
      } else if (balanceDifference === 0) {
        // Exact match
        remainingBalance = 0;
        exceptionStatus = 'Exact Match';
      } else {
        // Overpayment
        remainingBalance = 0; // Obligation becomes fully settled
        exceptionStatus = 'Overpayment';
      }

      // Update Financial Obligation in DB
      await this.prisma.financialObligation.update({
        where: { id: obligation.id },
        data: {
          outstandingBalance: remainingBalance,
          status: remainingBalance === 0 ? 'PAID' : 'PARTIALLY_PAID',
        },
      });
    }

    // Upsert Collection Application Record (CPS-008)
    const application = await this.prisma.collectionApplication.upsert({
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

    // Update Collection status to POSTED
    const updatedCollection = await this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.POSTED,
        collectionRefNo,
        auditTrail: {
          create: {
            action: 'Payment Posted',
            actor: actorName,
            role: actorRole,
            details: `Payment of ₱${appliedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} was successfully posted and applied to ${obligationType}. Exception Status: ${exceptionStatus}.`,
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

    return updatedCollection;
  }

  /**
   * Reject a collection with reason and audit log
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

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.REJECTED,
        rejectReason: dto.reason,
        auditTrail: {
          create: {
            action: 'Collection Rejected',
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
   * Get all collections with optional filtering
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
   * Helper: Generate unique reference number like COL-2026-00001
   */
  private async generateUniqueCollectionRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.collection.count({
      where: {
        collectionRefNo: { startsWith: `COL-${year}` },
      },
    });
    const sequence = String(count + 1).padStart(5, '0');
    return `COL-${year}-${sequence}`;
  }
}