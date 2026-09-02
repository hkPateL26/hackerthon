import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';
import { EventTypeEntity } from './event-type.entity.js';

@Entity('events')
@Index('idx_events_camera_occurred', ['cameraId', 'occurredAt'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'camera_id', type: 'uuid' })
  @Index('idx_events_camera_id')
  cameraId!: string;

  @ManyToOne(() => CameraEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera?: CameraEntity;

  @Column({ name: 'event_type_id', type: 'uuid' })
  @Index('idx_events_type_id')
  eventTypeId!: string;

  @ManyToOne(() => EventTypeEntity, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'event_type_id' })
  eventType?: EventTypeEntity;

  @Column({ name: 'detected_category', type: 'varchar', length: 30 })
  @Index('idx_events_category')
  detectedCategory!: string; // 'PERSON', 'VEHICLE'

  @Column({ name: 'detected_class', type: 'varchar', length: 50 })
  detectedClass!: string; // 'person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'

  @Column({ type: 'numeric', precision: 5, scale: 4 })
  confidence!: number;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  @Index('idx_events_occurred_at')
  occurredAt!: Date;

  @Column({ name: 'frame_width', type: 'integer', default: 640 })
  frameWidth!: number;

  @Column({ name: 'frame_height', type: 'integer', default: 360 })
  frameHeight!: number;

  @Column({ name: 'bbox_x', type: 'numeric', precision: 8, scale: 2 })
  bboxX!: number;

  @Column({ name: 'bbox_y', type: 'numeric', precision: 8, scale: 2 })
  bboxY!: number;

  @Column({ name: 'bbox_width', type: 'numeric', precision: 8, scale: 2 })
  bboxWidth!: number;

  @Column({ name: 'bbox_height', type: 'numeric', precision: 8, scale: 2 })
  bboxHeight!: number;

  @Column({ name: 'snapshot_path', type: 'text', nullable: true })
  snapshotPath!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'YOLOv8n' })
  source!: string;

  @Column({ name: 'track_id', type: 'integer', nullable: true })
  @Index('idx_events_camera_track_id')
  trackId?: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
