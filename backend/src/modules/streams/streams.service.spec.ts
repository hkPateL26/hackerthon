import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StreamsService } from './services/streams.service.js';
import { StreamStatus, StreamSourceType, StreamOutputType } from './enums/stream-status.enum.js';
import { CameraStatus } from '../cameras/enums/camera-status.enum.js';
import { CameraType } from '../cameras/enums/camera-type.enum.js';

describe('StreamsService — Video Ingestion & Stream Integration', () => {
  let service: StreamsService;
  let mockStreamRepo: any;
  let mockCameraRepo: any;
  let mockFfmpegManager: any;
  let mockConfigService: any;

  const sampleCamera = {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Junction PTZ',
    cameraType: CameraType.PTZ,
    status: CameraStatus.ONLINE,
    isActive: true,
    deletedAt: null,
    rtspUrl: 'rtsp://admin:pass123@192.168.10.11:554/live',
  };

  const sampleStreamEntity = {
    id: 's1111111-0001-4001-a001-000000000001',
    cameraId: sampleCamera.id,
    sourceType: StreamSourceType.RTSP,
    sourceUrl: 'rtsp://***:***@192.168.10.11:554/live',
    outputType: StreamOutputType.HLS,
    status: StreamStatus.STOPPED,
    processId: null,
    playbackUrl: `/api/streams/hls/${sampleCamera.id}/index.m3u8`,
    startedAt: null,
    stoppedAt: null,
    lastError: null,
    metadata: {},
  };

  beforeEach(() => {
    mockStreamRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 's-new-123' })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockCameraRepo = {
      findOne: vi.fn(),
    };

    mockFfmpegManager = {
      isProcessRunning: vi.fn().mockReturnValue(false),
      startProcess: vi.fn().mockResolvedValue({
        pid: 12345,
        outputDir: 'D:/runtime/hls/c1',
        playlistPath: 'D:/runtime/hls/c1/index.m3u8',
      }),
      stopProcess: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal?: any) => {
        if (key === 'FORCE_FILE_VIDEO_SOURCE') return 'false';
        return defaultVal;
      }),
    };

    service = new StreamsService(
      mockStreamRepo,
      mockCameraRepo,
      mockFfmpegManager,
      mockConfigService,
    );
  });

  describe('startStream', () => {
    it('should start stream successfully for an active camera and return RUNNING status', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue({ ...sampleStreamEntity });

      const result = await service.startStream(sampleCamera.id);

      expect(result.status).toBe(StreamStatus.RUNNING);
      expect(result.cameraId).toBe(sampleCamera.id);
      expect(result.playbackUrl).toBe(`/api/streams/hls/${sampleCamera.id}/index.m3u8`);
      expect(mockFfmpegManager.startProcess).toHaveBeenCalled();
      expect(mockStreamRepo.save).toHaveBeenCalled();
    });

    it('should return existing stream idempotently if already RUNNING', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue({
        ...sampleStreamEntity,
        status: StreamStatus.RUNNING,
        processId: 12345,
      });
      mockFfmpegManager.isProcessRunning.mockReturnValue(true);

      const result = await service.startStream(sampleCamera.id);

      expect(result.status).toBe(StreamStatus.RUNNING);
      expect(mockFfmpegManager.startProcess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if camera does not exist', async () => {
      mockCameraRepo.findOne.mockResolvedValue(null);

      await expect(service.startStream('invalid-id')).rejects.toThrow(NotFoundException);
      expect(mockFfmpegManager.startProcess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if camera is soft-deleted', async () => {
      mockCameraRepo.findOne.mockResolvedValue({
        ...sampleCamera,
        deletedAt: new Date(),
      });

      await expect(service.startStream(sampleCamera.id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if camera is inactive/disabled', async () => {
      mockCameraRepo.findOne.mockResolvedValue({
        ...sampleCamera,
        isActive: false,
      });

      await expect(service.startStream(sampleCamera.id)).rejects.toThrow(BadRequestException);
    });

    it('should handle FFmpeg spawn failure, mark status ERROR, and throw BadRequestException', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue({ ...sampleStreamEntity });
      mockFfmpegManager.startProcess.mockRejectedValue(new Error('Spawn failed: binary not executable'));

      await expect(service.startStream(sampleCamera.id)).rejects.toThrow(BadRequestException);
      expect(mockStreamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: StreamStatus.ERROR }),
      );
    });
  });

  describe('stopStream', () => {
    it('should stop stream, kill process, and update status to STOPPED', async () => {
      mockStreamRepo.findOne.mockResolvedValue({
        ...sampleStreamEntity,
        status: StreamStatus.RUNNING,
        processId: 12345,
      });

      const result = await service.stopStream(sampleCamera.id);

      expect(result.status).toBe(StreamStatus.STOPPED);
      expect(mockFfmpegManager.stopProcess).toHaveBeenCalledWith(sampleCamera.id);
      expect(mockStreamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: StreamStatus.STOPPED, processId: null }),
      );
    });

    it('should throw NotFoundException if no stream session exists', async () => {
      mockStreamRepo.findOne.mockResolvedValue(null);

      await expect(service.stopStream('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restartStream', () => {
    it('should stop and restart the stream', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue({
        ...sampleStreamEntity,
        status: StreamStatus.RUNNING,
        processId: 12345,
      });

      const result = await service.restartStream(sampleCamera.id);

      expect(mockFfmpegManager.stopProcess).toHaveBeenCalled();
      expect(result.status).toBe(StreamStatus.RUNNING);
    });
  });

  describe('getStream and getStreamStatus', () => {
    it('should return default stopped metadata if no stream session exists', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue(null);

      const result = await service.getStream(sampleCamera.id);

      expect(result.status).toBe(StreamStatus.STOPPED);
      expect(result.playbackUrl).toBe(`/api/streams/hls/${sampleCamera.id}/index.m3u8`);
    });

    it('should synchronize RUNNING status to STOPPED if process is dead', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCamera);
      mockStreamRepo.findOne.mockResolvedValue({
        ...sampleStreamEntity,
        status: StreamStatus.RUNNING,
        processId: 12345,
      });
      mockFfmpegManager.isProcessRunning.mockReturnValue(false); // dead

      const result = await service.getStream(sampleCamera.id);

      expect(result.status).toBe(StreamStatus.STOPPED);
      expect(mockStreamRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: StreamStatus.STOPPED }),
      );
    });
  });
});
