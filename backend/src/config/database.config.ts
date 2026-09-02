import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

/**
 * TypeORM database configuration factory.
 * Reads all values from environment variables via ConfigService.
 * 
 * IMPORTANT: synchronize is set to false to use explicit migrations only.
 * Never set synchronize: true in production as it can cause data loss.
 */
@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      database: this.configService.get<string>('DATABASE_NAME', 'cctv_hackathon'),
      username: this.configService.get<string>('DATABASE_USER', 'postgres'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      ssl: this.configService.get<string>('DATABASE_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false,

      // Entity auto-loading — load all .entity.ts files from modules
      autoLoadEntities: true,

      // Migrations — do NOT use synchronize in production
      synchronize: false,
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: false,

      // Logging — only log errors and slow queries in development
      logging: this.configService.get('NODE_ENV') === 'development'
        ? ['error', 'warn']
        : ['error'],

      // Connection pool
      extra: {
        max: 10,
        connectionTimeoutMillis: 5000,
      },
    };
  }
}
