import { CameraEntity } from '../entities/camera.entity.js';
import {
  SafeCameraResponseDto,
  DistrictSummaryDto,
  PoliceStationSummaryDto,
} from '../dto/camera-response.dto.js';
import {
  GeoJSONCameraFeatureDto,
  GeoJSONFeatureCollectionDto,
} from '../dto/geojson-response.dto.js';

export class CameraMapper {
  /**
   * Sanitizes RTSP stream URL by redacting embedded username and password.
   * e.g. rtsp://admin:SecretPass123@192.168.10.11:554/live -> rtsp://***:***@192.168.10.11:554/live
   */
  static sanitizeStreamUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      // Regex to redact credentials in URL: scheme://user:pass@host -> scheme://***:***@host
      return url.replace(/^(rtsp[s]?:\/\/)([^:@\s]+):([^@\s]+)@/i, '$1***:***@');
    } catch {
      return null;
    }
  }

  /**
   * Maps a CameraEntity into SafeCameraResponseDto
   */
  static toSafeResponse(entity: CameraEntity): SafeCameraResponseDto {
    const district: DistrictSummaryDto | null = entity.district
      ? {
          id: entity.district.id,
          name: entity.district.name,
          code: entity.district.code,
        }
      : null;

    const policeStation: PoliceStationSummaryDto | null = entity.policeStation
      ? {
          id: entity.policeStation.id,
          name: entity.policeStation.name,
          code: entity.policeStation.code,
          contactNumber: entity.policeStation.contactNumber,
        }
      : null;

    return {
      id: entity.id,
      cameraCode: entity.cameraCode,
      name: entity.name,
      description: entity.description,
      cameraType: entity.cameraType,
      vendor: entity.vendor,
      model: entity.model,
      serialNumber: entity.serialNumber,
      ipAddress: entity.ipAddress,
      port: entity.port,
      streamUrl: this.sanitizeStreamUrl(entity.rtspUrl),
      locationName: entity.locationName,
      district,
      policeStation,
      latitude: entity.latitude,
      longitude: entity.longitude,
      status: entity.status,
      isActive: entity.isActive,
      installedAt: entity.installedAt,
      lastSeenAt: entity.lastSeenAt,
      metadata: entity.metadata || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Maps an array of CameraEntity into GeoJSON FeatureCollection
   */
  static toGeoJSON(cameras: CameraEntity[]): GeoJSONFeatureCollectionDto {
    const features: GeoJSONCameraFeatureDto[] = cameras.map((camera) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [camera.longitude, camera.latitude], // GeoJSON standard: [lon, lat]
      },
      properties: {
        id: camera.id,
        cameraCode: camera.cameraCode,
        name: camera.name,
        cameraType: camera.cameraType,
        status: camera.status,
        isActive: camera.isActive,
        district: camera.district?.name || 'Unknown',
        policeStation: camera.policeStation?.name || 'Unknown',
        locationName: camera.locationName,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
