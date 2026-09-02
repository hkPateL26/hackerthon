import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import { StreamEntity } from '../entities/stream.entity.js';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import {
  StreamStatus,
  StreamSourceType,
  StreamOutputType,
} from '../enums/stream-status.enum.js';
import { FfmpegProcessManagerService } from './ffmpeg-process-manager.service.js';
import { IVideoSource } from '../interfaces/video-source.interface.js';
import { FileVideoSource } from '../sources/file-video-source.js';
import { RtspVideoSource } from '../sources/rtsp-video-source.js';
import {
  StreamResponseDto,
  StreamStatusResponseDto,
} from '../dto/stream-response.dto.js';

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);
  private readonly sampleVideoPath: string;

  constructor(
    @InjectRepository(StreamEntity)
    private readonly streamRepo: Repository<StreamEntity>,
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
    private readonly ffmpegManager: FfmpegProcessManagerService,
    private readonly configService: ConfigService,
  ) {
    // Resolve project root for sample video
    const rootDir = fs.existsSync(path.resolve(process.cwd(), 'sample-data'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');

    const defaultSamplePath = path.resolve(
      rootDir,
      'sample-data',
      'videos',
      'sample-city-traffic.mp4',
    );

    const configuredSample = this.configService.get<string>(
      'SAMPLE_VIDEO_PATH',
      defaultSamplePath,
    );
    this.sampleVideoPath = path.resolve(configuredSample);
  }

  /**
   * Start live video ingestion and HLS stream generation
   */
  async startStream(cameraId: string): Promise<StreamResponseDto> {
    // 1. Fetch camera and ensure not soft-deleted
    const camera = await this.cameraRepo.findOne({
      where: { id: cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera with ID '${cameraId}' not found or has been deleted`);
    }

    if (!camera.isActive) {
      throw new BadRequestException(`Cannot start stream: Camera '${camera.cameraCode}' is inactive/disabled`);
    }

    // 2. Fetch or create stream entity
    let stream = await this.streamRepo.findOne({ where: { cameraId } });
    if (!stream) {
      stream = this.streamRepo.create({
        cameraId,
        sourceType: StreamSourceType.FILE,
        sourceUrl: 'sample-city-traffic.mp4',
        outputType: StreamOutputType.HLS,
        status: StreamStatus.STOPPED,
      });
    }

    // 3. Check if already running (Idempotent start)
    if (stream.status === StreamStatus.RUNNING && this.ffmpegManager.isProcessRunning(cameraId)) {
      this.logger.log(`Stream for camera '${cameraId}' is already RUNNING (Idempotent response)`);
      return this.toResponseDto(stream);
    }

    // 4. Select appropriate Video Source abstraction (RTSP vs Local MP4 prototype)
    const source = this.resolveVideoSource(camera);
    const validation = await source.validate();
    if (!validation.valid) {
      throw new BadRequestException(
        `Failed to initialize video source for camera '${camera.cameraCode}': ${validation.error}`,
      );
    }

    // 5. Update state to STARTING
    stream.sourceType = source.getType();
    stream.sourceUrl = source.getSanitizedSourceUrl();
    stream.status = StreamStatus.STARTING;
    stream.lastError = null;
    stream.playbackUrl = `/api/streams/hls/${cameraId}/index.m3u8`;
    await this.streamRepo.save(stream);

    // 6. Spawn FFmpeg process
    try {
      const { pid, playlistPath } = await this.ffmpegManager.startProcess(
        cameraId,
        source,
        async (exitCode, error) => {
          await this.handleProcessExit(cameraId, exitCode, error);
        },
      );

      stream.status = StreamStatus.RUNNING;
      stream.processId = pid;
      stream.hlsPath = playlistPath;
      stream.startedAt = new Date();
      stream.stoppedAt = null;
      await this.streamRepo.save(stream);

      this.logger.log(`Stream started successfully for camera '${camera.cameraCode}' (PID: ${pid})`);
      return this.toResponseDto(stream);
    } catch (err: any) {
      this.logger.error(`Error starting stream for camera '${cameraId}': ${err.message}`);
      stream.status = StreamStatus.ERROR;
      stream.lastError = err.message;
      stream.stoppedAt = new Date();
      await this.streamRepo.save(stream);
      throw new BadRequestException(`Failed to spawn stream process: ${err.message}`);
    }
  }

  /**
   * Stop video stream and clean up child process
   */
  async stopStream(cameraId: string): Promise<StreamResponseDto> {
    const stream = await this.streamRepo.findOne({ where: { cameraId } });
    if (!stream) {
      throw new NotFoundException(`No stream session found for camera '${cameraId}'`);
    }

    await this.ffmpegManager.stopProcess(cameraId);

    stream.status = StreamStatus.STOPPED;
    stream.processId = null;
    stream.stoppedAt = new Date();
    await this.streamRepo.save(stream);

    this.logger.log(`Stream stopped for camera '${cameraId}'`);
    return this.toResponseDto(stream);
  }

  /**
   * Restart video stream
   */
  async restartStream(cameraId: string): Promise<StreamResponseDto> {
    this.logger.log(`Restarting stream for camera '${cameraId}'`);
    await this.stopStream(cameraId).catch(() => {});
    return this.startStream(cameraId);
  }

  /**
   * Get active stream metadata
   */
  async getStream(cameraId: string): Promise<StreamResponseDto> {
    const camera = await this.cameraRepo.findOne({ where: { id: cameraId } });
    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera with ID '${cameraId}' not found`);
    }

    let stream = await this.streamRepo.findOne({ where: { cameraId } });
    if (!stream) {
      // Return default stopped state if no session created yet
      return {
        id: 'none',
        cameraId,
        sourceType: StreamSourceType.FILE,
        outputType: StreamOutputType.HLS,
        status: StreamStatus.STOPPED,
        playbackUrl: `/api/streams/hls/${cameraId}/index.m3u8`,
        startedAt: null,
        stoppedAt: null,
        lastError: null,
      };
    }

    // Synchronize status with actual process state
    if (stream.status === StreamStatus.RUNNING && !this.ffmpegManager.isProcessRunning(cameraId)) {
      stream.status = StreamStatus.STOPPED;
      stream.processId = null;
      await this.streamRepo.save(stream);
    }

    return this.toResponseDto(stream);
  }

  /**
   * Get lightweight stream status
   */
  async getStreamStatus(cameraId: string): Promise<StreamStatusResponseDto> {
    const stream = await this.getStream(cameraId);
    return {
      cameraId: stream.cameraId,
      status: stream.status,
      sourceType: stream.sourceType,
      playbackUrl: stream.playbackUrl,
      startedAt: stream.startedAt,
      stoppedAt: stream.stoppedAt,
      lastError: stream.lastError,
    };
  }

  /**
   * Handle unexpected child process exit
   */
  private async handleProcessExit(
    cameraId: string,
    exitCode: number | null,
    error?: string,
  ): Promise<void> {
    try {
      const stream = await this.streamRepo.findOne({ where: { cameraId } });
      if (stream && stream.status === StreamStatus.RUNNING) {
        stream.status = exitCode === 0 ? StreamStatus.STOPPED : StreamStatus.ERROR;
        stream.processId = null;
        stream.stoppedAt = new Date();
        if (error) {
          stream.lastError = error;
        }
        await this.streamRepo.save(stream);
      }
    } catch (err: any) {
      this.logger.error(`Failed to handle process exit for camera '${cameraId}': ${err.message}`);
    }
  }

  /**
   * Resolve appropriate IVideoSource implementation
   */
  private resolveVideoSource(camera: CameraEntity): IVideoSource {
    const forceFile = this.configService.get<string>('FORCE_FILE_VIDEO_SOURCE') === 'true';

    if (!forceFile && camera.rtspUrl && camera.rtspUrl.startsWith('rtsp://')) {
      return new RtspVideoSource(camera.rtspUrl);
    }

    // Default prototype: Local sample MP4 with continuous loop
    return new FileVideoSource(this.sampleVideoPath, true);
  }

  /**
   * Map entity to safe DTO
   */
  private toResponseDto(entity: StreamEntity): StreamResponseDto {
    return {
      id: entity.id,
      cameraId: entity.cameraId,
      sourceType: entity.sourceType,
      outputType: entity.outputType,
      status: entity.status,
      playbackUrl: entity.playbackUrl,
      startedAt: entity.startedAt ? entity.startedAt.toISOString() : null,
      stoppedAt: entity.stoppedAt ? entity.stoppedAt.toISOString() : null,
      lastError: entity.lastError,
    };
  }
}
