import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CamerasController } from './cameras.controller.js';
import { CameraStatus } from './enums/camera-status.enum.js';
import { CameraType } from './enums/camera-type.enum.js';

describe('CamerasController', () => {
  let controller: CamerasController;
  let mockService: any;

  const mockSafeCamera = {
    id: 'c1111111-0001-0001-0001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Cross Road North',
    cameraType: CameraType.PTZ,
    district: { id: 'd1', name: 'Ahmedabad City', code: 'AHM' },
    policeStation: { id: 'p1', name: 'Satellite PS', code: 'PS-AHM-SAT' },
    latitude: 23.0305,
    longitude: 72.5074,
    status: CameraStatus.ONLINE,
    isActive: true,
    streamUrl: 'rtsp://***:***@192.168.10.11:554/live',
  };

  beforeEach(() => {
    mockService = {
      create: vi.fn().mockResolvedValue(mockSafeCamera),
      findAll: vi.fn().mockResolvedValue({
        items: [mockSafeCamera],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      }),
      findOne: vi.fn().mockResolvedValue(mockSafeCamera),
      update: vi.fn().mockResolvedValue(mockSafeCamera),
      softDelete: vi.fn().mockResolvedValue({ message: 'Archived', id: 'c1111111-0001-0001-0001-000000000001' }),
      updateStatus: vi.fn().mockResolvedValue({ ...mockSafeCamera, status: CameraStatus.MAINTENANCE }),
      activate: vi.fn().mockResolvedValue({ ...mockSafeCamera, isActive: true }),
      deactivate: vi.fn().mockResolvedValue({ ...mockSafeCamera, isActive: false }),
      getGeoJSON: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [72.5074, 23.0305] },
            properties: { id: 'c1', cameraCode: 'CAM-AHM-001' },
          },
        ],
      }),
      getDistricts: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Ahmedabad City' }]),
      getPoliceStations: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Satellite PS' }]),
      getGroups: vi.fn().mockResolvedValue([{ id: 'g1', name: 'SG Highway' }]),
      createGroup: vi.fn().mockResolvedValue({ id: 'g1', name: 'SG Highway' }),
    };

    controller = new CamerasController(mockService);
  });

  it('should call create on service and return safe camera', async () => {
    const dto: any = {
      cameraCode: 'CAM-AHM-001',
      name: 'Iskcon Cross Road North',
      districtId: 'd1',
      policeStationId: 'p1',
      latitude: 23.0305,
      longitude: 72.5074,
    };
    const result = await controller.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(result.cameraCode).toBe('CAM-AHM-001');
  });

  it('should call findAll on service and return paginated list', async () => {
    const query: any = { page: 1, limit: 20 };
    const result = await controller.findAll(query);
    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(result.items).toHaveLength(1);
  });

  it('should call findOne on service', async () => {
    const result = await controller.findOne('c1111111-0001-0001-0001-000000000001');
    expect(mockService.findOne).toHaveBeenCalledWith('c1111111-0001-0001-0001-000000000001');
    expect(result.id).toBe('c1111111-0001-0001-0001-000000000001');
  });

  it('should call update on service', async () => {
    const dto: any = { name: 'Updated Name' };
    await controller.update('c1111111-0001-0001-0001-000000000001', dto);
    expect(mockService.update).toHaveBeenCalledWith('c1111111-0001-0001-0001-000000000001', dto);
  });

  it('should call softDelete on service', async () => {
    await controller.softDelete('c1111111-0001-0001-0001-000000000001');
    expect(mockService.softDelete).toHaveBeenCalledWith('c1111111-0001-0001-0001-000000000001');
  });

  it('should call updateStatus on service', async () => {
    await controller.updateStatus('c1111111-0001-0001-0001-000000000001', { status: CameraStatus.MAINTENANCE });
    expect(mockService.updateStatus).toHaveBeenCalledWith('c1111111-0001-0001-0001-000000000001', CameraStatus.MAINTENANCE);
  });

  it('should call getGeoJSON on service', async () => {
    const result = await controller.getGeoJSON();
    expect(mockService.getGeoJSON).toHaveBeenCalled();
    expect(result.type).toBe('FeatureCollection');
  });
});
