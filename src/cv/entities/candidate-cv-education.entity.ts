import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'trx_candidate_cv_educations', schema: 'j_application' })
export class CandidateCvEducation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @Column({ type: 'varchar', length: 100 })
  institution!: string;

  @Column({ type: 'varchar', length: 50 })
  degree!: string;

  @Column({ name: 'field_of_study', type: 'varchar', length: 100 })
  fieldOfStudy!: string;

  @Column({ name: 'start_date', type: 'varchar', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'varchar', nullable: true })
  endDate!: string | null;

  @Column({ type: 'varchar', nullable: true })
  gpa!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
