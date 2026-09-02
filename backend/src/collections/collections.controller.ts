import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
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
import { CollectionsService } from './collections.service';
import { ApplyPaymentDto } from './dto/apply-payment.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { RejectCollectionDto } from './dto/reject-collection.dto';

// CPS-002: multer storage config
const proofStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'proofs'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `proof-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('Collections')
@Controller('collections')
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
  @UseInterceptors(FileInterceptor('file', { storage: proofStorage }))
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
   * CPS-005 — Check if payment reference is duplicate
   */
  @Get('check-duplicate/:ref')
  @ApiOperation({ summary: 'CPS-005: Check if payment reference already exists' })
  @ApiParam({ name: 'ref', description: 'Payment reference number to verify' })
  @ApiQuery({ name: 'excludeId', required: false, description: 'Collection ID to exclude from check' })
  checkDuplicate(
    @Param('ref') paymentReference: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.collectionsService.checkDuplicate(paymentReference, excludeId);
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
  @ApiResponse({ status: 409, description: 'Duplicate payment detected' })
  validateCollection(@Param('id') id: string) {
    return this.collectionsService.validateCollection(id);
  }

  /**
   * CPS-006 & CPS-008 — Apply payment to financial obligation
   */
  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CPS-006 & CPS-008: Apply payment to financial obligation and update balances' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Payment posted and applied successfully' })
  @ApiResponse({ status: 400, description: 'Obligation has zero balance or invalid application' })
  @ApiResponse({ status: 404, description: 'Collection or obligation not found' })
  applyPayment(
    @Param('id') id: string,
    @Body() dto: ApplyPaymentDto,
  ) {
    return this.collectionsService.applyPayment(id, dto);
  }

  /**
   * Reject collection with reason
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject collection with reason' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection rejected' })
  rejectCollection(
    @Param('id') id: string,
    @Body() dto: RejectCollectionDto,
  ) {
    return this.collectionsService.rejectCollection(id, dto);
  }

  /**
   * GET all collections
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