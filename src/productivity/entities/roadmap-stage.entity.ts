import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { RoadmapStageStatus } from '../productivity.dto';

@Entity({ name: 'trx_roadmap_stages', schema: 'j_application' })
@Unique(['roadmapId', 'stageOrder'])
export class RoadmapStage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'roadmap_id', type: 'uuid', nullable: false })
  roadmapId!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'stage_order', type: 'integer', nullable: false })
  stageOrder!: number;

  @Column({ type: 'varchar', nullable: false })
  status!: RoadmapStageStatus;

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate!: string | null;

  @Column({ name: 'started_date', type: 'date', nullable: true })
  startedDate!: string | null;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
