import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CvProfileStage, CvProfileStatus } from '../cv.enums';

@Entity({ name: 'trx_candidate_cv_profiles', schema: 'j_application' })
export class CandidateCvProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_application_id', type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'varchar', length: 255 })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 20 })
  fileType!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: CvProfileStatus.PENDING,
  })
  status!: CvProfileStatus;

  @Column({
    type: 'varchar',
    length: 30,
    default: CvProfileStage.EXTRACTION,
  })
  stage!: CvProfileStage;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  strengths!: string[] | null;

  @Column({ type: 'text', array: true, nullable: true })
  weaknesses!: string[] | null;

  @Column({ name: 'improvement_suggestions', type: 'text', nullable: true })
  improvementSuggestions!: string | null;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({
    name: 'processing_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  processingStartedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
