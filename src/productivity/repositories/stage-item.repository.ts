import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { StageItem } from '../entities/stage-item.entity';
import { StageItemStatus } from '../productivity.dto';

@Injectable()
export class StageItemRepository extends BaseRepository<StageItem> {
  constructor(readonly dataSource: DataSource) {
    super(StageItem, dataSource);
  }

  async findAllByApplicationId(applicationId: string): Promise<StageItem[]> {
    return this.repo.find({
      where: { jobApplicationId: applicationId },
      order: { scheduledAt: 'ASC', startTime: 'ASC' },
    });
  }

  async findAllByApplicationIdAndStageId(
    applicationId: string,
    stageId: string,
  ): Promise<StageItem[]> {
    return this.repo.find({
      where: { jobApplicationId: applicationId, roadmapStageId: stageId },
      order: { scheduledAt: 'ASC', startTime: 'ASC' },
    });
  }

  async findAllByRoadmapStageId(stageId: string): Promise<StageItem[]> {
    return this.repo.findBy({ roadmapStageId: stageId });
  }

  async findByIdAndApplicationId(
    id: string,
    applicationId: string,
  ): Promise<StageItem | null> {
    return this.repo.findOneBy({ id, jobApplicationId: applicationId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findAllAndLockUpcomingReminderTasks(
    today: string,
    maxDate: string,
  ): Promise<StageItem[]> {
    return this.repo
      .createQueryBuilder('item')
      .where('item.status NOT IN (:...statuses)', {
        statuses: [StageItemStatus.DONE, StageItemStatus.CANCELLED],
      })
      .andWhere('item.scheduled_at BETWEEN :today AND :maxDate', {
        today,
        maxDate,
      })
      .andWhere('item.start_time IS NOT NULL')
      .andWhere('(item.reminded_at IS NULL OR item.reminded_at < :today)', {
        today,
      })
      .orderBy('item.scheduled_at', 'ASC')
      .addOrderBy('item.start_time', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }
}
