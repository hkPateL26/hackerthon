import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventsService } from './services/events.service.js';

describe('EventsService — AI Detection Events Persistence', () => {
  let service: EventsService;
  let mockEventRepo: any;
  let mockEventTypeRepo: any;
  let mockCameraRepo: any;

  const sampleCamera = {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Junction North',
    isActive: true,
    deletedAt: null,
  };

  const sampleEventType = {
    id: 'et-1111-0001',
    code: 'PERSON_DETECTED',
    name: 'Person Detected',
    description: 'AI detected a human pedestrian',
  };

  beforeEach(() => {
    mockEventRepo = {
      create: vi.fn((dto) => ({ ...dto, id: 'event-uuid-123', createdAt: new Date() })),
      save: vi.fn((entity) => Promise.resolve({ ...entity, id: 'event-uuid-123' })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockEventTypeRepo = {
      findOne: vi.fn().mockResolvedValue(sampleEventType),
      create: vi.fn((dto) => ({ ...dto, id: 'et-new-123' })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockCameraRepo = {
      findOne: vi.fn().mockResolvedValue(sampleCamera),
    };

    service = new EventsService(
      mockEventRepo as any,
      mockEventTypeRepo as any,
      mockCameraRepo as any,
    );
  });

  describe('ingestEvent', () => {
    it('successfully ingests a PERSON detection event', async () => {
      const dto = {
        cameraId: sampleCamera.id,
        eventTypeCode: 'PERSON_DETECTED',
        detectedCategory: 'PERSON',
        detectedClass: 'person',
        confidence: 0.885,
        occurredAt: '2026-09-02T16:00:00.000Z',
        frameWidth: 640,
        frameHeight: 360,
        bboxX: 120,
        bboxY: 80,
        bboxWidth: 50,
        bboxHeight: 140,
        snapshotPath: 'runtime/snapshots/snap_1.jpg',
      };

      const result = await service.ingestEvent(dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('event-uuid-123');
      expect(result.detectedCategory).toBe('PERSON');
      expect(result.detectedClass).toBe('person');
      expect(result.confidence).toBe(0.885);
      expect(result.cameraCode).toBe('CAM-AHM-001');
      expect(mockEventRepo.save).toHaveBeenCalled();
    });

    it('successfully ingests a VEHICLE detection event', async () => {
      const vehicleEventType = {
        id: 'et-2222-0002',
        code: 'VEHICLE_DETECTED',
        name: 'Vehicle Detected',
      };
      mockEventTypeRepo.findOne.mockResolvedValue(vehicleEventType);

      const dto = {
        cameraId: sampleCamera.id,
        eventTypeCode: 'VEHICLE_DETECTED',
        detectedCategory: 'VEHICLE',
        detectedClass: 'bus',
        confidence: 0.92,
        bboxX: 200,
        bboxY: 100,
        bboxWidth: 300,
        bboxHeight: 200,
      };

      const result = await service.ingestEvent(dto);

      expect(result.detectedCategory).toBe('VEHICLE');
      expect(result.detectedClass).toBe('bus');
      expect(result.confidence).toBe(0.92);
    });

    it('rejects event if camera does not exist', async () => {
      mockCameraRepo.findOne.mockResolvedValue(null);

      const dto = {
        cameraId: 'non-existent-camera-id',
        eventTypeCode: 'PERSON_DETECTED',
        detectedCategory: 'PERSON',
        detectedClass: 'person',
        confidence: 0.9,
        bboxX: 10,
        bboxY: 10,
        bboxWidth: 50,
        bboxHeight: 50,
      };

      await expect(service.ingestEvent(dto)).rejects.toThrow(NotFoundException);
    });

    it('rejects event if camera is soft-deleted', async () => {
      mockCameraRepo.findOne.mockResolvedValue({
        ...sampleCamera,
        deletedAt: new Date(),
      });

      const dto = {
        cameraId: sampleCamera.id,
        eventTypeCode: 'PERSON_DETECTED',
        detectedCategory: 'PERSON',
        detectedClass: 'person',
        confidence: 0.9,
        bboxX: 10,
        bboxY: 10,
        bboxWidth: 50,
        bboxHeight: 50,
      };

      await expect(service.ingestEvent(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSnapshotFilePath', () => {
    it('rejects directory traversal attempts with 400 Bad Request', () => {
      expect(() => service.getSnapshotFilePath('../secret.txt')).toThrow(BadRequestException);
      expect(() => service.getSnapshotFilePath('..\\..\\windows\\system32')).toThrow(BadRequestException);
      expect(() => service.getSnapshotFilePath('invalid/char/path')).toThrow(BadRequestException);
    });
  });
});
