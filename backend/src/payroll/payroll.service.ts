import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayrollScheduleDto } from './dto/create-payroll-schedule.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(dto: CreatePayrollScheduleDto) {
    // 1. Validate Member (PPS-002)
    const member = await this.prisma.user.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
    }

    // 2. Validate Obligation if provided (PPS-005)
    if (dto.obligationId) {
      const obligation = await this.prisma.financialObligation.findUnique({
        where: { id: dto.obligationId },
      });
      if (!obligation) {
        throw new NotFoundException(`Obligation with ID ${dto.obligationId} not found`);
      }
    }

    // 3. Create schedule & prevent duplicates via Prisma Unique Constraint (PPS-006)
    try {
      const schedule = await this.prisma.payrollDeductionSchedule.create({
        data: {
          payrollPeriod: dto.payrollPeriod,
          memberId: dto.memberId,
          deductionType: dto.deductionType,
          expectedAmount: dto.expectedAmount,
          obligationId: dto.obligationId,
          status: 'SCHEDULED',
        },
      });
      return schedule;
    } catch (error) {
      // P2002 is Prisma's unique constraint violation error code
      if (error.code === 'P2002') {
        throw new ConflictException('A duplicate deduction schedule already exists for this member, period, and obligation.');
      }
      throw error;
    }
  }

  async getSchedulesByPeriod(payrollPeriod: string) {
    return this.prisma.payrollDeductionSchedule.findMany({
      where: { payrollPeriod },
      include: {
        member: { select: { name: true, email: true } },
      },
    });
  }

  async generateDeductionList(payrollPeriod: string) {
    // PPS-007, PPS-008
    const schedules = await this.prisma.payrollDeductionSchedule.findMany({
      where: { 
        payrollPeriod,
        status: 'SCHEDULED', // Only include valid scheduled records
      },
    });

    if (schedules.length === 0) {
      throw new BadRequestException(`No active schedules found for period ${payrollPeriod}`);
    }

    const totalAmount = schedules.reduce((sum, item) => sum + Number(item.expectedAmount), 0);
    const batchRef = `PAYROLL-${payrollPeriod}-${Date.now()}`;

    // Transaction to create the list and update the schedules
    return this.prisma.$transaction(async (tx) => {
      const deductionList = await tx.payrollDeductionList.create({
        data: {
          batchRef,
          payrollPeriod,
          totalAmount,
          status: 'GENERATED',
        },
      });

      await tx.payrollDeductionSchedule.updateMany({
        where: {
          id: { in: schedules.map((s) => s.id) },
        },
        data: {
          status: 'GENERATED',
        },
      });

      return deductionList;
    });
  }
}
