import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const mockHealthService = {
      check: vi.fn().mockResolvedValue({
        status: 'ok',
        timestamp: '2026-09-02T00:00:00.000Z',
        service: 'gujarat-police-cctv-api',
        version: '1.0.0',
        database: 'connected',
        postgis: 'available',
        uptime: 123.45,
        environment: 'test',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /health — should return health status', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('gujarat-police-cctv-api');
    expect(result.database).toBe('connected');
    expect(result.postgis).toBe('available');
    expect(result.timestamp).toBeDefined();
  });

  it('GET /health — should include uptime and version', async () => {
    const result = await controller.check();
    expect(result.uptime).toBeTypeOf('number');
    expect(result.version).toBe('1.0.0');
  });

  it('GET /health/live — should return alive status', () => {
    const result = controller.live();
    expect(result.status).toBe('alive');
  });
});
