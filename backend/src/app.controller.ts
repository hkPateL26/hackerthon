import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  /**
   * Root redirect — redirects to /api/health for convenience.
   * Not included in Swagger documentation.
   */
  @Get()
  @ApiExcludeEndpoint()
  root() {
    return {
      message: 'Gujarat Police CCTV Analytics API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health',
    };
  }
}
