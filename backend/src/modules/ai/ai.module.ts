import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { AiManagerService } from './services/ai-manager.service.js';
import { AiController } from './controllers/ai.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([CameraEntity])],
  providers: [AiManagerService],
  controllers: [AiController],
  exports: [AiManagerService],
})
export class AiModule {}
