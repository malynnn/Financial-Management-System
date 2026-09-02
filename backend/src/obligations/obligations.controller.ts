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
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditorReadOnlyGuard } from '../common/guards/auditor-read-only.guard';
import { CreateObligationDto } from './dto/create-obligation.dto';
import { ObligationsService } from './obligations.service';

@ApiTags('Financial Obligations')
@Controller('obligations')
@UseGuards(AuditorReadOnlyGuard) // CPS-013: Block mutating operations from Internal Auditors
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new financial obligation for a member' })
  @ApiResponse({ status: 201, description: 'Obligation created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — Auditor cannot create obligations (CPS-013)' })
  create(@Body() dto: CreateObligationDto) {
    return this.obligationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all financial obligations' })
  @ApiQuery({ name: 'memberId', required: false, description: 'Filter by member ID' })
  findAll(@Query('memberId') memberId?: string) {
    return this.obligationsService.findAll(memberId);
  }

  @Get('active/:memberId')
  @ApiOperation({ summary: 'CPS-006: Identify active financial obligations with balance > 0 for a member' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  findActiveByMember(@Param('memberId') memberId: string) {
    return this.obligationsService.findActiveByMember(memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a financial obligation by ID' })
  @ApiParam({ name: 'id', description: 'Obligation ID' })
  findOne(@Param('id') id: string) {
    return this.obligationsService.findOne(id);
  }
}