import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AiManagerService } from './services/ai-manager.service.js';
import { AiServiceKeyGuard } from '../../common/guards/ai-service-key.guard.js';

describe('AiManagerService — AI Session Management & Concurrency Cap', () => {
  let service: AiManagerService;
  let mockCameraRepo: any;
  let mockConfigService: any;

  const sampleCamera = {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Junction North',
    isActive: true,
    deletedAt: null,
    rtspUrl: null,
  };

  beforeEach(() => {
    mockCameraRepo = {
      findOne: vi.fn().mockResolvedValue(sampleCamera),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'AI_ENGINE_URL') return 'http://localhost:8000';
        if (key === 'AI_SERVICE_KEY') return 'test-service-key-123';
        if (key === 'AI_MAX_CONCURRENT_STREAMS') return 1;
        if (key === 'FORCE_FILE_VIDEO_SOURCE') return 'true';
        return defaultValue;
      }),
    };

    service = new AiManagerService(mockCameraRepo, mockConfigService);
  });

  describe('startSession', () => {
    it('rejects AI start if camera is inactive/disabled', async () => {
      mockCameraRepo.findOne.mockResolvedValue({
        ...sampleCamera,
        isActive: false,
      });

      await expect(
        service.startSession({ cameraId: sampleCamera.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces maximum concurrent AI streams limit (1)', async () => {
      // Mock listSessions returning 1 already active session
      vi.spyOn(service, 'listSessions').mockResolvedValue([
        {
          cameraId: 'other-camera-id',
          status: 'RUNNING',
          sampleFps: 1.5,
          confidenceThreshold: 0.5,
          processedFrames: 10,
          detectionsCount: 2,
          approxFps: 1.5,
          startedAt: new Date().toISOString(),
          error: null,
        },
      ]);

      try {
        await service.startSession({ cameraId: sampleCamera.id });
        expect.unreachable('Should have thrown 429 Too Many Requests');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('AI capacity reached');
      }
    });
  });
});

describe('AiServiceKeyGuard — Service-to-Service Security', () => {
  let guard: AiServiceKeyGuard;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'AI_SERVICE_KEY') return 'secret-key-12345';
        return null;
      }),
    };
    guard = new AiServiceKeyGuard(mockConfigService);
  });

  it('allows request with valid x-ai-service-key header', () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-ai-service-key': 'secret-key-12345',
          },
        }),
      }),
    };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request with valid Authorization Bearer token', () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer secret-key-12345',
          },
        }),
      }),
    };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects request with missing service key (401)', () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    };

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects request with invalid service key (401)', () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-ai-service-key': 'wrong-key',
          },
        }),
      }),
    };

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
