import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'trx_recruitment_roadmaps', schema: 'j_application' })
export class Roadmap {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'job_application_id',
    type: 'uuid',
    nullable: false,
    unique: true,
  })
  applicationId!: string;

  @Column({ name: 'is_custom', type: 'boolean', nullable: false })
  custom!: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    update: false,
  })
  createdAt!: Date;
}
