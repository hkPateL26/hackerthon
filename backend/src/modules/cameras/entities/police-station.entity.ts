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
import { DistrictEntity } from './district.entity.js';

@Entity({ name: 'police_stations' })
export class PoliceStationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'district_id', type: 'uuid' })
  districtId: string;

  @ManyToOne(() => DistrictEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'district_id' })
  district: DistrictEntity;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ name: 'contact_number', type: 'varchar', length: 30, nullable: true })
  contactNumber: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
