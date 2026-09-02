import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
  database: 'connected' | 'disconnected' | 'error';
  postgis: 'available' | 'unavailable' | 'unknown';
  uptime: number;
  environment: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async check(): Promise<HealthStatus> {
    const dbStatus = await this.checkDatabase();
    const postgisStatus = dbStatus === 'connected'
      ? await this.checkPostGIS()
      : 'unknown';

    const overallStatus =
      dbStatus === 'connected' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'gujarat-police-cctv-api',
      version: '1.0.0',
      database: dbStatus,
      postgis: postgisStatus,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
    };
  }

  private async checkDatabase(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      if (!this.dataSource.isInitialized) {
        return 'disconnected';
      }
      await this.dataSource.query('SELECT 1');
      return 'connected';
    } catch {
      return 'error';
    }
  }

  private async checkPostGIS(): Promise<'available' | 'unavailable'> {
    try {
      const result = await this.dataSource.query('SELECT PostGIS_Version()');
      return result?.length > 0 ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
}
