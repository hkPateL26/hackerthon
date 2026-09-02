import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import { EventEntity } from '../entities/event.entity.js';
import { EventTypeEntity } from '../entities/event-type.entity.js';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import { IngestEventDto } from '../dto/ingest-event.dto.js';
import { QueryEventsDto } from '../dto/query-events.dto.js';
import {
  EventResponseDto,
  PaginatedEventsResponseDto,
} from '../dto/event-response.dto.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly snapshotsDir: string;

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(EventTypeEntity)
    private readonly eventTypeRepo: Repository<EventTypeEntity>,
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
  ) {
    const rootDir = fs.existsSync(path.resolve(process.cwd(), 'sample-data'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');
    this.snapshotsDir = path.resolve(rootDir, 'runtime', 'snapshots');
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  /**
   * Ingest a new AI detection event
   */
  async ingestEvent(dto: IngestEventDto): Promise<EventResponseDto> {
    // 1. Validate camera exists and not soft deleted
    const camera = await this.cameraRepo.findOne({
      where: { id: dto.cameraId },
    });

    if (!camera || camera.deletedAt) {
      throw new NotFoundException(`Camera '${dto.cameraId}' not found or deleted`);
    }

    // 2. Resolve or fallback event type
    let eventType = await this.eventTypeRepo.findOne({
      where: { code: dto.eventTypeCode },
    });

    if (!eventType) {
      // Fallback: create event type if missing
      eventType = this.eventTypeRepo.create({
        code: dto.eventTypeCode,
        name: dto.eventTypeCode.replace(/_/g, ' '),
        description: 'Auto-registered AI event type',
      });
      eventType = await this.eventTypeRepo.save(eventType);
    }

    // 3. Create and persist event
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    const event = this.eventRepo.create({
      cameraId: dto.cameraId,
      eventTypeId: eventType.id,
      detectedCategory: dto.detectedCategory,
      detectedClass: dto.detectedClass,
      confidence: dto.confidence,
      occurredAt,
      frameWidth: dto.frameWidth || 640,
      frameHeight: dto.frameHeight || 360,
      bboxX: dto.bboxX,
      bboxY: dto.bboxY,
      bboxWidth: dto.bboxWidth,
      bboxHeight: dto.bboxHeight,
      snapshotPath: dto.snapshotPath || null,
      source: dto.source || 'YOLOv8n',
      trackId: dto.trackId ?? null,
      metadata: dto.metadata || {},
    });

    const saved = await this.eventRepo.save(event);
    this.logger.log(
      `Ingested ${saved.detectedCategory} (${saved.detectedClass}, conf=${saved.confidence}${saved.trackId ? `, track=#${saved.trackId}` : ''}) from camera ${camera.cameraCode}`,
    );

    return this.toResponseDto(saved, camera, eventType);
  }

  /**
   * Query events with filtering and pagination
   */
  async findAll(query: QueryEventsDto): Promise<PaginatedEventsResponseDto> {
    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.eventType', 'eventType')
      .leftJoinAndSelect('event.camera', 'camera');

    if (query.cameraId) {
      qb.andWhere('event.cameraId = :cameraId', { cameraId: query.cameraId });
    }

    if (query.category) {
      qb.andWhere('event.detectedCategory = :category', {
        category: query.category,
      });
    }

    if (query.type) {
      qb.andWhere('eventType.code = :type', { type: query.type });
    }

    if (query.minConfidence !== undefined) {
      qb.andWhere('event.confidence >= :minConf', { minConf: query.minConfidence });
    }

    if (query.from) {
      qb.andWhere('event.occurredAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('event.occurredAt <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('event.occurredAt', 'DESC');

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((e) => this.toResponseDto(e, e.camera, e.eventType)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single event by ID
   */
  async findById(id: string): Promise<EventResponseDto> {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: { camera: true, eventType: true },
    });

    if (!event) {
      throw new NotFoundException(`Event '${id}' not found`);
    }

    return this.toResponseDto(event, event.camera, event.eventType);
  }

  /**
   * Get recent events for a camera
   */
  async findByCameraId(
    cameraId: string,
    limit = 50,
  ): Promise<EventResponseDto[]> {
    const events = await this.eventRepo.find({
      where: { cameraId },
      relations: { camera: true, eventType: true },
      order: { occurredAt: 'DESC' },
      take: Math.min(100, limit),
    });

    return events.map((e) => this.toResponseDto(e, e.camera, e.eventType));
  }

  /**
   * Resolves safe local path for snapshot image
   */
  getSnapshotFilePath(fileName: string): string {
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(fileName) || fileName.includes('..')) {
      throw new BadRequestException('Invalid snapshot filename');
    }

    const targetFile = path.resolve(this.snapshotsDir, fileName);
    if (!targetFile.startsWith(this.snapshotsDir)) {
      throw new BadRequestException('Access denied: directory traversal detected');
    }

    if (!fs.existsSync(targetFile)) {
      throw new NotFoundException(`Snapshot '${fileName}' not found`);
    }

    return targetFile;
  }

  /**
   * Convert entity to safe response DTO
   */
  private toResponseDto(
    event: EventEntity,
    camera?: CameraEntity,
    eventType?: EventTypeEntity,
  ): EventResponseDto {
    const snapshotFileName = event.snapshotPath
      ? path.basename(event.snapshotPath)
      : null;

    return {
      id: event.id,
      cameraId: event.cameraId,
      cameraCode: camera?.cameraCode,
      cameraName: camera?.name,
      eventTypeCode: eventType?.code || 'UNKNOWN',
      eventTypeName: eventType?.name || 'Unknown',
      detectedCategory: event.detectedCategory,
      detectedClass: event.detectedClass,
      confidence: Number(event.confidence),
      occurredAt: event.occurredAt.toISOString(),
      frameWidth: event.frameWidth,
      frameHeight: event.frameHeight,
      bboxX: Number(event.bboxX),
      bboxY: Number(event.bboxY),
      bboxWidth: Number(event.bboxWidth),
      bboxHeight: Number(event.bboxHeight),
      snapshotPath: event.snapshotPath,
      snapshotUrl: snapshotFileName
        ? `/api/events/snapshots/${snapshotFileName}`
        : null,
      source: event.source,
      trackId: event.trackId ?? null,
      metadata: event.metadata || {},
      createdAt: event.createdAt.toISOString(),
    };
  }
}
