import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CamerasService } from './cameras.service.js';
import { CameraStatus } from './enums/camera-status.enum.js';
import { CameraType } from './enums/camera-type.enum.js';
import { CameraSortBy, SortOrder } from './dto/camera-query.dto.js';

describe('CamerasService', () => {
  let service: CamerasService;
  let mockCameraRepo: any;
  let mockDistrictRepo: any;
  let mockPoliceStationRepo: any;
  let mockGroupRepo: any;

  const sampleDistrict = {
    id: 'd1111111-0001-0001-0001-000000000001',
    name: 'Ahmedabad City',
    code: 'AHM',
  };

  const samplePoliceStation = {
    id: 'e1111111-0001-0001-0001-000000000001',
    districtId: 'd1111111-0001-0001-0001-000000000001',
    name: 'Satellite Police Station',
    code: 'PS-AHM-SAT',
    contactNumber: '079-26764500',
  };

  const sampleCameraEntity = {
    id: 'c1111111-0001-0001-0001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
    description: 'High definition PTZ camera',
    cameraType: CameraType.PTZ,
    vendor: 'Hikvision',
    model: 'DS-2DF8442IXS-AELW',
    serialNumber: 'HK20250912001',
    ipAddress: '192.168.10.11',
    port: 554,
    rtspUrl: 'rtsp://admin:SecretPass123@192.168.10.11:554/live',
    locationName: 'Iskcon Junction, SG Highway',
    districtId: sampleDistrict.id,
    district: sampleDistrict,
    policeStationId: samplePoliceStation.id,
    policeStation: samplePoliceStation,
    latitude: 23.0305,
    longitude: 72.5074,
    status: CameraStatus.ONLINE,
    isActive: true,
    installedAt: new Date('2025-01-15T10:00:00Z'),
    lastSeenAt: new Date('2025-03-01T12:00:00Z'),
    metadata: { resolution: '3840x2160' },
    deletedAt: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    const defaultQbMock: any = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[sampleCameraEntity], 1]),
      getMany: vi.fn().mockResolvedValue([sampleCameraEntity]),
    };

    mockCameraRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      findByIds: vi.fn(),
      create: vi.fn((dto) => ({ ...dto, id: 'new-uuid', createdAt: new Date(), updatedAt: new Date() })),
      save: vi.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'new-uuid' })),
      createQueryBuilder: vi.fn().mockReturnValue(defaultQbMock),
    };

    mockDistrictRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockPoliceStationRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockGroupRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ ...entity, id: 'group-uuid' })),
    };

    service = new CamerasService(
      mockCameraRepo,
      mockDistrictRepo,
      mockPoliceStationRepo,
      mockGroupRepo,
    );
  });

  describe('create', () => {
    it('should create a camera successfully with sanitized response', async () => {
      mockCameraRepo.findOne
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(sampleCameraEntity); // findOne after save
      mockDistrictRepo.findOne.mockResolvedValue(sampleDistrict);
      mockPoliceStationRepo.findOne.mockResolvedValue(samplePoliceStation);

      const result = await service.create({
        cameraCode: 'CAM-AHM-001',
        name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
        cameraType: CameraType.PTZ,
        districtId: sampleDistrict.id,
        policeStationId: samplePoliceStation.id,
        latitude: 23.0305,
        longitude: 72.5074,
      });

      expect(result).toBeDefined();
      expect(result.cameraCode).toBe('CAM-AHM-001');
      expect(result.streamUrl).toBe('rtsp://***:***@192.168.10.11:554/live');
      expect(mockCameraRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if cameraCode already exists', async () => {
      mockCameraRepo.findOne.mockResolvedValueOnce(sampleCameraEntity);

      await expect(
        service.create({
          cameraCode: 'CAM-AHM-001',
          name: 'Duplicate Code Camera',
          districtId: sampleDistrict.id,
          policeStationId: samplePoliceStation.id,
          latitude: 23.0305,
          longitude: 72.5074,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if district does not exist', async () => {
      mockCameraRepo.findOne.mockResolvedValueOnce(null);
      mockDistrictRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create({
          cameraCode: 'CAM-AHM-999',
          name: 'Invalid District Camera',
          districtId: 'invalid-district-id',
          policeStationId: samplePoliceStation.id,
          latitude: 23.0305,
          longitude: 72.5074,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated camera items and metadata', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[sampleCameraEntity], 1]),
      };
      mockCameraRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Iskcon',
        status: CameraStatus.ONLINE,
        sortBy: CameraSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].streamUrl).toBe('rtsp://***:***@192.168.10.11:554/live');
    });
  });

  describe('findOne', () => {
    it('should return safe camera response with redacted RTSP credentials', async () => {
      mockCameraRepo.findOne.mockResolvedValue(sampleCameraEntity);

      const result = await service.findOne(sampleCameraEntity.id);
      expect(result.id).toBe(sampleCameraEntity.id);
      expect(result.cameraCode).toBe('CAM-AHM-001');
      expect(result.streamUrl).toBe('rtsp://***:***@192.168.10.11:554/live');
      expect((result as any).rtspUrl).toBeUndefined();
    });

    it('should throw NotFoundException if camera does not exist', async () => {
      mockCameraRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should mark camera as inactive and set deletedAt timestamp', async () => {
      mockCameraRepo.findOne.mockResolvedValue({ ...sampleCameraEntity });

      const result = await service.softDelete(sampleCameraEntity.id);
      expect(result.id).toBe(sampleCameraEntity.id);
      expect(mockCameraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and update lastSeenAt when online', async () => {
      mockCameraRepo.findOne
        .mockResolvedValueOnce({ ...sampleCameraEntity, status: CameraStatus.OFFLINE })
        .mockResolvedValueOnce({ ...sampleCameraEntity, status: CameraStatus.ONLINE });

      const result = await service.updateStatus(sampleCameraEntity.id, CameraStatus.ONLINE);
      expect(result.status).toBe(CameraStatus.ONLINE);
      expect(mockCameraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CameraStatus.ONLINE,
          lastSeenAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getGeoJSON', () => {
    it('should return RFC 7946 GeoJSON FeatureCollection with [lon, lat] coordinates', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([sampleCameraEntity]),
      };
      mockCameraRepo.createQueryBuilder.mockReturnValue(qbMock);

      const geojson = await service.getGeoJSON();
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(1);
      expect(geojson.features[0].type).toBe('Feature');
      expect(geojson.features[0].geometry.type).toBe('Point');
      expect(geojson.features[0].geometry.coordinates).toEqual([72.5074, 23.0305]); // [lon, lat]
      expect(geojson.features[0].properties.cameraCode).toBe('CAM-AHM-001');
      expect(geojson.features[0].properties.district).toBe('Ahmedabad City');
      expect((geojson.features[0].properties as any).rtspUrl).toBeUndefined();
    });

    it('should apply filters and spatial bbox to GeoJSON query', async () => {
      const qbMock: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([sampleCameraEntity]),
      };
      mockCameraRepo.createQueryBuilder.mockReturnValue(qbMock);

      const geojson = await service.getGeoJSON({
        districtId: sampleDistrict.id,
        status: CameraStatus.ONLINE,
        search: 'Iskcon',
        bbox: '72.4,23.0,72.6,23.1',
      });

      expect(geojson.features).toHaveLength(1);
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'camera.districtId = :districtId',
        { districtId: sampleDistrict.id },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'camera.status = :status',
        { status: CameraStatus.ONLINE },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'ST_Intersects(camera.geom, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))',
        { minLng: 72.4, minLat: 23.0, maxLng: 72.6, maxLat: 23.1 },
      );
    });

    it('should throw BadRequestException on out-of-range bbox coordinates', async () => {
      await expect(
        service.getGeoJSON({ bbox: '72.4,120.0,72.6,23.1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
