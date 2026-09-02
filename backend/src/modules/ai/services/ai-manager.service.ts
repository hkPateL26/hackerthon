import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import { StartAiSessionDto } from '../dto/start-ai-session.dto.js';
import { AiSessionResponseDto } from '../dto/ai-session-response.dto.js';

@Injectable()
export class AiManagerService implements OnApplicationShutdown {
  private readonly logger = new Logger(AiManagerService.name);
  private readonly aiEngineUrl: string;
  private readonly aiServiceKey: string;
  private readonly maxConcurrentStreams: number;
  private readonly sampleVideoPath: string;

  constructor(
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
    private readonly configService: ConfigService,
  ) {
    this.aiEngineUrl = this.configService.get<string>(
      'AI_ENGINE_URL',
      'http://localhost:8000',
    );
    this.aiServiceKey =
      this.configService.get<string>('AI_SERVICE_KEY') ||
      this.configService.get<string>('AI_ENGINE_API_KEY') ||
      'gujarat_police_internal_ai_key_2026';
    this.maxConcurrentStreams = Number(
      this.configService.get<number>('AI_MAX_CONCURRENT_STREAMS', 1),
    );
    const rootDir = fs.existsSync(path.resolve(process.cwd(), 'sample-data'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');
    this.sampleVideoPath = path.resolve(
      rootDir,
      'sample-data',
      'videos',
      'sample-city-traffic.mp4',
    );
  }

  /**
   * Start AI Video Analytics Session on a Camera
   */
  async startSession(dto: StartAiSessionDto): Promise<AiSessionResponseDto> {
    // 1. Fetch camera and validate
    const camera = await this.cameraRepo.findOne({
      where: { id: dto.cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${dto.cameraId}' not found or has been deleted`);
    }

    if (!camera.isActive) {
      throw new BadRequestException(
        `Cannot start AI analytics: Camera '${camera.cameraCode}' is inactive/disabled`,
      );
    }

    // 2. Query active sessions to enforce concurrency cap
    const activeSessions = await this.listSessions();
    const runningCount = activeSessions.filter(
      (s) => s.status === 'RUNNING' || s.status === 'STARTING',
    ).length;

    const existingSession = activeSessions.find(
      (s) => s.cameraId === dto.cameraId,
    );

    if (
      (!existingSession || existingSession.status === 'STOPPED') &&
      runningCount >= this.maxConcurrentStreams
    ) {
      throw new HttpException(
        `AI capacity reached. Maximum concurrent AI streams (${this.maxConcurrentStreams}) already active. Stop an existing session before starting another.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Resolve video source path
    const forceFile =
      this.configService.get<string>('FORCE_FILE_VIDEO_SOURCE', 'true') === 'true';
    const sourceUrl =
      !forceFile && camera.rtspUrl ? camera.rtspUrl : this.sampleVideoPath;

    // 4. Call Python AI Engine
    try {
      const response = await fetch(`${this.aiEngineUrl}/api/ai/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-service-key': this.aiServiceKey,
        },
        body: JSON.stringify({
          cameraId: camera.id,
          cameraCode: camera.cameraCode,
          sourceUrl,
          sampleFps: dto.sampleFps || 1.5,
          confidenceThreshold: dto.confidenceThreshold || 0.35,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new BadRequestException(
          `AI Engine rejected session start: ${errText}`,
        );
      }

      const result = await response.json();
      return {
        ...result,
        cameraCode: camera.cameraCode,
        cameraName: camera.name,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to start AI session for camera ${camera.cameraCode}: ${err.message}`,
      );
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(
        `AI Engine unavailable or failed to start: ${err.message}`,
      );
    }
  }

  /**
   * Stop AI Video Analytics Session
   */
  async stopSession(cameraId: string): Promise<AiSessionResponseDto> {
    try {
      const response = await fetch(
        `${this.aiEngineUrl}/api/ai/sessions/${cameraId}/stop`,
        {
          method: 'POST',
          headers: {
            'x-ai-service-key': this.aiServiceKey,
          },
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        this.logger.warn(`AI Engine stop session returned error: ${errText}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      this.logger.error(
        `Error calling AI Engine to stop session ${cameraId}: ${err.message}`,
      );
      return {
        cameraId,
        status: 'STOPPED',
        sampleFps: 1.5,
        confidenceThreshold: 0.5,
        processedFrames: 0,
        detectionsCount: 0,
        approxFps: 0,
        startedAt: null,
        error: err.message,
      };
    }
  }

  /**
   * List all AI sessions
   */
  async listSessions(): Promise<AiSessionResponseDto[]> {
    try {
      const response = await fetch(`${this.aiEngineUrl}/api/ai/sessions`, {
        headers: {
          'x-ai-service-key': this.aiServiceKey,
        },
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (err: any) {
      this.logger.warn(`Could not reach AI Engine to list sessions: ${err.message}`);
      return [];
    }
  }

  /**
   * Get single AI session telemetry
   */
  async getSession(cameraId: string): Promise<AiSessionResponseDto> {
    try {
      const response = await fetch(
        `${this.aiEngineUrl}/api/ai/sessions/${cameraId}`,
        {
          headers: {
            'x-ai-service-key': this.aiServiceKey,
          },
        },
      );

      if (response.status === 404) {
        return {
          cameraId,
          status: 'STOPPED',
          sampleFps: 1.5,
          confidenceThreshold: 0.5,
          processedFrames: 0,
          detectionsCount: 0,
          approxFps: 0,
          startedAt: null,
          error: null,
        };
      }

      return await response.json();
    } catch (err: any) {
      return {
        cameraId,
        status: 'STOPPED',
        sampleFps: 1.5,
        confidenceThreshold: 0.5,
        processedFrames: 0,
        detectionsCount: 0,
        approxFps: 0,
        startedAt: null,
        error: err.message,
      };
    }
  }

  /**
   * Fetch runtime active tracks from Python AI Engine
   */
  async getActiveTracks(cameraId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.aiEngineUrl}/api/ai/sessions/${cameraId}/tracks`,
        {
          headers: { 'X-AI-Service-Key': this.aiServiceKey },
        },
      );

      if (!response.ok) {
        return {
          cameraId,
          sessionId: null,
          activeTracks: [],
        };
      }

      return await response.json();
    } catch (err: any) {
      this.logger.debug(`Could not reach AI Engine for active tracks: ${err.message}`);
      return {
        cameraId,
        sessionId: null,
        activeTracks: [],
      };
    }
  }

  /**
   * Clean up all AI sessions on application shutdown
   */
  async onApplicationShutdown() {
    this.logger.log('Stopping all AI analytics sessions on shutdown...');
    try {
      const sessions = await this.listSessions();
      for (const s of sessions) {
        if (s.status === 'RUNNING' || s.status === 'STARTING') {
          await this.stopSession(s.cameraId);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Shutdown cleanup error: ${err.message}`);
    }
  }
}
