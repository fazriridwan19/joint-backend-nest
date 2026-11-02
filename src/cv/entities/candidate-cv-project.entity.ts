import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'trx_candidate_cv_projects', schema: 'j_application' })
export class CandidateCvProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50 })
  role!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
