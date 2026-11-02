import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { ExperienceItem } from '../entities/experience-item.entity';

@Injectable()
export class CvExperienceItemRepository extends BaseRepository<ExperienceItem> {
  constructor(readonly dataSource: DataSource) {
    super(ExperienceItem, dataSource);
  }

  findByExperienceIds(experienceIds: string[]): Promise<ExperienceItem[]> {
    if (experienceIds.length === 0) return Promise.resolve([]);
    return this.repo.find({
      where: { candidateExperienceId: In(experienceIds) },
    });
  }
}
