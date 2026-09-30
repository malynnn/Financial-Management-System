import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CollectionStatus } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';
import { CollectionsService } from './collections.service';
import { ApplyPaymentDto } from './dto/apply-payment.dto';
import { ClassifyCollectionDto } from './dto/classify-collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { RejectCollectionDto } from './dto/reject-collection.dto';

// CPS-002: multer storage config with file validation
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — configurable limit

const proofStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'proofs'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `proof-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const proofFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `File type not allowed. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  }
};

@ApiTags('Collections')
@Controller('collections')
@UseGuards(AuditorReadOnlyGuard) // CPS-013: Block mutating operations from Internal Auditors
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * CPS-001 — Submit payment information
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'CPS-001: Submit a payment collection' })
  @ApiResponse({ status: 201, description: 'Collection submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed — missing required fields' })
  @ApiResponse({ status: 403, description: 'Forbidden — Auditor cannot submit collections (CPS-013)' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 409, description: 'Duplicate payment reference' })
  submitCollection(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.submitCollection(dto);
  }

  /**
   * CPS-002 — Upload proof of payment
   */
  @Post(':id/proof')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: proofStorage, fileFilter: proofFileFilter, limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  @ApiOperation({ summary: 'CPS-002: Upload proof of payment for a collection' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Proof of payment file (jpg, jpeg, png, pdf — max 5 MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Proof uploaded and linked to collection' })
  @ApiResponse({ status: 400, description: 'Invalid file type or file exceeds 5 MB' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  uploadProof(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.collectionsService.uploadProof(id, file);
  }

  /**
   * CPS-003 — Retrieve pending collection queue
   */
  @Get('queue/pending')
  @ApiOperation({ summary: "CPS-003: Retrieve Treasurer's Pending/For Verification collection queue" })
  @ApiResponse({ status: 200, description: 'List of pending collection submissions' })
  getPendingQueue() {
    return this.collectionsService.getPendingQueue();
  }

  /**
   * CPS-012 & CPS-013 — Get collection audit trail history
   */
  @Get('audit-logs')
  @ApiOperation({ summary: 'CPS-012 & CPS-013: Retrieve audit trail history for collections' })
  @ApiQuery({ name: 'collectionId', required: false, description: 'Filter by collection ID' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  getAuditLogs(@Query('collectionId') collectionId?: string) {
    return this.collectionsService.getAuditLogs(collectionId);
  }

  /**
   * CPS-013 — Monitor collection totals and categories
   */
  @Get('monitoring/totals')
  @ApiOperation({ summary: 'CPS-013: Monitor collection totals by date, category, member, and source' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date filter' })
  @ApiQuery({ name: 'category', required: false, description: 'Collection category filter' })
  @ApiQuery({ name: 'memberId', required: false, description: 'Member ID filter' })
  @ApiQuery({ name: 'source', required: false, description: 'Payment source/method filter' })
  @ApiResponse({ status: 200, description: 'Collection totals and analytics data' })
  getCollectionTotals(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('category') category?: string,
    @Query('memberId') memberId?: string,
    @Query('source') source?: string,
  ) {
    return this.collectionsService.getCollectionTotals({ dateFrom, dateTo, category, memberId, source });
  }

  /**
   * CPS-005 — Check if payment reference is duplicate (enhanced with source/member matching)
   */
  @Get('check-duplicate/:ref')
  @ApiOperation({ summary: 'CPS-005: Check if payment reference already exists (with optional member/transaction matching)' })
  @ApiParam({ name: 'ref', description: 'Payment reference number to verify' })
  @ApiQuery({ name: 'excludeId', required: false, description: 'Collection ID to exclude from check' })
  @ApiQuery({ name: 'memberId', required: false, description: 'Member ID for enhanced duplicate matching' })
  @ApiQuery({ name: 'paymentMethod', required: false, description: 'Payment method for enhanced duplicate matching' })
  checkDuplicate(
    @Param('ref') paymentReference: string,
    @Query('excludeId') excludeId?: string,
    @Query('memberId') memberId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.collectionsService.checkDuplicate(paymentReference, excludeId, memberId, paymentMethod);
  }

  /**
   * CPS-004 & CPS-007 — Validate submitted payment details & generate collection reference
   */
  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-004 & CPS-007: Validate payment details, proof of payment, and generate collection ref no' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection validated and collectionRefNo generated' })
  @ApiResponse({ status: 400, description: 'Validation failed (incomplete fields or missing proof)' })
  @ApiResponse({ status: 403, description: 'Forbidden — Auditor cannot validate (CPS-013)' })
  @ApiResponse({ status: 409, description: 'Duplicate payment detected' })
  validateCollection(@Param('id') id: string) {
    return this.collectionsService.validateCollection(id);
  }

  /**
   * CPS-006 — Classify collection category
   */
  @Post(':id/classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-006: Classify collection with a configured category before finalization' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection classified successfully' })
  @ApiResponse({ status: 400, description: 'Cannot classify posted/rejected collection' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  classifyCollection(
    @Param('id') id: string,
    @Body() dto: ClassifyCollectionDto,
  ) {
    return this.collectionsService.classifyCollection(id, dto);
  }

  /**
   * CPS-007 — Identify related financial obligation (receivable)
   */
  @Get(':id/receivable/:obligationId')
  @ApiOperation({ summary: 'CPS-007: Identify and validate the related financial obligation for a collection' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiParam({ name: 'obligationId', description: 'Financial Obligation ID to look up' })
  @ApiResponse({ status: 200, description: 'Receivable identified and eligible for payment application' })
  @ApiResponse({ status: 400, description: 'Obligation belongs to different member or has zero balance' })
  @ApiResponse({ status: 404, description: 'Collection or obligation not found' })
  identifyReceivable(
    @Param('id') id: string,
    @Param('obligationId') obligationId: string,
  ) {
    return this.collectionsService.identifyReceivable(id, obligationId);
  }

  /**
   * CPS-009 — Preview payment application math and exception status without posting
   */
  @Post(':id/preview-application')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-009: Preview payment application math & exception classification' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Application preview details' })
  previewApplication(
    @Param('id') id: string,
    @Body() dto: ApplyPaymentDto,
  ) {
    return this.collectionsService.previewApplication(id, dto);
  }

  /**
   * CPS-006, CPS-008, CPS-010, CPS-011, CPS-014 — Apply payment & Post collection
   */
  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-006, CPS-008, CPS-010, CPS-011, CPS-014: Apply payment, update balances, and post collection' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Payment posted and applied successfully' })
  @ApiResponse({ status: 400, description: 'Obligation has zero balance or invalid application' })
  @ApiResponse({ status: 403, description: 'Forbidden — Auditor cannot apply payment (CPS-013)' })
  @ApiResponse({ status: 404, description: 'Collection or obligation not found' })
  applyPayment(
    @Param('id') id: string,
    @Body() dto: ApplyPaymentDto,
  ) {
    return this.collectionsService.applyPayment(id, dto);
  }

  /**
   * CPS-014 — Mark collection as ready for reconciliation
   */
  @Post(':id/reconcile-ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-014: Explicitly mark a posted collection as Ready for Reconciliation' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection marked ready for reconciliation' })
  markReadyForReconciliation(@Param('id') id: string) {
    return this.collectionsService.markReadyForReconciliation(id);
  }

  /**
   * Reject collection with reason
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject collection with reason' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection rejected' })
  @ApiResponse({ status: 403, description: 'Forbidden — Auditor cannot reject collection (CPS-013)' })
  rejectCollection(
    @Param('id') id: string,
    @Body() dto: RejectCollectionDto,
  ) {
    return this.collectionsService.rejectCollection(id, dto);
  }

  /**
   * GET all collections (Auditor & Treasurer accessible)
   */
  @Get()
  @ApiOperation({ summary: 'Get all collections with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: CollectionStatus })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'List of collections' })
  findAll(
    @Query('status') status?: CollectionStatus,
    @Query('memberId') memberId?: string,
    @Query('search') search?: string,
  ) {
    return this.collectionsService.findAll(status, memberId, search);
  }

  /**
   * GET single collection by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get collection details by ID' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection details' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }
}