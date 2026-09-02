import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import { ExecuteDisbursementDto } from './dto/execute-disbursement.dto';
import { QueryDisbursementDto } from './dto/query-disbursement.dto';
import { ReviewDisbursementDto } from './dto/review-disbursement.dto';

@ApiTags('Disbursements')
@Controller('disbursements')
@UseGuards(AuditorReadOnlyGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  /**
   * DMP-001: Retrieve eligible approved loan records
   */
  @Get('eligible-loans')
  @ApiOperation({ summary: 'DMP-001: Retrieve approved loan information for disbursement' })
  @ApiResponse({ status: 200, description: 'List of approved loans eligible for disbursement' })
  getEligibleLoans() {
    return this.disbursementsService.getEligibleApprovedLoans();
  }

  /**
   * DMP-006: Retrieve fund account balance summaries
   */
  @Get('funds/summary')
  @ApiOperation({ summary: 'DMP-006: Retrieve fund source balances' })
  @ApiResponse({ status: 200, description: 'Summary of available fund balances' })
  getFundsSummary() {
    return this.disbursementsService.getAllFundsSummary();
  }

  /**
   * DMP-014: Retrieve all disbursements ready for Bank Reconciliation
   */
  @Get('reconciliation/ready')
  @ApiOperation({ summary: 'DMP-014: Retrieve completed disbursements marked ready for Bank Reconciliation' })
  @ApiResponse({ status: 200, description: 'List of reconciliation-ready disbursements' })
  getReconciliationReady() {
    return this.disbursementsService.getReconciliationReadyDisbursements();
  }

  /**
   * DMP-002 & DMP-003: Create disbursement request
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'DMP-002, DMP-003: Submit a disbursement request for an approved loan' })
  @ApiResponse({ status: 201, description: 'Disbursement request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed (DMP-003, DMP-004, DMP-005, DMP-006, DMP-007)' })
  @ApiResponse({ status: 404, description: 'Approved loan obligation not found' })
  createDisbursementRequest(@Body() dto: CreateDisbursementRequestDto) {
    return this.disbursementsService.createDisbursementRequest(dto);
  }

  /**
   * DMP-013: Find all disbursements with pagination, search, and filters
   */
  @Get()
  @ApiOperation({ summary: 'DMP-013: List all disbursements with status and filters' })
  @ApiResponse({ status: 200, description: 'Paginated disbursement records' })
  findAll(@Query() query: QueryDisbursementDto) {
    return this.disbursementsService.findAll(query);
  }

  /**
   * DMP-013: Get single disbursement details and full transaction history
   */
  @Get(':id/history')
  @ApiOperation({ summary: 'DMP-013: Get disbursement status and chronological transaction history' })
  @ApiParam({ name: 'id', description: 'Disbursement ID' })
  @ApiResponse({ status: 200, description: 'Disbursement transaction history' })
  @ApiResponse({ status: 404, description: 'Disbursement not found' })
  getHistory(@Param('id') id: string) {
    return this.disbursementsService.getDisbursementHistory(id);
  }

  /**
   * Find single disbursement by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get disbursement record by ID with audit trail' })
  @ApiParam({ name: 'id', description: 'Disbursement ID' })
  @ApiResponse({ status: 200, description: 'Disbursement details' })
  @ApiResponse({ status: 404, description: 'Disbursement not found' })
  findOne(@Param('id') id: string) {
    return this.disbursementsService.findOne(id);
  }

  /**
   * DMP-008 & DMP-012: Review disbursement request (Approve or Reject)
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DMP-008: Approve or Reject a disbursement request with fund availability check' })
  @ApiParam({ name: 'id', description: 'Disbursement ID' })
  @ApiResponse({ status: 200, description: 'Disbursement request review processed' })
  @ApiResponse({ status: 400, description: 'Invalid status for review or insufficient funds' })
  @ApiResponse({ status: 404, description: 'Disbursement not found' })
  reviewDisbursement(
    @Param('id') id: string,
    @Body() dto: ReviewDisbursementDto,
  ) {
    return this.disbursementsService.reviewDisbursement(id, dto);
  }

  /**
   * DMP-009, DMP-010, DMP-011, DMP-012, DMP-014: Execute disbursement (Fund Release)
   */
  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DMP-009, DMP-010, DMP-011, DMP-014: Execute approved disbursement and release funds' })
  @ApiParam({ name: 'id', description: 'Disbursement ID' })
  @ApiResponse({ status: 200, description: 'Disbursement executed and marked ready for reconciliation' })
  @ApiResponse({ status: 400, description: 'Invalid status for execution' })
  @ApiResponse({ status: 404, description: 'Disbursement not found' })
  executeDisbursement(
    @Param('id') id: string,
    @Body() dto: ExecuteDisbursementDto,
  ) {
    return this.disbursementsService.executeDisbursement(id, dto);
  }

  /**
   * DMP-014: Reconcile disbursement
   */
  @Post(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DMP-014: Mark an executed disbursement as reconciled' })
  @ApiParam({ name: 'id', description: 'Disbursement ID' })
  @ApiResponse({ status: 200, description: 'Disbursement reconciled' })
  @ApiResponse({ status: 400, description: 'Disbursement is not executed' })
  @ApiResponse({ status: 404, description: 'Disbursement not found' })
  reconcileDisbursement(@Param('id') id: string) {
    return this.disbursementsService.markReconciled(id);
  }
}
