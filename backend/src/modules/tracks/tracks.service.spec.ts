import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TracksService } from './services/tracks.service.js';

describe('TracksService — Multi-Object Tracking Persistence', () => {
  let service: TracksService;
  let mockTrackRepo: any;
  let mockCameraRepo: any;

  const sampleCamera = {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Junction North',
    isActive: true,
    deletedAt: null,
  };

  const sampleTrackEntity = {
    id: 'track-uuid-1',
    cameraId: sampleCamera.id,
    sessionId: 'sess-uuid-1',
    trackId: 17,
    category: 'PERSON',
    detectedClass: 'person',
    status: 'ACTIVE',
    firstSeenAt: new Date('2026-09-02T16:00:00Z'),
    lastSeenAt: new Date('2026-09-02T16:00:02Z'),
    detectionCount: 3,
    confidence: 0.91,
    bboxX: 100,
    bboxY: 120,
    bboxWidth: 50,
    bboxHeight: 80,
    metadata: {},
    createdAt: new Date('2026-09-02T16:00:00Z'),
    updatedAt: new Date('2026-09-02T16:00:02Z'),
    camera: sampleCamera,
  };

  beforeEach(() => {
    mockTrackRepo = {
      create: vi.fn((dto) => ({ ...dto, id: 'track-uuid-new', createdAt: new Date(), updatedAt: new Date() })),
      save: vi.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'track-uuid-new' })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockCameraRepo = {
      findOne: vi.fn().mockResolvedValue(sampleCamera),
    };

    service = new TracksService(mockTrackRepo as any, mockCameraRepo as any);
  });

  describe('syncTracks', () => {
    it('creates new tracks when none exist for camera/session', async () => {
      mockTrackRepo.findOne.mockResolvedValue(null);

      const dto = {
        cameraId: sampleCamera.id,
        sessionId: 'sess-uuid-1',
        tracks: [
          {
            trackId: 17,
            category: 'PERSON',
            detectedClass: 'person',
            confidence: 0.91,
            bboxX: 100,
            bboxY: 120,
            bboxWidth: 50,
            bboxHeight: 80,
            status: 'ACTIVE',
            firstSeenAt: '2026-09-02T16:00:00Z',
            lastSeenAt: '2026-09-02T16:00:00Z',
            detectionCount: 1,
            metadata: {},
          },
        ],
      };

      const result = await service.syncTracks(dto);
      expect(result.synchronized).toBe(1);
      expect(mockTrackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cameraId: sampleCamera.id,
          sessionId: 'sess-uuid-1',
          trackId: 17,
          category: 'PERSON',
          status: 'ACTIVE',
        }),
      );
      expect(mockTrackRepo.save).toHaveBeenCalled();
    });

    it('updates existing track state when track already exists in session', async () => {
      const existing = { ...sampleTrackEntity };
      mockTrackRepo.findOne.mockResolvedValue(existing);

      const dto = {
        cameraId: sampleCamera.id,
        sessionId: 'sess-uuid-1',
        tracks: [
          {
            trackId: 17,
            category: 'PERSON',
            detectedClass: 'person',
            confidence: 0.94,
            bboxX: 110,
            bboxY: 125,
            bboxWidth: 52,
            bboxHeight: 80,
            status: 'ACTIVE',
            firstSeenAt: '2026-09-02T16:00:00Z',
            lastSeenAt: '2026-09-02T16:00:03Z',
            detectionCount: 4,
            metadata: {},
          },
        ],
      };

      const result = await service.syncTracks(dto);
      expect(result.synchronized).toBe(1);
      expect(existing.detectionCount).toBe(4);
      expect(existing.confidence).toBe(0.94);
      expect(existing.bboxX).toBe(110);
    });

    it('throws NotFoundException if camera does not exist', async () => {
      mockCameraRepo.findOne.mockResolvedValue(null);

      await expect(
        service.syncTracks({
          cameraId: 'unknown-camera',
          sessionId: 'sess-1',
          tracks: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActiveByCameraId', () => {
    it('returns active tracks for a camera', async () => {
      mockTrackRepo.find.mockResolvedValue([sampleTrackEntity]);

      const res = await service.findActiveByCameraId(sampleCamera.id);
      expect(res.cameraId).toBe(sampleCamera.id);
      expect(res.activeTracks).toHaveLength(1);
      expect(res.activeTracks[0].trackId).toBe(17);
      expect(res.activeTracks[0].status).toBe('ACTIVE');
    });
  });

  describe('findById', () => {
    it('returns track DTO when found', async () => {
      mockTrackRepo.findOne.mockResolvedValue(sampleTrackEntity);

      const res = await service.findById('track-uuid-1');
      expect(res.id).toBe('track-uuid-1');
      expect(res.trackId).toBe(17);
      expect(res.cameraCode).toBe('CAM-AHM-001');
    });

    it('throws NotFoundException when track not found', async () => {
      mockTrackRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
