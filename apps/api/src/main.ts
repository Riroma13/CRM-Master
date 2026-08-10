import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { PinoLoggerService } from './modules/observability/logging/pino-logger.service';
import { toNodeHandler } from 'better-auth/node';
import { createAuth, createCorsOptions } from './common/auth';
import { PrismaService } from './common/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useLogger(app.get(PinoLoggerService));
  app.enableCors(createCorsOptions());

  const prisma = app.get(PrismaService);
  const auth = createAuth(prisma.$client);
  app.use('/api/auth', toNodeHandler(auth));
  app.use(express.json());

  // Controllers include full path (api/v1/...) — no global prefix or versioning needed
  // app.setGlobalPrefix('api');
  // app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('CRM-Master API')
    .setDescription('Mission Control — Panel de supervisión multi-tenant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/v1/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

if (require.main === module) bootstrap();
