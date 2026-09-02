import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CameraEntity } from '../../cameras/entities/camera.entity.js';

@Entity('anpr_results')
@Index('idx_anpr_camera_occurred', ['cameraId', 'occurredAt'])
@Index('idx_anpr_camera_track', ['cameraId', 'trackId'])
@Index('idx_anpr_camera_session_track', ['cameraId', 'sessionId', 'trackId'])
@Index('idx_anpr_plate_normalized', ['plateTextNormalized'])
@Index('idx_anpr_validation_status', ['validationStatus'])
@Index('idx_anpr_occurred_at', ['occurredAt'])
export class AnprResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'camera_id', type: 'uuid' })
  cameraId: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ name: 'track_id', type: 'integer', nullable: true })
  trackId: number | null;

  @Column({ name: 'vehicle_class', type: 'varchar', length: 50, nullable: true })
  vehicleClass: string | null;

  @Column({ name: 'plate_text_raw', type: 'varchar', length: 32 })
  plateTextRaw: string;

  @Column({ name: 'plate_text_normalized', type: 'varchar', length: 32, nullable: true })
  plateTextNormalized: string | null;

  @Column({ name: 'validation_status', type: 'varchar', length: 30, default: 'VALID' })
  validationStatus: string;

  @Column({
    name: 'plate_detection_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  plateDetectionConfidence: number | null;

  @Column({
    name: 'ocr_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  ocrConfidence: number | null;

  @Column({
    name: 'final_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  finalConfidence: number | null;

  @Column({
    name: 'plate_bbox_x',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  plateBboxX: number | null;

  @Column({
    name: 'plate_bbox_y',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  plateBboxY: number | null;

  @Column({
    name: 'plate_bbox_width',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  plateBboxWidth: number | null;

  @Column({
    name: 'plate_bbox_height',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v?: string | null) => (v ? parseFloat(v) : null),
    },
  })
  plateBboxHeight: number | null;

  @Column({ name: 'plate_snapshot_path', type: 'text', nullable: true })
  plateSnapshotPath: string | null;

  @Column({ name: 'vehicle_snapshot_path', type: 'text', nullable: true })
  vehicleSnapshotPath: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => CameraEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera: CameraEntity;
}
