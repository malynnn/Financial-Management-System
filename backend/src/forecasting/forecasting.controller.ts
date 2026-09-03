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
import { GenerateForecastDto } from './dto/generate-forecast.dto';
import { ForecastingService } from './forecasting.service';

@ApiTags('AI Forecasting')
@Controller('forecasting')
@UseGuards(AuditorReadOnlyGuard)
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  /**
   * FAI-001 through FAI-011: Generate and store AI Forecast
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sprint 4 (FAI-001 - FAI-011): Generate AI financial forecast using Pandas DataFrames and store results',
  })
  @ApiResponse({ status: 200, description: 'Forecast generated and stored successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or insufficient historical periods' })
  generateForecast(@Body() dto: GenerateForecastDto) {
    return this.forecastingService.generateForecast(dto);
  }

  /**
   * FAI-012: Provide latest valid stored forecast results to the Interactive Dashboard
   */
  @Get('stored/latest')
  @ApiOperation({
    summary: 'FAI-012: Provide latest valid stored forecast results to the Interactive Dashboard',
  })
  @ApiQuery({ name: 'fundCode', required: false, description: 'Optional fund code filter (UNF, GEN, DAF, FAF, LNF, or ALL)' })
  @ApiResponse({ status: 200, description: 'Latest valid stored forecast results for dashboard' })
  getLatestDashboardForecastData(@Query('fundCode') fundCode?: string) {
    return this.forecastingService.getLatestDashboardForecastData(fundCode);
  }

  /**
   * FAI-011 & FAI-012: Retrieve stored forecast records
   */
  @Get('stored')
  @ApiOperation({
    summary: 'FAI-011 & FAI-012: Retrieve valid stored forecast records from database',
  })
  @ApiQuery({ name: 'fundCode', required: false, description: 'Filter by fund code' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum records to retrieve' })
  @ApiResponse({ status: 200, description: 'List of valid stored forecast records' })
  getStoredForecasts(
    @Query('fundCode') fundCode?: string,
    @Query('limit') limit?: number,
  ) {
    return this.forecastingService.getStoredForecasts(fundCode, limit ? Number(limit) : 100);
  }

  /**
   * FAI-009: Evaluate historical data sufficiency and readiness for ALL active funds from Fund Master
   */
  @Get('readiness')
  @ApiOperation({
    summary: 'FAI-009: Evaluate data sufficiency for all active funds in Fund Master (UNF, GEN, DAF, FAF, LNF, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Readiness evaluation for active funds' })
  getForecastingReadiness() {
    return this.forecastingService.getForecastingReadiness();
  }

  /**
   * Retrieve forecast for a specific fund (FAI-004 to FAI-009, FAI-010)
   */
  @Get('fund/:code')
  @ApiOperation({
    summary: 'Retrieve forecast for a specific configured fund code (UNF, GEN, DAF, FAF, LNF, etc.)',
  })
  @ApiParam({ name: 'code', description: 'Fund code from Fund Master', example: 'FAF' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Forecast horizon in months (1-12)', example: 4 })
  @ApiQuery({ name: 'periods', required: false, description: 'Comma-separated target periods (YYYY-MM)' })
  @ApiResponse({ status: 200, description: 'Fund forecast projection' })
  @ApiResponse({ status: 400, description: 'Invalid fund code or insufficient historical periods' })
  getFundForecast(
    @Param('code') code: string,
    @Query('horizon') horizon?: number,
    @Query('periods') periods?: string,
  ) {
    const targetPeriods = periods ? periods.split(',').map((p) => p.trim()) : undefined;
    return this.forecastingService.getFundForecast(code, horizon ? Number(horizon) : 4, targetPeriods);
  }
}
