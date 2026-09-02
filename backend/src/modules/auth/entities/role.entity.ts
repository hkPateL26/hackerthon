import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity.js';

export enum RoleName {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR',
}

@Entity({ name: 'roles' })
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: RoleName;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '[]' })
  permissions: string[];

  @OneToMany(() => UserEntity, (user) => user.role)
  users: UserEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
