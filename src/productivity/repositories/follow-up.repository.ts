import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/repository/base.repository';
import { DataSource } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';

@Injectable()
export class FollowUpRepository extends BaseRepository<FollowUp> {
  constructor(readonly dataSource: DataSource) {
    super(FollowUp, dataSource);
  }

  async findAllByApplicationIdOrderByFollowUpDateDesc(
    applicationId: string,
  ): Promise<FollowUp[]> {
    return this.repo.find({
      where: { applicationId },
      order: { followUpDate: 'DESC' },
    });
  }

  async findByIdAndApplicationId(
    id: string,
    applicationId: string,
  ): Promise<FollowUp | null> {
    return this.repo.findOneBy({ id, applicationId });
  }
}
