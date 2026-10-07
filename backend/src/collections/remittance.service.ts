import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadRemittanceDto, RemittanceLineDto } from './dto/remittance.dto';
import { parse } from 'csv-parse/sync';

@Injectable()
export class RemittanceService {
  constructor(private prisma: PrismaService) {}

  async uploadRemittanceBatch(fileBuffer: Buffer, dto: UploadRemittanceDto) {
    const existing = await this.prisma.remittanceBatch.findUnique({
      where: { fileHash: dto.fileHash }
    });
    if (existing) {
      throw new BadRequestException('File with this hash has already been uploaded');
    }

    const csvData = fileBuffer.toString('utf-8');
    let records;
    try {
      records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      throw new BadRequestException('Invalid CSV format: ' + e.message);
    }

    if (!records.length) {
      throw new BadRequestException('CSV file is empty');
    }

    const batchRef = `REM-${Date.now()}`;
    let totalAmount = 0;

    const result = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.remittanceBatch.create({
        data: {
          batchRef,
          fileName: dto.fileName,
          fileHash: dto.fileHash,
          payrollPeriod: dto.payrollPeriod,
          totalLines: records.length,
          totalAmount: 0, // will update later
          uploadedBy: dto.uploadedBy,
        }
      });

      let lineNo = 1;
      for (const rec of records) {
        const { memberId, obligationId, amount } = rec;
        if (!memberId || !obligationId || !amount) {
          throw new BadRequestException(`Missing required columns (memberId, obligationId, amount) on line ${lineNo}`);
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new BadRequestException(`Invalid amount on line ${lineNo}`);
        }
        
        totalAmount += parsedAmount;
        
        await tx.remittanceLine.create({
          data: {
            batchId: batch.id,
            lineNo,
            memberId,
            obligationId,
            amount: parsedAmount,
            matchStatus: 'PENDING'
          }
        });
        lineNo++;
      }

      const updatedBatch = await tx.remittanceBatch.update({
        where: { id: batch.id },
        data: { totalAmount }
      });
      return updatedBatch;
    });

    return result;
  }

  async processMatch(batchId: string) {
    const batch = await this.prisma.remittanceBatch.findUnique({
      where: { id: batchId },
      include: { lines: true }
    });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status === 'MATCHED') throw new BadRequestException('Batch is already matched');

    await this.prisma.$transaction(async (tx) => {
      for (const line of batch.lines) {
        let status = 'MATCHED';
        const reasons: string[] = [];
        
        const member = await tx.user.findUnique({ where: { id: line.memberId } });
        if (!member) {
          status = 'UNMATCHED';
          reasons.push('Member not found');
        }

        const obligation = await tx.financialObligation.findUnique({ where: { id: line.obligationId } });
        if (!obligation) {
          status = 'UNMATCHED';
          reasons.push('Obligation not found');
        } else {
          if (obligation.memberId !== line.memberId) {
             status = 'UNMATCHED';
             reasons.push('Obligation does not belong to this member');
          }
          const monthlyDeduction = obligation.monthlyDeduction ? Number(obligation.monthlyDeduction) : 0;
          if (monthlyDeduction > 0 && Number(line.amount) !== monthlyDeduction) {
             status = 'UNMATCHED';
             reasons.push('Amount does not match expected monthly deduction');
          }
        }

        await tx.remittanceLine.update({
          where: { id: line.id },
          data: { matchStatus: status, matchReasons: reasons }
        });
      }

      await tx.remittanceBatch.update({
        where: { id: batchId },
        data: { status: 'MATCHED' }
      });
    });

    return { success: true };
  }

  async getAllBatches() {
    return this.prisma.remittanceBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
           select: { lines: true }
        }
      }
    });
  }

  async getBatchDetails(id: string) {
    const batch = await this.prisma.remittanceBatch.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNo: 'asc' } } }
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }
}
