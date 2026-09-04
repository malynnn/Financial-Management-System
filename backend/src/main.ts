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

  // Enable CORS for the Next.js frontend (supports local dev, custom FRONTEND_URL, or *.vercel.app)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const url = new URL(origin);
        if (
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*') ||
          origin.includes('localhost') ||
          url.hostname.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback for non-URL origins
      }
      return callback(null, true);
    },
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

  let microservicesCount = 0;
  const port = parseInt(process.env.PORT || '3001', 10);
  const tcpPort = parseInt(process.env.MICROSERVICE_PORT || '3002', 10);

  // Connect TCP microservice transport if port differs from HTTP port
  if (tcpPort !== port) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: process.env.MICROSERVICE_HOST || '0.0.0.0',
        port: tcpPort,
      },
    });
    microservicesCount++;
  }

  // Connect RabbitMQ microservice transport only if RABBITMQ_URL is provided and not default localhost
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  const isCloudOrCustomRMQ =
    rabbitmqUrl &&
    rabbitmqUrl.trim() !== '' &&
    !rabbitmqUrl.includes('127.0.0.1:5672') &&
    !rabbitmqUrl.includes('localhost:5672');

  if (isCloudOrCustomRMQ || (process.env.NODE_ENV !== 'production' && rabbitmqUrl)) {
    const rabbitmqQueue = process.env.RABBITMQ_QUEUE || 'fms_events_queue';
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl!],
        queue: rabbitmqQueue,
        queueOptions: {
          durable: true,
        },
      },
    });
    microservicesCount++;
    console.log(`Microservice RabbitMQ configured for queue: "${rabbitmqQueue}"`);
  } else {
    console.log('No external RABBITMQ_URL specified; RabbitMQ microservice listener omitted.');
  }

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Financial Management System API')
    .setDescription('BDOEA Financial Management System - NestJS Microservices Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start microservices if configured
  if (microservicesCount > 0) {
    try {
      await app.startAllMicroservices();
      console.log(`Started ${microservicesCount} microservice listeners.`);
    } catch (err) {
      console.warn('Warning: Some microservices could not be started:', err);
    }
  }

  await app.listen(port);

  console.log(`HTTP server running on port ${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();