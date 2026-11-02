import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { CvItemType } from '../cv.enums';

@Entity({ name: 'trx_project_items', schema: 'j_application' })
export class ProjectItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'candidate_project_id', type: 'uuid' })
  candidateProjectId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: CvItemType;

  @Column({ type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
