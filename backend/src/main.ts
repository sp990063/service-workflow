import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe - validates and transforms input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip non-whitelisted properties
      forbidNonWhitelisted: true,  // Error on non-whitelisted props
      transform: true,              // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - prevents stack trace leakage
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  app.enableCors();
  await app.listen(3000);
  console.log('Service Workflow API running on http://localhost:3000');
}
bootstrap();
