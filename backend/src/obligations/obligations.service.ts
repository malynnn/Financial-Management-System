import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObligationDto } from './dto/create-obligation.dto';

@Injectable()
export class ObligationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new financial obligation for a member (e.g. Annual Dues, Emergency Loan)
   */
  async create(dto: CreateObligationDto) {
    const member = await this.prisma.user.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID "${dto.memberId}" not found`);
    }

    return this.prisma.financialObligation.create({
      data: {
        memberId: dto.memberId,
        obligationType: dto.obligationType,
        originalAmount: dto.originalAmount,
        outstandingBalance: dto.originalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'UNPAID',
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Find all financial obligations, optionally filtered by memberId
   */
  async findAll(memberId?: string) {
    return this.prisma.financialObligation.findMany({
      where: memberId ? { memberId } : undefined,
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * CPS-006: Identify active financial obligations with outstandingBalance > 0
   */
  async findActiveByMember(memberId: string) {
    return this.prisma.financialObligation.findMany({
      where: {
        memberId,
        outstandingBalance: { gt: 0 },
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find single obligation by ID
   */
  async findOne(id: string) {
    const obligation = await this.prisma.financialObligation.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, name: true, email: true } },
        applications: {
          include: {
            collection: true,
          },
        },
      },
    });
    if (!obligation) {
      throw new NotFoundException(`Financial obligation with ID "${id}" not found`);
    }
    return obligation;
  }
}