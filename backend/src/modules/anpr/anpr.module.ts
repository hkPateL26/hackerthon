import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnprResultEntity } from './entities/anpr-result.entity.js';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { AnprService } from './services/anpr.service.js';
import {
  AnprController,
  CameraAnprController,
} from './controllers/anpr.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnprResultEntity, CameraEntity]),
    AuthModule,
  ],
  controllers: [AnprController, CameraAnprController],
  providers: [AnprService],
  exports: [AnprService],
})
export class AnprModule {}
