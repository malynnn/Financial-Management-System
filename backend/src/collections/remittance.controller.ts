import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { RemittanceService } from './remittance.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadRemittanceDto } from './dto/remittance.dto';

@Controller('remittance')
export class RemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRemittanceDto
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!file.originalname.endsWith('.csv')) throw new BadRequestException('Only CSV files are allowed');
    
    dto.fileName = file.originalname;
    
    return this.remittanceService.uploadRemittanceBatch(file.buffer, dto);
  }

  @Post(':id/match')
  async match(@Param('id') id: string) {
    return this.remittanceService.processMatch(id);
  }

  @Get()
  async findAll() {
    return this.remittanceService.getAllBatches();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.remittanceService.getBatchDetails(id);
  }
}
