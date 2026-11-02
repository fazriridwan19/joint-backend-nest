import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { Roadmap } from '../entities/roadmap.entity';

@Injectable()
export class RoadmapRepository extends BaseRepository<Roadmap> {
  constructor(readonly dataSource: DataSource) {
    super(Roadmap, dataSource);
  }

  async findByApplicationId(applicationId: string): Promise<Roadmap | null> {
    return this.repo.findOneBy({ applicationId });
  }
}
