import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

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
   * GET all collections (Treasurer / Auditor)
   */
  @Get()
  @ApiOperation({ summary: 'Get all collection submissions' })
  @ApiResponse({ status: 200, description: 'List of all collections' })
  findAll() {
    return this.collectionsService.findAll();
  }

  /**
   * GET single collection by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a collection by ID' })
  @ApiParam({ name: 'id', description: 'Collection ID' })
  @ApiResponse({ status: 200, description: 'Collection details' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }
}