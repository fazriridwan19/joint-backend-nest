import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { CvItemType } from '../cv.enums';

@Entity({ name: 'trx_experience_items', schema: 'j_application' })
export class ExperienceItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'candidate_experience_id', type: 'uuid' })
  candidateExperienceId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: CvItemType;

  @Column({ type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
