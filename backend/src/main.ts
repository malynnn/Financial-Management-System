import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // Ensure upload directory exists
  const uploadDir = join(process.cwd(), 'uploads', 'proofs');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Create hybrid app: HTTP gateway + TCP microservice listener
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static assets from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Enable CORS for the Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Connect TCP microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.MICROSERVICE_HOST || '0.0.0.0',
      port: parseInt(process.env.MICROSERVICE_PORT || '3002', 10),
    },
  });

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Financial Management System API')
    .setDescription('BDOEA Financial Management System - NestJS Microservices Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start all microservices first, then the HTTP server
  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);

  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  console.log(`Microservice TCP listening on port ${process.env.MICROSERVICE_PORT || 3002}`);
}

bootstrap();