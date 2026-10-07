import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LifespanService } from './lifespan.service';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';

@ApiTags('AI-Based Fund Lifespan Prediction')
@Controller('lifespan')
@UseGuards(AuditorReadOnlyGuard)
export class LifespanController {
  constructor(private readonly lifespanService: LifespanService) {}

  @Get('predict')
  @ApiOperation({
    summary: 'AI-FLP-001 to 018: Predict lifespan for all active funds',
  })
  @ApiQuery({ name: 'horizon', required: false, type: Number, description: 'Prediction horizon in months (default 12)' })
  @ApiQuery({ name: 'save', required: false, type: Boolean, description: 'Save the prediction to the database' })
  @ApiResponse({ status: 200, description: 'Lifespan prediction for all funds' })
  getAllPredictions(
    @Query('horizon') horizon?: number,
    @Query('save') save?: boolean,
  ) {
    // If the query string comes as "true" it evaluates to truthy or we can cast
    const isSave = String(save) === 'true';
    return this.lifespanService.predictLifespan('ALL', horizon, isSave);
  }

  @Get(':code')
  @ApiOperation({
    summary: 'AI-FLP-001 to 018: Predict lifespan for a specific fund',
  })
  @ApiParam({ name: 'code', description: 'Fund code (e.g. UNF, GEN)', example: 'UNF' })
  @ApiQuery({ name: 'horizon', required: false, type: Number, description: 'Prediction horizon in months (default 12)' })
  @ApiQuery({ name: 'save', required: false, type: Boolean, description: 'Save the prediction to the database' })
  @ApiResponse({ status: 200, description: 'Fund lifespan prediction' })
  @ApiResponse({ status: 400, description: 'Invalid fund code' })
  getLifespan(
    @Param('code') code: string,
    @Query('horizon') horizon?: number,
    @Query('save') save?: boolean,
  ) {
    const isSave = String(save) === 'true';
    return this.lifespanService.predictLifespan(code, horizon, isSave);
  }
}
