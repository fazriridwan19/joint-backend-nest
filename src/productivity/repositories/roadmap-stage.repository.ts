import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { RoadmapStage } from '../entities/roadmap-stage.entity';

@Injectable()
export class RoadmapStageRepository extends BaseRepository<RoadmapStage> {
  constructor(readonly dataSource: DataSource) {
    super(RoadmapStage, dataSource);
  }

  async findAllByRoadmapIdOrderByStageOrder(
    roadmapId: string,
  ): Promise<RoadmapStage[]> {
    return this.repo.find({
      where: { roadmapId },
      order: { stageOrder: 'ASC' },
    });
  }

  async findByIdAndRoadmapId(
    id: string,
    roadmapId: string,
  ): Promise<RoadmapStage | null> {
    return this.repo.findOneBy({ id, roadmapId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
