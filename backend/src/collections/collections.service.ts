import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

// CPS-002: allowed file types and max size
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CPS-001: Submit payment information as a collection.
   * All five fields (memberId, paymentAmount, paymentDate,
   * paymentMethod, paymentReference) are enforced by the DTO.
   */
  async submitCollection(dto: CreateCollectionDto) {
    // Verify the member exists
    const member = await this.prisma.user.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID "${dto.memberId}" not found`);
    }

    const collection = await this.prisma.collection.create({
      data: {
        memberId: dto.memberId,
        paymentAmount: dto.paymentAmount,
        paymentDate: new Date(dto.paymentDate),
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        description: dto.description,
      },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    return collection;
  }

  /**
   * CPS-002: Attach proof of payment to an existing collection.
   * File must be an allowed format and not exceed 5 MB.
   */
  async uploadProof(
    collectionId: string,
    file: Express.Multer.File,
  ) {
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

    // Store relative path — swap this with cloud URL later
    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        proofOfPaymentPath: file.path,
        proofOfPaymentName: file.originalname,
      },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    return updated;
  }

  /** Get all collections (for Treasurer / Auditor views) */
  async findAll() {
    return this.prisma.collection.findMany({
      include: { member: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single collection by ID */
  async findOne(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { member: { select: { id: true, name: true, email: true } } },
    });
    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }
    return collection;
  }
}