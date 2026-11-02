import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationStatus } from '../application.enums';

@Entity({ name: 'trx_application_activities', schema: 'j_application' })
export class ApplicationActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: false })
  applicationId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 255, nullable: false })
  eventType!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 255, nullable: false })
  actorType!: string;

  @Column({
    name: 'previous_status',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  previousStatus!: ApplicationStatus | null;

  @Column({ name: 'new_status', type: 'varchar', length: 30, nullable: true })
  newStatus!: ApplicationStatus | null;

  @Column({ name: 'event_date', type: 'timestamptz', nullable: false })
  eventDate!: Date;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt!: Date;
}
