import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers with Helmet
  app.use(helmet());

  // CORS - configurable origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe - validates and transforms input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - prevents stack trace leakage
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ServiceFlow API')
    .setDescription('Workflow and Form Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('forms', 'Form management')
    .addTag('workflows', 'Workflow management')
    .addTag('approvals', 'Approval processing')
    .addTag('delegations', 'Delegation management')
    .addTag('escalations', 'Escalation rules')
    .addTag('analytics', 'Statistics and analytics')
    .addTag('admin', 'Admin settings')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Service Workflow API running on http://localhost:${port}`);
}
bootstrap();
