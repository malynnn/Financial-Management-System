import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';
import { AuthorizedBalanceAdjustmentDto } from './dto/authorized-balance-adjustment.dto';
import { CheckFundAvailabilityDto } from './dto/check-fund-availability.dto';
import { CreateFundDto } from './dto/create-fund.dto';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';
import { FundSummaryQueryDto } from './dto/fund-summary-query.dto';
import { QueryFundLedgerDto } from './dto/query-fund-ledger.dto';
import { ToggleFundStatusDto } from './dto/toggle-fund-status.dto';
import { UpdateFundDto } from './dto/update-fund.dto';
import { ValidateFundAssignmentDto } from './dto/validate-fund-assignment.dto';
import { FundsService } from './funds.service';

@ApiTags('Funds')
@Controller('funds')
@UseGuards(AuditorReadOnlyGuard)
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  /**
   * FMS-001: Register a new fund
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'FMS-001: Register a new fund record' })
  @ApiResponse({ status: 201, description: 'Fund registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Duplicate fund code or fund name' })
  createFund(@Body() dto: CreateFundDto) {
    return this.fundsService.createFund(dto);
  }

  /**
   * FMS-001 & FMS-003: List all fund records with calculated balances
   */
  @Get()
  @ApiOperation({ summary: 'FMS-001 & FMS-003: Retrieve all funds with dynamic balances' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by fund name or code' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (Active, Inactive, All)' })
  @ApiResponse({ status: 200, description: 'List of all funds' })
  getAllFunds(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.fundsService.getAllFunds({ search, status });
  }

  /**
   * FMS-002 & FMS-003: Global Fund Transaction Ledger
   */
  @Get('transactions/ledger')
  @ApiOperation({ summary: 'FMS-002 & FMS-003: Retrieve global fund transaction ledger' })
  @ApiResponse({ status: 200, description: 'Paginated fund transaction ledger' })
  getFundTransactionsLedger(@Query() query: QueryFundLedgerDto) {
    return this.fundsService.getFundTransactionsLedger(query);
  }

  /**
   * FMS-009: Complete Fund Transaction History with audit details
   */
  @Get('transactions/history')
  @ApiOperation({ summary: 'FMS-009: Complete fund transaction history and audit trail' })
  @ApiQuery({ name: 'fundIdentifier', required: false, description: 'Optional fund ID, code, or name filter' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Records per page' })
  @ApiResponse({ status: 200, description: 'Complete transaction history list' })
  getFundTransactionHistory(
    @Query('fundIdentifier') fundIdentifier?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.fundsService.getFundTransactionHistory(
      fundIdentifier,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  /**
   * FMS-008: Check fund availability before releasing funds
   */
  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FMS-008: Check fund liquidity and availability before release' })
  @ApiResponse({ status: 200, description: 'Fund availability check result' })
  @ApiResponse({ status: 400, description: 'Invalid required amount or inactive fund' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  checkFundAvailability(@Body() dto: CheckFundAvailabilityDto) {
    return this.fundsService.checkFundAvailability(dto);
  }

  /**
   * FMS-005: Validate fund assignment
   */
  @Post('validate-assignment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FMS-005: Validate fund assignment for transactions' })
  @ApiResponse({ status: 200, description: 'Fund assignment is valid and active' })
  @ApiResponse({ status: 400, description: 'Fund is inactive or invalid' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  validateFundAssignment(@Body() dto: ValidateFundAssignmentDto) {
    return this.fundsService.validateFundAssignment(dto.fundIdentifier);
  }

  /**
   * FMS-010: Process Authorized Balance Adjustment
   */
  @Post('authorized-adjustment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FMS-010: Execute authorized fund balance adjustment' })
  @ApiResponse({ status: 200, description: 'Balance adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid amount or excessive reduction' })
  @ApiResponse({ status: 403, description: 'Unauthorized adjustment attempt' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  processAuthorizedAdjustment(@Body() dto: AuthorizedBalanceAdjustmentDto) {
    return this.fundsService.processAuthorizedAdjustment(dto);
  }

  /**
   * FMS-011: Prepared dataset for AI Forecasting Module
   */
  @Get('forecasting-ready-data')
  @ApiOperation({ summary: 'FMS-011: Retrieve validated posted data for AI Forecasting' })
  @ApiResponse({ status: 200, description: 'Forecasting-ready time series and validated balances' })
  getForecastingReadyData(@Query() query: ForecastingQueryDto) {
    return this.fundsService.getForecastingReadyData(query);
  }

  /**
   * FMS-001 & FMS-003: Get single fund details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve single fund details with calculated balance' })
  @ApiParam({ name: 'id', description: 'Fund ID' })
  @ApiResponse({ status: 200, description: 'Fund details' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  getFundById(@Param('id') id: string) {
    return this.fundsService.getFundWithCalculatedBalance(id);
  }

  /**
   * FMS-007: Calculate fund utilization
   */
  @Get(':id/utilization')
  @ApiOperation({ summary: 'FMS-007: Calculate fund utilization based on posted outflows' })
  @ApiParam({ name: 'id', description: 'Fund ID or Code' })
  @ApiResponse({ status: 200, description: 'Fund utilization metrics' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  getFundUtilization(@Param('id') id: string) {
    return this.fundsService.calculateFundUtilization(id);
  }

  /**
   * FMS-001: Edit fund configuration
   */
  @Put(':id')
  @ApiOperation({ summary: 'FMS-001: Edit fund configuration' })
  @ApiParam({ name: 'id', description: 'Fund ID' })
  @ApiResponse({ status: 200, description: 'Fund updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  @ApiResponse({ status: 409, description: 'Duplicate fund code or name' })
  updateFund(@Param('id') id: string, @Body() dto: UpdateFundDto) {
    return this.fundsService.updateFund(id, dto);
  }

  /**
   * FMS-001: Activate or deactivate fund
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'FMS-001: Activate or deactivate a fund' })
  @ApiParam({ name: 'id', description: 'Fund ID' })
  @ApiResponse({ status: 200, description: 'Fund status updated' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  toggleFundStatus(@Param('id') id: string, @Body() dto: ToggleFundStatusDto) {
    return this.fundsService.toggleFundStatus(id, dto);
  }

  /**
   * FMS-003: Retrieve fund financial summary
   */
  @Get(':id/summary')
  @ApiOperation({ summary: 'FMS-003: Retrieve fund financial summary for a period' })
  @ApiParam({ name: 'id', description: 'Fund ID' })
  @ApiResponse({ status: 200, description: 'Fund financial summary' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  getFundFinancialSummary(
    @Param('id') id: string,
    @Query() query: FundSummaryQueryDto,
  ) {
    return this.fundsService.getFundFinancialSummary(id, query);
  }
}
