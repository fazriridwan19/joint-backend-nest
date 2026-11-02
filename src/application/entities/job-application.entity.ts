import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  ApplicationPriority,
  ApplicationSource,
  ApplicationStatus,
  EmploymentType,
  WorkArrangement,
} from '../application.enums';

@Entity({ name: 'trx_job_applications', schema: 'j_application' })
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: false })
  companyId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  position!: string;

  @Column({ name: 'applied_date', type: 'date', nullable: false })
  appliedDate!: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  status!: ApplicationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({
    name: 'employment_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  employmentType!: EmploymentType | null;

  @Column({
    name: 'work_arrangement',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  workArrangement!: WorkArrangement | null;

  @Column({
    name: 'salary_range_min',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  salaryRangeMin!: string | null;

  @Column({
    name: 'salary_range_max',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  salaryRangeMax!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  source!: ApplicationSource | null;

  @Column({ type: 'varchar', length: 30, nullable: false })
  priority!: ApplicationPriority;

  @Column({ name: 'job_url', type: 'varchar', length: 500, nullable: true })
  jobUrl!: string | null;

  @Column({
    name: 'application_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  applicationUrl!: string | null;

  @Column({ name: 'is_archived', type: 'boolean', nullable: false })
  archived!: boolean;

  @Column({ name: 'job_description', type: 'text', nullable: true })
  jobDescription!: string | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt!: Date;
}
