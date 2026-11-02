import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReminderType } from '../productivity.dto';

@Entity({ name: 'trx_reminders', schema: 'j_application' })
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: false })
  type!: ReminderType;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: false })
  dueAt!: Date;

  @Column({ name: 'is_completed', type: 'boolean', nullable: false })
  completed!: boolean;

  @Column({ name: 'snoozed_until', type: 'timestamptz', nullable: true })
  snoozedUntil!: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    update: false,
  })
  createdAt!: Date;
}
