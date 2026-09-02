import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';

@Entity('tracks')
@Unique('uq_camera_session_track', ['cameraId', 'sessionId', 'trackId'])
@Index('idx_tracks_camera_session_track', ['cameraId', 'sessionId', 'trackId'])
@Index('idx_tracks_camera_status', ['cameraId', 'status'])
@Index('idx_tracks_camera_last_seen', ['cameraId', 'lastSeenAt'])
@Index('idx_tracks_status', ['status'])
export class TrackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'camera_id', type: 'uuid' })
  cameraId!: string;

  @ManyToOne(() => CameraEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera?: CameraEntity;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'track_id', type: 'integer' })
  trackId!: number;

  @Column({ type: 'varchar', length: 30 })
  category!: string; // 'PERSON' | 'VEHICLE'

  @Column({ name: 'detected_class', type: 'varchar', length: 50 })
  detectedClass!: string; // 'person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'

  @Column({ type: 'varchar', length: 20 })
  status!: string; // 'NEW', 'ACTIVE', 'LOST', 'TERMINATED'

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt!: Date;

  @Column({ name: 'detection_count', type: 'integer', default: 0 })
  detectionCount!: number;

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence!: number | null;

  @Column({ name: 'bbox_x', type: 'numeric', precision: 8, scale: 2, nullable: true })
  bboxX!: number | null;

  @Column({ name: 'bbox_y', type: 'numeric', precision: 8, scale: 2, nullable: true })
  bboxY!: number | null;

  @Column({ name: 'bbox_width', type: 'numeric', precision: 8, scale: 2, nullable: true })
  bboxWidth!: number | null;

  @Column({ name: 'bbox_height', type: 'numeric', precision: 8, scale: 2, nullable: true })
  bboxHeight!: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
