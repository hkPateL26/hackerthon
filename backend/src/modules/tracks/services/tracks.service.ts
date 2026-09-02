import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackEntity } from '../entities/track.entity.js';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import { SyncTracksDto } from '../dto/sync-track.dto.js';
import { QueryTracksDto } from '../dto/query-tracks.dto.js';
import {
  TrackResponseDto,
  PaginatedTracksResponseDto,
  ActiveTracksResponseDto,
} from '../dto/track-response.dto.js';

@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);

  constructor(
    @InjectRepository(TrackEntity)
    private readonly trackRepo: Repository<TrackEntity>,
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
  ) {}

  /**
   * Synchronize batch of tracks from Python AI Engine (Internal Service)
   */
  async syncTracks(dto: SyncTracksDto): Promise<{ synchronized: number }> {
    const camera = await this.cameraRepo.findOne({
      where: { id: dto.cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${dto.cameraId}' not found or deleted`);
    }

    let count = 0;

    for (const item of dto.tracks) {
      const firstSeen = new Date(item.firstSeenAt);
      const lastSeen = new Date(item.lastSeenAt);

      // Check if track already exists for this camera and session
      let track = await this.trackRepo.findOne({
        where: {
          cameraId: dto.cameraId,
          sessionId: dto.sessionId,
          trackId: item.trackId,
        },
      });

      if (track) {
        // Update existing track state
        track.category = item.category;
        track.detectedClass = item.detectedClass;
        track.status = item.status;
        track.lastSeenAt = lastSeen;
        track.detectionCount = item.detectionCount ?? (track.detectionCount + 1);
        track.confidence = item.confidence !== undefined ? item.confidence : track.confidence;
        track.bboxX = item.bboxX !== undefined ? item.bboxX : track.bboxX;
        track.bboxY = item.bboxY !== undefined ? item.bboxY : track.bboxY;
        track.bboxWidth = item.bboxWidth !== undefined ? item.bboxWidth : track.bboxWidth;
        track.bboxHeight = item.bboxHeight !== undefined ? item.bboxHeight : track.bboxHeight;
        if (item.metadata) {
          track.metadata = { ...track.metadata, ...item.metadata };
        }
      } else {
        // Create new track
        track = this.trackRepo.create({
          cameraId: dto.cameraId,
          sessionId: dto.sessionId,
          trackId: item.trackId,
          category: item.category,
          detectedClass: item.detectedClass,
          status: item.status,
          firstSeenAt: firstSeen,
          lastSeenAt: lastSeen,
          detectionCount: item.detectionCount || 1,
          confidence: item.confidence ?? null,
          bboxX: item.bboxX ?? null,
          bboxY: item.bboxY ?? null,
          bboxWidth: item.bboxWidth ?? null,
          bboxHeight: item.bboxHeight ?? null,
          metadata: item.metadata || {},
        });
      }

      await this.trackRepo.save(track);
      count++;
    }

    this.logger.debug(
      `Synchronized ${count} tracks for camera ${camera.cameraCode} (session: ${dto.sessionId})`,
    );
    return { synchronized: count };
  }

  /**
   * Query tracks with filtering and pagination (Authenticated)
   */
  async findAll(query: QueryTracksDto): Promise<PaginatedTracksResponseDto> {
    const qb = this.trackRepo
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.camera', 'camera');

    if (query.cameraId) {
      qb.andWhere('track.cameraId = :cameraId', { cameraId: query.cameraId });
    }

    if (query.sessionId) {
      qb.andWhere('track.sessionId = :sessionId', { sessionId: query.sessionId });
    }

    if (query.category) {
      qb.andWhere('track.category = :category', { category: query.category });
    }

    if (query.status) {
      qb.andWhere('track.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('track.lastSeenAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('track.lastSeenAt <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('track.lastSeenAt', 'DESC');

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((t) => this.toResponseDto(t, t.camera)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single track by UUID
   */
  async findById(id: string): Promise<TrackResponseDto> {
    const track = await this.trackRepo.findOne({
      where: { id },
      relations: { camera: true },
    });

    if (!track) {
      throw new NotFoundException(`Track with ID '${id}' not found`);
    }

    return this.toResponseDto(track, track.camera);
  }

  /**
   * Get active tracks for a specific camera
   */
  async findActiveByCameraId(cameraId: string): Promise<ActiveTracksResponseDto> {
    const camera = await this.cameraRepo.findOne({
      where: { id: cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${cameraId}' not found or deleted`);
    }

    const tracks = await this.trackRepo.find({
      where: [
        { cameraId, status: 'ACTIVE' },
        { cameraId, status: 'NEW' },
      ],
      order: { lastSeenAt: 'DESC' },
      relations: { camera: true },
      take: 50,
    });

    return {
      cameraId,
      sessionId: tracks[0]?.sessionId,
      activeTracks: tracks.map((t) => this.toResponseDto(t, camera)),
    };
  }

  /**
   * Get historical tracks for a specific camera
   */
  async findByCameraId(cameraId: string, limit: number = 50): Promise<TrackResponseDto[]> {
    const camera = await this.cameraRepo.findOne({
      where: { id: cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${cameraId}' not found or deleted`);
    }

    const tracks = await this.trackRepo.find({
      where: { cameraId },
      order: { lastSeenAt: 'DESC' },
      relations: { camera: true },
      take: Math.min(100, limit),
    });

    return tracks.map((t) => this.toResponseDto(t, camera));
  }

  /**
   * Serializes entity to safe response DTO
   */
  private toResponseDto(track: TrackEntity, camera?: CameraEntity): TrackResponseDto {
    return {
      id: track.id,
      cameraId: track.cameraId,
      cameraCode: camera?.cameraCode,
      cameraName: camera?.name,
      sessionId: track.sessionId,
      trackId: track.trackId,
      category: track.category,
      detectedClass: track.detectedClass,
      status: track.status,
      firstSeenAt: track.firstSeenAt.toISOString(),
      lastSeenAt: track.lastSeenAt.toISOString(),
      detectionCount: track.detectionCount,
      confidence: track.confidence !== null ? Number(track.confidence) : null,
      bbox:
        track.bboxX !== null && track.bboxY !== null && track.bboxWidth !== null && track.bboxHeight !== null
          ? {
              x: Number(track.bboxX),
              y: Number(track.bboxY),
              width: Number(track.bboxWidth),
              height: Number(track.bboxHeight),
            }
          : null,
      metadata: track.metadata || {},
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    };
  }
}
