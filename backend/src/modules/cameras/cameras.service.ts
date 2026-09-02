import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CameraEntity } from './entities/camera.entity.js';
import { DistrictEntity } from './entities/district.entity.js';
import { PoliceStationEntity } from './entities/police-station.entity.js';
import { CameraGroupEntity } from './entities/camera-group.entity.js';
import { CreateCameraDto } from './dto/create-camera.dto.js';
import { UpdateCameraDto } from './dto/update-camera.dto.js';
import { CameraQueryDto, CameraSortBy, SortOrder } from './dto/camera-query.dto.js';
import { CameraStatus } from './enums/camera-status.enum.js';
import {
  SafeCameraResponseDto,
  PaginatedCameraResponseDto,
} from './dto/camera-response.dto.js';
import { GeoJSONFeatureCollectionDto } from './dto/geojson-response.dto.js';
import { CreateCameraGroupDto } from './dto/create-camera-group.dto.js';
import { CameraMapper } from './mappers/camera.mapper.js';

@Injectable()
export class CamerasService {
  private readonly logger = new Logger(CamerasService.name);

  constructor(
    @InjectRepository(CameraEntity)
    private readonly cameraRepo: Repository<CameraEntity>,
    @InjectRepository(DistrictEntity)
    private readonly districtRepo: Repository<DistrictEntity>,
    @InjectRepository(PoliceStationEntity)
    private readonly policeStationRepo: Repository<PoliceStationEntity>,
    @InjectRepository(CameraGroupEntity)
    private readonly groupRepo: Repository<CameraGroupEntity>,
  ) {}

  /**
   * Create a new camera in the registry (ADMIN only)
   */
  async create(dto: CreateCameraDto): Promise<SafeCameraResponseDto> {
    const existing = await this.cameraRepo.findOne({
      where: { cameraCode: dto.cameraCode },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `Camera code '${dto.cameraCode}' is already registered`,
      );
    }

    // Verify district
    const district = await this.districtRepo.findOne({
      where: { id: dto.districtId },
    });
    if (!district) {
      throw new BadRequestException(`District with ID '${dto.districtId}' not found`);
    }

    // Verify police station
    const policeStation = await this.policeStationRepo.findOne({
      where: { id: dto.policeStationId },
    });
    if (!policeStation) {
      throw new BadRequestException(
        `Police station with ID '${dto.policeStationId}' not found`,
      );
    }

    const camera = this.cameraRepo.create({
      cameraCode: dto.cameraCode,
      name: dto.name,
      description: dto.description || null,
      cameraType: dto.cameraType,
      vendor: dto.vendor || null,
      model: dto.model || null,
      serialNumber: dto.serialNumber || null,
      ipAddress: dto.ipAddress || null,
      port: dto.port || 554,
      rtspUrl: dto.rtspUrl || null,
      locationName: dto.locationName || null,
      districtId: dto.districtId,
      policeStationId: dto.policeStationId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: dto.status || CameraStatus.ONLINE,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      installedAt: dto.installedAt || null,
      metadata: dto.metadata || {},
    });

    const saved = await this.cameraRepo.save(camera);
    this.logger.log(`Created camera '${saved.cameraCode}' (${saved.name})`);

    // Reload with eager/joined relations
    return this.findOne(saved.id);
  }

  /**
   * List cameras with pagination, multi-field search, and filters
   */
  async findAll(query: CameraQueryDto): Promise<PaginatedCameraResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.cameraRepo
      .createQueryBuilder('camera')
      .leftJoinAndSelect('camera.district', 'district')
      .leftJoinAndSelect('camera.policeStation', 'policeStation')
      .where('camera.deletedAt IS NULL');

