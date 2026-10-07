import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';

@Injectable()
export class RemittanceService {
  constructor(private readonly prisma: PrismaService) {}

  // Audit Helper
  async createAuditLog(batchId: string | null, userId: string | null, action: string, details: string) {
    await this.prisma.payrollAuditLog.create({
      data: { batchId, userId, action, details },
    });
  }

  // PPS-009: Prepare a remittance template
  async generateTemplate(payrollPeriod: string): Promise<string> {
    const schedules = await this.prisma.payrollDeductionSchedule.findMany({
      where: { payrollPeriod, status: 'GENERATED' },
    });

    const headers = ['LineNo', 'MemberId', 'PayrollPeriod', 'DeductionType', 'ExpectedAmount', 'ObligationId'];
    let csv = headers.join(',') + '\n';

    schedules.forEach((sch, index) => {
      const row = [
        index + 1,
        sch.memberId,
        sch.payrollPeriod,
        sch.deductionType,
        sch.expectedAmount.toString(),
        sch.obligationId || ''
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // PPS-010, PPS-012: Receive and parse remittance file
  async processUpload(fileBuffer: Buffer, fileName: string, payrollPeriod: string, uploadedBy: string) {
    // Detect duplicates (PPS-012)
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const existing = await this.prisma.remittanceBatch.findUnique({ where: { fileHash } });
    if (existing) {
      throw new ConflictException('This exact remittance file has already been uploaded.');
    }

    const csvContent = fileBuffer.toString('utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });

    if (records.length === 0) {
      throw new BadRequestException('The remittance file is empty or improperly formatted.');
    }

    let totalAmount = 0;
    const lines = records.map((record: any, idx: number) => {
      const amount = parseFloat(record.ExpectedAmount || record.Amount || '0');
      totalAmount += amount;
      return {
        lineNo: idx + 1,
        memberId: record.MemberId,
        obligationId: record.ObligationId || 'NONE',
        amount,
        matchStatus: 'PENDING',
      };
    });

    const batchRef = `BATCH-${payrollPeriod}-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.remittanceBatch.create({
        data: {
          batchRef,
          fileName,
          fileHash,
          payrollPeriod,
          status: 'DRAFT',
          totalLines: lines.length,
          totalAmount,
          uploadedBy,
          lines: {
            create: lines,
          },
        },
      });

      await tx.payrollAuditLog.create({
        data: {
          batchId: batch.id,
          userId: uploadedBy,
          action: 'UPLOAD',
          details: `Uploaded remittance file with ${lines.length} lines.`,
        },
      });

      return batch;
    });
  }

  // PPS-011, PPS-013, PPS-014: Validate actual remitted amounts against expected
  async validateBatch(batchId: string, userId: string) {
    const batch = await this.prisma.remittanceBatch.findUnique({
      where: { id: batchId },
      include: { lines: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== 'DRAFT' && batch.status !== 'WITH_EXCEPTIONS') {
      throw new BadRequestException(`Cannot validate batch in status ${batch.status}`);
    }

    let hasExceptions = false;

    await this.prisma.$transaction(async (tx) => {
      for (const line of batch.lines) {
        // Find expected schedule
        const schedule = await tx.payrollDeductionSchedule.findFirst({
          where: {
            memberId: line.memberId,
            payrollPeriod: batch.payrollPeriod,
            obligationId: line.obligationId === 'NONE' ? null : line.obligationId,
          },
        });

        let newStatus = 'MATCHED';
        const reasons: string[] = [];

        if (!schedule) {
          newStatus = 'NOT_FOUND';
          reasons.push('No expected deduction schedule found for this record.');
          hasExceptions = true;
        } else if (Number(schedule.expectedAmount) !== Number(line.amount)) {
          newStatus = 'MISMATCH';
          reasons.push(`Amount mismatch: expected ${schedule.expectedAmount}, got ${line.amount}`);
          hasExceptions = true;
        }

        await tx.remittanceLine.update({
          where: { id: line.id },
          data: { matchStatus: newStatus, matchReasons: reasons },
        });
      }

      const finalBatchStatus = hasExceptions ? 'WITH_EXCEPTIONS' : 'VALIDATED';

      await tx.remittanceBatch.update({
        where: { id: batch.id },
        data: { status: finalBatchStatus },
      });

      await tx.payrollAuditLog.create({
        data: {
          batchId: batch.id,
          userId,
          action: 'VALIDATE',
          details: `Validated batch. Status changed to ${finalBatchStatus}`,
        },
      });
    });

    return this.prisma.remittanceBatch.findUnique({ where: { id: batchId }, include: { lines: true }});
  }

  // PPS-016: Hand off validated payroll remittance
  async handoffBatch(batchId: string, userId: string) {
    const batch = await this.prisma.remittanceBatch.findUnique({ where: { id: batchId } });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== 'VALIDATED') {
      throw new BadRequestException(`Only VALIDATED batches can be handed off. Current status: ${batch.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.remittanceBatch.update({
        where: { id: batchId },
        data: { status: 'READY_FOR_COLLECTION' },
      });

      await tx.payrollAuditLog.create({
        data: {
          batchId: batch.id,
          userId,
          action: 'HANDOFF',
          details: `Handoff completed. Batch status is now READY_FOR_COLLECTION.`,
        },
      });

      // NOTE: In a real system we would trigger an event or queue a message 
      // here to alert CollectionService to pick this up.

      return updated;
    });
  }
}
