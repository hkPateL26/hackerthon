import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from './entities/camera.entity.js';
import { DistrictEntity } from './entities/district.entity.js';
import { PoliceStationEntity } from './entities/police-station.entity.js';
import { CameraGroupEntity } from './entities/camera-group.entity.js';
import { CamerasService } from './cameras.service.js';
import { CamerasController } from './cameras.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CameraEntity,
      DistrictEntity,
      PoliceStationEntity,
      CameraGroupEntity,
    ]),
  ],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService],
})
export class CamerasModule {}
