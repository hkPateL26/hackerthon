import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  // Global validation pipe
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

  // CORS configuration
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gujarat Police CCTV Analytics API')
    .setDescription(
      'Central CCTV Integration & AI Video Analytics Platform — API Documentation',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('health', 'System health checks')
    .addTag('cameras', 'CCTV Camera Registry')
    .addTag('events', 'AI-detected Events')
    .addTag('alerts', 'Real-time Alerts')
    .addTag('incidents', 'Incident Management')
    .addTag('watchlist', 'Watchlist Management')
    .addTag('vehicles', 'ANPR & Vehicle Intelligence')
    .addTag('search', 'Cross-Camera Search')
    .addTag('analytics', 'Dashboard & Analytics')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(port);
  console.log(`\n🚀 Gujarat Police CCTV Analytics API running`);
  console.log(`   Port:     ${port}`);
  console.log(`   API:      http://localhost:${port}/api`);
  console.log(`   Docs:     http://localhost:${port}/api/docs`);
  console.log(`   Health:   http://localhost:${port}/api/health`);
  console.log(`   Env:      ${configService.get('NODE_ENV', 'development')}\n`);
}

await bootstrap();
