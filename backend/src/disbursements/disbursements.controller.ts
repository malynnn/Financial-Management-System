import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';
import { RequestContextGuard } from '../common/guards/request-context.guard';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import { ExecuteDisbursementDto } from './dto/execute-disbursement.dto';
import { QueryDisbursementDto } from './dto/query-disbursement.dto';
import { ReviewDisbursementDto } from './dto/review-disbursement.dto';
import { UpdateChequeStatusDto } from './dto/update-cheque-status.dto';
import { DISBURSEMENT_TYPES, DISBURSEMENT_CATEGORIES, REQUIRES_SUPPORTING_DOC } from './disbursement.config';
import { ChequeStatus } from '@prisma/client';

@ApiTags('Disbursements')
@Controller('disbursements')
@UseGuards(RequestContextGuard, AuditorReadOnlyGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get disbursement configuration lists' })
  getConfig() {
    return {
      types: DISBURSEMENT_TYPES,
      categories: DISBURSEMENT_CATEGORIES,
      requiresSupportingDoc: REQUIRES_SUPPORTING_DOC,
      chequeStatuses: Object.values(ChequeStatus),
    };
  }

  @Get('eligible-loans')
  @ApiOperation({ summary: 'Retrieve approved loan information for disbursement' })
  getEligibleLoans() {
    return this.disbursementsService.getEligibleApprovedLoans();
  }

  @Get('funds/summary')
  @ApiOperation({ summary: 'Retrieve fund source balances' })
  getFundsSummary() {
    return this.disbursementsService.getAllFundsSummary();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a generic disbursement request' })
  createDisbursement(@Body() dto: CreateDisbursementRequestDto, @Req() req: any) {
    return this.disbursementsService.createDisbursementRequest(dto, req.user?.id);
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a disbursement request (legacy alias)' })
  createDisbursementAlias(@Body() dto: CreateDisbursementRequestDto, @Req() req: any) {
    return this.disbursementsService.createDisbursementRequest(dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all disbursements with status and filters' })
  findAll(@Query() query: QueryDisbursementDto) {
    return this.disbursementsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get disbursement record by ID' })
  findOne(@Param('id') id: string) {
    return this.disbursementsService.findOne(id);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or Reject a disbursement request' })
  reviewDisbursement(
    @Param('id') id: string,
    @Body() dto: ReviewDisbursementDto,
    @Req() req: any,
  ) {
    return this.disbursementsService.reviewDisbursement(id, dto, req.user?.id);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute approved disbursement and release funds' })
  executeDisbursement(
    @Param('id') id: string,
    @Body() dto: ExecuteDisbursementDto,
    @Req() req: any,
  ) {
    return this.disbursementsService.executeDisbursement(id, dto, req.user?.id);
  }

  @Patch(':id/cheque-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cheque status' })
  updateChequeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateChequeStatusDto,
    @Req() req: any,
  ) {
    return this.disbursementsService.updateChequeStatus(id, dto, req.user?.id);
  }
}
