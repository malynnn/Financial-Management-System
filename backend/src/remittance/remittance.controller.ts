import { Controller, Get, Post, Param, Query, UseInterceptors, UploadedFile, Body, Res } from '@nestjs/common';
import { RemittanceService } from './remittance.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('remittance')
export class RemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Get('template')
  async getTemplate(@Query('payrollPeriod') payrollPeriod: string, @Res() res: Response) {
    const csv = await this.remittanceService.generateTemplate(payrollPeriod);
    res.header('Content-Type', 'text/csv');
    res.attachment(`remittance-template-${payrollPeriod}.csv`);
    return res.send(csv);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRemittance(
    @UploadedFile() file: Express.Multer.File,
    @Body('payrollPeriod') payrollPeriod: string,
    @Body('userId') userId: string,
  ) {
    return this.remittanceService.processUpload(file.buffer, file.originalname, payrollPeriod, userId);
  }

  @Post(':id/validate')
  async validateBatch(@Param('id') id: string, @Body('userId') userId: string) {
    return this.remittanceService.validateBatch(id, userId);
  }

  @Post(':id/handoff')
  async handoffBatch(@Param('id') id: string, @Body('userId') userId: string) {
    return this.remittanceService.handoffBatch(id, userId);
  }
}
