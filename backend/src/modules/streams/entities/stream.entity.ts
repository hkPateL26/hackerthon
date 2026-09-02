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
import {
  StreamStatus,
  StreamSourceType,
  StreamOutputType,
} from '../enums/stream-status.enum.js';

@Entity('streams')
export class StreamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'camera_id', type: 'uuid', unique: true })
  cameraId: string;

  @ManyToOne(() => CameraEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera: CameraEntity;

  @Column({
    name: 'source_type',
    type: 'varchar',
    length: 30,
    default: StreamSourceType.FILE,
  })
  sourceType: StreamSourceType;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl: string;

  @Column({
    name: 'output_type',
    type: 'varchar',
    length: 30,
    default: StreamOutputType.HLS,
  })
  outputType: StreamOutputType;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: StreamStatus.STOPPED,
  })
  status: StreamStatus;

  @Column({ name: 'process_id', type: 'integer', nullable: true })
  processId: number | null;

  @Column({ name: 'hls_path', type: 'text', nullable: true })
  hlsPath: string | null;

  @Column({ name: 'playback_url', type: 'varchar', length: 255, nullable: true })
  playbackUrl: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'stopped_at', type: 'timestamptz', nullable: true })
  stoppedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
