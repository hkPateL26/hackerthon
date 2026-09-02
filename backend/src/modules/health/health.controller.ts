import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * System health check — no authentication required.
   * Used by Docker health checks, monitoring, and CI/CD.
   */
  @Get()
  @ApiOperation({ summary: 'System health check' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-09-02T17:00:00.000Z' },
        service: { type: 'string', example: 'gujarat-police-cctv-api' },
        version: { type: 'string', example: '1.0.0' },
        database: { type: 'string', example: 'connected' },
        uptime: { type: 'number', example: 12345.67 },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }

  /**
   * Lightweight liveness probe — minimal response for load balancers.
   */
  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live() {
    return { status: 'alive' };
  }
}
