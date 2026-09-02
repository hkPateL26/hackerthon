import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CamerasModule } from './modules/cameras/cameras.module.js';
import { StreamsModule } from './modules/streams/streams.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { DatabaseConfig } from './config/database.config.js';

@Module({
  imports: [
    // Configuration — loads .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),

    // Database — TypeORM with PostgreSQL + PostGIS
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
      inject: [ConfigService],
    }),

    // Health check module
    HealthModule,

    // Authentication & RBAC module
    AuthModule,

    // Centralized Camera Registry module
    CamerasModule,

    // Video Ingestion & Stream Integration module
    StreamsModule,

    // AI Detection Events module
    EventsModule,

    // AI Video Analytics Manager module
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
