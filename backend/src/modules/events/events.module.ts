import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity.js';
import { EventTypeEntity } from './entities/event-type.entity.js';
import { CameraEntity } from '../cameras/entities/camera.entity.js';
import { EventsService } from './services/events.service.js';
import { EventsController } from './controllers/events.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity, EventTypeEntity, CameraEntity]),
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
