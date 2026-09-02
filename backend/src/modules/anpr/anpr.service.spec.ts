import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnprService } from './services/anpr.service.js';
import { AnprResultEntity } from './entities/anpr-result.entity.js';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AnprService', () => {
  let service: AnprService;
  let anprRepo: any;
  let cameraRepo: any;

  const mockCamera = {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Ahmedabad Junction 01',
    deletedAt: null,
  };

  const mockAnprRecord = {
    id: 'a1111111-0001-4001-a001-000000000001',
    cameraId: mockCamera.id,
    sessionId: 's1111111-0001-4001-a001-000000000001',
    trackId: 42,
    vehicleClass: 'car',
    plateTextRaw: 'GJ 01 AB 1234',
    plateTextNormalized: 'GJ01AB1234',
    validationStatus: 'VALID',
    plateDetectionConfidence: 0.95,
    ocrConfidence: 0.92,
    finalConfidence: 0.93,
    plateBboxX: 100,
    plateBboxY: 200,
    plateBboxWidth: 80,
    plateBboxHeight: 30,
    plateSnapshotPath: 'runtime/anpr/plates/plate_test.jpg',
    vehicleSnapshotPath: 'runtime/anpr/vehicles/veh_test.jpg',
    occurredAt: new Date(),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    camera: mockCamera,
  };

  beforeEach(async () => {
    anprRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'mock-uuid', createdAt: new Date(), updatedAt: new Date() })),
      save: vi.fn().mockImplementation((e) => Promise.resolve({ ...e, id: e.id || 'saved-uuid' })),
      createQueryBuilder: vi.fn(),
    };

    cameraRepo = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnprService,
        {
          provide: getRepositoryToken(AnprResultEntity),
          useValue: anprRepo,
        },
        {
          provide: getRepositoryToken(CameraEntity),
          useValue: cameraRepo,
        },
      ],
    }).compile();

    service = module.get<AnprService>(AnprService);
  });

  describe('syncObservations', () => {
    it('should throw NotFoundException if camera is missing', async () => {
      cameraRepo.findOne.mockResolvedValue(null);

      await expect(
        service.syncObservations({
          cameraId: 'unknown-id',
          observations: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trackId is provided without sessionId', async () => {
      cameraRepo.findOne.mockResolvedValue(mockCamera);

      await expect(
        service.syncObservations({
          cameraId: mockCamera.id,
          observations: [
            {
              cameraId: mockCamera.id,
              trackId: 10,
              plateTextRaw: 'GJ01AB1234',
              occurredAt: new Date().toISOString(),
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully persist valid ANPR observation', async () => {
      cameraRepo.findOne.mockResolvedValue(mockCamera);
      anprRepo.findOne.mockResolvedValue(null);

      const res = await service.syncObservations({
        cameraId: mockCamera.id,
        sessionId: 's1111111-0001-4001-a001-000000000001',
        observations: [
          {
            cameraId: mockCamera.id,
            sessionId: 's1111111-0001-4001-a001-000000000001',
            trackId: 10,
            vehicleClass: 'car',
            plateTextRaw: 'GJ 01 AB 1234',
            plateTextNormalized: 'GJ01AB1234',
            validationStatus: 'VALID',
            ocrConfidence: 0.91,
            finalConfidence: 0.91,
            occurredAt: new Date().toISOString(),
          },
        ],
      });

      expect(res.synchronized).toBe(1);
      expect(anprRepo.create).toHaveBeenCalled();
      expect(anprRepo.save).toHaveBeenCalled();
    });

    it('should deduplicate within cooldown window and update confidence', async () => {
      cameraRepo.findOne.mockResolvedValue(mockCamera);
      const existing = {
        ...mockAnprRecord,
        finalConfidence: 0.80,
        occurredAt: new Date(),
      };
      anprRepo.findOne.mockResolvedValue(existing);

      const res = await service.syncObservations({
        cameraId: mockCamera.id,
        sessionId: mockAnprRecord.sessionId,
        observations: [
          {
            cameraId: mockCamera.id,
            sessionId: mockAnprRecord.sessionId,
            trackId: mockAnprRecord.trackId,
            plateTextRaw: 'GJ01AB1234',
            plateTextNormalized: 'GJ01AB1234',
            finalConfidence: 0.95,
            occurredAt: new Date().toISOString(),
          },
        ],
      });

      expect(res.synchronized).toBe(1);
      expect(existing.finalConfidence).toBe(0.95);
      expect(anprRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('findById', () => {
    it('should return formatted response dto', async () => {
      anprRepo.findOne.mockResolvedValue(mockAnprRecord);

      const res = await service.findById(mockAnprRecord.id);
      expect(res.id).toBe(mockAnprRecord.id);
      expect(res.plateTextNormalized).toBe('GJ01AB1234');
      expect(res.cameraCode).toBe('CAM-AHM-001');
    });

    it('should throw NotFoundException when not found', async () => {
      anprRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
