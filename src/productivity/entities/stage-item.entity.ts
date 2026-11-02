import { Column, Entity, PrimaryColumn } from 'typeorm';
import { StageItemPriority, StageItemStatus } from '../productivity.dto';

@Entity({ name: 'trx_stage_items', schema: 'j_application' })
export class StageItem {
  @PrimaryColumn({ type: 'uuid', nullable: false })
  id!: string;

  @Column({ name: 'roadmap_stage_id', type: 'uuid', nullable: false })
  roadmapStageId!: string;

  @Column({ name: 'job_application_id', type: 'uuid', nullable: false })
  jobApplicationId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: false })
  categoryId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status!: StageItemStatus;

  @Column({ name: 'scheduled_at', type: 'date', nullable: true })
  scheduledAt!: string | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignee!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priority!: StageItemPriority | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'reminded_at', type: 'date', nullable: true })
  remindedAt!: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
    update: false,
  })
  createdAt!: Date;
}
