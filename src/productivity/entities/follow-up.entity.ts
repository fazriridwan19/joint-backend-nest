import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FollowUpChannel, FollowUpStatus } from '../productivity.dto';

@Entity({ name: 'trx_follow_ups', schema: 'j_application' })
export class FollowUp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: false })
  applicationId!: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId!: string | null;

  @Column({ name: 'follow_up_date', type: 'date', nullable: false })
  followUpDate!: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  channel!: FollowUpChannel;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'text', nullable: true })
  result!: string | null;

  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status!: FollowUpStatus;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    update: false,
  })
  createdAt!: Date;
}