    // Search
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(camera.cameraCode ILIKE :term OR camera.name ILIKE :term OR camera.vendor ILIKE :term OR camera.model ILIKE :term OR camera.locationName ILIKE :term)',
        { term },
      );
    }

    // District filter
    if (query.districtId) {
      qb.andWhere('camera.districtId = :districtId', { districtId: query.districtId });
    }

    // Police Station filter
    if (query.policeStationId) {
      qb.andWhere('camera.policeStationId = :policeStationId', {
        policeStationId: query.policeStationId,
      });
    }

    // Status filter
    if (query.status) {
      qb.andWhere('camera.status = :status', { status: query.status });
    }

    // Camera Type filter
    if (query.cameraType) {
      qb.andWhere('camera.cameraType = :cameraType', { cameraType: query.cameraType });
    }

    // Active status filter
    if (query.isActive !== undefined) {
      qb.andWhere('camera.isActive = :isActive', { isActive: query.isActive });
    }

    // Sorting
    const sortFieldMap: Record<CameraSortBy, string> = {
      [CameraSortBy.CREATED_AT]: 'camera.createdAt',
      [CameraSortBy.CAMERA_CODE]: 'camera.cameraCode',
      [CameraSortBy.NAME]: 'camera.name',
      [CameraSortBy.STATUS]: 'camera.status',
      [CameraSortBy.CAMERA_TYPE]: 'camera.cameraType',
    };
    const sortColumn = sortFieldMap[query.sortBy] || 'camera.createdAt';
    const sortDirection = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection);

    qb.skip(skip).take(limit);

    const [cameras, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: cameras.map((c) => CameraMapper.toSafeResponse(c)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Get camera details by ID
   */
  async findOne(id: string): Promise<SafeCameraResponseDto> {
    const camera = await this.cameraRepo.findOne({
      where: { id },
      relations: { district: true, policeStation: true },
    });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }
    return CameraMapper.toSafeResponse(camera);
  }

  /**
   * Update camera details (ADMIN only)
   */
  async update(id: string, dto: UpdateCameraDto): Promise<SafeCameraResponseDto> {
    const camera = await this.cameraRepo.findOne({
      where: { id },
      relations: { district: true, policeStation: true },
    });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }

    // Unique code check if changed
    if (dto.cameraCode && dto.cameraCode !== camera.cameraCode) {
      const existing = await this.cameraRepo.findOne({
        where: { cameraCode: dto.cameraCode },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Camera code '${dto.cameraCode}' is already in use`,
        );
      }
      camera.cameraCode = dto.cameraCode;
    }

    // Validate foreign keys if updated
    if (dto.districtId && dto.districtId !== camera.districtId) {
      const district = await this.districtRepo.findOne({
        where: { id: dto.districtId },
      });
      if (!district) throw new BadRequestException(`District not found`);
      camera.districtId = dto.districtId;
    }

    if (dto.policeStationId && dto.policeStationId !== camera.policeStationId) {
      const ps = await this.policeStationRepo.findOne({
        where: { id: dto.policeStationId },
      });
      if (!ps) throw new BadRequestException(`Police station not found`);
      camera.policeStationId = dto.policeStationId;
    }

    if (dto.name !== undefined) camera.name = dto.name;
    if (dto.description !== undefined) camera.description = dto.description;
    if (dto.cameraType !== undefined) camera.cameraType = dto.cameraType;
    if (dto.vendor !== undefined) camera.vendor = dto.vendor;
    if (dto.model !== undefined) camera.model = dto.model;
    if (dto.serialNumber !== undefined) camera.serialNumber = dto.serialNumber;
    if (dto.ipAddress !== undefined) camera.ipAddress = dto.ipAddress;
    if (dto.port !== undefined) camera.port = dto.port;
    if (dto.rtspUrl !== undefined) camera.rtspUrl = dto.rtspUrl;
    if (dto.locationName !== undefined) camera.locationName = dto.locationName;
    if (dto.latitude !== undefined) camera.latitude = dto.latitude;
    if (dto.longitude !== undefined) camera.longitude = dto.longitude;
    if (dto.status !== undefined) camera.status = dto.status;
    if (dto.isActive !== undefined) camera.isActive = dto.isActive;
    if (dto.installedAt !== undefined) camera.installedAt = dto.installedAt;
    if (dto.metadata !== undefined) camera.metadata = dto.metadata;

    await this.cameraRepo.save(camera);
    this.logger.log(`Updated camera '${camera.cameraCode}' (${camera.id})`);

    return this.findOne(id);
  }

  /**
   * Soft delete a camera (ADMIN only)
   */
  async softDelete(id: string): Promise<{ message: string; id: string }> {
    const camera = await this.cameraRepo.findOne({ where: { id } });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }

    camera.isActive = false;
    camera.deletedAt = new Date();
    await this.cameraRepo.save(camera);

    this.logger.log(`Soft deleted camera '${camera.cameraCode}' (${id})`);
    return {
      message: `Camera '${camera.cameraCode}' has been successfully deactivated and archived`,
      id,
    };
  }

  /**
   * Update camera status (ADMIN / SUPERVISOR)
   */
  async updateStatus(
    id: string,
    status: CameraStatus,
  ): Promise<SafeCameraResponseDto> {
    const camera = await this.cameraRepo.findOne({ where: { id } });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }

    camera.status = status;
    if (status === CameraStatus.ONLINE) {
      camera.lastSeenAt = new Date();
    }
    await this.cameraRepo.save(camera);

    this.logger.log(
      `Updated status for camera '${camera.cameraCode}' to ${status}`,
    );
    return this.findOne(id);
  }

  /**
   * Activate camera (ADMIN only)
   */
  async activate(id: string): Promise<SafeCameraResponseDto> {
    const camera = await this.cameraRepo.findOne({ where: { id } });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }

    camera.isActive = true;
    await this.cameraRepo.save(camera);
    this.logger.log(`Activated camera '${camera.cameraCode}'`);
    return this.findOne(id);
  }

  /**
   * Deactivate camera (ADMIN only)
   */
  async deactivate(id: string): Promise<SafeCameraResponseDto> {
    const camera = await this.cameraRepo.findOne({ where: { id } });
    if (!camera) {
      throw new NotFoundException(`Camera with ID '${id}' not found`);
    }

    camera.isActive = false;
    await this.cameraRepo.save(camera);
    this.logger.log(`Deactivated camera '${camera.cameraCode}'`);
    return this.findOne(id);
  }

  /**
   * Return GeoJSON FeatureCollection of all active cameras (GIS-ready)
   */
  async getGeoJSON(): Promise<GeoJSONFeatureCollectionDto> {
    const cameras = await this.cameraRepo.find({
      where: { isActive: true },
      relations: { district: true, policeStation: true },
      order: { createdAt: 'DESC' },
    });

    return CameraMapper.toGeoJSON(cameras);
  }

  /**
   * List all districts
   */
  async getDistricts(): Promise<DistrictEntity[]> {
    return this.districtRepo.find({ order: { name: 'ASC' } });
  }

  /**
   * List police stations (optionally filtered by district)
   */
  async getPoliceStations(districtId?: string): Promise<PoliceStationEntity[]> {
    if (districtId) {
      return this.policeStationRepo.find({
        where: { districtId },
        order: { name: 'ASC' },
      });
    }
    return this.policeStationRepo.find({ order: { name: 'ASC' } });
  }

  /**
   * List camera groups
   */
  async getGroups(): Promise<CameraGroupEntity[]> {
    return this.groupRepo.find({
      relations: { cameras: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Create camera group (ADMIN only)
   */
  async createGroup(
    dto: CreateCameraGroupDto,
    userId?: string,
  ): Promise<CameraGroupEntity> {
    const existing = await this.groupRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(
        `Camera group '${dto.name}' already exists`,
      );
    }

    let cameras: CameraEntity[] = [];
    if (dto.cameraIds && dto.cameraIds.length > 0) {
      cameras = await this.cameraRepo.findBy({ id: In(dto.cameraIds) });
    }

    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description || null,
      createdBy: userId || null,
      cameras,
    });

    return this.groupRepo.save(group);
  }
}
