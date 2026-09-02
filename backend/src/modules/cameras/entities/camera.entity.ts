import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CameraStatus } from '../enums/camera-status.enum.js';
import { CameraType } from '../enums/camera-type.enum.js';
import { DistrictEntity } from './district.entity.js';
import { PoliceStationEntity } from './police-station.entity.js';

@Entity({ name: 'cameras' })
export class CameraEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'camera_code', type: 'varchar', length: 50, unique: true })
  cameraCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({
    name: 'camera_type',
    type: 'varchar',
    length: 30,
    default: CameraType.FIXED,
  })
  cameraType: CameraType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vendor: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'integer', default: 554 })
  port: number;

  @Column({ name: 'rtsp_url', type: 'text', nullable: true })
  rtspUrl: string | null;

  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: true })
  locationName: string | null;

  @Index()
  @Column({ name: 'district_id', type: 'uuid' })
  districtId: string;

  @ManyToOne(() => DistrictEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'district_id' })
  district: DistrictEntity;

  @Index()
  @Column({ name: 'police_station_id', type: 'uuid' })
  policeStationId: string;

  @ManyToOne(() => PoliceStationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'police_station_id' })
  policeStation: PoliceStationEntity;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Index()
  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: CameraStatus.ONLINE,
  })
  status: CameraStatus;

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'installed_at', type: 'timestamptz', nullable: true })
  installedAt: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
