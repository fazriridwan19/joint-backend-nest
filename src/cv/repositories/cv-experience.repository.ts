import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../shared/repository/base.repository';
import { CandidateCvExperience } from '../entities/candidate-cv-experience.entity';

@Injectable()
export class CvExperienceRepository extends BaseRepository<CandidateCvExperience> {
  constructor(readonly dataSource: DataSource) {
    super(CandidateCvExperience, dataSource);
  }

  findByProfileId(profileId: string): Promise<CandidateCvExperience[]> {
    return this.repo.find({ where: { profileId } });
  }
}
