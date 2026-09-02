import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnprResultEntity } from '../entities/anpr-result.entity.js';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import { SyncAnprDto } from '../dto/sync-anpr.dto.js';
import { QueryAnprDto } from '../dto/query-anpr.dto.js';
import {
  AnprResponseDto,
  PaginatedAnprResponseDto,
} from '../dto/anpr-response.dto.js';

@Injectable()
export class AnprService {
  private readonly logger = new Logger(AnprService.name);

  constructor(
    @InjectRepository(AnprResultEntity)
    private readonly anprRepo: Repository<AnprResultEntity>,
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
  ) {}

  /**
   * Synchronize ANPR observations from Python AI Engine (Service-to-Service)
   */
  async syncObservations(dto: SyncAnprDto): Promise<{ synchronized: number }> {
    const camera = await this.cameraRepo.findOne({
      where: { id: dto.cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera with ID '${dto.cameraId}' not found or deleted`);
    }

    let count = 0;
    for (const item of dto.observations) {
      // Enforce session_id rule: if track_id is set, session_id must not be null
      const effectiveSessionId = item.sessionId || dto.sessionId || null;
      if (item.trackId !== undefined && item.trackId !== null && !effectiveSessionId) {
        throw new BadRequestException(
          `Invalid ANPR observation: trackId #${item.trackId} requires a non-null sessionId`,
        );
      }

      const normalized = (item.plateTextNormalized || item.plateTextRaw || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      const occurredAt = new Date(item.occurredAt);

      // Deduplication check: same camera, session, track, plate within 5s window
      let existing: AnprResultEntity | null = null;
      if (effectiveSessionId && item.trackId) {
        existing = await this.anprRepo.findOne({
          where: {
            cameraId: camera.id,
            sessionId: effectiveSessionId,
            trackId: item.trackId,
            plateTextNormalized: normalized,
          },
          order: { occurredAt: 'DESC' },
        });
      }

      if (existing) {
        // If within 5 seconds, update existing observation if new confidence is higher
        const diffMs = Math.abs(occurredAt.getTime() - existing.occurredAt.getTime());
        if (diffMs < 5000) {
          if ((item.finalConfidence || 0) > (existing.finalConfidence || 0)) {
            existing.finalConfidence = item.finalConfidence ?? existing.finalConfidence;
            existing.ocrConfidence = item.ocrConfidence ?? existing.ocrConfidence;
            existing.plateDetectionConfidence = item.plateDetectionConfidence ?? existing.plateDetectionConfidence;
            existing.validationStatus = item.validationStatus || existing.validationStatus;
            if (item.plateSnapshotPath) existing.plateSnapshotPath = item.plateSnapshotPath;
            if (item.vehicleSnapshotPath) existing.vehicleSnapshotPath = item.vehicleSnapshotPath;
            await this.anprRepo.save(existing);
            count++;
          }
          continue;
        }
      }

      // Create new ANPR observation record
      const anpr = this.anprRepo.create({
        cameraId: camera.id,
        sessionId: effectiveSessionId,
        trackId: item.trackId ?? null,
        vehicleClass: item.vehicleClass ?? null,
        plateTextRaw: item.plateTextRaw,
        plateTextNormalized: normalized,
        validationStatus: item.validationStatus || 'VALID',
        plateDetectionConfidence: item.plateDetectionConfidence ?? null,
        ocrConfidence: item.ocrConfidence ?? null,
        finalConfidence: item.finalConfidence ?? null,
        plateBboxX: item.plateBboxX ?? null,
        plateBboxY: item.plateBboxY ?? null,
        plateBboxWidth: item.plateBboxWidth ?? null,
        plateBboxHeight: item.plateBboxHeight ?? null,
        plateSnapshotPath: item.plateSnapshotPath ?? null,
        vehicleSnapshotPath: item.vehicleSnapshotPath ?? null,
        occurredAt,
        metadata: item.metadata || {},
      });

      await this.anprRepo.save(anpr);
      count++;
    }

    this.logger.debug(
      `Synchronized ${count} ANPR observations for camera ${camera.cameraCode}`,
    );
    return { synchronized: count };
  }

  /**
   * Query ANPR records with filtering and pagination (Operator / Supervisor / Admin)
   */
  async findAll(query: QueryAnprDto): Promise<PaginatedAnprResponseDto> {
    const qb = this.anprRepo
      .createQueryBuilder('anpr')
      .leftJoinAndSelect('anpr.camera', 'camera');

    if (query.cameraId) {
      qb.andWhere('anpr.cameraId = :cameraId', { cameraId: query.cameraId });
    }

    if (query.sessionId) {
      qb.andWhere('anpr.sessionId = :sessionId', { sessionId: query.sessionId });
    }

    if (query.trackId) {
      qb.andWhere('anpr.trackId = :trackId', { trackId: query.trackId });
    }

    if (query.vehicleClass) {
      qb.andWhere('LOWER(anpr.vehicleClass) = LOWER(:vehicleClass)', {
        vehicleClass: query.vehicleClass,
      });
    }

    if (query.validationStatus) {
      qb.andWhere('anpr.validationStatus = :validationStatus', {
        validationStatus: query.validationStatus,
      });
    }

    if (query.minConfidence !== undefined && query.minConfidence !== null) {
      qb.andWhere('anpr.finalConfidence >= :minConfidence', {
        minConfidence: query.minConfidence,
      });
    }

    if (query.plate) {
      const cleanPlate = query.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      qb.andWhere(
        '(anpr.plateTextNormalized ILIKE :plate OR anpr.plateTextRaw ILIKE :rawPlate)',
        {
          plate: `%${cleanPlate}%`,
          rawPlate: `%${query.plate}%`,
        },
      );
    }

    if (query.from) {
      qb.andWhere('anpr.occurredAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('anpr.occurredAt <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('anpr.occurredAt', 'DESC');

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((a) => this.toResponseDto(a, a.camera)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lookup single ANPR record by UUID
   */
  async findById(id: string): Promise<AnprResponseDto> {
    const record = await this.anprRepo.findOne({
      where: { id },
      relations: { camera: true },
    });

    if (!record) {
      throw new NotFoundException(`ANPR record with ID '${id}' not found`);
    }

    return this.toResponseDto(record, record.camera);
  }

  /**
   * Get recent ANPR observations for a camera
   */
  async findByCameraId(
    cameraId: string,
    limit: number = 20,
  ): Promise<AnprResponseDto[]> {
    const camera = await this.cameraRepo.findOne({
      where: { id: cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${cameraId}' not found or deleted`);
    }

    const records = await this.anprRepo.find({
      where: { cameraId },
      order: { occurredAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
      relations: { camera: true },
    });

    return records.map((r) => this.toResponseDto(r, camera));
  }

  /**
   * Search plates across all cameras
   */
  async searchPlates(
    term: string,
    limit: number = 20,
  ): Promise<AnprResponseDto[]> {
    if (!term || term.trim().length === 0) {
      return [];
    }

    const clean = term.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const records = await this.anprRepo
      .createQueryBuilder('anpr')
      .leftJoinAndSelect('anpr.camera', 'camera')
      .where('anpr.plateTextNormalized ILIKE :term', { term: `%${clean}%` })
      .orWhere('anpr.plateTextRaw ILIKE :rawTerm', { rawTerm: `%${term.trim()}%` })
      .orderBy('anpr.occurredAt', 'DESC')
      .take(Math.min(100, Math.max(1, limit)))
      .getMany();

    return records.map((r) => this.toResponseDto(r, r.camera));
  }

  /**
   * Format entity to standard client response DTO
   */
  toResponseDto(entity: AnprResultEntity, camera?: CameraEntity): AnprResponseDto {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    return {
      id: entity.id,
      cameraId: entity.cameraId,
      cameraCode: camera?.cameraCode,
      cameraName: camera?.name,
      sessionId: entity.sessionId,
      trackId: entity.trackId,
      vehicleClass: entity.vehicleClass,
      plateTextRaw: entity.plateTextRaw,
      plateTextNormalized: entity.plateTextNormalized,
      validationStatus: entity.validationStatus,
      plateDetectionConfidence: entity.plateDetectionConfidence,
      ocrConfidence: entity.ocrConfidence,
      finalConfidence: entity.finalConfidence,
      plateBbox: entity.plateBboxX !== null ? {
        x: entity.plateBboxX,
        y: entity.plateBboxY,
        width: entity.plateBboxWidth,
        height: entity.plateBboxHeight,
      } : null,
      plateSnapshotUrl: entity.plateSnapshotPath
        ? `${baseUrl}/api/anpr/snapshots/${entity.plateSnapshotPath.replace(/^runtime\/anpr\//, '')}`
        : null,
      vehicleSnapshotUrl: entity.vehicleSnapshotPath
        ? `${baseUrl}/api/anpr/snapshots/${entity.vehicleSnapshotPath.replace(/^runtime\/anpr\//, '')}`
        : null,
      occurredAt: entity.occurredAt.toISOString(),
      metadata: entity.metadata || {},
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
