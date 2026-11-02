import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { CvSkillType } from '../cv.enums';

@Entity({ name: 'trx_candidate_cv_skills', schema: 'j_application' })
export class CandidateCvSkill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: CvSkillType;

  @Column({ type: 'varchar', length: 100 })
  value!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
