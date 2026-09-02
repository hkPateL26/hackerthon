import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamEntity } from './entities/stream.entity.js';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { StreamsService } from './services/streams.service.js';
import { FfmpegProcessManagerService } from './services/ffmpeg-process-manager.service.js';
import { StreamsController } from './controllers/streams.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StreamEntity, CameraEntity])],
  controllers: [StreamsController],
  providers: [StreamsService, FfmpegProcessManagerService],
  exports: [StreamsService, FfmpegProcessManagerService],
})
export class StreamsModule {}
