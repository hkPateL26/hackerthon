import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
