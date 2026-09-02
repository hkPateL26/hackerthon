import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TrackEntity } from './entities/track.entity.js';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { TracksService } from './services/tracks.service.js';
import { TracksController } from './controllers/tracks.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackEntity, CameraEntity]),
    ConfigModule,
  ],
  controllers: [TracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
