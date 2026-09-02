import { ApiProperty } from '@nestjs/swagger';

export class GeoJSONPointGeometryDto {
  @ApiProperty({ example: 'Point' })
  type: 'Point' = 'Point';

  @ApiProperty({ example: [72.5074, 23.0305], description: '[longitude, latitude]' })
  coordinates: [number, number];
}

export class GeoJSONCameraPropertiesDto {
  @ApiProperty({ example: 'c1111111-0001-0001-0001-000000000001' })
  id: string;

  @ApiProperty({ example: 'CAM-AHM-001' })
  cameraCode: string;

  @ApiProperty({ example: 'Iskcon Cross Road Pan-Tilt-Zoom North' })
  name: string;

  @ApiProperty({ example: 'PTZ' })
  cameraType: string;

  @ApiProperty({ example: 'ONLINE' })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'Ahmedabad City' })
  district: string;

  @ApiProperty({ example: 'Satellite Police Station' })
  policeStation: string;

  @ApiProperty({ example: 'Iskcon Junction, SG Highway' })
  locationName: string | null;
}

export class GeoJSONCameraFeatureDto {
  @ApiProperty({ example: 'Feature' })
  type: 'Feature' = 'Feature';

  @ApiProperty({ type: GeoJSONPointGeometryDto })
  geometry: GeoJSONPointGeometryDto;

  @ApiProperty({ type: GeoJSONCameraPropertiesDto })
  properties: GeoJSONCameraPropertiesDto;
}

export class GeoJSONFeatureCollectionDto {
  @ApiProperty({ example: 'FeatureCollection' })
  type: 'FeatureCollection' = 'FeatureCollection';

  @ApiProperty({ type: [GeoJSONCameraFeatureDto] })
  features: GeoJSONCameraFeatureDto[];
}
