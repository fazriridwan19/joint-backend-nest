import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'trx_candidate_cv_experiences', schema: 'j_application' })
export class CandidateCvExperience {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  position!: string | null;

  @Column({ name: 'start_date', type: 'varchar', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'varchar', nullable: true })
  endDate!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
