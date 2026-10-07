import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollScheduleDto } from './dto/create-payroll-schedule.dto';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('schedules')
  async createSchedule(@Body() dto: CreatePayrollScheduleDto) {
    return this.payrollService.createSchedule(dto);
  }

  @Get('schedules')
  async getSchedules(@Query('payrollPeriod') payrollPeriod: string) {
    return this.payrollService.getSchedulesByPeriod(payrollPeriod);
  }

  @Post('generate-list')
  async generateList(@Body('payrollPeriod') payrollPeriod: string) {
    return this.payrollService.generateDeductionList(payrollPeriod);
  }
}
